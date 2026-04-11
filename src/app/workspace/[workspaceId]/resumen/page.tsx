'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { TrendingUp, Users, Package, CheckSquare, DollarSign, ArrowUpRight } from 'lucide-react'
import { getVentas, getClientes, getTareas, toDate } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Venta, Cliente, Tarea } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ResumenPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    loadData()
  }, [workspaceId])

  const loadData = async () => {
    try {
      const [v, c, t] = await Promise.all([
        getVentas(workspaceId),
        getClientes(workspaceId),
        getTareas(workspaceId),
      ])
      setVentas(v)
      setClientes(c)
      setTareas(t)
    } finally {
      setLoading(false)
    }
  }

  // Métricas del mes actual
  const now = new Date()
  const ventasMes = ventas.filter(v => {
    const fecha = toDate(v.createdAt)
    return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear()
  })
  const totalMes = ventasMes.reduce((acc, v) => acc + v.total, 0)
  const ventasCerradas = ventasMes.filter(v => v.estado === 'cerrada').length
  const clientesActivos = clientes.filter(c => c.estado === 'activo').length
  const tareasPendientes = tareas.filter(t => !t.completada).length

  const fmt = (n: number, moneda = 'ARS') =>
    moneda === 'USD'
      ? `U$S ${n.toLocaleString('es-AR')}`
      : `$${Math.round(n).toLocaleString('es-AR')}`

  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 bg-[var(--surface-3)] rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Saludo */}
      <div className="pt-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {format(now, "EEEE d 'de' MMMM", { locale: es })}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">
          {ventasCerradas > 0
            ? `${ventasCerradas} venta${ventasCerradas > 1 ? 's' : ''} cerrada${ventasCerradas > 1 ? 's' : ''} este mes 🔥`
            : 'Hoy puede ser el día del primer cierre 💪'}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Ventas del mes</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{ventasCerradas}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-brand-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Facturado</p>
              <p className="text-base font-bold text-[var(--text-primary)] leading-tight">{fmt(totalMes)}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[var(--green-bg)] flex items-center justify-center">
              <DollarSign size={16} className="text-[var(--green)]" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Clientes activos</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{clientesActivos}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[var(--blue-bg)] flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Tareas hoy</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{tareasPendientes}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[var(--amber-bg)] flex items-center justify-center">
              <CheckSquare size={16} className="text-[var(--amber)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Últimas ventas */}
      {ventasMes.length > 0 && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">Últimas ventas</span>
            <span className="text-xs text-[var(--text-tertiary)]">{ventasMes.length} este mes</span>
          </div>
          <div className="space-y-3">
            {ventasMes.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-sm">
                    {v.estado === 'cerrada' ? '✅' : '⏳'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{v.clienteNombre}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {format(toDate(v.createdAt), 'dd/MM HH:mm')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{fmt(v.total, v.moneda)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clientes dormidos */}
      {clientes.filter(c => c.estado === 'dormido').length > 0 && (
        <div className="bg-[var(--amber-bg)] border border-amber-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💤</span>
            <div>
              <p className="text-sm font-semibold text-[var(--amber)]">
                {clientes.filter(c => c.estado === 'dormido').length} clientes dormidos
              </p>
              <p className="text-xs text-[var(--amber)] mt-0.5">
                Son clientes que ya confiaron en vos. Buen momento para reactivarlos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {ventas.length === 0 && clientes.length === 0 && (
        <div className="empty-state mt-8">
          <div className="empty-icon">
            <TrendingUp size={24} className="text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-[var(--text-primary)] font-medium text-sm">Todo listo para arrancar</h3>
          <p className="text-[var(--text-tertiary)] text-xs mt-1 max-w-xs">
            Agregá tus primeros clientes y productos desde las pestañas de abajo.
          </p>
        </div>
      )}
    </div>
  )
}
