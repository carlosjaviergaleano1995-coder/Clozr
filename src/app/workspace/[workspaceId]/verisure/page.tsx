'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Copy, RefreshCw, Settings, Check } from 'lucide-react'
import { getConfigVerisure, saveConfigVerisure } from '@/lib/services'
import { CONFIG_VERISURE_DEFAULT } from '@/lib/verisure-defaults'
import type { ConfigVerisure, NivelPrecio, TipoVenta, DispositivoExtra } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────
const iva = (n: number, pct = 21) => Math.round(n * (1 + pct / 100))
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type NivelKit = Exclude<NivelPrecio, 'jefe' | 'gerente'>
const NIVELES_KIT: NivelKit[] = ['catalogo', 'alto', 'medio', 'bajo']
const NIVEL_LABEL: Record<NivelPrecio, string> = {
  catalogo: 'Catálogo', alto: 'Alto', medio: 'Medio',
  bajo: 'Bajo', jefe: 'Jefe', gerente: 'Gerente',
}

interface ExtraSeleccionado {
  dispositivoId: string
  cantidadIdx: number   // índice en el array cantidades[]
  nivel: 'alto' | 'bajo'
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function VerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [config, setConfig] = useState<ConfigVerisure>(CONFIG_VERISURE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [showPromos, setShowPromos] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [copied, setCopied] = useState(false)

  // Calculadora
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>('RP')
  const [nivelKit, setNivelKit] = useState<NivelPrecio>('catalogo')
  const [usaPromo, setUsaPromo] = useState(false)
  const [promoId, setPromoId] = useState('')
  const [conUpgrade, setConUpgrade] = useState(false)
  const [cuotas, setCuotas] = useState(12)
  const [extras, setExtras] = useState<ExtraSeleccionado[]>([])
  const [nivelExtras, setNivelExtras] = useState<'alto' | 'bajo'>('alto')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const c = await getConfigVerisure(workspaceId)
      setConfig(c)
      if (c.promos.length > 0) setPromoId(c.promos[0].id)
    } finally { setLoading(false) }
  }

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const promoActual = config.promos.find(p => p.id === promoId)
  const esJefeGerente = nivelKit === 'jefe' || nivelKit === 'gerente'

  // Precio instalación (sin IVA)
  const precioInsSinIVA = usaPromo && promoActual
    ? promoActual.precio
    : config.kits[nivelKit] + (conUpgrade && !esJefeGerente
        ? (nivelKit === 'catalogo' ? config.upgrades.catalogo
          : nivelKit === 'alto'    ? config.upgrades.alto
          : config.upgrades.medioBajo)
        : 0)

  // Precio instalación con IVA
  const precioInsConIVA = iva(precioInsSinIVA, config.ivaPct)

  // Cuota base sin IVA
  const cuotaBaseSinIVA = config.cuotaBase + (conUpgrade && !esJefeGerente ? config.cuotaUpgrade : 0)

  // Extras
  const extrasData = extras.map(e => {
    const disp = config.dispositivos.find(d => d.id === e.dispositivoId)
    if (!disp) return null
    return { disp, idx: e.cantidadIdx }
  }).filter(Boolean) as { disp: DispositivoExtra; idx: number }[]

  const extraPrecioSinIVA = extrasData.reduce((acc, { disp, idx }) => acc + disp.precios[idx], 0)
  const extraCuotaSinIVA  = extrasData.reduce((acc, { disp, idx }) => acc + disp.cuotas[idx], 0)
  const extraComision     = extrasData.reduce((acc, { disp, idx }) => acc + disp.comisiones[idx], 0)

  // Totales con IVA
  const totalInsConIVA  = iva(precioInsSinIVA + extraPrecioSinIVA, config.ivaPct)
  const cuotaTotalConIVA = iva(cuotaBaseSinIVA + extraCuotaSinIVA, config.ivaPct)
  const cuotaClienteConIVA = Math.round(totalInsConIVA / cuotas) // cuota de instalación dividida

  // Comisión kit
  const comisionKit = (() => {
    if (usaPromo) return 0
    if (esJefeGerente) return 0
    const key = `${nivelKit}_${tipoVenta}` as keyof typeof config.comisiones
    return config.comisiones[key] ?? 0
  })()

  const comisionTotal = comisionKit + extraComision

  // Cuota mensual que paga el cliente
  const cuotaMensualCliente = cuotaTotalConIVA

  // ── Extras handlers ────────────────────────────────────────────────────────
  const dispositivosNivel = config.dispositivos.filter(d =>
    d.nivel === nivelExtras || d.nivel === 'ambos'
  )
  // Agrupar por nombre (eliminar duplicados alto/bajo ya filtrados)
  const nombresUnicos = dispositivosNivel.map(d => d.nombre).filter((n, i, arr) => arr.indexOf(n) === i)

  const toggleExtra = (dispId: string, cantidadIdx: number) => {
    setExtras(prev => {
      const existe = prev.find(e => e.dispositivoId === dispId)
      if (existe) {
        if (existe.cantidadIdx === cantidadIdx) {
          return prev.filter(e => e.dispositivoId !== dispId)
        }
        return prev.map(e => e.dispositivoId === dispId ? { ...e, cantidadIdx } : e)
      }
      return [...prev, { dispositivoId: dispId, cantidadIdx, nivel: nivelExtras }]
    })
  }

  const getDispByNombreNivel = (nombre: string) =>
    config.dispositivos.find(d => d.nombre === nombre && (d.nivel === nivelExtras || d.nivel === 'ambos'))

  const extraActivo = (dispId: string) => extras.find(e => e.dispositivoId === dispId)

  // ── Mensaje WhatsApp ───────────────────────────────────────────────────────
  const generarMensaje = () => {
    const nivelLabel = NIVEL_LABEL[nivelKit]
    let msg = `🔒 *Presupuesto Verisure*\n\n`

    if (usaPromo && promoActual) {
      msg += `📦 *Promo ${promoActual.label}*\n`
      msg += `   ${promoActual.descripcion}\n`
    } else {
      msg += `📦 *Kit ${nivelLabel}*${conUpgrade ? ' + Upgrade' : ''}\n`
    }

    if (extrasData.length > 0) {
      msg += `\n➕ *Extras:*\n`
      extrasData.forEach(({ disp, idx }) => {
        const cant = disp.cantidades[idx]
        msg += `   • ${cant}x ${disp.nombre} — ${fmt(iva(disp.precios[idx], config.ivaPct))}\n`
      })
    }

    msg += `\n💰 *Instalación: ${fmt(totalInsConIVA)}*`
    msg += `\n📅 *Cuota mensual: ${fmt(cuotaMensualCliente)}*`

    if (cuotas > 1) {
      msg += `\n\n📊 En ${cuotas} cuotas: ${fmt(cuotaClienteConIVA)} por cuota (instalación)`
    }

    msg += `\n\n✅ Monitoreo 24/7 · Instalación incluida · Sin permanencia`
    return msg
  }

  const copiar = () => {
    navigator.clipboard.writeText(generarMensaje())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setNivelKit('catalogo')
    setTipoVenta('RP')
    setUsaPromo(false)
    setConUpgrade(false)
    setCuotas(12)
    setExtras([])
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface-200 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Calculadora Verisure</h2>
          <p className="text-surface-500 text-xs mt-0.5">Calculá precio, cuota y comisión</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-ghost text-xs gap-1">
            <RefreshCw size={13} /> Reset
          </button>
          <button onClick={() => setShowConfig(!showConfig)} className="btn-ghost text-xs gap-1">
            <Settings size={13} /> Config
          </button>
        </div>
      </div>

      {/* Tipo de venta */}
      <div className="card">
        <p className="text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wide">Tipo de venta</p>
        <div className="grid grid-cols-2 gap-2">
          {(['RP', 'RE'] as TipoVenta[]).map(t => (
            <button key={t} onClick={() => setTipoVenta(t)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tipoVenta === t ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}>
              {t === 'RP' ? '🤝 RP — Recurso Propio' : '🏢 RE — Recurso Empresa'}
            </button>
          ))}
        </div>
      </div>

      {/* Promos del día */}
      <div className="card">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowPromos(!showPromos)}
        >
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Promos del día</p>
          {showPromos ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
        </button>

        {showPromos && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setUsaPromo(false)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                !usaPromo ? 'border-surface-900 bg-surface-900 text-white' : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <span className="text-sm font-medium">Sin promo — Kit estándar</span>
            </button>
            {config.promos.filter(p => p.activa).map(promo => (
              <button key={promo.id}
                onClick={() => { setUsaPromo(true); setPromoId(promo.id) }}
                className={`w-full flex items-start justify-between p-3 rounded-xl border transition-all text-left ${
                  usaPromo && promoId === promo.id
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${usaPromo && promoId === promo.id ? 'text-brand-700' : 'text-surface-800'}`}>
                    {promo.label}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">{promo.descripcion}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className={`text-sm font-bold ${usaPromo && promoId === promo.id ? 'text-brand-600' : 'text-surface-700'}`}>
                    {fmt(promo.precio)}
                  </p>
                  <p className={`text-[10px] ${usaPromo && promoId === promo.id ? 'text-brand-400' : 'text-surface-400'}`}>
                    {fmt(iva(promo.precio, config.ivaPct))} c/IVA
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {usaPromo && promoActual && !showPromos && (
          <div className="mt-2 flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-brand-700">✅ Promo: {promoActual.label}</span>
            <div className="text-right">
              <p className="text-xs font-bold text-brand-600">{fmt(promoActual.precio)}</p>
              <p className="text-[10px] text-brand-400">{fmt(iva(promoActual.precio, config.ivaPct))} c/IVA</p>
            </div>
          </div>
        )}
      </div>

      {/* Nivel del kit — solo si no hay promo */}
      {!usaPromo && (
        <div className="card">
          <p className="text-xs font-semibold text-surface-500 mb-3 uppercase tracking-wide">Nivel del kit</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(Object.keys(config.kits) as NivelPrecio[]).map(nivel => (
              <button key={nivel} onClick={() => setNivelKit(nivel)}
                className={`flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all ${
                  nivelKit === nivel
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300 bg-white'
                }`}
              >
                <span className={`text-xs font-semibold ${nivelKit === nivel ? 'text-brand-700' : 'text-surface-700'}`}>
                  {NIVEL_LABEL[nivel]}
                </span>
                <span className={`text-[10px] font-medium mt-0.5 ${nivelKit === nivel ? 'text-brand-600' : 'text-surface-700'}`}>
                  {fmt(config.kits[nivel])}
                </span>
                <span className={`text-[9px] mt-0.5 ${nivelKit === nivel ? 'text-brand-400' : 'text-surface-400'}`}>
                  {fmt(iva(config.kits[nivel], config.ivaPct))} c/IVA
                </span>
              </button>
            ))}
          </div>

          {/* Upgrade */}
          {!esJefeGerente && (
            <button
              onClick={() => setConUpgrade(!conUpgrade)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                conUpgrade ? 'border-brand-600 bg-brand-50' : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${conUpgrade ? 'text-brand-700' : 'text-surface-700'}`}>
                  ⬆️ Con Upgrade
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  +{fmt(
                    nivelKit === 'catalogo' ? config.upgrades.catalogo
                    : nivelKit === 'alto'   ? config.upgrades.alto
                    : config.upgrades.medioBajo
                  )} instalación · +{fmt(config.upgrades.cuotaAdicional)}/mes
                  <span className="text-surface-300"> (sin IVA)</span>
                </p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                conUpgrade ? 'border-brand-600 bg-brand-600' : 'border-surface-300'
              }`}>
                {conUpgrade && <Check size={12} className="text-white" />}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Cuotas */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Cuotas sin interés</p>
          <span className="text-sm font-bold text-surface-900">{cuotas}x</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[1,2,3,4,6,9,12].map(n => (
            <button key={n} onClick={() => setCuotas(n)}
              className={`flex-1 min-w-[36px] py-2 rounded-xl text-sm font-semibold transition-all ${
                cuotas === n ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}>
              {n}
            </button>
          ))}
        </div>
        {cuotas > 1 && (
          <p className="text-xs text-surface-400 mt-2 text-center">
            Cuota instalación: {fmt(Math.round(totalInsConIVA / cuotas))} × {cuotas}
          </p>
        )}
      </div>

      {/* Dispositivos extras */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Dispositivos extras</p>
          <div className="flex gap-1">
            {(['alto', 'bajo'] as const).map(n => (
              <button key={n} onClick={() => setNivelExtras(n)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  nivelExtras === n ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-500'
                }`}>
                {n === 'alto' ? 'Alto' : 'Bajo'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {nombresUnicos.map(nombre => {
            const disp = getDispByNombreNivel(nombre)
            if (!disp) return null
            const activo = extraActivo(disp.id)
            return (
              <div key={disp.id} className={`rounded-xl border transition-all ${
                activo ? 'border-brand-200 bg-brand-50' : 'border-surface-200'
              }`}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className={`text-sm font-medium ${activo ? 'text-brand-800' : 'text-surface-800'}`}>
                      {disp.nombre}
                    </p>
                    {activo ? (
                      <div className="mt-1 space-y-0.5">
                        <div className="flex gap-3">
                          <p className="text-xs font-semibold text-brand-700">
                            {fmt(disp.precios[activo.cantidadIdx])}
                            <span className="font-normal text-brand-400"> sin IVA</span>
                          </p>
                          <p className="text-xs text-brand-500">
                            {fmt(iva(disp.precios[activo.cantidadIdx], config.ivaPct))}
                            <span className="text-brand-400"> c/IVA</span>
                          </p>
                        </div>
                        {disp.cuotas[activo.cantidadIdx] > 0 && (
                          <p className="text-xs text-brand-500">
                            +{fmt(iva(disp.cuotas[activo.cantidadIdx], config.ivaPct))}
                            <span className="text-brand-400">/mes c/IVA</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-surface-400 mt-0.5">
                        desde {fmt(disp.precios[0])} sin IVA
                      </p>
                    )}
                  </div>
                  {/* Selector cantidad */}
                  <div className="flex gap-1 flex-shrink-0">
                    {disp.cantidades.map((cant, idx) => (
                      <button key={cant}
                        onClick={() => toggleExtra(disp.id, idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          activo?.cantidadIdx === idx
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}>
                        {cant}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {extras.length === 0 && (
          <p className="text-xs text-surface-400 text-center py-2">
            Tocá una cantidad para agregar un dispositivo
          </p>
        )}
      </div>

      {/* Resultado */}
      <div className="rounded-2xl overflow-hidden border border-surface-200">
        {/* Precio cliente */}
        <div className="bg-surface-900 px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-xs mb-1">Instalación</p>
              <p className="text-white text-2xl font-bold">{fmt(precioInsSinIVA + extraPrecioSinIVA)}</p>
              <p className="text-surface-500 text-xs mt-0.5">{fmt(totalInsConIVA)} con IVA</p>
            </div>
            <div className="text-right">
              <p className="text-surface-400 text-xs mb-1">Cuota mensual</p>
              <p className="text-white text-lg font-semibold">{fmt(cuotaBaseSinIVA + extraCuotaSinIVA)}</p>
              <p className="text-surface-500 text-xs mt-0.5">{fmt(cuotaMensualCliente)} con IVA</p>
            </div>
          </div>
          {cuotas > 1 && (
            <div className="mt-3 pt-3 border-t border-surface-700">
              <p className="text-surface-300 text-xs text-center">
                En {cuotas} cuotas de {fmt(Math.round((precioInsSinIVA + extraPrecioSinIVA) / cuotas))} · sin interés · sin IVA
              </p>
              <p className="text-surface-500 text-[10px] text-center mt-0.5">
                {fmt(Math.round(totalInsConIVA / cuotas))} con IVA
              </p>
            </div>
          )}
        </div>

        {/* Comisión vendedor */}
        <div className="bg-green-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-xs font-medium">Tu comisión</p>
              {usaPromo && <p className="text-green-500 text-[10px] mt-0.5">Kit: $0 (promo) + extras</p>}
              {!usaPromo && comisionKit > 0 && (
                <p className="text-green-500 text-[10px] mt-0.5">
                  Kit {NIVEL_LABEL[nivelKit]} {tipoVenta}: {fmt(comisionKit)}
                  {extraComision > 0 ? ` + extras: ${fmt(extraComision)}` : ''}
                </p>
              )}
            </div>
            <p className="text-green-700 text-xl font-bold">{fmt(comisionTotal)}</p>
          </div>
        </div>

        {/* Desglose */}
        <div className="bg-white px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs text-surface-500">
            <span>Kit {usaPromo ? `Promo ${promoActual?.label}` : NIVEL_LABEL[nivelKit]}{conUpgrade && !usaPromo ? ' + Upgrade' : ''}</span>
            <span>{fmt(iva(precioInsSinIVA, config.ivaPct))}</span>
          </div>
          {extrasData.map(({ disp, idx }) => (
            <div key={disp.id} className="flex justify-between text-xs text-surface-500">
              <span>{disp.cantidades[idx]}x {disp.nombre}</span>
              <span>{fmt(iva(disp.precios[idx], config.ivaPct))}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs text-surface-400 pt-1 border-t border-surface-100">
            <span>Cuota base</span>
            <span>{fmt(iva(config.cuotaBase, config.ivaPct))}/mes</span>
          </div>
          {extrasData.map(({ disp, idx }) => disp.cuotas[idx] > 0 && (
            <div key={`cuota_${disp.id}`} className="flex justify-between text-xs text-surface-400">
              <span>+ {disp.cantidades[idx]}x {disp.nombre}</span>
              <span>+{fmt(iva(disp.cuotas[idx], config.ivaPct))}/mes</span>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <button onClick={copiar}
        className="w-full btn-primary py-3 text-sm gap-2">
        {copied ? <><Check size={16} /> ¡Copiado!</> : <><Copy size={16} /> Copiar mensaje WhatsApp</>}
      </button>

      {/* Config de precios (editable) */}
      {showConfig && (
        <ConfigPanel config={config} workspaceId={workspaceId} onSave={c => { setConfig(c); setShowConfig(false) }} />
      )}
    </div>
  )
}

// ── Panel de configuración ────────────────────────────────────────────────────
function ConfigPanel({ config, workspaceId, onSave }: {
  config: ConfigVerisure
  workspaceId: string
  onSave: (c: ConfigVerisure) => void
}) {
  const [draft, setDraft] = useState<ConfigVerisure>(JSON.parse(JSON.stringify(config)))
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'kits' | 'promos' | 'bonos'>('kits')

  const updateKit = (k: NivelPrecio, val: number) =>
    setDraft(d => ({ ...d, kits: { ...d.kits, [k]: val } }))

  const updateComision = (k: keyof ConfigVerisure['comisiones'], val: number) =>
    setDraft(d => ({ ...d, comisiones: { ...d.comisiones, [k]: val } }))

  const updatePromo = (id: string, field: string, val: any) =>
    setDraft(d => ({ ...d, promos: d.promos.map(p => p.id === id ? { ...p, [field]: val } : p) }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfigVerisure(workspaceId, draft)
      onSave(draft)
    } finally { setSaving(false) }
  }

  return (
    <div className="card border-amber-200 bg-amber-50">
      <p className="text-sm font-semibold text-amber-800 mb-3">⚙️ Configuración de precios</p>

      <div className="flex gap-1 mb-4">
        {(['kits', 'promos', 'bonos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              tab === t ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'kits' && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-medium mb-1">Precios de instalación (sin IVA)</p>
          {(Object.keys(draft.kits) as NivelPrecio[]).map(nivel => (
            <div key={nivel} className="flex items-center gap-3">
              <span className="text-xs text-amber-800 w-20 font-medium">{NIVEL_LABEL[nivel]}</span>
              <input type="number" value={draft.kits[nivel]}
                onChange={e => updateKit(nivel, Number(e.target.value))}
                className="input text-sm py-1.5 bg-white" />
            </div>
          ))}
          <p className="text-xs text-amber-700 font-medium mt-3 mb-1">Comisiones (sin IVA)</p>
          {(Object.keys(draft.comisiones) as (keyof ConfigVerisure['comisiones'])[]).map(k => (
            <div key={k} className="flex items-center gap-3">
              <span className="text-xs text-amber-800 w-28 font-medium">{k.replace('_', ' ')}</span>
              <input type="number" value={draft.comisiones[k]}
                onChange={e => updateComision(k, Number(e.target.value))}
                className="input text-sm py-1.5 bg-white" />
            </div>
          ))}
        </div>
      )}

      {tab === 'promos' && (
        <div className="space-y-3">
          {draft.promos.map(promo => (
            <div key={promo.id} className="bg-white rounded-xl p-3 space-y-2">
              <input value={promo.label} onChange={e => updatePromo(promo.id, 'label', e.target.value)}
                className="input text-sm py-1.5 font-medium" placeholder="Nombre promo" />
              <input value={promo.descripcion} onChange={e => updatePromo(promo.id, 'descripcion', e.target.value)}
                className="input text-sm py-1.5" placeholder="Descripción" />
              <div className="flex gap-2 items-center">
                <input type="number" value={promo.precio} onChange={e => updatePromo(promo.id, 'precio', Number(e.target.value))}
                  className="input text-sm py-1.5 flex-1" placeholder="Precio sin IVA" />
                <button onClick={() => updatePromo(promo.id, 'activa', !promo.activa)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    promo.activa ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500'
                  }`}>
                  {promo.activa ? '✅ Activa' : '⏸ Pausada'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bonos' && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-medium">Cuota base y upgrade (sin IVA)</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-800 w-28">Cuota base</span>
            <input type="number" value={draft.cuotaBase}
              onChange={e => setDraft(d => ({ ...d, cuotaBase: Number(e.target.value) }))}
              className="input text-sm py-1.5 bg-white" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-800 w-28">Cuota upgrade</span>
            <input type="number" value={draft.cuotaUpgrade}
              onChange={e => setDraft(d => ({ ...d, cuotaUpgrade: Number(e.target.value) }))}
              className="input text-sm py-1.5 bg-white" />
          </div>
          <p className="text-xs text-amber-700 font-medium mt-3">Bonos instalación</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-800 w-28">Por RP instalada</span>
            <input type="number" value={draft.bonoInstalacionRP}
              onChange={e => setDraft(d => ({ ...d, bonoInstalacionRP: Number(e.target.value) }))}
              className="input text-sm py-1.5 bg-white" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-800 w-28">Jefe/Gerente</span>
            <input type="number" value={draft.bonoInstalacionJefeGerente}
              onChange={e => setDraft(d => ({ ...d, bonoInstalacionJefeGerente: Number(e.target.value) }))}
              className="input text-sm py-1.5 bg-white" />
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full mt-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-xl py-2.5 transition-all disabled:opacity-40">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
