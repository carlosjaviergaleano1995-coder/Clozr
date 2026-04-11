'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, MessageCircle, MoreVertical, User, Pencil, Trash2 } from 'lucide-react'
import { getClientes, createCliente, updateCliente, deleteCliente, getWorkspaces } from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import type { Cliente, ClienteTipo, ClienteEstado } from '@/types'

// ── Configs por tipo de workspace ────────────────────────────────────────────

// Servicios (Verisure): solo RP y RE
const TIPOS_SERVICIOS: { id: ClienteTipo; label: string; color: string; bg: string; descripcion: string }[] = [
  { id: 'final',      label: 'RP',    color: 'var(--brand-light)', bg: 'rgba(232,0,29,0.12)', descripcion: 'Recurso Propio — cliente conseguido por vos' },
  { id: 'empresa',    label: 'RE',    color: 'var(--blue)',        bg: 'var(--blue-bg)',       descripcion: 'Recurso Empresa — cliente asignado por la empresa' },
]

// Productos (iPhone Club): final, revendedor, mayorista
const TIPOS_PRODUCTOS: { id: ClienteTipo; label: string; color: string; bg: string }[] = [
  { id: 'final',      label: 'Final',      color: 'var(--blue)',        bg: 'var(--blue-bg)' },
  { id: 'revendedor', label: 'Revendedor', color: 'var(--green)',       bg: 'var(--green-bg)' },
  { id: 'mayorista',  label: 'Mayorista',  color: 'var(--amber)',       bg: 'var(--amber-bg)' },
]

const ESTADO_CONFIG: Record<ClienteEstado, { label: string; emoji: string; color: string }> = {
  activo:    { label: 'Activo',    emoji: '🟢', color: 'var(--green)' },
  potencial: { label: 'Potencial', emoji: '⭐', color: 'var(--blue)' },
  dormido:   { label: 'Dormido',   emoji: '💤', color: 'var(--amber)' },
  perdido:   { label: 'Perdido',   emoji: '❌', color: 'var(--text-tertiary)' },
}

type FormData = Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId' | 'creadoPor'>

const EMPTY: FormData = {
  nombre: '', telefono: '', email: '', direccion: '',
  tipo: 'final', estado: 'potencial', notas: '',
}

export default function ClientesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()

  const ws = workspaces.find(w => w.id === workspaceId)
  const esServicios = ws?.tipo === 'servicios'

  const tiposDisponibles = esServicios ? TIPOS_SERVICIOS : TIPOS_PRODUCTOS

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<ClienteTipo | 'todos'>('todos')
  const [filterEstado, setFilterEstado] = useState<ClienteEstado | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getClientes(workspaceId)
      setClientes(data)
    } finally { setLoading(false) }
  }

  const filtered = clientes.filter(c => {
    const matchSearch = !search ||
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchTipo   = filterTipo === 'todos' || c.tipo === filterTipo
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado
    return matchSearch && matchTipo && matchEstado
  }).sort((a, b) => {
    // Activos primero, luego potenciales, dormidos, perdidos
    const orden = { activo: 0, potencial: 1, dormido: 2, perdido: 3 }
    return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9)
  })

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY, tipo: tiposDisponibles[0].id })
    setShowForm(true)
  }

  const openEdit = (c: Cliente) => {
    setEditando(c)
    setForm({
      nombre:    c.nombre,
      telefono:  c.telefono   ?? '',
      email:     c.email      ?? '',
      direccion: c.direccion  ?? '',
      tipo:      c.tipo,
      estado:    c.estado,
      notas:     c.notas      ?? '',
    })
    setShowForm(true)
    setMenuId(null)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !user) return
    setSaving(true)
    try {
      if (editando) {
        await updateCliente(workspaceId, editando.id, form)
        setClientes(prev => prev.map(c => c.id === editando.id ? { ...c, ...form } : c))
      } else {
        const id = await createCliente(workspaceId, { ...form, workspaceId, creadoPor: user.uid })
        setClientes(prev => [...prev, {
          id, ...form, workspaceId, creadoPor: user.uid,
          createdAt: new Date(), updatedAt: new Date(),
        }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    await deleteCliente(workspaceId, id)
    setClientes(prev => prev.filter(c => c.id !== id))
    setMenuId(null)
  }

  const handleEstado = async (c: Cliente, estado: ClienteEstado) => {
    await updateCliente(workspaceId, c.id, { estado, ultimoContacto: new Date() })
    setClientes(prev => prev.map(x => x.id === c.id ? { ...x, estado } : x))
    setMenuId(null)
  }

  const tipoInfo = (tipo: ClienteTipo) =>
    tiposDisponibles.find(t => t.id === tipo) ?? { label: tipo, color: 'var(--text-tertiary)', bg: 'var(--surface-2)' }

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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clientes</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {clientes.length} en total
            {esServicios && (
              <> · {clientes.filter(c => c.tipo === 'final').length} RP · {clientes.filter(c => c.tipo === 'empresa').length} RE</>
            )}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary gap-1">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-9 text-sm" placeholder="Buscar nombre, teléfono..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={() => setFilterTipo('todos')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={filterTipo === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todos
        </button>
        {tiposDisponibles.map(t => (
          <button key={t.id} onClick={() => setFilterTipo(t.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filterTipo === t.id
              ? { background: t.color, color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {t.label}
          </button>
        ))}
        <div className="w-px mx-0.5" style={{ background: 'var(--border)' }} />
        {(Object.keys(ESTADO_CONFIG) as ClienteEstado[]).map(e => (
          <button key={e} onClick={() => setFilterEstado(filterEstado === e ? 'todos' : e)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={filterEstado === e
              ? { background: 'var(--surface-3)', color: 'var(--text-primary)', border: `1px solid ${ESTADO_CONFIG[e].color}` }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {ESTADO_CONFIG[e].emoji} {ESTADO_CONFIG[e].label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--surface-2)' }}>
            <User size={22} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {search ? 'Sin resultados' : 'Todavía no hay clientes'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'Probá con otro término' : 'Tocá + Nuevo para agregar el primero'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const tInfo = tipoInfo(c.tipo)
            const eInfo = ESTADO_CONFIG[c.estado]
            return (
              <div key={c.id} className="px-3 py-3 rounded-xl relative"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: tInfo.bg, color: tInfo.color }}>
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {c.nombre}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: tInfo.bg, color: tInfo.color }}>
                        {tInfo.label}
                      </span>
                      <span className="text-[10px]" style={{ color: eInfo.color }}>
                        {eInfo.emoji} {eInfo.label}
                      </span>
                    </div>
                    {c.telefono && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{c.telefono}</p>
                    )}
                    {c.direccion && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>📍 {c.direccion}</p>
                    )}
                    {c.notas && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>{c.notas}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.telefono && (
                      <a href={`https://wa.me/54${c.telefono.replace(/\D/g,'')}`} target="_blank"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <button onClick={() => openEdit(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Pencil size={13} />
                    </button>
                    <div className="relative">
                      <button onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                        <MoreVertical size={13} />
                      </button>
                      {menuId === c.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg z-50 overflow-hidden animate-scale-in"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                            Cambiar estado
                          </div>
                          {(Object.keys(ESTADO_CONFIG) as ClienteEstado[]).map(est => (
                            <button key={est} onClick={() => handleEstado(c, est)}
                              className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                              style={{
                                color: c.estado === est ? ESTADO_CONFIG[est].color : 'var(--text-primary)',
                                fontWeight: c.estado === est ? 600 : 400,
                                background: 'transparent',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {ESTADO_CONFIG[est].emoji} {ESTADO_CONFIG[est].label}
                            </button>
                          ))}
                          <div style={{ borderTop: '1px solid var(--border)' }} />
                          <button onClick={() => handleDelete(c.id)}
                            className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                            style={{ color: 'var(--brand-light)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            🗑 Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              {/* Nombre */}
              <div>
                <label className="label">Nombre *</label>
                <input className="input text-sm" placeholder="Juan Pérez"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  autoFocus />
              </div>

              {/* Tipo — botones visuales */}
              <div>
                <label className="label">{esServicios ? 'Origen' : 'Tipo'}</label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiposDisponibles.length}, 1fr)` }}>
                  {tiposDisponibles.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                      className="py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={form.tipo === t.id
                        ? { background: t.color, color: '#fff', border: `1.5px solid ${t.color}` }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)' }}>
                      {t.label}
                      {'descripcion' in t && form.tipo === t.id && (
                        <span className="block text-[9px] font-normal opacity-80 mt-0.5 leading-tight">
                          {(t as any).descripcion}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="label">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ESTADO_CONFIG) as ClienteEstado[]).map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, estado: e }))}
                      className="py-2 rounded-xl text-xs font-semibold transition-all"
                      style={form.estado === e
                        ? { background: 'var(--surface-3)', color: ESTADO_CONFIG[e].color, border: `1px solid ${ESTADO_CONFIG[e].color}` }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {ESTADO_CONFIG[e].emoji} {ESTADO_CONFIG[e].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="label">Teléfono</label>
                <input className="input text-sm" type="tel" placeholder="221 4445-2967"
                  value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>

              {/* Dirección */}
              <div>
                <label className="label">Dirección</label>
                <input className="input text-sm" placeholder="Calle 123, La Plata"
                  value={form.direccion ?? ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>

              {/* Email (solo productos/mixto) */}
              {!esServicios && (
                <div>
                  <label className="label">Email</label>
                  <input className="input text-sm" type="email" placeholder="juan@ejemplo.com"
                    value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="label">Notas</label>
                <textarea className="input text-sm resize-none" rows={3}
                  placeholder={esServicios ? 'Observaciones, objeciones, seguimiento...' : 'Info adicional...'}
                  value={form.notas ?? ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.nombre.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
