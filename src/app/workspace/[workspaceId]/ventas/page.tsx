'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, TrendingUp, DollarSign, CheckCircle, Clock } from 'lucide-react'
import { getVentas, createVenta, getClientes, toDate } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Venta, Cliente, VentaEstado } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CONFIG: Record<VentaEstado, { label: string; class: string }> = {
  presupuesto: { label: 'Presupuesto', class: 'badge-gray' },
  pendiente:   { label: 'Pendiente',   class: 'badge-amber' },
  cerrada:     { label: 'Cerrada ✅',  class: 'badge-green' },
  cancelada:   { label: 'Cancelada',   class: 'badge-red' },
}

const FORMAS_PAGO = ['Efectivo USD', 'Efectivo ARS', 'USDT', 'Transferencia ARS', 'Tarjeta', 'Cuotas', 'Otro']

export default function VentasPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    clienteId: '', clienteNombre: '',
    total: 0, moneda: 'USD' as 'USD' | 'ARS',
    formaPago: 'Efectivo USD',
    estado: 'cerrada' as VentaEstado,
    notas: '',
  })

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, c] = await Promise.all([getVentas(workspaceId), getClientes(workspaceId)])
      setVentas(v)
      setClientes(c)
    } finally { setLoading(false) }
  }

  // Métricas
  const now = new Date()
  const ventasMes = ventas.filter(v => {
    const fecha = toDate(v.createdAt)
    return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear() && v.estado === 'cerrada'
  })
  const totalMes = ventasMes.reduce((acc, v) => acc + v.total, 0)

  const fmt = (n: number, moneda = 'USD') =>
    moneda === 'USD' ? `U$S ${n.toLocaleString('es-AR')}` : `$${Math.round(n).toLocaleString('es-AR')}`

  const handleSave = async () => {
    if (!form.total || !user) return
    setSaving(true)
    try {
      const clienteSeleccionado = clientes.find(c => c.id === form.clienteId)
      await createVenta(workspaceId, {
        workspaceId,
        clienteId: form.clienteId,
        clienteNombre: clienteSeleccionado?.nombre ?? form.clienteNombre,
        items: [],
        subtotal: form.total,
        total: form.total,
        moneda: form.moneda,
        formaPago: form.formaPago,
        estado: form.estado,
        notas: form.notas,
        creadoPor: user.uid,
      })
      await load()
      setShowForm(false)
      setForm({ clienteId: '', clienteNombre: '', total: 0, moneda: 'USD', formaPago: 'Efectivo USD', estado: 'cerrada', notas: '' })
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-[var(--surface-3)] rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ventas</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">{ventasMes.length} cerradas este mes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Registrar
        </button>
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Ventas del mes</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{ventasMes.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Total facturado</p>
          <p className="text-base font-bold text-[var(--text-primary)] leading-tight">{fmt(totalMes)}</p>
        </div>
      </div>

      {/* Lista de ventas */}
      <div className="space-y-2">
        {ventas.length === 0 ? (
          <div className="empty-state mt-6">
            <div className="empty-icon"><TrendingUp size={22} className="text-[var(--text-tertiary)]" /></div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">Sin ventas registradas</p>
            <p className="text-[var(--text-tertiary)] text-xs mt-1">Registrá tu primera venta cuando cierres</p>
          </div>
        ) : ventas.map(v => {
          const fecha = (v.createdAt as any)?.toDate?.() ?? new Date(v.createdAt)
          return (
            <div key={v.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${v.estado === 'cerrada' ? 'bg-[var(--green-bg)]' : 'bg-[var(--amber-bg)]'}`}>
                    {v.estado === 'cerrada'
                      ? <CheckCircle size={16} className="text-[var(--green)]" />
                      : <Clock size={16} className="text-[var(--amber)]" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{v.clienteNombre || 'Sin cliente'}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {format(fecha, 'dd/MM/yyyy')} · {v.formaPago}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{fmt(v.total, v.moneda)}</p>
                  <span className={`badge ${ESTADO_CONFIG[v.estado].class} mt-0.5`}>
                    {ESTADO_CONFIG[v.estado].label}
                  </span>
                </div>
              </div>
              {v.notas && <p className="text-xs text-[var(--text-tertiary)] mt-2 pt-2 border-t border-[var(--border)]">{v.notas}</p>}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-modal overflow-y-auto max-h-[90vh] animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[var(--text-primary)]">Registrar venta</h3>
                <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
              </div>
              <div className="space-y-3">
                {/* Cliente */}
                <div>
                  <label className="label">Cliente</label>
                  {clientes.length > 0 ? (
                    <select className="input" value={form.clienteId}
                      onChange={e => setForm(f => ({...f, clienteId: e.target.value}))}>
                      <option value="">Sin cliente / Ocasional</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  ) : (
                    <input className="input" placeholder="Nombre del cliente" value={form.clienteNombre}
                      onChange={e => setForm(f => ({...f, clienteNombre: e.target.value}))} />
                  )}
                </div>
                {/* Monto */}
                <div>
                  <label className="label">Monto total</label>
                  <div className="flex gap-2">
                    <select className="input w-24 flex-shrink-0" value={form.moneda}
                      onChange={e => setForm(f => ({...f, moneda: e.target.value as 'USD' | 'ARS'}))}>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                    <input className="input flex-1" type="number" min="0" placeholder="720"
                      value={form.total || ''} onChange={e => setForm(f => ({...f, total: Number(e.target.value)}))} />
                  </div>
                </div>
                {/* Forma de pago */}
                <div>
                  <label className="label">Forma de pago</label>
                  <select className="input" value={form.formaPago}
                    onChange={e => setForm(f => ({...f, formaPago: e.target.value}))}>
                    {FORMAS_PAGO.map(fp => <option key={fp}>{fp}</option>)}
                  </select>
                </div>
                {/* Estado */}
                <div>
                  <label className="label">Estado</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['cerrada', 'pendiente', 'presupuesto'] as VentaEstado[]).map(est => (
                      <button key={est} onClick={() => setForm(f => ({...f, estado: est}))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${form.estado === est ? 'bg-surface-900 text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
                        {ESTADO_CONFIG[est].label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Notas */}
                <div>
                  <label className="label">Notas</label>
                  <textarea className="input resize-none" rows={2} placeholder="Detalles, modelo, observaciones..."
                    value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSave} disabled={!form.total || saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Registrar venta'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
