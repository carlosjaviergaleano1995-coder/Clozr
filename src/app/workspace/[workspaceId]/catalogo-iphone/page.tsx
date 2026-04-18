'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getCatalogoItems, getCatalogoSubcategorias,
  createCatalogoItem, deleteCatalogoItem,
  createCatalogoSubcategoria, deleteCatalogoSubcategoria,
} from '@/lib/services'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { CatalogoItem, CatalogoSubcategoria } from '@/types'

const CATEGORIAS_PRINCIPALES = [
  { id: 'smartphones',  label: '📱 Smartphones' },
  { id: 'accesorios',   label: '🔌 Accesorios' },
  { id: 'computadoras', label: '💻 Computadoras' },
  { id: 'tablets',      label: '📟 Tablets' },
  { id: 'wearables',    label: '⌚ Wearables' },
  { id: 'audio',        label: '🎧 Audio' },
  { id: 'gaming',       label: '🎮 Gaming' },
  { id: 'otros',        label: '📦 Otros' },
]

const EMOJIS = ['📱','🔌','💻','📟','⌚','🎧','🎮','📦','⚡','🔧','🧲','✏️','🌎','🎥','✨','🔗','📷','🎵','🖥️']

export default function CatalogoIPhonePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { isAdmin, loading: roleLoading } = useMemberRole(workspaceId)

  const [items, setItems]   = useState<CatalogoItem[]>([])
  const [subcats, setSubcats] = useState<CatalogoSubcategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState('accesorios')
  const [subcatActiva, setSubcatActiva] = useState<string | null>(null)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  // Nuevo item
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [addingTo, setAddingTo] = useState<string | null>(null)  // subcategoria id

  // Nueva subcategoría
  const [nuevaSubcat, setNuevaSubcat] = useState('')
  const [nuevaSubcatEmoji, setNuevaSubcatEmoji] = useState('📦')
  const [showNuevaSubcat, setShowNuevaSubcat] = useState(false)

  useEffect(() => { load() }, [workspaceId, categoriaActiva])

  const load = async () => {
    setLoading(true)
    try {
      const [its, subs] = await Promise.all([
        getCatalogoItems(workspaceId, categoriaActiva),
        getCatalogoSubcategorias(workspaceId, categoriaActiva),
      ])
      setItems(its)
      setSubcats(subs)
      setSubcatActiva(null)
    } finally { setLoading(false) }
  }


  // Agrupar items por subcategoría
  const porSubcat = useMemo(() => {
    const m: Record<string, CatalogoItem[]> = {}
    items.forEach(i => {
      if (!m[i.subcategoria]) m[i.subcategoria] = []
      m[i.subcategoria].push(i)
    })
    return m
  }, [items])

  const handleAddItem = async (subcategoria: string) => {
    if (!nuevoNombre.trim()) return
    const orden = (porSubcat[subcategoria]?.length ?? 0)
    const id = await createCatalogoItem(workspaceId, {
      workspaceId, categoria: categoriaActiva, subcategoria,
      nombre: nuevoNombre.trim(), activo: true, orden,
    })
    setItems(prev => [...prev, { id, workspaceId, categoria: categoriaActiva, subcategoria, nombre: nuevoNombre.trim(), activo: true, orden, creadoAt: new Date() }])
    setNuevoNombre('')
    setAddingTo(null)
  }

  const handleDeleteItem = async (item: CatalogoItem) => {
    await deleteCatalogoItem(workspaceId, item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleAddSubcat = async () => {
    if (!nuevaSubcat.trim()) return
    const id = await createCatalogoSubcategoria(workspaceId, {
      workspaceId, categoria: categoriaActiva,
      nombre: nuevaSubcat.trim(), emoji: nuevaSubcatEmoji,
      activo: true, orden: subcats.length,
    })
    setSubcats(prev => [...prev, { id, workspaceId, categoria: categoriaActiva, nombre: nuevaSubcat.trim(), emoji: nuevaSubcatEmoji, activo: true, orden: subcats.length, creadoAt: new Date() }])
    setNuevaSubcat('')
    setShowNuevaSubcat(false)
  }

  const handleDeleteSubcat = async (sub: CatalogoSubcategoria) => {
    if (!confirm(`¿Eliminar la subcategoría "${sub.nombre}"? Los items quedarán sin subcategoría.`)) return
    await deleteCatalogoSubcategoria(workspaceId, sub.id)
    setSubcats(prev => prev.filter(s => s.id !== sub.id))
  }

  const toggleExpandida = (id: string) => {
    setExpandidas(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // Subcats a mostrar: las de Firestore + subcats de items sin subcat registrada
  const todasSubcats = useMemo(() => {
    const registradas = subcats.map(s => s.id)
    // subcategorías implícitas (solo en items, no en subcats collection)
    const implicitas = Array.from(new Set(items.map(i => i.subcategoria)))
      .filter(s => !subcats.find(r => r.id === s || r.nombre.toLowerCase() === s.toLowerCase()))
      .map(s => ({ id: s, nombre: s, emoji: '📦', isImplicita: true }))
    return [
      ...subcats.map(s => ({ ...s, isImplicita: false })),
      ...implicitas,
    ]
  }, [subcats, items])

  if (roleLoading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  if (!isAdmin) return (
    <div className="text-center py-12">
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Solo administradores pueden editar el catálogo</p>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Catálogo</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {items.length} productos · {subcats.length} subcategorías
        </p>
      </div>

      {/* Selector categoría principal */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {CATEGORIAS_PRINCIPALES.map(c => (
          <button key={c.id} onClick={() => setCategoriaActiva(c.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
            style={categoriaActiva === c.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
        </div>
      ) : (
        <>
          {/* Subcategorías */}
          <div className="space-y-3">
            {todasSubcats.map(sub => {
              const subItems = porSubcat[sub.id] ?? porSubcat[sub.nombre.toLowerCase()] ?? porSubcat[sub.nombre] ?? []
              const estaExpandida = expandidas.has(sub.id)
              const isAdding = addingTo === sub.id

              return (
                <div key={sub.id} className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  {/* Header subcategoría */}
                  <div className="flex items-center justify-between px-3 py-2.5"
                    style={{ background: 'var(--surface-2)' }}>
                    <button className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => toggleExpandida(sub.id)}>
                      <span>{sub.emoji}</span>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {sub.nombre}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
                        {subItems.length}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setAddingTo(isAdding ? null : sub.id); setNuevoNombre('') }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: isAdding ? 'var(--brand)' : 'var(--surface-3)', color: isAdding ? '#fff' : 'var(--text-tertiary)' }}>
                        <Plus size={13} />
                      </button>
                      {!sub.isImplicita && (
                        <button onClick={() => handleDeleteSubcat(sub as unknown as CatalogoSubcategoria)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button onClick={() => toggleExpandida(sub.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ color: 'var(--text-tertiary)' }}>
                        {estaExpandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Input nuevo item */}
                  {isAdding && (
                    <div className="flex gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <input className="input text-sm flex-1 py-1.5" autoFocus
                        placeholder="Nombre del producto..."
                        value={nuevoNombre}
                        onChange={e => setNuevoNombre(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(sub.id); if (e.key === 'Escape') setAddingTo(null) }} />
                      <button onClick={() => handleAddItem(sub.id)}
                        disabled={!nuevoNombre.trim()}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
                        style={{ background: nuevoNombre.trim() ? 'var(--brand)' : 'var(--surface-3)', color: nuevoNombre.trim() ? '#fff' : 'var(--text-tertiary)' }}>
                        Agregar
                      </button>
                    </div>
                  )}

                  {/* Items */}
                  {estaExpandida && (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {subItems.length === 0 ? (
                        <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
                          Sin items — tocá + para agregar
                        </p>
                      ) : (
                        subItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.nombre}</span>
                            <button onClick={() => handleDeleteItem(item)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ml-2"
                              style={{ color: 'var(--text-tertiary)' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Agregar subcategoría */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px dashed var(--border)' }}>
            {!showNuevaSubcat ? (
              <button onClick={() => setShowNuevaSubcat(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm transition-all"
                style={{ color: 'var(--text-tertiary)' }}>
                <Plus size={14} /> Nueva subcategoría en {CATEGORIAS_PRINCIPALES.find(c => c.id === categoriaActiva)?.label}
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Nueva subcategoría</p>
                <input className="input text-sm" placeholder="Nombre (ej: Cables para armar)" autoFocus
                  value={nuevaSubcat} onChange={e => setNuevaSubcat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubcat()} />
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>Emoji</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setNuevaSubcatEmoji(e)}
                        className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                        style={nuevaSubcatEmoji === e
                          ? { background: 'var(--surface-3)', border: '2px solid var(--brand)' }
                          : { background: 'var(--surface-2)' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddSubcat} disabled={!nuevaSubcat.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: nuevaSubcat.trim() ? 'var(--brand)' : 'var(--surface-3)' }}>
                    Crear subcategoría
                  </button>
                  <button onClick={() => { setShowNuevaSubcat(false); setNuevaSubcat('') }}
                    className="btn-secondary px-4">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
