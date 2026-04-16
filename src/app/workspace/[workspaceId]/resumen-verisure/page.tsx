'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { TrendingUp, DollarSign, Star, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { getVentas2, getClientes } from '@/lib/services'
import { toDate } from '@/lib/services'
import type { Venta2, Cliente } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Plan comisiones VET / N6 ──────────────────────────────────────────────────
// Directa por venta
const COMISION_KIT: Record<string, { re: number; rp: number }> = {
  'catalogo':   { re: 140000, rp: 200000 },
  'alto':       { re: 70000,  rp: 100000  },
  'medio':      { re: 35000,  rp: 50000   },
  'bajo':       { re: 0,      rp: 0        },
  'catalogo_2': { re: 175000, rp: 250000  },
  'alto_2':     { re: 140000, rp: 200000  },
  'medio_bajo': { re: 56000,  rp: 80000   },
}

// Instalación Vet/N4-N6
const INSTALACION_VET = {
  min:     { cargo: 300000, cantidad: 5 },
  express: { cargo: 500000, cantidad: 7 },
}

// Performance Vet/N6
const PERFORMANCE = {
  escalaBase: 8, // cantidad de ventas netas totales para empezar a cobrar
  bonoPorExtra: 80000,
  escalaRP: 3,   // RP extra sobre la escala mayor
  bonoPorExtraRP: 100000,
}

const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export default function ResumenVerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [ventas, setVentas] = useState<Venta2[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetalle, setShowDetalle] = useState(false)

  // Simulador manual (si no tiene ventas registradas)
  const [simRP, setSimRP] = useState(0)
  const [simRE, setSimRE] = useState(0)
  const [simInstalaciones, setSimInstalaciones] = useState(0)
  const [simKitPromedio, setSimKitPromedio] = useState<'catalogo' | 'alto' | 'medio' | 'bajo'>('alto')
  const [modoSim, setModoSim] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, c] = await Promise.all([
        getVentas2(workspaceId),
        getClientes(workspaceId),
      ])
      setVentas(v)
      setClientes(c)
    } finally { setLoading(false) }
  }

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const ventasMes = ventas.filter(v => toDate(v.createdAt) >= inicioMes)

  // RP = cliente tipo 'final', RE = cliente tipo 'empresa'
  // Buscamos el tipo del cliente por nombre en la venta
  const clienteMap = useMemo(() => {
    const m: Record<string, Cliente> = {}
    clientes.forEach(c => { m[c.nombre.toLowerCase()] = c })
    return m
  }, [clientes])

  const ventasRP = ventasMes.filter(v => {
    const c = clienteMap[v.clienteNombre?.toLowerCase() ?? '']
    return c?.tipo === 'final' || !c  // sin match asumimos RP
  })
  const ventasRE = ventasMes.filter(v => {
    const c = clienteMap[v.clienteNombre?.toLowerCase() ?? '']
    return c?.tipo === 'empresa'
  })

  // Usar simulador si no hay ventas o si está en modo sim
  const totalRP = modoSim ? simRP : ventasRP.length
  const totalRE = modoSim ? simRE : ventasRE.length
  const totalVentas = totalRP + totalRE
  const totalInstalaciones = modoSim ? simInstalaciones : ventasMes.length

  // Calcular comisiones
  const comisiones = useMemo(() => {
    const kit = COMISION_KIT[simKitPromedio] ?? COMISION_KIT['alto']

    // 1. Directa por venta
    const directaRP = totalRP * kit.rp
    const directaRE = totalRE * kit.re

    // 2. Instalación (Vet)
    let comisionInstalacion = 0
    if (totalInstalaciones >= INSTALACION_VET.express.cantidad) {
      comisionInstalacion = INSTALACION_VET.express.cargo
    } else if (totalInstalaciones >= INSTALACION_VET.min.cantidad) {
      comisionInstalacion = INSTALACION_VET.min.cargo
    }

    // 3. Performance
    const escalaBase = PERFORMANCE.escalaBase
    let bonoPerfomance = 0
    if (totalVentas > escalaBase) {
      bonoPerfomance = (totalVentas - escalaBase) * PERFORMANCE.bonoPorExtra
    }

    // 4. Bono RP
    const escalaRP = PERFORMANCE.escalaRP
    let bonoRP = 0
    // Asumimos escala mayor RP = 3 para Vet
    if (totalRP > escalaRP) {
      bonoRP = (totalRP - escalaRP) * PERFORMANCE.bonoPorExtraRP
    }

    const total = directaRP + directaRE + comisionInstalacion + bonoPerfomance + bonoRP

    return {
      directaRP, directaRE, comisionInstalacion,
      bonoPerfomance, bonoRP, total,
    }
  }, [totalRP, totalRE, totalVentas, totalInstalaciones, simKitPromedio])

  // Progreso hacia la escala de instalación
  const progresoInstalacion = Math.min(100, (totalInstalaciones / INSTALACION_VET.express.cantidad) * 100)
  const progresoPerformance = Math.min(100, (totalVentas / PERFORMANCE.escalaBase) * 100)

  if (loading) return (
    <div className="space-y-3 mt-4">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  const mesLabel = format(hoy, "MMMM yyyy", { locale: es })

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
            {mesLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Resumen de comisiones — Vet
          </p>
        </div>
        <button onClick={() => setModoSim(!modoSim)}
          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
          style={modoSim
            ? { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber)' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          {modoSim ? '🧮 Simulando' : '🧮 Simular'}
        </button>
      </div>

      {/* Simulador */}
      {modoSim && (
        <div className="px-4 py-3 rounded-2xl space-y-3"
          style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>
            🧮 Modo simulador — ajustá los valores
          </p>
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
              <select className="input text-sm" value={simKitPromedio}
                onChange={e => setSimKitPromedio(e.target.value as any)}>
                <option value="catalogo">Catálogo</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Resumen ventas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-3 rounded-2xl text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>{totalRP}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>RP</p>
        </div>
        <div className="px-3 py-3 rounded-2xl text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--blue)' }}>{totalRE}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>RE</p>
        </div>
        <div className="px-3 py-3 rounded-2xl text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{totalVentas}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Total</p>
        </div>
      </div>

      {/* Total comisiones */}
      <div className="px-4 py-4 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--green)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
          Comisión estimada del mes
        </p>
        <p className="text-3xl font-bold" style={{ color: 'var(--green)' }}>
          {fmtARS(comisiones.total)}
        </p>
        <button onClick={() => setShowDetalle(!showDetalle)}
          className="flex items-center gap-1 mt-2 text-xs"
          style={{ color: 'var(--text-tertiary)' }}>
          Ver detalle {showDetalle ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showDetalle && (
          <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: `Directa RP (${totalRP} ventas)`,        valor: comisiones.directaRP,          color: 'var(--brand-light)' },
              { label: `Directa RE (${totalRE} ventas)`,        valor: comisiones.directaRE,          color: 'var(--blue)' },
              { label: `Instalación (${totalInstalaciones})`,   valor: comisiones.comisionInstalacion, color: '#a855f7' },
              { label: 'Bono performance',                       valor: comisiones.bonoPerfomance,     color: 'var(--amber)' },
              { label: 'Bono RP extra',                         valor: comisiones.bonoRP,             color: 'var(--green)' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.label}</span>
                <span className="text-sm font-semibold" style={{ color: r.valor > 0 ? r.color : 'var(--text-tertiary)' }}>
                  {fmtARS(r.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progreso escalas */}
      <div className="space-y-3">
        {/* Instalaciones */}
        <div className="px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Instalaciones
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {totalInstalaciones} / {INSTALACION_VET.express.cantidad} para express
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progresoInstalacion}%`, background: 'var(--green)' }} />
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

        {/* Performance */}
        <div className="px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Performance
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {totalVentas} / {PERFORMANCE.escalaBase} ventas netas
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progresoPerformance}%`, background: 'var(--amber)' }} />
          </div>
          {totalVentas > PERFORMANCE.escalaBase && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--amber)' }}>
              +{totalVentas - PERFORMANCE.escalaBase} extra = {fmtARS(comisiones.bonoPerfomance)} bono
            </p>
          )}
        </div>
      </div>

      {/* Clientes del mes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
          style={{ color: 'var(--text-tertiary)' }}>
          Clientes activos este mes
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Potenciales', count: clientes.filter(c => c.estado === 'potencial').length, color: 'var(--blue)' },
            { label: 'Instalados',  count: clientes.filter(c => c.estado === 'activo').length,    color: 'var(--green)' },
            { label: 'En seguimiento', count: clientes.filter(c => c.estado === 'dormido').length,  color: 'var(--amber)' },
            { label: 'Perdidos',    count: clientes.filter(c => c.estado === 'perdido').length,   color: 'var(--text-tertiary)' },
          ].map(s => (
            <div key={s.label} className="px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
