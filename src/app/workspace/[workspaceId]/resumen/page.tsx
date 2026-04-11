'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { TrendingUp, Users, Package, CheckSquare, DollarSign, Wrench, Ticket, ShoppingCart } from 'lucide-react'
import {
  getVentas, getClientes, getTareas, toDate,
  getVentas2, getProductos2, getCajaHoy,
  getMovimientosCaja, getOrdenesTrabajo, getTurnosHoy,
} from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmtUSD = (n: number) => `U$S ${n.toLocaleString('es-AR')}`
const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

function Card({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

export default function ResumenPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const tipo = ws?.tipo ?? 'servicios'

  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  useEffect(() => { if (workspaceId) load() }, [workspaceId, tipo])

  const load = async () => {
    try {
      if (tipo === 'servicios') {
        const [ventas, clientes, tareas] = await Promise.all([
          getVentas(workspaceId), getClientes(workspaceId), getTareas(workspaceId),
        ])
        setData({ ventas, ventasMes: ventas.filter(v => toDate(v.createdAt) >= inicioMes), clientes, tareas })

      } else if (tipo === 'productos' || tipo === 'mixto') {
        const [ventas2, productos, caja, movsHoy, tareas] = await Promise.all([
          getVentas2(workspaceId), getProductos2(workspaceId),
          getCajaHoy(workspaceId), getMovimientosCaja(workspaceId, hoyStr),
          getTareas(workspaceId),
        ])
        setData({
          ventasHoy: ventas2.filter(v => toDate(v.createdAt).toISOString().slice(0,10) === hoyStr),
          ventasMes: ventas2.filter(v => toDate(v.createdAt) >= inicioMes),
          productos,
          stockCritico: productos.filter((p: any) => p.stock === 0),
          caja,
          totalUSD: movsHoy.filter(m => m.esIngreso && m.moneda === 'USD').reduce((a,m) => a+m.monto, 0),
          totalARS: movsHoy.filter(m => m.esIngreso && m.moneda === 'ARS').reduce((a,m) => a+m.monto, 0),
          tareas,
        })

      } else if (tipo === 'tecnico') {
        const [ordenes, turnos, movsHoy] = await Promise.all([
          getOrdenesTrabajo(workspaceId), getTurnosHoy(workspaceId),
          getMovimientosCaja(workspaceId, hoyStr),
        ])
        setData({
          activas: ordenes.filter((o: any) => !['entregado','cancelado'].includes(o.estado)),
          listas: ordenes.filter((o: any) => o.estado === 'listo'),
          pendientes: turnos.filter((t: any) => !t.atendido),
          cobradoHoy: movsHoy.filter(m => m.esIngreso).reduce((a,m) => a+m.monto, 0),
        })
      }
    } finally { setLoading(false) }
  }

  const fechaLabel = format(hoy, "EEEE d 'de' MMMM", { locale: es })

  if (loading) return (
    <div className="space-y-3 mt-4">
      {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  // ── SERVICIOS ──────────────────────────────────────────────────────────────
  if (tipo === 'servicios') {
    const tareasHoy = (data.tareas ?? []).filter((t: any) => !t.completada)
    const clientesActivos = (data.clientes ?? []).filter((c: any) => c.estado === 'activo')
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="pt-2">
          <p className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{fechaLabel}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {data.ventasMes?.length > 0 ? `${data.ventasMes.length} ventas este mes 💪` : 'Hoy puede ser el día del primer cierre 💪'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card icon={TrendingUp} label="Ventas del mes" value={data.ventasMes?.length ?? 0} color="var(--brand)" />
          <Card icon={DollarSign} label="Facturado" value={`$${(data.ventasMes ?? []).reduce((a: number, v: any) => a + v.total, 0).toLocaleString('es-AR')}`} color="var(--green)" />
          <Card icon={Users} label="Clientes activos" value={clientesActivos.length} color="var(--blue)" />
          <Card icon={CheckSquare} label="Tareas hoy" value={tareasHoy.length} color="var(--amber)" />
        </div>
      </div>
    )
  }

  // ── PRODUCTOS / MIXTO ──────────────────────────────────────────────────────
  if (tipo === 'productos' || tipo === 'mixto') {
    const tareasHoy = (data.tareas ?? []).filter((t: any) => !t.completada)
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="pt-2">
          <p className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{fechaLabel}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {data.ventasHoy?.length > 0 ? `${data.ventasHoy.length} venta${data.ventasHoy.length > 1 ? 's' : ''} hoy 🔥` : 'Sin ventas registradas hoy'}
          </p>
        </div>

        {/* Estado caja */}
        <div className="px-4 py-3 rounded-2xl"
          style={{ background: data.caja?.abierta ? 'var(--green-bg)' : 'var(--surface)', border: `1px solid ${data.caja?.abierta ? 'var(--green)' : 'var(--border)'}` }}>
          <p className="text-xs font-semibold" style={{ color: data.caja?.abierta ? 'var(--green)' : 'var(--text-tertiary)' }}>
            {data.caja?.abierta ? '🔓 Caja abierta' : '🔒 Caja cerrada'}
          </p>
          {data.caja?.abierta && (
            <div className="flex gap-4 mt-1">
              <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>+{fmtUSD(data.totalUSD ?? 0)}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>+{fmtARS(data.totalARS ?? 0)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card icon={ShoppingCart} label="Ventas hoy" value={data.ventasHoy?.length ?? 0} color="var(--brand)" />
          <Card icon={TrendingUp} label="Ventas mes" value={data.ventasMes?.length ?? 0} color="var(--green)" />
          <Card icon={Package} label="Con stock" value={(data.productos ?? []).filter((p: any) => p.stock > 0).length} color="var(--blue)" />
          <Card icon={CheckSquare} label="Tareas" value={tareasHoy.length} color="var(--amber)" sub="pendientes" />
        </div>

        {data.stockCritico?.length > 0 && (
          <div className="px-3 py-3 rounded-2xl" style={{ background: 'var(--red-bg)', border: '1px solid rgba(232,0,29,0.3)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--brand-light)' }}>⚠️ Sin stock ({data.stockCritico.length})</p>
            <div className="space-y-1">
              {data.stockCritico.slice(0, 4).map((p: any) => (
                <p key={p.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {p.marca} {p.modelo}{p.storage ? ' ' + p.storage : ''}{p.color ? ' · ' + p.color : ''}
                </p>
              ))}
              {data.stockCritico.length > 4 && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+{data.stockCritico.length - 4} más</p>}
            </div>
          </div>
        )}

        {data.ventasMes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>Últimas ventas</p>
            <div className="space-y-1.5">
              {data.ventasMes.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--brand-light)' }}>{v.codigo}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.clienteNombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                      {v.moneda === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {format(toDate(v.createdAt), "d MMM HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── TÉCNICO ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="pt-2">
        <p className="text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{fechaLabel}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {data.listas?.length > 0 ? `${data.listas.length} equipo${data.listas.length > 1 ? 's' : ''} listo para entregar 📦` : 'Buen día de trabajo 🔧'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card icon={Wrench} label="OTs activas" value={data.activas?.length ?? 0} color="var(--brand)" />
        <Card icon={Package} label="Listos entregar" value={data.listas?.length ?? 0} color="var(--green)" />
        <Card icon={Ticket} label="Turnos pendientes" value={data.pendientes?.length ?? 0} color="var(--blue)" />
        <Card icon={DollarSign} label="Cobrado hoy" value={fmtUSD(data.cobradoHoy ?? 0)} color="var(--amber)" />
      </div>
      {data.listas?.length > 0 && (
        <div className="px-3 py-3 rounded-2xl" style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--green)' }}>✅ Listos para entregar</p>
          <div className="space-y-1">
            {data.listas.map((ot: any) => (
              <div key={ot.id} className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{ot.equipoMarca} {ot.equipoModelo} — {ot.clienteNombre}</p>
                <span className="text-[10px] font-mono" style={{ color: 'var(--green)' }}>{ot.codigo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
