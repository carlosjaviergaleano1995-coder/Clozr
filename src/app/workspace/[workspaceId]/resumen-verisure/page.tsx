'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Copy, Check, Share2 } from 'lucide-react'
import { getVentas, getClientes, getPipeline } from '@/lib/services'
import { toDate } from '@/lib/services'
import type { Cliente, PipelineCliente } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fmtARS } from '@/lib/format'

// ── Plan comisiones VET ───────────────────────────────────────────────────────
const COMISION_KIT: Record<string, { re: number; rp: number }> = {
  'Catálogo':     { re: 140000, rp: 200000 },
  'Alto':         { re: 70000,  rp: 100000  },
  'Medio':        { re: 35000,  rp: 50000   },
  'Bajo':         { re: 0,      rp: 0        },
  'Catálogo +':   { re: 175000, rp: 250000  },
  'Alto +':       { re: 140000, rp: 200000  },
  'Medio/Bajo +': { re: 56000,  rp: 80000   },
}

const INSTALACION_VET = {
  min:     { cargo: 300000, cantidad: 5 },
  express: { cargo: 500000, cantidad: 7 },
}

const PERFORMANCE_BASE = 8
const BONO_EXTRA_VENTA = 80000
const BONO_EXTRA_RP = 100000
const ESCALA_RP = 3

export default function ResumenVerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [ventas, setVentas] = useState<any[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pipeline, setPipeline] = useState<PipelineCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetalle, setShowDetalle] = useState(false)
  const [modoSim, setModoSim] = useState(false)
  const [copied, setCopied] = useState(false)

  // Simulador
  const [simRP, setSimRP] = useState(0)
  const [simRE, setSimRE] = useState(0)
  const [simInstalaciones, setSimInstalaciones] = useState(0)
  const [simKitPromedio, setSimKitPromedio] = useState<string>('Alto')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, c, p] = await Promise.all([
        getVentas(workspaceId),
        getClientes(workspaceId),
        getPipeline(workspaceId),
      ])
      setVentas(v)
      setClientes(c)
      setPipeline(p)
    } finally { setLoading(false) }
  }

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const mesLabel = format(hoy, "MMMM yyyy", { locale: es })

  // Ventas del mes desde ventas-verisure (formaPago = 'RP' | 'RE')
  const ventasMes = useMemo(() =>
    ventas.filter(v => toDate(v.createdAt) >= inicioMes),
    [ventas]
  )
  const ventasRP_real = ventasMes.filter(v => v.formaPago === 'RP')
  const ventasRE_real = ventasMes.filter(v => v.formaPago === 'RE')

  // Usar simulador o datos reales
  const totalRP = modoSim ? simRP : ventasRP_real.length
  const totalRE = modoSim ? simRE : ventasRE_real.length
  const totalVentas = totalRP + totalRE
  const totalInstalaciones = modoSim ? simInstalaciones : ventasMes.length

  // Calcular comisiones
  const comisiones = useMemo(() => {
    const kitKey = modoSim ? simKitPromedio : 'Alto' // para reales usamos promedio
    const kit = COMISION_KIT[kitKey] ?? COMISION_KIT['Alto']

    // 1. Directa por venta — para datos reales usamos el total de la venta (ya calculado en ventas-verisure)
    let directaRP = 0
    let directaRE = 0
    if (modoSim) {
      directaRP = totalRP * kit.rp
      directaRE = totalRE * kit.re
    } else {
      directaRP = ventasRP_real.reduce((a, v) => a + (v.total ?? 0), 0)
      directaRE = ventasRE_real.reduce((a, v) => a + (v.total ?? 0), 0)
    }

    // 2. Instalación (Vet)
    let comisionInstalacion = 0
    if (totalInstalaciones >= INSTALACION_VET.express.cantidad) {
      comisionInstalacion = INSTALACION_VET.express.cargo
    } else if (totalInstalaciones >= INSTALACION_VET.min.cantidad) {
      comisionInstalacion = INSTALACION_VET.min.cargo
    }

    // 3. Performance
    let bonoPerformance = 0
    if (totalVentas > PERFORMANCE_BASE) {
      bonoPerformance = (totalVentas - PERFORMANCE_BASE) * BONO_EXTRA_VENTA
    }

    // 4. Bono RP
    let bonoRP = 0
    if (totalRP > ESCALA_RP) {
      bonoRP = (totalRP - ESCALA_RP) * BONO_EXTRA_RP
    }

    const total = directaRP + directaRE + comisionInstalacion + bonoPerformance + bonoRP
    return { directaRP, directaRE, comisionInstalacion, bonoPerformance, bonoRP, total }
  }, [totalRP, totalRE, totalVentas, totalInstalaciones, modoSim, simKitPromedio, ventasRP_real, ventasRE_real])

  const progresoInstalacion = Math.min(100, (totalInstalaciones / INSTALACION_VET.express.cantidad) * 100)
  const progresoPerformance = Math.min(100, (totalVentas / PERFORMANCE_BASE) * 100)

  // Pipeline stats
  const pipelineActivos = pipeline.filter(p => !['cobrado','perdido'].includes(p.estado))
  const pipelineInstalados = pipeline.filter(p => p.estado === 'instalado')
  const pipelineAprobados = pipeline.filter(p => p.estado === 'aprobado')

  const generarResumen = () => {
    const mesCapitalizado = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)
    const lineas: string[] = []
    lineas.push(`🛡️ *RESUMEN VERISURE — ${mesCapitalizado.toUpperCase()}*`)
    lineas.push('')
    lineas.push(`📊 *Ventas del mes*`)
    lineas.push(`• RP: ${totalRP}`)
    lineas.push(`• RE: ${totalRE}`)
    lineas.push(`• Total: ${totalVentas}`)
    lineas.push('')
    lineas.push(`💰 *Comisión estimada: ${fmtARS(comisiones.total)}*`)
    lineas.push('')
    if (comisiones.directaRP > 0)         lineas.push(`  ↳ Directa RP: ${fmtARS(comisiones.directaRP)}`)
    if (comisiones.directaRE > 0)         lineas.push(`  ↳ Directa RE: ${fmtARS(comisiones.directaRE)}`)
    if (comisiones.comisionInstalacion > 0) lineas.push(`  ↳ Instalación: ${fmtARS(comisiones.comisionInstalacion)}`)
    if (comisiones.bonoPerformance > 0)   lineas.push(`  ↳ Performance: ${fmtARS(comisiones.bonoPerformance)}`)
    if (comisiones.bonoRP > 0)            lineas.push(`  ↳ Bono RP: ${fmtARS(comisiones.bonoRP)}`)
    lineas.push('')
    lineas.push(`📈 *Progreso escalas*`)
    lineas.push(`• Instalaciones: ${totalInstalaciones}/${INSTALACION_VET.express.cantidad} (express)`)
    lineas.push(`• Performance: ${totalVentas}/${PERFORMANCE_BASE} ventas netas`)
    if (pipeline.length > 0) {
      lineas.push('')
      lineas.push(`🔄 *Pipeline*`)
      lineas.push(`• Activos: ${pipelineActivos.length}`)
      if (pipelineAprobados.length > 0) lineas.push(`• Aprobados: ${pipelineAprobados.length}`)
      if (pipelineInstalados.length > 0) lineas.push(`• Instalados: ${pipelineInstalados.length}`)
    }
    if (ventasMes.length > 0 && !modoSim) {
      lineas.push('')
      lineas.push(`📋 *Detalle ventas*`)
      ventasMes.forEach((v: any) => {
        lineas.push(`• [${v.formaPago}] ${v.clienteNombre} — ${v.items?.[0]?.nombre ?? '—'} — ${fmtARS(v.total)}`)
      })
    }
    lineas.push('')
    lineas.push(`_Generado con Clozr · ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}_`)
    return lineas.join('\n')
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(generarResumen())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCompartir = async () => {
    const texto = generarResumen()
    if (navigator.share) {
      await navigator.share({ text: texto })
    } else {
      navigator.clipboard.writeText(texto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (loading) return (
    <div className="space-y-3 mt-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{mesLabel}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {modoSim ? '🧮 Modo simulador' : `Datos reales · ${ventasMes.length} ventas registradas`}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleCopiar}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={copied
              ? { background: 'var(--green-bg)', color: 'var(--green)' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={handleCompartir}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            <Share2 size={14} />
          </button>
          <button onClick={() => setModoSim(!modoSim)}
            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
            style={modoSim
              ? { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber)' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            🧮 {modoSim ? 'Sim' : 'Sim'}
          </button>
        </div>
      </div>

      {/* Simulador */}
      {modoSim && (
        <div className="px-4 py-3 rounded-2xl space-y-3"
          style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>Ajustá los valores para simular</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Ventas RP', val: simRP, set: setSimRP },
              { label: 'Ventas RE', val: simRE, set: setSimRE },
              { label: 'Instalaciones', val: simInstalaciones, set: setSimInstalaciones },
            ].map(f => (
              <div key={f.label}>
                <label className="label text-[10px]">{f.label}</label>
                <input type="number" min="0" className="input text-sm"
                  value={f.val || ''} onChange={e => f.set(Number(e.target.value))} />
              </div>
            ))}
            <div>
              <label className="label text-[10px]">Kit promedio</label>
              <select className="input text-sm" value={simKitPromedio} onChange={e => setSimKitPromedio(e.target.value)}>
                {Object.keys(COMISION_KIT).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ventas del mes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'RP', value: totalRP, color: 'var(--brand)' },
          { label: 'RE', value: totalRE, color: 'var(--blue)' },
          { label: 'Total', value: totalVentas, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="px-3 py-3 rounded-2xl text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Total comisiones */}
      <div className="px-4 py-4 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--green)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
          Comisión estimada
        </p>
        <p className="text-3xl font-bold" style={{ color: 'var(--green)' }}>
          {fmtARS(comisiones.total)}
        </p>
        <button onClick={() => setShowDetalle(!showDetalle)}
          className="flex items-center gap-1 mt-2 text-xs"
          style={{ color: 'var(--text-tertiary)' }}>
          Ver desglose {showDetalle ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showDetalle && (
          <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: `Directa RP (${totalRP})`,             valor: comisiones.directaRP,          color: 'var(--brand-light)' },
              { label: `Directa RE (${totalRE})`,             valor: comisiones.directaRE,          color: 'var(--blue)'        },
              { label: `Instalación (${totalInstalaciones})`, valor: comisiones.comisionInstalacion, color: '#a855f7'            },
              { label: 'Bono performance',                    valor: comisiones.bonoPerformance,    color: 'var(--amber)'       },
              { label: 'Bono RP extra',                       valor: comisiones.bonoRP,             color: 'var(--green)'       },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.label}</span>
                <span className="text-sm font-semibold"
                  style={{ color: r.valor > 0 ? r.color : 'var(--text-tertiary)' }}>
                  {fmtARS(r.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progreso escalas */}
      <div className="space-y-3">
        <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Instalaciones</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {totalInstalaciones} / {INSTALACION_VET.express.cantidad} para express
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progresoInstalacion}%`, background: 'var(--green)' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Min {INSTALACION_VET.min.cantidad}: {fmtARS(INSTALACION_VET.min.cargo)}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Express {INSTALACION_VET.express.cantidad}: {fmtARS(INSTALACION_VET.express.cargo)}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Performance</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {totalVentas} / {PERFORMANCE_BASE} ventas netas
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progresoPerformance}%`, background: 'var(--amber)' }} />
          </div>
          {totalVentas > PERFORMANCE_BASE && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--amber)' }}>
              +{totalVentas - PERFORMANCE_BASE} sobre la escala = {fmtARS(comisiones.bonoPerformance)} extra
            </p>
          )}
        </div>
      </div>

      {/* Pipeline stats */}
      {pipeline.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Pipeline
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Activos',    count: pipelineActivos.length,    color: 'var(--blue)'  },
              { label: 'Aprobados',  count: pipelineAprobados.length,  color: 'var(--amber)' },
              { label: 'Instalados', count: pipelineInstalados.length, color: 'var(--green)' },
              { label: 'Total',      count: pipeline.length,           color: 'var(--text-primary)' },
            ].map(s => (
              <div key={s.label} className="px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas ventas del mes */}
      {ventasMes.length > 0 && !modoSim && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Ventas del mes
          </p>
          <div className="space-y-1.5">
            {ventasMes.slice(0, 6).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={v.formaPago === 'RP'
                    ? { background: 'var(--red-bg)', color: 'var(--brand-light)' }
                    : { background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                  {v.formaPago}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {v.clienteNombre}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {v.items?.[0]?.nombre ?? '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>{fmtARS(v.total)}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {format(toDate(v.createdAt), "d MMM", { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Botón copiar grande al final */}
      <div className="pt-2 pb-2">
        <button onClick={handleCompartir}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <Share2 size={16} />
          Compartir resumen por WhatsApp
        </button>
        <button onClick={handleCopiar}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-medium mt-2 transition-all"
          style={copied
            ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar texto</>}
        </button>
      </div>
    </div>
  )
}
