'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Plus, TrendingUp, CheckCircle, Clock, Search, X,
  UserPlus, Package, Zap, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useAuthStore } from '@/store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useSales }     from '@/hooks/useSales'
import { useCustomers } from '@/hooks/useCustomers'
import { useCatalog }   from '@/hooks/useCatalog'
import { createSale }   from '@/features/sales/actions'
import { createCustomer } from '@/features/customers/actions'
import { applyPricingPolicyForItem } from '@/features/customers/types'
import type { Sale, SaleItem, SalePayment, PaymentMethod } from '@/features/sales/types'
import type { Customer } from '@/features/customers/types'
import type { CatalogItem } from '@/features/catalog/types'
import { fmtARS, fmtUSD } from '@/lib/format'

// ── Constantes ────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; currency: 'ARS' | 'USD' }[] = [
  { method: 'efectivo_usd',  label: 'Efectivo USD',    currency: 'USD' },
  { method: 'efectivo_ars',  label: 'Efectivo ARS',    currency: 'ARS' },
  { method: 'transferencia', label: 'Transferencia',   currency: 'ARS' },
  { method: 'usdt',          label: 'USDT',            currency: 'USD' },
  { method: 'tarjeta',       label: 'Tarjeta',         currency: 'ARS' },
  { method: 'cuotas',        label: 'Cuotas',          currency: 'ARS' },
  { method: 'otro',          label: 'Otro',            currency: 'ARS' },
]

function fmtMoney(n: number, currency: 'ARS' | 'USD') {
  return currency === 'USD' ? fmtUSD(n) : fmtARS(n)
}

// ── Buscador de cliente con creación rápida ───────────────────────────────────

function CustomerPicker({
  customers, selected, onSelect, onCreateNew,
}: {
  customers:   Customer[]
  selected:    Customer | null
  onSelect:    (c: Customer | null) => void
  onCreateNew: (nombre: string) => void
}) {
  const [q,         setQ]         = useState('')
  const [open,      setOpen]      = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    if (!q.trim()) return customers.slice(0, 6)
    const term = q.toLowerCase()
    return customers
      .filter(c =>
        c.nombre.toLowerCase().includes(term) ||
        c.telefono?.includes(term)
      )
      .slice(0, 6)
  }, [q, customers])

  const exactMatch = customers.some(c => c.nombre.toLowerCase() === q.toLowerCase())

  function pick(c: Customer) {
    onSelect(c)
    setQ('')
    setOpen(false)
  }

  function clear() {
    onSelect(null)
    setQ('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (selected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '12px',
        background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--blue-bg)', color: 'var(--blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700,
        }}>
          {selected.nombre.split(' ').slice(0,2).map(w => w[0]).join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selected.nombre}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
            {selected.tipo} · {selected.estado}
            {selected.pricingPolicy && (
              <span style={{ marginLeft: '6px', color: 'var(--amber)' }}>
                🏷️ Precio personalizado
              </span>
            )}
          </p>
        </div>
        <button onClick={clear} style={{ color: 'var(--text-tertiary)', lineHeight: 0 }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          className="input text-sm"
          style={{ paddingLeft: '34px' }}
          placeholder="Buscar cliente por nombre o teléfono..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderRadius: '14px', overflow: 'hidden', zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {matches.map(c => (
            <button
              key={c.id}
              onClick={() => pick(c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface-2)', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
              }}>
                {c.nombre.split(' ').slice(0,2).map(w => w[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {c.nombre}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {c.tipo} · {c.telefono ?? 'Sin teléfono'}
                  {c.pricingPolicy && <span style={{ color: 'var(--amber)', marginLeft: '6px' }}>🏷️</span>}
                </p>
              </div>
            </button>
          ))}

          {/* Opción de crear nuevo */}
          {q.trim() && !exactMatch && (
            <button
              onClick={() => { onCreateNew(q.trim()); setOpen(false); setQ('') }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', textAlign: 'left',
                background: 'var(--brand)', opacity: 0.92,
              }}
            >
              <UserPlus size={16} style={{ color: '#fff', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                Crear cliente "{q.trim()}"
              </p>
            </button>
          )}

          {matches.length === 0 && !q.trim() && (
            <p style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Sin clientes registrados todavía
            </p>
          )}

          {/* Cerrar al hacer click afuera */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── Selector de producto ──────────────────────────────────────────────────────

function ProductPicker({
  catalog, onAdd,
}: {
  catalog:  CatalogItem[]
  onAdd:    (item: CatalogItem, imei?: string) => void
}) {
  const [q,       setQ]       = useState('')
  const [open,    setOpen]    = useState(false)
  const [imeiFor, setImeiFor] = useState<CatalogItem | null>(null)
  const [imei,    setImei]    = useState('')

  const matches = useMemo(() => {
    if (!q.trim()) return catalog.filter(i => i.activo).slice(0, 8)
    const term = q.toLowerCase()
    return catalog
      .filter(i => i.activo && (
        i.nombre.toLowerCase().includes(term) ||
        i.categoria.toLowerCase().includes(term)
      ))
      .slice(0, 8)
  }, [q, catalog])

  function selectItem(item: CatalogItem) {
    if (item.imei && item.imei.length > 0) {
      // Tiene IMEIs — pedir cuál
      setImeiFor(item)
      setOpen(false)
    } else {
      onAdd(item)
      setQ('')
      setOpen(false)
    }
  }

  function confirmImei() {
    if (!imeiFor) return
    onAdd(imeiFor, imei.trim() || undefined)
    setImeiFor(null)
    setImei('')
    setQ('')
  }

  if (imeiFor) {
    return (
      <div style={{
        padding: '12px', borderRadius: '12px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Seleccionar IMEI — {imeiFor.nombre}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {imeiFor.imei!.map(i => (
            <button key={i} onClick={() => { setImei(i); }}
              style={{
                padding: '8px 12px', borderRadius: '8px', textAlign: 'left',
                fontSize: '13px', fontFamily: 'monospace',
                background: imei === i ? 'var(--brand)' : 'var(--surface)',
                color:      imei === i ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${imei === i ? 'transparent' : 'var(--border)'}`,
              }}>
              {i}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={confirmImei}
            style={{
              flex: 1, padding: '8px', borderRadius: '10px',
              background: 'var(--brand)', color: '#fff',
              fontSize: '13px', fontWeight: 600,
            }}>
            {imei ? 'Confirmar IMEI' : 'Sin IMEI específico'}
          </button>
          <button onClick={() => { setImeiFor(null); setImei('') }}
            style={{
              padding: '8px 12px', borderRadius: '10px',
              background: 'var(--surface-2)', color: 'var(--text-secondary)',
              fontSize: '13px', border: '1px solid var(--border)',
            }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Package size={14} style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none',
        }} />
        <input
          className="input text-sm"
          style={{ paddingLeft: '34px' }}
          placeholder="Buscar en catálogo / stock..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>

      {open && (matches.length > 0 || q.trim()) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderRadius: '14px', overflow: 'hidden', zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {matches.map(item => {
            const agotado = item.trackStock && (item.stock ?? 0) <= 0
            return (
              <button
                key={item.id}
                onClick={() => !agotado && selectItem(item)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)',
                  opacity: agotado ? 0.4 : 1,
                  cursor:  agotado ? 'not-allowed' : 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.nombre}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                    {item.categoria}
                    {item.precio != null && ` · ${fmtMoney(item.precio, item.currency ?? 'USD')}`}
                    {item.trackStock && (
                      <span style={{ marginLeft: '6px', color: agotado ? 'var(--brand-light)' : 'var(--green)' }}>
                        {agotado ? '· Sin stock' : `· ${item.stock} en stock`}
                      </span>
                    )}
                  </p>
                </div>
                {!agotado && <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
              </button>
            )
          })}
          <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VentasPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { user }    = useAuthStore()
  const { isViewerOnly } = useMemberRole(workspaceId)
  const canCreate   = !isViewerOnly

  const { sales, thisMonthSales, totalThisMonth, loading } = useSales(workspaceId)
  const { customers }                                       = useCustomers(workspaceId)
  const { items: catalog }                                  = useCatalog(workspaceId)

  const [isPending,    startTransition] = useTransition()
  const [showForm,     setShowForm]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [items,            setItems]            = useState<SaleItem[]>([])
  const [pagos,            setPagos]            = useState<SalePayment[]>([
    { metodo: 'efectivo_usd', moneda: 'USD', monto: 0, esSena: false },
  ])
  const [notas,            setNotas]            = useState('')
  const [modoRapido,       setModoRapido]       = useState(false) // item libre sin stock

  // Modo rápido — item libre
  const [libreDesc,  setLibreDesc]  = useState('')
  const [librePrecio, setLibrePrecio] = useState(0)
  const [libreCurrency, setLibreCurrency] = useState<'ARS'|'USD'>('USD')
  const [libreCantidad, setLibreCantidad] = useState(1)

  // ── Totales calculados ────────────────────────────────────────────────────
  const subtotal    = items.reduce((s, i) => s + i.subtotal, 0)
  const totalPagos  = pagos.reduce((s, p) => s + p.monto, 0)
  const saldo       = Math.max(0, subtotal - totalPagos)
  const pagadoTotal = totalPagos >= subtotal && subtotal > 0

  // ── Agregar producto del catálogo ─────────────────────────────────────────
  function addFromCatalog(catalogItem: CatalogItem, imei?: string) {
    const precio = selectedCustomer?.pricingPolicy
      ? applyPricingPolicyForItem(
          catalogItem.precio ?? 0,
          selectedCustomer.pricingPolicy,
          catalogItem.id,
          1,
        )
      : (catalogItem.precio ?? 0)

    setItems(prev => [...prev, {
      catalogItemId:  catalogItem.id,
      descripcion:    catalogItem.nombre,
      cantidad:       1,
      precioBase:     catalogItem.precio ?? 0,
      precioUnitario: precio,
      subtotal:       precio,
      imei,
      desdeStock:     catalogItem.trackStock ?? false,
    }])
  }

  // ── Agregar item libre ────────────────────────────────────────────────────
  function addLibre() {
    if (!libreDesc.trim() || !librePrecio) return
    const precio  = librePrecio
    const subtot  = precio * libreCantidad
    setItems(prev => [...prev, {
      descripcion:    libreDesc.trim(),
      cantidad:       libreCantidad,
      precioUnitario: precio,
      subtotal:       subtot,
      desdeStock:     false,
    }])
    setLibreDesc(''); setLibrePrecio(0); setLibreCantidad(1)
    setModoRapido(false)
  }

  // ── Crear cliente rápido desde el buscador ────────────────────────────────
  function handleCreateCustomer(nombre: string) {
    startTransition(async () => {
      const result = await createCustomer(workspaceId, {
        nombre, tipo: 'final', estado: 'activo',
      }, user?.uid)
      if (result.ok) {
        // El hook useCustomers actualizará automáticamente
        // Buscamos el cliente recién creado en la próxima render
        // Por ahora seleccionamos por nombre (se actualizará cuando llegue del hook)
        setSelectedCustomer({
          id: result.data.id, nombre, tipo: 'final', estado: 'activo',
          workspaceId, totalSales: 0, creadoPor: user?.uid ?? '',
          createdAt: new Date(), updatedAt: new Date(),
        })
      }
    })
  }

  // ── Guardar venta ─────────────────────────────────────────────────────────
  function handleSave() {
    if (items.length === 0) { setError('Agregá al menos un item'); return }
    if (totalPagos === 0)   { setError('Registrá al menos un pago'); return }
    setError(null)

    startTransition(async () => {
      const result = await createSale(workspaceId, {
        customerId:     selectedCustomer?.id,
        customerName:   selectedCustomer?.nombre ?? 'Sin cliente',
        vendedorId:     user?.uid,
        vendedorNombre: user?.displayName,
        items,
        pagos: pagos.filter(p => p.monto > 0),
        notas: notas || undefined,
        fecha: new Date(),
      })

      if (!result.ok) { setError(result.error); return }

      // Reset
      setShowForm(false)
      setSelectedCustomer(null)
      setItems([])
      setPagos([{ metodo: 'efectivo_usd', moneda: 'USD', monto: 0, esSena: false }])
      setNotas('')
      setError(null)
    })
  }

  function resetForm() {
    setShowForm(false)
    setSelectedCustomer(null)
    setItems([])
    setPagos([{ metodo: 'efectivo_usd', moneda: 'USD', monto: 0, esSena: false }])
    setNotas('')
    setError(null)
    setModoRapido(false)
  }

  if (loading) return (
    <div className="space-y-3 mt-2 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="animate-fade-in pb-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Ventas
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {thisMonthSales.length} este mes · {sales.length} total
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="btn-primary press"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 13px', borderRadius: '12px' }}>
            <Plus size={13} /> Registrar
          </button>
        )}
      </div>

      {/* Métricas del mes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card">
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Ventas del mes</p>
          <p className="stat-number">{thisMonthSales.length}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total facturado</p>
          <p className="stat-number" style={{ fontSize: '18px', color: 'var(--green)' }}>
            {fmtARS(totalThisMonth)}
          </p>
        </div>
      </div>

      {/* Lista de ventas */}
      {sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>💰</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Sin ventas todavía</p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Registrá tu primera venta cuando cerrés
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sales.map(v => <VentaCard key={v.id} venta={v} />)}
        </div>
      )}

      {/* ── MODAL NUEVA VENTA ─────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={resetForm}
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: '24px', maxHeight: '92vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)' }} />
            </div>

            <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Título */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nueva venta
                </h3>
                <button onClick={resetForm} className="btn-icon">✕</button>
              </div>

              {error && (
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--red-bg)', color: 'var(--brand-light)', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              {/* ── STEP 1: Cliente ──────────────────────────────────────── */}
              <div>
                <p className="section-label" style={{ marginBottom: '10px' }}>1. Cliente</p>
                <CustomerPicker
                  customers={customers}
                  selected={selectedCustomer}
                  onSelect={setSelectedCustomer}
                  onCreateNew={handleCreateCustomer}
                />
                {!selectedCustomer && (
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                    Opcional — podés registrar la venta sin asignar un cliente
                  </p>
                )}
              </div>

              {/* ── STEP 2: Productos ────────────────────────────────────── */}
              <div>
                <p className="section-label" style={{ marginBottom: '10px' }}>2. Productos</p>

                {/* Items agregados */}
                {items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {items.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '12px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.descripcion}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {item.cantidad} × {fmtMoney(item.precioUnitario, 'USD')}
                            {item.imei && <span style={{ marginLeft: '6px', fontFamily: 'monospace' }}>{item.imei}</span>}
                            {item.desdeStock && <span style={{ marginLeft: '6px', color: 'var(--green)' }}>· Del stock</span>}
                            {item.precioBase != null && item.precioBase !== item.precioUnitario && (
                              <span style={{ marginLeft: '6px', color: 'var(--amber)' }}>
                                🏷️ (lista: {fmtMoney(item.precioBase, 'USD')})
                              </span>
                            )}
                          </p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                          {fmtMoney(item.subtotal, 'USD')}
                        </p>
                        <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          style={{ color: 'var(--text-tertiary)', lineHeight: 0, flexShrink: 0 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar desde catálogo */}
                {!modoRapido && (
                  <>
                    <ProductPicker catalog={catalog} onAdd={addFromCatalog} />
                    <button
                      onClick={() => setModoRapido(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)',
                        marginTop: '8px', padding: '4px 0',
                      }}>
                      <Zap size={12} /> Agregar item libre (sin catálogo)
                    </button>
                  </>
                )}

                {/* Item libre */}
                {modoRapido && (
                  <div style={{
                    padding: '12px', borderRadius: '14px',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Item rápido
                      </p>
                      <button onClick={() => setModoRapido(false)}
                        style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Cancelar
                      </button>
                    </div>
                    <input className="input text-sm" placeholder="Descripción del producto o servicio"
                      value={libreDesc} onChange={e => setLibreDesc(e.target.value)} autoFocus />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="input text-sm" style={{ width: '70px', flexShrink: 0 }}
                        value={libreCurrency} onChange={e => setLibreCurrency(e.target.value as 'ARS'|'USD')}>
                        <option value="USD">USD</option>
                        <option value="ARS">ARS</option>
                      </select>
                      <input type="number" min="0" className="input text-sm" style={{ flex: 1 }}
                        placeholder="Precio unitario"
                        value={librePrecio || ''} onChange={e => setLibrePrecio(Number(e.target.value))} />
                      <input type="number" min="1" className="input text-sm" style={{ width: '60px', flexShrink: 0 }}
                        placeholder="Cant."
                        value={libreCantidad} onChange={e => setLibreCantidad(Number(e.target.value))} />
                    </div>
                    <button onClick={addLibre} disabled={!libreDesc.trim() || !librePrecio}
                      style={{
                        padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                        background: libreDesc.trim() && librePrecio ? 'var(--brand)' : 'var(--surface-3)',
                        color: libreDesc.trim() && librePrecio ? '#fff' : 'var(--text-tertiary)',
                      }}>
                      Agregar item
                    </button>
                  </div>
                )}
              </div>

              {/* ── STEP 3: Pagos ────────────────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p className="section-label">3. Forma de pago</p>
                  {subtotal > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: saldo > 0 ? 'var(--amber)' : 'var(--green)' }}>
                      {saldo > 0 ? `Saldo pendiente: ${fmtMoney(saldo, 'USD')}` : '✓ Cubierto'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pagos.map((pago, idx) => (
                    <div key={idx} style={{
                      display: 'flex', gap: '6px', alignItems: 'center',
                      padding: '10px 12px', borderRadius: '12px',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                    }}>
                      <select
                        className="input text-sm"
                        style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                        value={pago.metodo}
                        onChange={e => {
                          const opt = PAYMENT_OPTIONS.find(o => o.method === e.target.value)!
                          setPagos(prev => prev.map((p, i) => i === idx
                            ? { ...p, metodo: opt.method, moneda: opt.currency }
                            : p
                          ))
                        }}>
                        {PAYMENT_OPTIONS.map(o => (
                          <option key={o.method} value={o.method}>{o.label}</option>
                        ))}
                      </select>

                      <select
                        className="input text-sm"
                        style={{ width: '64px', flexShrink: 0, padding: '6px 4px', fontSize: '12px' }}
                        value={pago.moneda}
                        onChange={e => setPagos(prev => prev.map((p, i) => i === idx ? { ...p, moneda: e.target.value as 'ARS'|'USD' } : p))}>
                        <option value="USD">USD</option>
                        <option value="ARS">ARS</option>
                      </select>

                      <input type="number" min="0"
                        className="input text-sm"
                        style={{ width: '90px', flexShrink: 0 }}
                        placeholder="Monto"
                        value={pago.monto || ''}
                        onChange={e => setPagos(prev => prev.map((p, i) => i === idx ? { ...p, monto: Number(e.target.value) } : p))} />

                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, cursor: 'pointer' }}>
                        <input type="checkbox" checked={pago.esSena ?? false}
                          onChange={e => setPagos(prev => prev.map((p, i) => i === idx ? { ...p, esSena: e.target.checked } : p))} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Seña</span>
                      </label>

                      {pagos.length > 1 && (
                        <button onClick={() => setPagos(prev => prev.filter((_, i) => i !== idx))}
                          style={{ color: 'var(--text-tertiary)', lineHeight: 0, flexShrink: 0 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setPagos(prev => [...prev, { metodo: 'efectivo_ars', moneda: 'ARS', monto: 0, esSena: false }])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 600, color: 'var(--brand)',
                      padding: '4px 0',
                    }}>
                    <Plus size={13} /> Agregar otro medio de pago
                  </button>
                </div>
              </div>

              {/* Resumen */}
              {subtotal > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: '14px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{fmtMoney(subtotal, 'USD')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total pagado</span>
                    <span style={{ fontSize: '13px', color: totalPagos >= subtotal ? 'var(--green)' : 'var(--amber)' }}>
                      {fmtMoney(totalPagos, 'USD')}
                    </span>
                  </div>
                  {saldo > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>Saldo pendiente</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>{fmtMoney(saldo, 'USD')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notas */}
              <div>
                <p className="section-label" style={{ marginBottom: '8px' }}>
                  Notas <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none' }}>opcional</span>
                </p>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Observaciones, acuerdos especiales..."
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>

              {/* Botón confirmar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSave}
                  disabled={items.length === 0 || totalPagos === 0 || isPending}
                  className="btn-primary"
                  style={{ flex: 1, opacity: (items.length === 0 || totalPagos === 0) ? 0.5 : 1 }}>
                  {isPending ? 'Guardando...' : `Confirmar venta${subtotal > 0 ? ' · ' + fmtMoney(subtotal, 'USD') : ''}`}
                </button>
                <button onClick={resetForm} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card de venta ─────────────────────────────────────────────────────────────

function VentaCard({ venta }: { venta: Sale }) {
  const [expanded, setExpanded] = useState(false)
  const fecha    = venta.fecha instanceof Date ? venta.fecha : new Date()
  const pagado   = venta.pagado
  const total    = venta.total
  const currency = (venta as any).currency ?? 'ARS'

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '16px', overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: pagado ? 'var(--green-bg)' : 'var(--amber-bg)',
          color: pagado ? 'var(--green)' : 'var(--amber)',
        }}>
          {pagado ? <CheckCircle size={17} /> : <Clock size={17} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {venta.customerName || 'Sin cliente'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {format(fecha, 'dd/MM/yyyy · HH:mm', { locale: es })}
            {venta.vendedorNombre && ` · ${venta.vendedorNombre}`}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {currency === 'USD' ? fmtUSD(total) : fmtARS(total)}
          </p>
          <span className={`chip ${pagado ? 'chip-green' : 'chip-amber'}`} style={{ marginTop: '3px' }}>
            {pagado ? 'Pagado' : `Saldo ${fmtARS((venta as any).saldo ?? 0)}`}
          </span>
        </div>

        <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          {/* Items */}
          {venta.items?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p className="section-label" style={{ marginBottom: '6px' }}>Productos</p>
              {venta.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {item.cantidad}× {item.descripcion}
                    {item.imei && <span style={{ marginLeft: '6px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.imei}</span>}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fmtARS(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagos */}
          {venta.pagos?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p className="section-label" style={{ marginBottom: '6px' }}>Pagos</p>
              {venta.pagos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {p.metodo.replace('_', ' ')}
                    {p.esSena && <span style={{ marginLeft: '6px', color: 'var(--amber)' }}>(seña)</span>}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.moneda === 'USD' ? fmtUSD(p.monto) : fmtARS(p.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {venta.notas && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '10px', fontStyle: 'italic' }}>
              {venta.notas}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
