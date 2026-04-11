'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Package, MoreVertical, Copy } from 'lucide-react'
import { getProductos, createProducto, updateProducto, deleteProducto } from '@/lib/services'
import { useWorkspaceStore, useAuthStore } from '@/store'
import type { Producto, ProductoCondicion } from '@/types'

const CONDICION_LABELS: Record<ProductoCondicion, string> = {
  nuevo: '🆕 Nuevo',
  usado: '🔄 Usado',
  reacondicionado: '✨ Reacondicionado',
}

const CATEGORIAS = ['iPhone', 'iPad', 'Apple Watch', 'AirPods', 'Accesorios', 'Servicio', 'Otro']

const EMPTY = {
  nombre: '', categoria: 'iPhone', condicion: 'nuevo' as ProductoCondicion,
  precioFinal: 0, precioRevendedor: 0, precioMayorista: 0,
  moneda: 'USD' as 'USD' | 'ARS',
  stockActual: 0,
  bateria: undefined as number | undefined,
  ciclos: undefined as number | undefined,
  color: '', storage: '',
  activo: true,
}

export default function CatalogoPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { getActiveWorkspace } = useWorkspaceStore()
  const ws = getActiveWorkspace()

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('todos')
  const [filterCond, setFilterCond] = useState<ProductoCondicion | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getProductos(workspaceId)
      setProductos(data)
    } finally { setLoading(false) }
  }

  const filtered = productos.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.color?.toLowerCase().includes(search.toLowerCase()) ||
      p.storage?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'todos' || p.categoria === filterCat
    const matchCond = filterCond === 'todos' || p.condicion === filterCond
    return matchSearch && matchCat && matchCond
  })

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY, moneda: ws?.config.moneda === 'ARS' ? 'ARS' : 'USD' })
    setShowForm(true)
  }

  const openEdit = (p: Producto) => {
    setEditando(p)
    setForm({
      nombre: p.nombre, categoria: p.categoria, condicion: p.condicion,
      precioFinal: p.precioFinal ?? 0, precioRevendedor: p.precioRevendedor ?? 0,
      precioMayorista: p.precioMayorista ?? 0, moneda: p.moneda,
      stockActual: p.stockActual ?? 0,
      bateria: p.bateria, ciclos: p.ciclos,
      color: p.color ?? '', storage: p.storage ?? '', activo: p.activo,
    })
    setShowForm(true)
    setMenuId(null)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !user) return
    setSaving(true)
    try {
      const data = {
        ...form,
        workspaceId,
        bateria: form.bateria || undefined,
        ciclos: form.ciclos || undefined,
      }
      if (editando) {
        await updateProducto(workspaceId, editando.id, data)
      } else {
        await createProducto(workspaceId, data)
      }
      await load()
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await deleteProducto(workspaceId, id)
    await load()
    setMenuId(null)
  }

  const fmtPrecio = (n?: number, moneda = 'USD') => {
    if (!n) return '—'
    return moneda === 'USD' ? `U$S ${n.toLocaleString('es-AR')}` : `$${n.toLocaleString('es-AR')}`
  }

  const generarListaWA = () => {
    const nuevos = filtered.filter(p => p.condicion === 'nuevo')
    const usados = filtered.filter(p => p.condicion === 'usado')
    let msg = '📱 *LISTA DE PRECIOS*\n\n'
    if (nuevos.length) {
      msg += '*🆕 NUEVOS*\n'
      nuevos.forEach(p => {
        msg += `▸ ${p.nombre}${p.storage ? ' ' + p.storage : ''}${p.color ? ' ' + p.color : ''} → ${fmtPrecio(p.precioFinal, p.moneda)}\n`
      })
    }
    if (usados.length) {
      msg += '\n*🔄 USADOS*\n'
      usados.forEach(p => {
        msg += `▸ ${p.nombre}${p.storage ? ' ' + p.storage : ''}${p.bateria ? ' ' + p.bateria + '%' : ''}${p.color ? ' ' + p.color : ''} → ${fmtPrecio(p.precioFinal, p.moneda)}\n`
      })
    }
    navigator.clipboard.writeText(msg)
    alert('✅ Lista copiada al portapapeles')
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Catálogo</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">{productos.length} productos</p>
        </div>
        <div className="flex gap-2">
          {productos.length > 0 && (
            <button onClick={generarListaWA} className="btn-secondary text-xs">
              <Copy size={13} /> Lista WA
            </button>
          )}
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por modelo, color, storage..." className="input pl-9" />
      </div>

      {/* Filtros condición */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {(['todos', 'nuevo', 'usado', 'reacondicionado'] as const).map(c => (
          <button key={c} onClick={() => setFilterCond(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterCond === c ? 'bg-[var(--surface-3)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'}`}>
            {c === 'todos' ? 'Todos' : CONDICION_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="empty-state mt-6">
            <div className="empty-icon"><Package size={22} className="text-[var(--text-tertiary)]" /></div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">{search ? 'Sin resultados' : 'Catálogo vacío'}</p>
            <p className="text-[var(--text-tertiary)] text-xs mt-1">{search ? 'Probá con otro término' : 'Tocá + Nuevo para agregar productos'}</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="card card-hover">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-lg flex-shrink-0">
                {p.condicion === 'nuevo' ? '📱' : p.condicion === 'usado' ? '🔄' : '✨'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] text-sm">{p.nombre}</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                      {[p.storage, p.color, p.bateria ? `${p.bateria}%` : null, p.ciclos ? `${p.ciclos} ciclos` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[var(--text-primary)] text-sm">{fmtPrecio(p.precioFinal, p.moneda)}</p>
                    {p.precioRevendedor ? <p className="text-xs text-[var(--text-tertiary)]">Rev: {fmtPrecio(p.precioRevendedor, p.moneda)}</p> : null}
                  </div>
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <button onClick={() => setMenuId(menuId === p.id ? null : p.id)} className="btn-icon">
                  <MoreVertical size={16} />
                </button>
                {menuId === p.id && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-modal z-50 overflow-hidden animate-scale-in">
                    <button onClick={() => openEdit(p)} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--red-bg)]">Eliminar</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-modal overflow-y-auto max-h-[90vh] animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[var(--text-primary)]">{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
                <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Nombre / Modelo *</label>
                  <input className="input" placeholder="iPhone 16 Pro" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Categoría</label>
                    <select className="input" value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))}>
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Condición</label>
                    <select className="input" value={form.condicion} onChange={e => setForm(f => ({...f, condicion: e.target.value as ProductoCondicion}))}>
                      {(Object.entries(CONDICION_LABELS) as [ProductoCondicion, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.replace(/^[^\s]+ /, '')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Storage</label>
                    <input className="input" placeholder="128GB" value={form.storage} onChange={e => setForm(f => ({...f, storage: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Color</label>
                    <input className="input" placeholder="Black" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} />
                  </div>
                </div>
                {form.condicion === 'usado' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Batería %</label>
                      <input className="input" type="number" min="0" max="100" placeholder="85" value={form.bateria ?? ''} onChange={e => setForm(f => ({...f, bateria: Number(e.target.value) || undefined}))} />
                    </div>
                    <div>
                      <label className="label">Ciclos</label>
                      <input className="input" type="number" min="0" placeholder="0" value={form.ciclos ?? ''} onChange={e => setForm(f => ({...f, ciclos: Number(e.target.value) || undefined}))} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Moneda</label>
                  <div className="flex gap-2">
                    {(['USD', 'ARS'] as const).map(m => (
                      <button key={m} onClick={() => setForm(f => ({...f, moneda: m}))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${form.moneda === m ? 'bg-[var(--surface-3)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
                        {m === 'USD' ? '🇺🇸 USD' : '🇦🇷 ARS'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Precio cliente final</label>
                  <input className="input" type="number" min="0" placeholder="720" value={form.precioFinal || ''} onChange={e => setForm(f => ({...f, precioFinal: Number(e.target.value)}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Precio revendedor</label>
                    <input className="input" type="number" min="0" placeholder="700" value={form.precioRevendedor || ''} onChange={e => setForm(f => ({...f, precioRevendedor: Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="label">Precio mayorista</label>
                    <input className="input" type="number" min="0" placeholder="680" value={form.precioMayorista || ''} onChange={e => setForm(f => ({...f, precioMayorista: Number(e.target.value)}))} />
                  </div>
                </div>
                <div>
                  <label className="label">Stock disponible</label>
                  <input className="input" type="number" min="0" value={form.stockActual || ''} onChange={e => setForm(f => ({...f, stockActual: Number(e.target.value)}))} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSave} disabled={!form.nombre.trim() || saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Guardar'}
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
