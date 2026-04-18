'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import {
  getStockAccesorios, createStockAccesorio,
  updateStockAccesorio, deleteStockAccesorio,
  getCatalogoItems, getCatalogoSubcategorias,
} from '@/lib/services'
import type { StockAccesorio, PrecioVolumen, CatalogoItem, CatalogoSubcategoria } from '@/types'
import { fmtMonto } from '@/lib/format'

// Categorías base — se amplían con las del catálogo
const CATEGORIAS_BASE = [
  { id: 'battery_pack',    label: '🔋 Battery Pack' },
  { id: 'cargadores',      label: '⚡ Cargadores' },
  { id: 'cargadores_armar',label: '🔧 Cargadores p/armar' },
  { id: 'cables',          label: '🔌 Cables' },
  { id: 'cables_armar',    label: '🔧 Cables p/armar' },
  { id: 'fundas',          label: '📱 Fundas' },
  { id: 'templados',       label: '🔲 Templados' },
  { id: 'pencil',          label: '✏️ Pencil' },
  { id: 'airtag',          label: '🌎 AirTag' },
  { id: 'audio',           label: '🎧 Audio' },
  { id: 'otros',           label: '📦 Otros' },
]

type FormData = {
  nombre: string; categoria: string; descripcion: string
  moneda: 'ARS' | 'USD'; stock: number
  preciosVolumen: PrecioVolumen[]
}

const EMPTY_FORM: FormData = {
  nombre: '', categoria: 'cables', descripcion: '',
  moneda: 'ARS', stock: 0,
  preciosVolumen: [{ cantidad: 1, precio: 0 }],
}

export default function StockAccesorios({ workspaceId, canEdit = true, canDelete = true }: {
  workspaceId: string; canEdit?: boolean; canDelete?: boolean
}) {
  const [items, setItems]         = useState<StockAccesorio[]>([])
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([])
  const [catalogoSubcats, setCatalogoSubcats] = useState<CatalogoSubcategoria[]>([])
  const [loading, setLoading]     = useState(true)
  const [catFiltro, setCatFiltro] = useState('todos')
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editando, setEditando]   = useState<StockAccesorio | null>(null)
  const [form, setForm]           = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [data, cats, subs] = await Promise.all([
        getStockAccesorios(workspaceId),
        getCatalogoItems(workspaceId, 'accesorios'),
        getCatalogoSubcategorias(workspaceId, 'accesorios'),
      ])
      setItems(data)
      setCatalogoItems(cats)
      setCatalogoSubcats(subs)
    } finally { setLoading(false) }
  }

  // Categorías: base + extras del catálogo
  const categorias = useMemo(() => {
    const extra = catalogoSubcats
      .filter(s => !CATEGORIAS_BASE.find(b => b.id === s.id))
      .map(s => ({ id: s.id, label: `${s.emoji} ${s.nombre}` }))
    return [...CATEGORIAS_BASE, ...extra]
  }, [catalogoSubcats])

  // Sugerencias de nombre desde el catálogo
  const sugerencias = useMemo(() => {
    if (!form.nombre) return []
    return catalogoItems
      .map(i => i.nombre)
      .filter((n, i, arr) => arr.indexOf(n) === i)
      .filter(n => n.toLowerCase().includes(form.nombre.toLowerCase()))
      .slice(0, 10)
  }, [catalogoItems, form.nombre])

  const filtered = items
    .filter(i => catFiltro === 'todos' || i.categoria === catFiltro)
    .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()) || i.descripcion?.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => { setEditando(null); setForm({ ...EMPTY_FORM }); setShowForm(true) }

  const openEdit = (item: StockAccesorio) => {
    setEditando(item)
    setForm({
      nombre: item.nombre, categoria: item.categoria,
      descripcion: item.descripcion ?? '', moneda: item.moneda,
      stock: item.stock, preciosVolumen: [...item.preciosVolumen],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre) return
    setSaving(true)
    try {
      const data = {
        nombre: form.nombre, categoria: form.categoria,
        descripcion: form.descripcion || undefined,
        moneda: form.moneda, stock: form.stock,
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

  const addPrecio = () => setForm(f => ({ ...f, preciosVolumen: [...f.preciosVolumen, { cantidad: 0, precio: 0 }] }))
  const updPrecio = (idx: number, field: keyof PrecioVolumen, val: number) =>
    setForm(f => ({ ...f, preciosVolumen: f.preciosVolumen.map((p, i) => i === idx ? { ...p, [field]: val } : p) }))
  const remPrecio = (idx: number) =>
    setForm(f => ({ ...f, preciosVolumen: f.preciosVolumen.filter((_, i) => i !== idx) }))

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Accesorios</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{items.length} productos</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>
            <Plus size={13} /> Agregar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin accesorios</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Tocá Agregar para cargar tu primer producto
          </p>
        </div>
      ) : (
        <>
          {/* Filtro categoría */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setCatFiltro('todos')}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap"
              style={catFiltro === 'todos' ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              Todos ({items.length})
            </button>
            {categorias.filter(c => items.some(i => i.categoria === c.id)).map(c => (
              <button key={c.id} onClick={() => setCatFiltro(c.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap"
                style={catFiltro === c.id ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                {c.label} ({items.filter(i => i.categoria === c.id).length})
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
            {filtered.map(item => (
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
                    </div>

                    {/* Precios por volumen */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.preciosVolumen.map((pv, i) => (
                        <div key={i} className="flex flex-col items-center px-2.5 py-1.5 rounded-xl"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <span className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>x{pv.cantidad}</span>
                          <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-light)' }}>
                            {fmtMonto(pv.precio, item.moneda)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Stock */}
                    <div className="mt-2">
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
            ))}
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
              {/* Nombre con autocompletar del catálogo */}
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Ej: Cable USB-C a Lightning"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  autoFocus list="acc-nombres" />
                <datalist id="acc-nombres">
                  {sugerencias.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>

              {/* Categoría */}
              <div>
                <label className="label">Categoría</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {categorias.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, categoria: c.id }))}
                      className="py-2 px-2 rounded-xl text-xs font-medium text-left transition-all"
                      style={form.categoria === c.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción + Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Descripción</label>
                  <input className="input text-sm" placeholder="Ej: 1m Nylon"
                    value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="0" className="input text-sm"
                    value={form.stock || ''} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
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

              {/* Precios por cantidad */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Precios por cantidad</label>
                  <button onClick={addPrecio}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--brand-light)', border: '1px solid var(--border)' }}>
                    + Tramo
                  </button>
                </div>
                <div className="space-y-2">
                  {form.preciosVolumen.map((pv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>x</span>
                      <input type="number" min="1" className="input text-sm py-1.5 w-20"
                        placeholder="cant" value={pv.cantidad || ''}
                        onChange={e => updPrecio(idx, 'cantidad', Number(e.target.value))} />
                      <input type="number" min="0" className="input text-sm py-1.5 flex-1"
                        placeholder={form.moneda === 'USD' ? 'USD' : 'ARS'}
                        value={pv.precio || ''}
                        onChange={e => updPrecio(idx, 'precio', Number(e.target.value))} />
                      {form.preciosVolumen.length > 1 && (
                        <button onClick={() => remPrecio(idx)}
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
