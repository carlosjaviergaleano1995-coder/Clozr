'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Phone, MessageCircle, Pencil, Trash2, Search } from 'lucide-react'
import {
  getRevendedores, createRevendedor, updateRevendedor, deleteRevendedor,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Revendedor, RevendedorEstado } from '@/types'
import { toDate } from '@/lib/services'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CONFIG: Record<RevendedorEstado, { label: string; color: string; bg: string }> = {
  activo:    { label: 'Activo',    color: 'var(--green)',       bg: 'var(--green-bg)' },
  dormido:   { label: 'Dormido',   color: 'var(--amber)',       bg: 'var(--amber-bg)' },
  potencial: { label: 'Potencial', color: 'var(--blue)',        bg: 'var(--blue-bg)' },
  inactivo:  { label: 'Inactivo',  color: 'var(--text-tertiary)', bg: 'var(--surface-3)' },
}

type FormData = Omit<Revendedor, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'creadoPor'>
const EMPTY: FormData = {
  nombre: '', telefono: '', instagram: '', zona: '',
  estado: 'potencial', notas: '', volumenMensual: undefined,
}

export default function RevendedoresPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [revendedores, setRevendedores] = useState<Revendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<RevendedorEstado | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Revendedor | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getRevendedores(workspaceId)
      setRevendedores(data)
    } finally { setLoading(false) }
  }

  const filtered = revendedores
    .filter(r => filtroEstado === 'todos' || r.estado === filtroEstado)
    .filter(r => !search || `${r.nombre} ${r.zona ?? ''} ${r.instagram ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const orden = { activo: 0, potencial: 1, dormido: 2, inactivo: 3 }
      return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9)
    })

  const openNew = () => { setEditando(null); setForm({ ...EMPTY }); setShowForm(true) }
  const openEdit = (r: Revendedor) => {
    setEditando(r)
    setForm({ nombre: r.nombre, telefono: r.telefono ?? '', instagram: r.instagram ?? '',
      zona: r.zona ?? '', estado: r.estado, notas: r.notas ?? '', volumenMensual: r.volumenMensual })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !user) return
    setSaving(true)
    try {
      if (editando) {
        await updateRevendedor(workspaceId, editando.id, { ...form, ultimoContacto: new Date() })
        setRevendedores(prev => prev.map(r => r.id === editando.id ? { ...r, ...form } : r))
      } else {
        const id = await createRevendedor(workspaceId, {
          ...form, workspaceId, creadoPor: user.uid, ultimoContacto: new Date(),
        })
        setRevendedores(prev => [...prev, {
          id, ...form, workspaceId, creadoPor: user.uid,
          ultimoContacto: new Date(), createdAt: new Date(), updatedAt: new Date(),
        }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (r: Revendedor) => {
    if (!confirm(`¿Eliminar a ${r.nombre}?`)) return
    await deleteRevendedor(workspaceId, r.id)
    setRevendedores(prev => prev.filter(x => x.id !== r.id))
  }

  const marcarContacto = async (r: Revendedor) => {
    await updateRevendedor(workspaceId, r.id, { ultimoContacto: new Date(), estado: 'activo' })
    setRevendedores(prev => prev.map(x => x.id === r.id
      ? { ...x, ultimoContacto: new Date(), estado: 'activo' } : x))
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Revendedores</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {revendedores.filter(r => r.estado === 'activo').length} activos · {revendedores.filter(r => r.estado === 'dormido').length} dormidos
          </p>
        </div>
        <button onClick={openNew} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['todos', 'activo', 'potencial', 'dormido', 'inactivo'] as const).map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={filtroEstado === e
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {e === 'todos' ? 'Todos' : ESTADO_CONFIG[e].label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar nombre, zona, Instagram..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin revendedores</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Agregá tu primer revendedor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const cfg = ESTADO_CONFIG[r.estado]
            const ultimoContacto = r.ultimoContacto
              ? formatDistanceToNow(toDate(r.ultimoContacto), { addSuffix: true, locale: es })
              : 'Sin contacto'
            return (
              <div key={r.id} className="px-3 py-3 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {r.nombre}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {r.zona && (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>📍 {r.zona}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {r.instagram && (
                        <span className="text-xs" style={{ color: 'var(--blue)' }}>@{r.instagram}</span>
                      )}
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {ultimoContacto}
                      </span>
                      {r.volumenMensual && (
                        <span className="text-[10px]" style={{ color: 'var(--green)' }}>
                          ~U$S {r.volumenMensual}/mes
                        </span>
                      )}
                    </div>
                    {r.notas && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>{r.notas}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {r.telefono && (
                      <a href={`https://wa.me/54${r.telefono.replace(/\D/g,'')}`} target="_blank"
                        onClick={() => marcarContacto(r)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                        <MessageCircle size={13} />
                      </a>
                    )}
                    <button onClick={() => openEdit(r)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(r)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
                {editando ? 'Editar revendedor' : 'Nuevo revendedor'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input text-sm" placeholder="Nombre o apodo"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input text-sm" placeholder="2214..."
                    value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Instagram</label>
                  <input className="input text-sm" placeholder="usuario"
                    value={form.instagram ?? ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Zona</label>
                  <input className="input text-sm" placeholder="La Plata, CABA..."
                    value={form.zona ?? ''} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Vol. mensual USD</label>
                  <input type="number" className="input text-sm" placeholder="500"
                    value={form.volumenMensual ?? ''} onChange={e => setForm(f => ({ ...f, volumenMensual: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
              </div>
              <div>
                <label className="label">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ESTADO_CONFIG) as RevendedorEstado[]).map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, estado: e }))}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={form.estado === e
                        ? { background: ESTADO_CONFIG[e].bg, color: ESTADO_CONFIG[e].color, border: `1px solid ${ESTADO_CONFIG[e].color}` }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {ESTADO_CONFIG[e].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Preferencias, historial, observaciones..."
                  value={form.notas ?? ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.nombre.trim() || saving} className="btn-primary flex-1">
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
