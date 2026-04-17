'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import {
  getStockAccesorios, createStockAccesorio,
  updateStockAccesorio, deleteStockAccesorio,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { StockAccesorio, PrecioVolumen } from '@/types'
import { fmtARS, fmtUSD, fmtMonto } from '@/lib/format'

// ── Categorías disponibles ────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'cargadores',       label: '⚡️ Cargadores',           moneda: 'ARS' as const },
  { id: 'cargadores_armar', label: '🔧 Cargadores para armar', moneda: 'ARS' as const },
  { id: 'cables',           label: '🔌 Cables',               moneda: 'ARS' as const },
  { id: 'cables_armar',     label: '🔧 Cables para armar',    moneda: 'ARS' as const },
  { id: 'fundas',           label: '📱 Fundas',               moneda: 'ARS' as const },
  { id: 'fuente_original',  label: '⭐ Fuente Original',      moneda: 'USD' as const },
]

const fmtPrecio = (precio: number, moneda: 'ARS' | 'USD') =>
  moneda === 'USD'
    ? `U$S ${precio}`
    : `$${precio.toLocaleString('es-AR')}`

// ── Stock inicial desde el broadcast ─────────────────────────────────────────
const STOCK_INICIAL: Omit<StockAccesorio, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  // Cargadores
  {
    nombre: 'Fuente 5w', categoria: 'cargadores', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 5, precio: 7000 }, { cantidad: 10, precio: 6200 }, { cantidad: 30, precio: 5900 }, { cantidad: 50, precio: 5500 }],
  },
  {
    nombre: 'Fuente 20w (Americano)', categoria: 'cargadores', moneda: 'USD', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 5, precio: 7.5 }, { cantidad: 10, precio: 7 }, { cantidad: 30, precio: 6.5 }, { cantidad: 50, precio: 5.5 }],
  },
  // Cargadores para armar
  {
    nombre: 'Fuente 20w (Americano)', categoria: 'cargadores_armar', moneda: 'USD', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 5, precio: 7.5 }, { cantidad: 10, precio: 7 }, { cantidad: 30, precio: 6.5 }, { cantidad: 50, precio: 4.7 }, { cantidad: 100, precio: 4 }, { cantidad: 250, precio: 3 }],
  },
  // Cables
  {
    nombre: 'Cable USB a Lightning', categoria: 'cables', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 3800 }, { cantidad: 30, precio: 3000 }, { cantidad: 50, precio: 2500 }, { cantidad: 100, precio: 2000 }],
  },
  {
    nombre: 'Cable C a Lightning', categoria: 'cables', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 4300 }, { cantidad: 30, precio: 3800 }, { cantidad: 50, precio: 3300 }, { cantidad: 100, precio: 2800 }],
  },
  {
    nombre: 'Cable C a C (Mallado)', categoria: 'cables', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 5000 }, { cantidad: 30, precio: 4000 }, { cantidad: 50, precio: 3500 }, { cantidad: 100, precio: 3000 }],
  },
  // Cables para armar
  {
    nombre: 'Cable USB a Lightning', categoria: 'cables_armar', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 50, precio: 1900 }, { cantidad: 100, precio: 1500 }, { cantidad: 300, precio: 1200 }, { cantidad: 500, precio: 1050 }],
  },
  {
    nombre: 'Cable C a Lightning', categoria: 'cables_armar', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 50, precio: 2500 }, { cantidad: 100, precio: 1950 }, { cantidad: 300, precio: 1650 }, { cantidad: 500, precio: 1500 }],
  },
  {
    nombre: 'Cable C a C (Mallado)', categoria: 'cables_armar', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 50, precio: 2300 }, { cantidad: 100, precio: 1900 }, { cantidad: 300, precio: 1750 }, { cantidad: 500, precio: 1600 }],
  },
  // Fundas
  {
    nombre: 'Transparente', categoria: 'fundas', descripcion: '11 a 16 Pro Max', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 2900 }, { cantidad: 30, precio: 2300 }, { cantidad: 50, precio: 1800 }],
  },
  {
    nombre: 'Silicone Case', categoria: 'fundas', descripcion: '11 a 16 Pro Max', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 3600 }, { cantidad: 30, precio: 3100 }, { cantidad: 50, precio: 2700 }, { cantidad: 100, precio: 2300 }],
  },
  {
    nombre: 'Silicone Case', categoria: 'fundas', descripcion: '17 a 17 Pro Max', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 5200 }, { cantidad: 30, precio: 4600 }, { cantidad: 50, precio: 4100 }, { cantidad: 100, precio: 3800 }],
  },
  {
    nombre: 'Magsafe', categoria: 'fundas', descripcion: '11 a 16 Pro Max', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 3600 }, { cantidad: 30, precio: 3100 }, { cantidad: 50, precio: 2700 }, { cantidad: 100, precio: 2300 }],
  },
  {
    nombre: 'Magsafe', categoria: 'fundas', descripcion: '17 a 17 Pro Max', moneda: 'ARS', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 10, precio: 5200 }, { cantidad: 30, precio: 4600 }, { cantidad: 50, precio: 4100 }, { cantidad: 100, precio: 3800 }],
  },
  // Fuente original importada
  {
    nombre: 'Fuente 20w Original', categoria: 'fuente_original', moneda: 'USD', stock: 0, activo: true,
    preciosVolumen: [{ cantidad: 1, precio: 25 }, { cantidad: 10, precio: 20 }, { cantidad: 20, precio: 19 }, { cantidad: 50, precio: 17 }],
  },
]

type FormData = {
  nombre: string
  categoria: string
  descripcion: string
  moneda: 'ARS' | 'USD'
  stock: number
  preciosVolumen: PrecioVolumen[]
}

const EMPTY_FORM: FormData = {
  nombre: '', categoria: 'cargadores', descripcion: '',
  moneda: 'ARS', stock: 0, preciosVolumen: [{ cantidad: 1, precio: 0 }],
}

export default function StockAccesorios({ workspaceId, canEdit = true, canDelete = true }: { workspaceId: string; canEdit?: boolean; canDelete?: boolean }) {
  const { user } = useAuthStore()

  const [items, setItems] = useState<StockAccesorio[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<StockAccesorio | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getStockAccesorios(workspaceId)
      setItems(data)
    } finally { setLoading(false) }
  }

  // Carga el stock inicial desde el broadcast si no hay nada
  const cargarStockInicial = async () => {
    if (!user) return
    setSeeding(true)
    try {
      for (const item of STOCK_INICIAL) {
        await createStockAccesorio(workspaceId, { ...item, workspaceId })
      }
      await load()
    } finally { setSeeding(false) }
  }

  const filtered = items
    .filter(i => categoriaFiltro === 'todos' || i.categoria === categoriaFiltro)
    .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  const openEdit = (item: StockAccesorio) => {
    setEditando(item)
    setForm({
      nombre: item.nombre,
      categoria: item.categoria,
      descripcion: item.descripcion ?? '',
      moneda: item.moneda,
      stock: item.stock,
      preciosVolumen: [...item.preciosVolumen],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre || !user) return
    setSaving(true)
    try {
      const data = {
        nombre: form.nombre,
        categoria: form.categoria,
        descripcion: form.descripcion || undefined,
        moneda: form.moneda,
        stock: form.stock,
        preciosVolumen: form.preciosVolumen.filter(p => p.cantidad > 0 && p.precio > 0),
        activo: true,
      }
      if (editando) {
        await updateStockAccesorio(workspaceId, editando.id, data)
        setItems(prev => prev.map(i => i.id === editando.id ? { ...i, ...data } : i))
      } else {
        const id = await createStockAccesorio(workspaceId, { ...data, workspaceId })
        setItems(prev => [...prev, { id, ...data, workspaceId, createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (item: StockAccesorio) => {
    if (!confirm(`¿Eliminar ${item.nombre}?`)) return
    await deleteStockAccesorio(workspaceId, item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const addPrecio = () => setForm(f => ({
    ...f, preciosVolumen: [...f.preciosVolumen, { cantidad: 0, precio: 0 }],
  }))

  const updatePrecio = (idx: number, field: keyof PrecioVolumen, val: number) =>
    setForm(f => ({
      ...f,
      preciosVolumen: f.preciosVolumen.map((p, i) => i === idx ? { ...p, [field]: val } : p),
    }))

  const removePrecio = (idx: number) =>
    setForm(f => ({ ...f, preciosVolumen: f.preciosVolumen.filter((_, i) => i !== idx) }))

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Accesorios</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Cargadores · Cables · Fundas
          </p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="btn-primary gap-1 text-sm">
            <Plus size={15} /> Nuevo
          </button>
        )}
      </div>

      {/* Empty state con carga inicial */}
      {items.length === 0 && (
        <div className="card text-center py-6">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Sin accesorios cargados
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Podés cargar tu lista completa de un solo toque
          </p>
          <button onClick={cargarStockInicial} disabled={seeding} className="btn-primary mx-auto">
            {seeding ? 'Cargando...' : '⚡ Cargar mi lista completa'}
          </button>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Carga {STOCK_INICIAL.length} productos con sus precios. Podés editar stock y precios después.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Filtro categoría */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setCategoriaFiltro('todos')}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
              style={categoriaFiltro === 'todos'
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              Todos
            </button>
            {CATEGORIAS.map(c => (
              <button key={c.id} onClick={() => setCategoriaFiltro(c.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
                style={categoriaFiltro === c.id
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input className="input pl-8 text-sm" placeholder="Buscar accesorio..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {filtered.map(item => {
              const cat = CATEGORIAS.find(c => c.id === item.categoria)
              return (
                <div key={item.id} className="px-3 py-3 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {item.nombre}
                        </span>
                        {item.descripcion && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                            {item.descripcion}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {cat?.label}
                        </span>
                      </div>

                      {/* Precios por volumen */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.preciosVolumen.map((pv, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg font-medium"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                            x{pv.cantidad} {fmtMonto(pv.precio, item.moneda)}
                          </span>
                        ))}
                      </div>

                      {/* Stock */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: item.stock > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                            color: item.stock > 0 ? 'var(--green)' : 'var(--brand-light)',
                          }}>
                          {item.stock > 0 ? `${item.stock} u` : 'Sin stock'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      {canEdit && (
                        <button onClick={() => openEdit(item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar accesorio' : 'Nuevo accesorio'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              {/* Nombre */}
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Ej: Cable C a Lightning"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
              </div>

              {/* Categoría */}
              <div>
                <label className="label">Categoría</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIAS.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, categoria: c.id, moneda: c.moneda }))}
                      className="py-2 px-2 rounded-xl text-xs font-medium text-left transition-all"
                      style={form.categoria === c.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción + Moneda + Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Descripción</label>
                  <input className="input text-sm" placeholder="Ej: 11 a 16 Pro Max"
                    value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="0" className="input text-sm"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Moneda */}
              <div>
                <label className="label">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ARS', 'USD'] as const).map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, moneda: m }))}
                      className="py-2 rounded-xl text-sm font-semibold transition-all"
                      style={form.moneda === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precios por volumen */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Precios por volumen</label>
                  <button onClick={addPrecio}
                    className="text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ background: 'var(--surface-2)', color: 'var(--brand-light)', border: '1px solid var(--border)' }}>
                    + Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.preciosVolumen.map((pv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>x</span>
                        <input type="number" min="1" className="input text-sm py-1.5 w-20"
                          placeholder="cant" value={pv.cantidad || ''}
                          onChange={e => updatePrecio(idx, 'cantidad', Number(e.target.value))} />
                        <input type="number" min="0" className="input text-sm py-1.5 flex-1"
                          placeholder={form.moneda === 'USD' ? 'precio USD' : 'precio ARS'}
                          value={pv.precio || ''}
                          onChange={e => updatePrecio(idx, 'precio', Number(e.target.value))} />
                      </div>
                      {form.preciosVolumen.length > 1 && (
                        <button onClick={() => removePrecio(idx)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.nombre || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar' : 'Agregar'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
