'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Package, Trash2, Pencil } from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { createCatalogItem, deleteCatalogItem } from '@/features/catalog/actions'
import { useCatalog } from '@/hooks/useCatalog'
import type { CatalogItem } from '@/features/catalog/types'
import { fmtARS, fmtUSD } from '@/lib/format'

// Categorías base — se pueden sobreescribir desde SystemConfigProvider en el futuro
const DEFAULT_CATEGORIAS = [
  'Productos', 'Servicios', 'Accesorios', 'Repuestos', 'Otro',
]

type FormData = {
  categoria:    string
  subcategoria: string
  nombre:       string
  precio:       number
  currency:     'ARS' | 'USD'
}

const EMPTY: FormData = {
  categoria:    DEFAULT_CATEGORIAS[0],
  subcategoria: '',
  nombre:       '',
  precio:       0,
  currency:     'ARS',
}

export default function CatalogoPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { isViewerOnly, isAdmin } = useMemberRole(workspaceId)
  const canEdit = !isViewerOnly

  const { items, loading } = useCatalog(workspaceId)
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormData>({ ...EMPTY })
  const [isPending, startTransition] = useTransition()
  const [error,     setError]     = useState<string | null>(null)

  // Filtrado local
  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.nombre.toLowerCase().includes(q) ||
      item.categoria.toLowerCase().includes(q) ||
      item.subcategoria.toLowerCase().includes(q)
    )
  })

  // Agrupados por categoría
  const porCategoria = filtered.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = []
    acc[item.categoria].push(item)
    return acc
  }, {})

  function handleSave() {
    if (!form.nombre.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createCatalogItem(workspaceId, {
        categoria:    form.categoria,
        subcategoria: form.subcategoria || form.categoria,
        nombre:       form.nombre.trim(),
        precio:       form.precio || undefined,
        currency:     form.currency,
        orden:        items.length,
      })
      if (!result.ok) { setError(result.error); return }
      // useCatalog se actualiza automáticamente via onSnapshot
      setShowForm(false)
      setForm({ ...EMPTY })
    })
  }

  function handleDelete(itemId: string) {
    if (!confirm('¿Eliminar este item del catálogo?')) return
    startTransition(async () => {
      await deleteCatalogItem(workspaceId, itemId)
      // useCatalog onSnapshot actualizará automáticamente
    })
  }

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-14 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-2)' }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Catálogo
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} items · {Object.keys(porCategoria).length} categorías
          </p>
        </div>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary gap-1.5 text-sm"
          >
            <Plus size={14} /> Agregar
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Nuevo item
            </h3>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY }) }}
              style={{ color: 'var(--text-tertiary)' }}
            >✕</button>
          </div>

          {error && (
            <p className="text-xs px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
              {error}
            </p>
          )}

          {/* Nombre */}
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input text-sm"
              placeholder="Ej: iPhone 16 Pro, Servicio de reparación..."
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="label">Categoría</label>
            <select
              className="input text-sm"
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            >
              {DEFAULT_CATEGORIAS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría */}
          <div>
            <label className="label">Subcategoría</label>
            <input
              className="input text-sm"
              placeholder="Ej: 128GB, Pantalla, Cable..."
              value={form.subcategoria}
              onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}
            />
          </div>

          {/* Precio */}
          <div>
            <label className="label">Precio (opcional)</label>
            <div className="flex gap-2">
              <select
                className="input text-sm w-20 flex-shrink-0"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'ARS' | 'USD' }))}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="number"
                min="0"
                className="input text-sm flex-1"
                placeholder="0"
                value={form.precio || ''}
                onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.nombre.trim() || isPending}
              className="btn-primary flex-1"
            >
              {isPending ? 'Guardando...' : 'Agregar al catálogo'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY }) }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      {items.length > 0 && (
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            className="input pl-8 text-sm"
            placeholder="Buscar en catálogo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="text-center py-14">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--surface-2)' }}
          >
            <Package size={22} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Catálogo vacío
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Agregá productos o servicios para usarlos en ventas
          </p>
        </div>
      )}

      {/* Sin resultados */}
      {items.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
          Sin resultados para "{search}"
        </p>
      )}

      {/* Lista por categoría */}
      {Object.entries(porCategoria).map(([categoria, catItems]) => (
        <div key={categoria}>
          <p
            className="section-label mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {categoria} · {catItems.length}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {catItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-3"
                style={{
                  background: 'var(--surface)',
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}>
                    {item.nombre}
                  </p>
                  {item.subcategoria && item.subcategoria !== item.categoria && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.subcategoria}
                    </p>
                  )}
                </div>

                {/* Precio */}
                {item.precio != null && item.precio > 0 && (
                  <span className="text-sm font-semibold flex-shrink-0"
                    style={{ color: 'var(--text-primary)' }}>
                    {item.currency === 'USD' ? fmtUSD(item.precio) : fmtARS(item.precio)}
                  </span>
                )}

                {/* Borrar */}
                {canEdit && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
