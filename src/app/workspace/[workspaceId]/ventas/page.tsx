'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { useSales } from '@/hooks/useSales'
import { useCustomers } from '@/hooks/useCustomers'
import { createSale } from '@/features/sales/actions'
import type { Sale } from '@/features/sales/types'

const FORMAS_PAGO = ['Efectivo USD', 'Efectivo ARS', 'USDT', 'Transferencia ARS', 'Tarjeta', 'Cuotas', 'Otro']

const fmt = (n: number, moneda = 'USD') =>
  moneda === 'USD'
    ? `U$S ${n.toLocaleString('es-AR')}`
    : `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function VentasPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { isViewerOnly } = useMemberRole(workspaceId)
  const canCreate   = !isViewerOnly

  // ── Datos reactivos ──────────────────────────────────────────────────────
  const { sales, thisMonthSales, totalThisMonth, loading } = useSales(workspaceId)
  const { customers } = useCustomers(workspaceId)

  const [isPending, startTransition] = useTransition()
  const [showForm,  setShowForm]     = useState(false)
  const [error,     setError]        = useState<string | null>(null)

  const [form, setForm] = useState({
    clienteId:   '',
    clienteNombre: '',
    total:       0,
    moneda:      'USD' as 'USD' | 'ARS',
    formaPago:   'Efectivo USD',
    pagado:      true,
    notas:       '',
  })

  const handleSave = () => {
    if (!form.total) return
    setError(null)

    const cliente = customers.find(c => c.id === form.clienteId)
    const customerName = cliente?.nombre || form.clienteNombre || 'Sin cliente'

    startTransition(async () => {
      const result = await createSale(workspaceId, {
        customerId:   form.clienteId || undefined,
        customerName,
        items: [{
          descripcion:    customerName,
          cantidad:       1,
          precioUnitario: form.total,
          subtotal:       form.total,
        }],
        subtotal:  form.total,
        total:     form.total,
        currency:  form.moneda,
        formaPago: form.formaPago,
        pagado:    form.pagado,
        notas:     form.notas || undefined,
        fecha:     new Date(),
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setShowForm(false)
      setForm({ clienteId: '', clienteNombre: '', total: 0, moneda: 'USD', formaPago: 'Efectivo USD', pagado: true, notas: '' })
    })
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ventas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {thisMonthSales.length} este mes · {sales.length} total
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1">
            <Plus size={15} /> Registrar
          </button>
        )}
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Ventas del mes</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{thisMonthSales.length}</p>
        </div>
        <div className="card">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total facturado</p>
          <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {fmt(totalThisMonth)}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--surface-2)' }}>
              <TrendingUp size={22} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin ventas registradas</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Registrá tu primera venta cuando cierres
            </p>
          </div>
        ) : (
          sales.map(v => <VentaCard key={v.id} venta={v} />)
        )}
      </div>

      {/* Modal nueva venta */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar venta</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Cliente */}
              <div>
                <label className="label">Cliente</label>
                {customers.length > 0 ? (
                  <select className="input text-sm" value={form.clienteId}
                    onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                    <option value="">Sin cliente / Ocasional</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input text-sm" placeholder="Nombre del cliente"
                    value={form.clienteNombre}
                    onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} />
                )}
              </div>

              {/* Monto */}
              <div>
                <label className="label">Monto total</label>
                <div className="flex gap-2">
                  <select className="input text-sm w-24 flex-shrink-0" value={form.moneda}
                    onChange={e => setForm(f => ({ ...f, moneda: e.target.value as 'USD' | 'ARS' }))}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                  <input type="number" min="0" className="input text-sm flex-1"
                    placeholder="0"
                    value={form.total || ''}
                    onChange={e => setForm(f => ({ ...f, total: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Forma de pago */}
              <div>
                <label className="label">Forma de pago</label>
                <select className="input text-sm" value={form.formaPago}
                  onChange={e => setForm(f => ({ ...f, formaPago: e.target.value }))}>
                  {FORMAS_PAGO.map(fp => <option key={fp}>{fp}</option>)}
                </select>
              </div>

              {/* Pagado */}
              <div>
                <label className="label">Estado del pago</label>
                <div className="flex gap-2">
                  {[
                    { value: true,  label: '✅ Pagado'   },
                    { value: false, label: '⏳ Pendiente' },
                  ].map(opt => (
                    <button key={String(opt.value)} onClick={() => setForm(f => ({ ...f, pagado: opt.value }))}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={form.pagado === opt.value
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas</label>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Detalles, modelo, observaciones..."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={!form.total || isPending}
                className="btn-primary flex-1">
                {isPending ? 'Guardando...' : 'Registrar venta'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card de venta ─────────────────────────────────────────────────────────────

function VentaCard({ venta }: { venta: Sale }) {
  const fecha = venta.fecha instanceof Date ? venta.fecha : new Date()
  const esPagada = venta.pagado

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: esPagada ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
            {esPagada
              ? <CheckCircle size={16} style={{ color: 'var(--green)' }} />
              : <Clock size={16} style={{ color: 'var(--amber)' }} />
            }
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {venta.customerName || 'Sin cliente'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {format(fecha, 'dd/MM/yyyy', { locale: es })} · {venta.formaPago}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {venta.currency === 'USD'
              ? `U$S ${venta.total.toLocaleString('es-AR')}`
              : `$${venta.total.toLocaleString('es-AR')}`}
          </p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 inline-block"
            style={esPagada
              ? { background: 'var(--green-bg)', color: 'var(--green)' }
              : { background: 'var(--amber-bg)', color: 'var(--amber)' }}>
            {esPagada ? 'Pagado' : 'Pendiente'}
          </span>
        </div>
      </div>
      {venta.notas && (
        <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
          {venta.notas}
        </p>
      )}
    </div>
  )
}
