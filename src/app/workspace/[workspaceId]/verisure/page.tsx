'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Copy, RefreshCw, Settings, Check, Plus, TrendingUp } from 'lucide-react'
import { getConfigVerisure, saveConfigVerisure } from '@/lib/services'
import { CONFIG_VERISURE_DEFAULT, DEVICE_IMAGES } from '@/lib/verisure-defaults'
import { useModuloGuard } from '@/hooks/useModuloGuard'
import { useMemberRole } from '@/hooks/useMemberRole'
import dynamic from 'next/dynamic'
import type { ConfigVerisure, NivelPrecio, TipoVenta, DispositivoExtra } from '@/types'

const ConfigPanel = dynamic(() => import('./ConfigPanel'), { ssr: false })

// ── Helpers ───────────────────────────────────────────────────────────────────
const iva = (n: number, pct = 21) => n * (1 + pct / 100)
const fmt = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const fmtPrecio = (n: number, conIva = false, ivaPct = 21) =>
  n === -1 ? 'A consultar' : fmt(conIva ? iva(n, ivaPct) : n)
const nowStr = () => {
  const d = new Date()
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

const NIVEL_LABEL: Record<NivelPrecio, string> = {
  catalogo: 'Catálogo', alto: 'Alto', medio: 'Medio',
  bajo: 'Bajo', jefe: 'Jefe', gerente: 'Gerente',
}
const NIVELES_ORDEN: NivelPrecio[] = ['catalogo', 'alto', 'medio', 'bajo', 'jefe', 'gerente']

// ── Tipos locales ─────────────────────────────────────────────────────────────
interface ExtraItem {
  dispositivoId: string
  cantidadIdx: number
  nivel: 'alto' | 'bajo'
  bonificado: boolean
}

interface Instalacion {
  id: number
  nivelKit: NivelPrecio | null   // null = sin seleccionar
  usaPromo: boolean
  promoId: string
  conUpgrade: boolean
  extras: ExtraItem[]
  nivelExtras: 'alto' | 'bajo'
  esExpress: boolean
}

interface CalcResult {
  kitSinIVA: number
  kitConIVA: number
  extrasPrecioSinIVA: number
  totalInsSinIVA: number
  totalInsConIVA: number
  cuotaBaseSinIVA: number
  cuotaExtrasSinIVA: number
  cuotaTotalSinIVA: number
  cuotaTotalConIVA: number
  comisionKit: number
  comisionExtras: number
  comisionTotal: number
  extrasData: { disp: DispositivoExtra; idx: number; bonificado: boolean }[]
}

// ── Calculadora por instalación ───────────────────────────────────────────────
function calcInstalacion(inst: Instalacion, config: ConfigVerisure, tipoVenta: TipoVenta): CalcResult {
  const esJG = inst.nivelKit === 'jefe' || inst.nivelKit === 'gerente'
  const promoActual = config.promos.find(p => p.id === inst.promoId)

  const upgPrecio = !inst.nivelKit ? 0
    : inst.nivelKit === 'catalogo' ? config.upgrades.catalogo
    : inst.nivelKit === 'alto' ? config.upgrades.alto : config.upgrades.medioBajo

  const kitSinIVA = inst.usaPromo && promoActual
    ? promoActual.precio
    : inst.nivelKit
      ? config.kits[inst.nivelKit] + (inst.conUpgrade && !esJG ? upgPrecio : 0)
      : 0
  const kitConIVA = iva(kitSinIVA, config.ivaPct)

  const extrasData = inst.extras.map(e => {
    const disp = config.dispositivos.find(d => d.id === e.dispositivoId)
    if (!disp) return null
    return { disp, idx: e.cantidadIdx, bonificado: e.bonificado }
  }).filter(Boolean) as { disp: DispositivoExtra; idx: number; bonificado: boolean }[]

  const extrasPrecioSinIVA = extrasData.reduce((s, { disp, idx, bonificado }) => s + (bonificado ? 0 : disp.precios[idx]), 0)
  const cuotaExtrasSinIVA  = extrasData.reduce((s, { disp, idx }) => s + disp.cuotas[idx], 0)
  const comisionExtras     = extrasData.reduce((s, { disp, idx }) => s + disp.comisiones[idx], 0)

  const totalInsSinIVA = kitSinIVA + extrasPrecioSinIVA
  const totalInsConIVA = iva(totalInsSinIVA, config.ivaPct)
  const cuotaBaseSinIVA = config.cuotaBase + (inst.conUpgrade && !esJG ? config.cuotaUpgrade : 0)
  const cuotaTotalSinIVA = cuotaBaseSinIVA + cuotaExtrasSinIVA
  const cuotaTotalConIVA = iva(cuotaTotalSinIVA, config.ivaPct)

  const comisionKit = (() => {
    if (inst.usaPromo || esJG || !inst.nivelKit) return 0
    const key = `${inst.nivelKit}_${tipoVenta}` as keyof typeof config.comisiones
    return config.comisiones[key] ?? 0
  })()

  return {
    kitSinIVA, kitConIVA,
    extrasPrecioSinIVA, totalInsSinIVA, totalInsConIVA,
    cuotaBaseSinIVA, cuotaExtrasSinIVA, cuotaTotalSinIVA, cuotaTotalConIVA,
    comisionKit, comisionExtras, comisionTotal: comisionKit + comisionExtras,
    extrasData,
  }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function VerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  useModuloGuard('moduloVerisure') // redirige si no tiene licencia
  const { isAdmin } = useMemberRole(workspaceId)

  const [config, setConfig] = useState<ConfigVerisure>(CONFIG_VERISURE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [copiedCliente, setCopiedCliente] = useState(false)
  const [copiedInterno, setCopiedInterno] = useState(false)

  // Global
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>('RP')
  const [cuotas, setCuotas] = useState(12)
  const [ventasMes, setVentasMes] = useState(0)
  const [rpMes, setRpMes] = useState(0)
  const [expressMes, setExpressMes] = useState(0)

  // Instalaciones
  const makeInstBase = (promoId = ''): Instalacion => ({
    id: Date.now() + Math.random(), nivelKit: null,
    usaPromo: false, promoId, conUpgrade: false,
    extras: [], nivelExtras: 'alto', esExpress: false,
  })
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([makeInstBase()])
  const [instActiva, setInstActiva] = useState(0)

  // UI panels
  const [showPromos, setShowPromos] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  const [showBonos, setShowBonos] = useState(false)
  const [showSugs, setShowSugs] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const c = await getConfigVerisure(workspaceId)
      setConfig(c)
      setInstalaciones([makeInstBase(c.promos[0]?.id ?? '')])
    } finally { setLoading(false) }
  }

  const inst = instalaciones[instActiva] ?? instalaciones[0]
  const setInst = (fn: (i: Instalacion) => Instalacion) =>
    setInstalaciones(prev => prev.map((x, i) => i === instActiva ? fn(x) : x))

  // Cálculos — memoizados para evitar recalcular en cada render
  const calcs = useMemo(
    () => instalaciones.map(i => calcInstalacion(i, config, tipoVenta)),
    [instalaciones, config, tipoVenta]
  )
  const totalInsSinIVA = calcs.reduce((s, c) => s + c.totalInsSinIVA, 0)
  const totalInsConIVA = calcs.reduce((s, c) => s + c.totalInsConIVA, 0)
  const cuotaTotalConIVA = calcs.reduce((s, c) => s + c.cuotaTotalConIVA, 0)
  const cuotaTotalSinIVA = calcs.reduce((s, c) => s + c.cuotaTotalSinIVA, 0)
  const comisionVenta = calcs.reduce((s, c) => s + c.comisionTotal, 0)

  // ── Bonos ─────────────────────────────────────────────────────────────────
  const ventasConEsta = ventasMes + instalaciones.length
  const rpConEsta = tipoVenta === 'RP' ? rpMes + instalaciones.length : rpMes
  const expressConEsta = instalaciones.filter(i => i.esExpress).length + expressMes

  const calcBonoPerf = (n: number) => {
    const esc = [...config.bonoPerformance].sort((a, b) => b.ventas - a.ventas).find(e => n >= e.ventas)
    if (!esc) return 0
    const maxEsc = Math.max(...config.bonoPerformance.map(e => e.ventas))
    const extra = Math.max(0, n - maxEsc)
    return esc.monto + extra * config.bonoPerformanceExtra
  }
  const calcBonoRP = (n: number) => {
    const esc = [...config.bonoRP].sort((a, b) => b.rp - a.rp).find(e => n >= e.rp)
    if (!esc) return 0
    const maxEsc = Math.max(...config.bonoRP.map(e => e.rp))
    const extra = Math.max(0, n - maxEsc)
    return esc.monto + extra * config.bonoRPExtra
  }
  const calcBonoExpress = (n: number) =>
    [...config.bonoExpress].sort((a, b) => b.express - a.express).find(e => n >= e.express)?.monto ?? 0

  const bonoPerf        = calcBonoPerf(ventasConEsta)
  const bonoPerfAntes   = calcBonoPerf(ventasMes)
  const bonoRP          = calcBonoRP(rpConEsta)
  const bonoRPAntes     = calcBonoRP(rpMes)
  const bonoExpress     = calcBonoExpress(expressConEsta)
  const bonoInstalacion = instalaciones.reduce((s, i) => {
    if (tipoVenta === 'RE') return s
    const esJG = i.nivelKit === 'jefe' || i.nivelKit === 'gerente'
    return s + (esJG ? config.bonoInstalacionJefeGerente : config.bonoInstalacionRP)
  }, 0)

  const totalBonos = bonoPerf + bonoRP + bonoExpress + bonoInstalacion
  const gananciaTotal = comisionVenta + totalBonos

  const sigEscPerf = config.bonoPerformance.filter(e => e.ventas > ventasConEsta).sort((a,b) => a.ventas - b.ventas)[0]
  const sigEscRP   = config.bonoRP.filter(e => e.rp > rpConEsta).sort((a,b) => a.rp - b.rp)[0]

  // ── Extras ────────────────────────────────────────────────────────────────
  const dispositivosNivel = config.dispositivos.filter(d => d.nivel === inst.nivelExtras || d.nivel === 'ambos')
  const nombresUnicos = dispositivosNivel.map(d => d.nombre).filter((n, i, arr) => arr.indexOf(n) === i)
  const getDisp = (nombre: string) =>
    config.dispositivos.find(d => d.nombre === nombre && (d.nivel === inst.nivelExtras || d.nivel === 'ambos'))
  const extraActivo = (dispId: string) => inst.extras.find(e => e.dispositivoId === dispId)

  // Modal de dispositivo
  const [modalDisp, setModalDisp] = useState<{ disp: DispositivoExtra; editando: boolean } | null>(null)
  const [modalCantIdx, setModalCantIdx] = useState(0)
  const [modalBonif, setModalBonif] = useState(false)

  const abrirModal = (nombre: string, editar = false) => {
    const disp = getDisp(nombre)
    if (!disp) return
    const activo = extraActivo(disp.id)
    setModalDisp({ disp, editando: editar })
    setModalCantIdx(activo?.cantidadIdx ?? 0)
    setModalBonif(activo?.bonificado ?? false)
  }

  const confirmarModal = () => {
    if (!modalDisp) return
    const { disp } = modalDisp
    setInst(i => {
      const sinEste = i.extras.filter(e => e.dispositivoId !== disp.id)
      return { ...i, extras: [...sinEste, { dispositivoId: disp.id, cantidadIdx: modalCantIdx, nivel: i.nivelExtras, bonificado: modalBonif }] }
    })
    setModalDisp(null)
  }

  const quitarExtra = (dispId: string) =>
    setInst(i => ({ ...i, extras: i.extras.filter(e => e.dispositivoId !== dispId) }))

  const toggleBonif = (dispId: string) =>
    setInst(i => ({ ...i, extras: i.extras.map(e => e.dispositivoId === dispId ? { ...e, bonificado: !e.bonificado } : e) }))

  // ── Mensajes ──────────────────────────────────────────────────────────────
  const msgCliente = () => {
    let t = `🛡️ *Sistema de Seguridad Verisure*\n\n`
    instalaciones.forEach((ins, idx) => {
      const c = calcs[idx]
      if (instalaciones.length > 1) t += `*Instalación #${idx + 1}*\n`
      t += `📦 Instalación: *${fmt(c.totalInsConIVA)}*${ins.usaPromo ? ' _(precio especial)_' : ''}\n`
      if (ins.conUpgrade && ins.nivelKit && !['jefe','gerente'].includes(ins.nivelKit)) t += `⬆️ Upgrade incluido\n`
      const pagos  = c.extrasData.filter(e => !e.bonificado && e.disp.precios[e.idx] > 0)
      const bonifs = c.extrasData.filter(e => e.bonificado)
      if (pagos.length) {
        t += `➕ Equipamiento adicional:\n`
        pagos.forEach(({ disp, idx: i }) => t += `   • ${disp.cantidades[i]}x ${disp.nombre}: *${fmt(iva(disp.precios[i], config.ivaPct))}*\n`)
      }
      if (bonifs.length) {
        t += `🎁 Incluido sin costo:\n`
        bonifs.forEach(({ disp, idx: i }) => t += `   • ${disp.cantidades[i]}x ${disp.nombre} ✓\n`)
      }
      if (idx < instalaciones.length - 1) t += '\n'
    })
    t += `\n─────────────────────\n`
    if (cuotas > 1) {
      const cuotaKit = Math.round(totalInsConIVA / cuotas)
      t += `💳 *En ${cuotas} cuotas de ${fmt(cuotaKit)}* _(instalación)_\n`
      t += `📅 *Durante ${cuotas} meses:* ${fmt(cuotaTotalConIVA + cuotaKit)}/mes\n`
      t += `   _(mensualidad + cuota de instalación)_\n\n`
      t += `📅 *Después:* *${fmt(cuotaTotalConIVA)}/mes*\n`
      t += `   _(solo mensualidad del servicio)_\n`
    } else {
      t += `📅 *Mensualidad del servicio:* *${fmt(cuotaTotalConIVA)}/mes*\n`
    }
    t += `─────────────────────\n`
    t += `\n✅ *Precios finales con IVA incluido*\n`
    t += `🔒 Monitoreo 24hs · Atención personalizada`
    return t
  }

  const msgInterno = () => {
    let t = `[VENTA VERISURE] ${nowStr()}\n`
    t += `Tipo: ${tipoVenta} | Instalaciones: ${instalaciones.length}\n`
    t += `${'─'.repeat(36)}\n`
    instalaciones.forEach((ins, idx) => {
      const c = calcs[idx]
      const promo = config.promos.find(p => p.id === ins.promoId)
      t += `\nINSTALACIÓN #${idx + 1}\n`
      t += `Kit: ${ins.usaPromo ? `PROMO ${promo?.label}` : ins.nivelKit ? NIVEL_LABEL[ins.nivelKit] : 'Sin kit'} ${fmt(c.kitSinIVA)} s/IVA > ${fmt(c.kitConIVA)} c/IVA\n`
      t += `Cuota base: ${fmt(config.cuotaBase)}/mes s/IVA > ${fmt(iva(config.cuotaBase, config.ivaPct))}/mes c/IVA\n`
      if (ins.conUpgrade && ins.nivelKit && !['jefe','gerente'].includes(ins.nivelKit)) {
        const up = ins.nivelKit === 'catalogo' ? config.upgrades.catalogo : ins.nivelKit === 'alto' ? config.upgrades.alto : config.upgrades.medioBajo
        t += `Upgrade: ${fmt(up)} s/IVA > ${fmt(iva(up, config.ivaPct))} c/IVA | +${fmt(config.upgrades.cuotaAdicional)}/mes\n`
      }
      if (c.extrasData.length) {
        t += `Extras:\n`
        c.extrasData.forEach(({ disp, idx: i, bonificado }) => {
          t += `  + ${disp.cantidades[i]}x ${disp.nombre} (${disp.nivel})`
          t += bonificado ? ` BONIF $0` : ` ${fmt(disp.precios[i])} s/IVA > ${fmt(iva(disp.precios[i], config.ivaPct))} c/IVA`
          if (disp.cuotas[i]) t += ` | cuota +${fmt(disp.cuotas[i])}/mes`
          t += '\n'
        })
      }
      t += `Comisión: kit ${fmt(c.comisionKit)} + extras ${fmt(c.comisionExtras)} = ${fmt(c.comisionTotal)}\n`
    })
    t += `\n${'─'.repeat(36)}\n`
    t += `SUBTOTAL s/IVA : ${fmt(totalInsSinIVA)}\n`
    t += `IVA 21%        : ${fmt(totalInsConIVA - totalInsSinIVA)}\n`
    t += `TOTAL c/IVA    : ${fmt(totalInsConIVA)}\n`
    t += `${'─'.repeat(36)}\n`
    t += `MENS. s/IVA    : ${fmt(cuotaTotalSinIVA)}/mes\n`
    t += `MENS. c/IVA    : ${fmt(cuotaTotalConIVA)}/mes\n`
    if (cuotas > 1) {
      const cuotaKit = Math.round(totalInsConIVA / cuotas)
      t += `${'─'.repeat(36)}\n`
      t += `Durante ${cuotas} meses : ${fmt(cuotaTotalConIVA + cuotaKit)}/mes\n`
      t += `  (mens ${fmt(cuotaTotalConIVA)} + cuota kit ${fmt(cuotaKit)})\n`
      t += `Luego          : ${fmt(cuotaTotalConIVA)}/mes\n`
    }
    t += `${'─'.repeat(36)}\n`
    t += `COMISIÓN VENTA : ${fmt(comisionVenta)}\n`
    if (bonoInstalacion > 0) t += `Bono instalac. : ${fmt(bonoInstalacion)}\n`
    t += `TOTAL ESTIMADO : ${fmt(gananciaTotal)}\n`
    return t
  }

  const copiarCliente = () => { navigator.clipboard.writeText(msgCliente()); setCopiedCliente(true); setTimeout(() => setCopiedCliente(false), 2500) }
  const copiarInterno = () => { navigator.clipboard.writeText(msgInterno()); setCopiedInterno(true); setTimeout(() => setCopiedInterno(false), 2500) }

  const agregarInst = () => {
    const nueva = makeInstBase(config.promos[0]?.id ?? '')
    setInstalaciones(prev => [...prev, nueva])
    setInstActiva(instalaciones.length)
  }
  const eliminarInst = (idx: number) => {
    setInstalaciones(prev => prev.filter((_, i) => i !== idx))
    setInstActiva(Math.max(0, idx - 1))
  }
  const reset = () => {
    setInstalaciones([makeInstBase(config.promos[0]?.id ?? '')])
    setInstActiva(0); setTipoVenta('RP'); setCuotas(12)
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[var(--surface-3)] rounded-2xl animate-pulse" />)}
    </div>
  )

  const promoActual = config.promos.find(p => p.id === inst.promoId)
  const esJG = inst.nivelKit === 'jefe' || inst.nivelKit === 'gerente'

  return (
    <div className="space-y-4 animate-fade-in pb-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Calculadora Verisure</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">Precio · Comisión · Bonos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-ghost text-xs gap-1"><RefreshCw size={13} /> Reset</button>
          {isAdmin && <button onClick={() => setShowConfig(!showConfig)} className="btn-ghost text-xs gap-1"><Settings size={13} /></button>}
        </div>
      </div>

      {/* Tipo venta + Cuotas */}
      {/* Tipo venta + Cuotas */}
      <div className="card space-y-3">
        <div>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">Tipo de venta</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTipoVenta('RP')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border ${tipoVenta === 'RP' ? 'border-[#E8001D] bg-[rgba(232,0,29,0.1)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}
              style={{ color: tipoVenta === 'RP' ? '#E8001D' : 'var(--text-secondary)' }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#E8001D' }} />
              Recurso Propio
            </button>
            <button onClick={() => setTipoVenta('RE')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border ${tipoVenta === 'RE' ? 'border-[#0a84ff] bg-[rgba(10,132,255,0.1)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}
              style={{ color: tipoVenta === 'RE' ? '#0a84ff' : 'var(--text-secondary)' }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#0a84ff' }} />
              Recurso Empresa
            </button>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Financiación instalación</p>
            <span className="text-sm font-bold text-[var(--text-primary)]">x{cuotas}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,6,9,12].map(n => (
              <button key={n} onClick={() => setCuotas(n)}
                className={`flex-1 min-w-[32px] py-1.5 rounded-lg text-xs font-semibold transition-all ${cuotas === n ? 'text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}
                style={cuotas === n ? { background: 'var(--brand)' } : {}}>
                x{n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs instalaciones */}
      <div className="flex gap-1.5 items-center">
        {instalaciones.map((ins, idx) => (
          <button key={ins.id} onClick={() => setInstActiva(idx)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all relative ${instActiva === idx ? 'bg-[var(--surface-3)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
            Inst. #{idx + 1}
            {instalaciones.length > 1 && instActiva === idx && (
              <span onClick={e => { e.stopPropagation(); eliminarInst(idx) }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--red-bg)]0 rounded-full text-white text-[9px] flex items-center justify-center leading-none">
                ✕
              </span>
            )}
          </button>
        ))}
        {instalaciones.length < 4 && (
          <button onClick={agregarInst} className="px-3 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-all">
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Promos */}
      <div className="card">
        <button className="w-full flex items-center justify-between" onClick={() => setShowPromos(!showPromos)}>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Promos del día</p>
          {showPromos ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
        </button>
        {showPromos && (
          <div className="mt-3 space-y-2">
            <button onClick={() => setInst(i => ({ ...i, usaPromo: false }))}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${!inst.usaPromo ? 'border-surface-900 bg-[var(--surface-3)] text-white' : 'border-[var(--border)]'}`}>
              <span className="text-sm font-medium">Sin promo — Kit estándar</span>
            </button>
            {config.promos.filter(p => p.activa).map(promo => (
              <button key={promo.id} onClick={() => setInst(i => ({ ...i, usaPromo: true, promoId: promo.id }))}
                className={`w-full flex items-start justify-between p-3 rounded-xl border transition-all text-left ${inst.usaPromo && inst.promoId === promo.id ? 'border-brand-600 bg-brand-50' : 'border-[var(--border)]'}`}>
                <div>
                  <p className={`text-sm font-semibold ${inst.usaPromo && inst.promoId === promo.id ? 'text-brand-700' : 'text-surface-800'}`}>{promo.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{promo.descripcion}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className={`text-sm font-bold ${inst.usaPromo && inst.promoId === promo.id ? 'text-brand-600' : 'text-[var(--text-primary)]'}`}>{fmt(promo.precio)}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{fmt(iva(promo.precio, config.ivaPct))} c/IVA</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {inst.usaPromo && promoActual && !showPromos && (
          <div className="mt-2 flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-brand-700">✅ {promoActual.label}</span>
            <div className="text-right">
              <p className="text-xs font-bold text-brand-600">{fmt(promoActual.precio)}</p>
              <p className="text-[10px] text-brand-400">{fmt(iva(promoActual.precio, config.ivaPct))} c/IVA</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de precios */}
      {!inst.usaPromo && (
        <div className="card">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-3 uppercase tracking-wide">Lista de precios</p>

          {/* Promociones — disponibles para RP y RE */}
          <p className="text-[10px] font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Promociones
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(['catalogo', 'alto', 'medio', 'bajo'] as NivelPrecio[]).filter(n => config.kits[n] !== undefined).map(nivel => (
              <button key={nivel} onClick={() => setInst(i => ({ ...i, nivelKit: nivel }))}
                className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all ${inst.nivelKit === nivel ? 'border-brand-600 bg-brand-50' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                <span className={`text-xs font-semibold ${inst.nivelKit === nivel ? 'text-brand-700' : 'text-[var(--text-primary)]'}`}>{NIVEL_LABEL[nivel]}</span>
                <span className={`text-[10px] font-medium mt-0.5 ${inst.nivelKit === nivel ? 'text-brand-600' : 'text-[var(--text-primary)]'}`}>{fmt(config.kits[nivel])}</span>
                <span className={`text-[9px] mt-0.5 ${inst.nivelKit === nivel ? 'text-brand-400' : 'text-[var(--text-tertiary)]'}`}>{fmt(iva(config.kits[nivel], config.ivaPct))} c/IVA</span>
              </button>
            ))}
          </div>

          {/* Precios especiales RE — solo visible cuando tipoVenta === 'RE' */}
          {tipoVenta === 'RE' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--blue)' }}>
                  Precios RE
                </p>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['jefe', 'gerente'] as NivelPrecio[]).filter(n => config.kits[n] !== undefined).map(nivel => (
                  <button key={nivel} onClick={() => setInst(i => ({ ...i, nivelKit: nivel }))}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all ${inst.nivelKit === nivel ? 'border-brand-600 bg-brand-50' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                    <span className={`text-xs font-semibold ${inst.nivelKit === nivel ? 'text-brand-700' : 'text-[var(--text-primary)]'}`}>{NIVEL_LABEL[nivel]}</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${inst.nivelKit === nivel ? 'text-brand-600' : 'text-[var(--text-primary)]'}`}>{fmt(config.kits[nivel])}</span>
                    <span className={`text-[9px] mt-0.5 ${inst.nivelKit === nivel ? 'text-brand-400' : 'text-[var(--text-tertiary)]'}`}>{fmt(iva(config.kits[nivel], config.ivaPct))} c/IVA</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Si seleccionó Jefe/Gerente pero cambia a RP — limpiar */}
          {tipoVenta === 'RP' && (inst.nivelKit === 'jefe' || inst.nivelKit === 'gerente') && (
            <p className="text-xs text-center mb-2" style={{ color: 'var(--brand-light)' }}>
              ⚠️ Precio Jefe/Gerente solo aplica para RE. Seleccioná otro precio.
            </p>
          )}

          {!inst.nivelKit && (
            <p className="text-xs text-center mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Seleccioná un precio para continuar
            </p>
          )}
          {inst.nivelKit && !esJG && (
            <button onClick={() => setInst(i => ({ ...i, conUpgrade: !i.conUpgrade }))}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${inst.conUpgrade ? 'border-brand-600 bg-brand-50' : 'border-[var(--border)]'}`}>
              <div>
                <p className={`text-sm font-medium ${inst.conUpgrade ? 'text-brand-700' : 'text-[var(--text-primary)]'}`}>⬆️ Con Upgrade</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  +{fmt(inst.nivelKit === 'catalogo' ? config.upgrades.catalogo : inst.nivelKit === 'alto' ? config.upgrades.alto : config.upgrades.medioBajo)} ins.
                  · +{fmt(config.upgrades.cuotaAdicional)}/mes <span className="text-[var(--text-secondary)]">s/IVA</span>
                </p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${inst.conUpgrade ? 'border-brand-600 bg-brand-600' : 'border-[var(--border-strong)]'}`}>
                {inst.conUpgrade && <Check size={12} className="text-white" />}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Extras */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Dispositivos extras</p>
            {inst.extras.length > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: 'var(--brand)' }}>
                {inst.extras.length}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(['alto', 'bajo'] as const).map(n => (
              <button key={n}
                onClick={() => setInst(i => ({ ...i, nivelExtras: n }))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={inst.nivelExtras === n
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                {n === 'alto' ? 'Alto' : 'Bajo'}
              </button>
            ))}
          </div>
        </div>

        {/* Extras ya agregados */}
        {inst.extras.length > 0 && (
          <div className="space-y-2 mb-3">
            {inst.extras.map(ex => {
              const disp = config.dispositivos.find(d => d.id === ex.dispositivoId)
              if (!disp) return null
              return (
                <div key={ex.dispositivoId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--brand-light)' }}>
                        x{disp.cantidades[ex.cantidadIdx]}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{disp.nombre}</span>
                      {ex.bonificado && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>🎁 Bonif</span>}
                    </div>
                    {!ex.bonificado ? (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {fmtPrecio(disp.precios[ex.cantidadIdx])} s/IVA
                        {disp.cuotas[ex.cantidadIdx] > 0 && ` · +${fmt(disp.cuotas[ex.cantidadIdx])}/mes`}
                      </p>
                    ) : (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--green)' }}>
                        $0 · cuota +{fmt(disp.cuotas[ex.cantidadIdx])}/mes
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => abrirModal(disp.nombre, true)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Editar
                    </button>
                    <button onClick={() => quitarExtra(disp.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-[var(--text-tertiary)] hover:text-[var(--brand-light)]"
                      style={{ background: 'var(--surface-3)' }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lista para agregar */}
        <div className="space-y-1">
          {nombresUnicos.map(nombre => {
            const disp = getDisp(nombre)
            if (!disp) return null
            const yaAgregado = inst.extras.some(e => e.dispositivoId === disp.id)
            if (yaAgregado) return null

            return (
              <button key={disp.id}
                onClick={() => abrirModal(nombre)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {/* Imagen miniatura */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--surface-3)' }}>
                  {DEVICE_IMAGES[disp.nombre]
                    ? <img src={DEVICE_IMAGES[disp.nombre]} alt={disp.nombre} className="w-9 h-9 object-contain" loading="lazy" />
                    : <span className="text-lg">📦</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{disp.nombre}</span>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{disp.precios[0] === -1 ? 'Precio a consultar' : `desde ${fmt(disp.precios[0])} s/IVA`}</p>
                </div>
                <span className="text-xl text-[var(--text-tertiary)] leading-none">+</span>
              </button>
            )
          })}
        </div>

        {inst.extras.length === nombresUnicos.length && inst.extras.length > 0 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">Todos los dispositivos agregados</p>
        )}
      </div>

      {/* Express (solo RE) */}
      {tipoVenta === 'RE' && (
        <button onClick={() => setInst(i => ({ ...i, esExpress: !i.esExpress }))}
          className={`card w-full flex items-center justify-between transition-all ${inst.esExpress ? 'border-brand-300 bg-brand-50' : ''}`}>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">⚡ Venta Express</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Instalación el mismo día — suma al bono Express</p>
          </div>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${inst.esExpress ? 'border-brand-600 bg-brand-600' : 'border-[var(--border-strong)]'}`}>
            {inst.esExpress && <Check size={12} className="text-white" />}
          </div>
        </button>
      )}

      {/* Resultado */}
      <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
        <div className="bg-surface-900 px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[var(--text-tertiary)] text-xs mb-1">Instalación{instalaciones.length > 1 ? ' total' : ''}</p>
              <p className="text-white text-2xl font-bold">{fmt(totalInsSinIVA)}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">{fmt(totalInsConIVA)} c/IVA</p>
            </div>
            <div className="text-right">
              <p className="text-[var(--text-tertiary)] text-xs mb-1">Mensualidad</p>
              <p className="text-white text-lg font-semibold">{fmt(cuotaTotalSinIVA)}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">{fmt(cuotaTotalConIVA)} c/IVA</p>
            </div>
          </div>
          {cuotas > 1 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
              <p className="text-[var(--text-secondary)] text-xs text-center font-medium">
                Financiación instalación: {cuotas}x de {fmt(Math.round(totalInsConIVA / cuotas))} c/IVA
              </p>
              <p className="text-[var(--text-secondary)] text-[10px] text-center">
                ≠ mensualidad del servicio · son conceptos separados
              </p>
            </div>
          )}
        </div>

        <div className="bg-[var(--green-bg)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--green)] text-xs font-medium">Comisión esta venta</p>
              <p className="text-green-500 text-[10px] mt-0.5">
                Kit: {fmt(calcs.reduce((s,c)=>s+c.comisionKit,0))} · Extras: {fmt(calcs.reduce((s,c)=>s+c.comisionExtras,0))}
              </p>
            </div>
            <p className="text-[var(--green)] text-xl font-bold">{fmt(comisionVenta)}</p>
          </div>
        </div>

        <div className="bg-[var(--surface)] px-4 py-3 space-y-1.5">
          {calcs.map((c, idx) => (
            <div key={idx}>
              {instalaciones.length > 1 && <p className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wide mt-1">Inst. #{idx+1}</p>}
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{instalaciones[idx].usaPromo ? `Promo` : instalaciones[idx].nivelKit ? NIVEL_LABEL[instalaciones[idx].nivelKit!] : '—'}{instalaciones[idx].conUpgrade ? ' + Upg' : ''}</span>
                <span>{fmt(c.kitSinIVA)}</span>
              </div>
              {c.extrasData.map(({ disp, idx: i, bonificado }) => (
                <div key={disp.id} className="flex justify-between text-xs text-[var(--text-tertiary)]">
                  <span>{disp.cantidades[i]}x {disp.nombre}{bonificado ? ' 🎁' : ''}</span>
                  <span>{bonificado ? '$0' : fmt(disp.precios[i])}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-between text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--border)]">
            <span>Mensualidad del servicio</span><span>{fmt(cuotaTotalSinIVA)}/mes s/IVA</span>
          </div>
        </div>
      </div>

      {/* Panel bonos */}
      <div className="card">
        <button className="w-full flex items-center justify-between" onClick={() => setShowBonos(!showBonos)}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--text-secondary)]" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Panel de bonos del mes</p>
          </div>
          {showBonos ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
        </button>
        {showBonos && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[['Ventas mes', ventasMes, setVentasMes], ['RP mes', rpMes, setRpMes], ['Express mes', expressMes, setExpressMes]].map(([label, val, set]) => (
                <div key={label as string}>
                  <label className="label">{label as string}</label>
                  <input type="number" min="0" value={val as number}
                    onChange={e => (set as (n:number)=>void)(Number(e.target.value))}
                    className="input text-sm py-1.5 text-center" />
                </div>
              ))}
            </div>

            {/* Bono performance */}
            <div className={`rounded-xl p-3 ${bonoPerf > bonoPerfAntes ? 'bg-[var(--green-bg)] border border-green-200' : 'bg-[var(--surface-2)]'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">🎯 Bono Performance</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{ventasConEsta} ventas con esta operación
                    {bonoPerf > bonoPerfAntes && <span className="text-[var(--green)] font-semibold"> · ¡Subís escalón!</span>}
                  </p>
                  {sigEscPerf && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Faltan {sigEscPerf.ventas - ventasConEsta} para {fmt(sigEscPerf.monto)}</p>}
                </div>
                <p className={`text-lg font-bold ${bonoPerf > 0 ? 'text-[var(--green)]' : 'text-[var(--text-tertiary)]'}`}>{fmt(bonoPerf)}</p>
              </div>
            </div>

            {/* Bono RP */}
            <div className={`rounded-xl p-3 ${bonoRP > bonoRPAntes ? 'bg-[var(--green-bg)] border border-green-200' : 'bg-[var(--surface-2)]'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">🤝 Bono RP</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{rpConEsta} RP con esta operación
                    {bonoRP > bonoRPAntes && <span className="text-[var(--green)] font-semibold"> · ¡Subís escalón!</span>}
                  </p>
                  {sigEscRP && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Faltan {sigEscRP.rp - rpConEsta} RP para {fmt(sigEscRP.monto)}</p>}
                </div>
                <p className={`text-lg font-bold ${bonoRP > 0 ? 'text-[var(--green)]' : 'text-[var(--text-tertiary)]'}`}>{fmt(bonoRP)}</p>
              </div>
            </div>

            {/* Bono express */}
            {(tipoVenta === 'RE' || expressMes > 0) && (
              <div className="rounded-xl p-3 bg-[var(--surface-2)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">⚡ Bono Express</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{expressConEsta} express este mes</p>
                  </div>
                  <p className={`text-lg font-bold ${bonoExpress > 0 ? 'text-[var(--green)]' : 'text-[var(--text-tertiary)]'}`}>{fmt(bonoExpress)}</p>
                </div>
              </div>
            )}

            {/* Bono instalación */}
            {bonoInstalacion > 0 && (
              <div className="rounded-xl p-3 bg-[var(--green-bg)] border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">🔧 Bono Instalación</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {instalaciones.map((ins, i) => `#${i+1}: ${fmt((ins.nivelKit === 'jefe' || ins.nivelKit === 'gerente') ? config.bonoInstalacionJefeGerente : config.bonoInstalacionRP)}`).join(' · ')}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[var(--green)]">{fmt(bonoInstalacion)}</p>
                </div>
              </div>
            )}

            {/* Total estimado */}
            <div className="bg-surface-900 rounded-xl px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[var(--text-secondary)] text-xs">Comisión + bonos estimados</p>
                  <p className="text-[var(--text-tertiary)] text-[10px] mt-0.5">{fmt(comisionVenta)} + {fmt(totalBonos)} bonos</p>
                </div>
                <p className="text-white text-xl font-bold">{fmt(gananciaTotal)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      <div className="card">
        <button className="w-full flex items-center justify-between" onClick={() => setShowSugs(!showSugs)}>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">💡 Sugerencias</p>
          {showSugs ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
        </button>
        {showSugs && (
          <div className="mt-3 space-y-2">
            {/* Upsell */}
            {!inst.usaPromo && inst.nivelKit && inst.nivelKit !== 'catalogo' && (() => {
              const idx = NIVELES_ORDEN.indexOf(inst.nivelKit!)
              const sup = idx > 0 ? NIVELES_ORDEN[idx - 1] : null
              if (!sup) return null
              const difPrecio = iva(config.kits[sup], config.ivaPct) - iva(config.kits[inst.nivelKit!], config.ivaPct)
              const comSup = config.comisiones[`${sup}_${tipoVenta}` as keyof typeof config.comisiones] ?? 0
              const comAct = config.comisiones[`${inst.nivelKit!}_${tipoVenta}` as keyof typeof config.comisiones] ?? 0
              return (
                <div className="bg-[var(--amber-bg)] border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-[var(--amber)]">🔼 Upsell a {NIVEL_LABEL[sup]}</p>
                  <p className="text-xs text-[var(--amber)] mt-1">
                    Cliente paga <strong>{fmt(difPrecio)}</strong> más c/IVA
                    {comSup - comAct > 0 && <> · Tu comisión sube <strong>{fmt(comSup - comAct)}</strong></>}
                  </p>
                </div>
              )
            })()}

            {sigEscPerf && (
              <div className="bg-[var(--blue-bg)] border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-[var(--blue)]">🎯 Próximo bono Performance</p>
                <p className="text-xs text-[var(--blue)] mt-1">
                  Faltan <strong>{sigEscPerf.ventas - ventasConEsta} venta{sigEscPerf.ventas - ventasConEsta !== 1 ? 's' : ''}</strong> para el bono de <strong>{fmt(sigEscPerf.monto)}</strong>
                </p>
              </div>
            )}

            {sigEscRP && tipoVenta === 'RP' && (
              <div className="bg-[var(--blue-bg)] border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-[var(--blue)]">🤝 Próximo bono RP</p>
                <p className="text-xs text-[var(--blue)] mt-1">
                  Faltan <strong>{sigEscRP.rp - rpConEsta} RP</strong> para el bono de <strong>{fmt(sigEscRP.monto)}</strong>
                </p>
              </div>
            )}

            {!inst.conUpgrade && !inst.usaPromo && !esJG && (() => {
              const up = inst.nivelKit === 'catalogo' ? config.upgrades.catalogo : inst.nivelKit === 'alto' ? config.upgrades.alto : config.upgrades.medioBajo
              return (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">⬆️ Agregar Upgrade</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Cliente paga <strong>{fmt(iva(up, config.ivaPct))}</strong> más + <strong>{fmt(iva(config.upgrades.cuotaAdicional, config.ivaPct))}</strong>/mes. Tu comisión no cambia.
                  </p>
                </div>
              )
            })()}

            {tipoVenta === 'RE' && !inst.esExpress && (() => {
              const sig = config.bonoExpress.filter(e => e.express > expressConEsta).sort((a,b) => a.express - b.express)[0]
              return sig ? (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">⚡ Activar Express</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Si instalás hoy, faltan <strong>{sig.express - expressConEsta}</strong> express para {fmt(sig.monto)}.
                  </p>
                </div>
              ) : null
            })()}

            {!sigEscPerf && !sigEscRP && inst.conUpgrade && inst.usaPromo && (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-2">Todo optimizado 🎯</p>
            )}
          </div>
        )}
      </div>

      {/* Botones mensaje */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={copiarCliente} className="btn-primary py-3 text-sm gap-2 flex items-center justify-center">
          {copiedCliente ? <><Check size={15}/> Copiado</> : <><Copy size={15}/> Para cliente</>}
        </button>
        <button onClick={copiarInterno}
          className={`py-3 text-sm gap-2 rounded-xl font-medium border flex items-center justify-center transition-all ${copiedInterno ? 'bg-green-100 text-[var(--green)] border-green-200' : 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--surface-3)]'}`}>
          {copiedInterno ? <><Check size={15}/> Copiado</> : <><Copy size={15}/> Para equipo</>}
        </button>
      </div>

      {/* Modal dispositivo */}
      {modalDisp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalDisp(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              {DEVICE_IMAGES[modalDisp.disp.nombre] && (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--surface-3)' }}>
                  <img
                    src={DEVICE_IMAGES[modalDisp.disp.nombre]}
                    alt={modalDisp.disp.nombre}
                    className="w-14 h-14 object-contain" loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{modalDisp.disp.nombre}</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  Nivel {inst.nivelExtras === 'alto' ? 'Alto' : 'Bajo'}
                </p>
              </div>
              <button onClick={() => setModalDisp(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] flex-shrink-0"
                style={{ background: 'var(--surface-2)' }}>✕</button>
            </div>

            {/* Selector de pack */}
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Pack</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {modalDisp.disp.cantidades.map((cant, idx) => {
                const isSelected = modalCantIdx === idx
                const precioSinIVA = modalDisp.disp.precios[idx]
                const cuota = modalDisp.disp.cuotas[idx]
                return (
                  <button key={cant} onClick={() => setModalCantIdx(idx)}
                    className="flex flex-col items-center py-2.5 px-1 rounded-xl transition-all"
                    style={isSelected
                      ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                      : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      x{cant}
                    </span>
                    <span className={`text-[9px] mt-0.5 font-medium ${isSelected ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                      {precioSinIVA === -1 ? 'Consultar' : fmt(precioSinIVA)}
                    </span>
                    {cuota > 0 && (
                      <span className={`text-[8px] mt-0.5 ${isSelected ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
                        +{fmt(cuota)}/m
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Desglose del pack seleccionado */}
            <div className="rounded-xl px-3 py-2.5 mb-4 space-y-1"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Precio s/IVA</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {modalBonif ? '$0 🎁' : fmtPrecio(modalDisp.disp.precios[modalCantIdx])}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">Precio c/IVA</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {modalBonif ? '$0 🎁' : fmtPrecio(modalDisp.disp.precios[modalCantIdx], true, config.ivaPct)}
                </span>
              </div>
              {modalDisp.disp.cuotas[modalCantIdx] > 0 && (
                <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-[var(--text-tertiary)]">+Mensualidad</span>
                  <span style={{ color: 'var(--amber)' }} className="font-semibold">
                    +{fmt(iva(modalDisp.disp.cuotas[modalCantIdx], config.ivaPct))}/mes c/IVA
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-[var(--text-tertiary)]">Tu comisión</span>
                <span style={{ color: 'var(--green)' }} className="font-semibold">
                  {fmt(modalDisp.disp.comisiones[modalCantIdx])}
                </span>
              </div>
            </div>

            {/* Bonificado toggle */}
            <button onClick={() => setModalBonif(!modalBonif)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-4 transition-all"
              style={modalBonif
                ? { background: 'var(--green-bg)', border: '1px solid var(--green)' }
                : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: modalBonif ? 'var(--green)' : 'var(--text-primary)' }}>
                  🎁 Bonificado
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                  Precio $0 — la mensualidad sigue sumando
                </p>
              </div>
              <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                style={modalBonif
                  ? { borderColor: 'var(--green)', background: 'var(--green)' }
                  : { borderColor: 'var(--border-strong)' }}>
                {modalBonif && <Check size={12} className="text-white" />}
              </div>
            </button>

            {/* Acciones */}
            <div className="flex gap-2">
              <button onClick={confirmarModal}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: 'var(--brand)' }}>
                {modalDisp.editando ? 'Guardar cambios' : 'Agregar'}
              </button>
              {modalDisp.editando && (
                <button onClick={() => { quitarExtra(modalDisp.disp.id); setModalDisp(null) }}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--red-bg)', color: 'var(--brand-light)', border: '1px solid rgba(232,0,29,0.2)' }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfig && <ConfigPanel config={config} workspaceId={workspaceId} onSave={c => { setConfig(c); setShowConfig(false) }} />}
    </div>
  )
}
