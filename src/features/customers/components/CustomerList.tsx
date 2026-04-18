'use client'

import { useState, useTransition } from 'react'
import { Search, Plus, Pencil, Trash2, Phone, MessageCircle } from 'lucide-react'
import { useCustomers } from '@/hooks/useCustomers'
import { deleteCustomer } from '../actions'
import { CustomerForm } from './CustomerForm'
import type { Customer, CustomerType, CustomerStatus } from '../types'

// ── Badge helpers ─────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<CustomerStatus, { bg: string; color: string }> = {
  activo:    { bg: 'rgba(34,197,94,.12)',   color: '#4ade80' },
  potencial: { bg: 'rgba(251,191,36,.12)',  color: '#fbbf24' },
  dormido:   { bg: 'rgba(251,191,36,.12)',  color: '#fbbf24' },
  inactivo:  { bg: 'rgba(156,163,175,.12)', color: '#9ca3af' },
  perdido:   { bg: 'rgba(239,68,68,.12)',   color: '#f87171' },
}

const ESTADO_LABELS: Record<CustomerStatus, string> = {
  activo:    'Activo',
  potencial: 'Potencial',
  dormido:   'Dormido',
  inactivo:  'Inactivo',
  perdido:   'Perdido',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CustomerListProps {
  workspaceId: string
  canCreate?: boolean
  canEdit?:   boolean
  canDelete?: boolean
  labels?: {
    singular?:     string
    plural?:       string
    createLabel?:  string
    customerTypes?: Record<string, string>
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerList({
  workspaceId,
  canCreate = true,
  canEdit   = true,
  canDelete = false,
  labels,
}: CustomerListProps) {
  const [search,   setSearch]   = useState('')
  const [editing,  setEditing]  = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, startDelete] = useTransition()

  const { customers, loading } = useCustomers(workspaceId, { search })

  const singularLabel = labels?.singular ?? 'cliente'
  const pluralLabel   = labels?.plural   ?? 'clientes'

  function handleDelete(customer: Customer) {
    if (!confirm(`¿Eliminar a ${customer.nombre}?`)) return
    startDelete(async () => {
      await deleteCustomer(workspaceId, customer.id)
    })
  }

  function handleWhatsApp(customer: Customer) {
    if (!customer.telefono) return
    const num = customer.telefono.replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const showModal = creating || editing !== null

  if (showModal) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editing ? `Editar ${singularLabel}` : `Nuevo ${singularLabel}`}
          </h3>
          <button
            onClick={() => { setCreating(false); setEditing(null) }}
            style={{ color: 'var(--text-tertiary)' }}
          >✕</button>
        </div>
        <CustomerForm
          workspaceId={workspaceId}
          editingCustomer={editing ?? undefined}
          labels={labels}
          onSuccess={() => { setCreating(false); setEditing(null) }}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      </div>
    )
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {pluralLabel.charAt(0).toUpperCase() + pluralLabel.slice(1)}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {loading ? '…' : `${customers.length} ${customers.length === 1 ? singularLabel : pluralLabel}`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'var(--brand)' }}
          >
            <Plus size={13} />
            {labels?.createLabel ?? `Agregar`}
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        />
        <input
          className="input pl-8 text-sm"
          placeholder={`Buscar ${pluralLabel}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div
              key={i}
              className="h-[68px] rounded-2xl animate-pulse"
              style={{ background: 'var(--surface-2)' }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && customers.length === 0 && (
        <div className="text-center py-14">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {search ? `Sin resultados para "${search}"` : `Sin ${pluralLabel} todavía`}
          </p>
          {!search && canCreate && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Tocá + Agregar para cargar el primero
            </p>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && customers.length > 0 && (
        <div className="space-y-2">
          {customers.map(customer => {
            const badge = ESTADO_COLORS[customer.estado]
            return (
              <div
                key={customer.id}
                className="px-3 py-3 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-3">

                  {/* Avatar inicial */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                  >
                    {customer.nombre.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {customer.nombre}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {ESTADO_LABELS[customer.estado]}
                      </span>
                    </div>
                    {customer.telefono && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {customer.telefono}
                        {customer.barrio ? ` · ${customer.barrio}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {customer.telefono && (
                      <button
                        onClick={() => handleWhatsApp(customer)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: '#25d366' }}
                        title="WhatsApp"
                      >
                        <MessageCircle size={13} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setEditing(customer)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(customer)}
                        disabled={deleting}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
