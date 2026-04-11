'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Phone, MessageCircle, MoreVertical, User, Filter } from 'lucide-react'
import { getClientes, createCliente, updateCliente, deleteCliente } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Cliente, ClienteTipo, ClienteEstado } from '@/types'

const TIPO_LABELS: Record<ClienteTipo, string> = {
  final: 'Cliente final',
  revendedor: 'Revendedor',
  mayorista: 'Mayorista',
  empresa: 'Empresa',
}
const TIPO_COLORS: Record<ClienteTipo, string> = {
  final: 'badge-blue',
  revendedor: 'badge-green',
  mayorista: 'badge-amber',
  empresa: 'badge-gray',
}
const ESTADO_LABELS: Record<ClienteEstado, string> = {
  activo: '🟢 Activo',
  dormido: '💤 Dormido',
  potencial: '⭐ Potencial',
  perdido: '❌ Perdido',
}

const EMPTY: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId' | 'creadoPor'> = {
  nombre: '', telefono: '', email: '', direccion: '',
  tipo: 'final', estado: 'potencial', notas: '',
}

export default function ClientesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<ClienteTipo | 'todos'>('todos')
  const [filterEstado, setFilterEstado] = useState<ClienteEstado | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
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
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
    const matchTipo = filterTipo === 'todos' || c.tipo === filterTipo
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado
    return matchSearch && matchTipo && matchEstado
  })

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }

  const openEdit = (c: Cliente) => {
    setEditando(c)
    setForm({
      nombre: c.nombre, telefono: c.telefono ?? '',
      email: c.email ?? '', direccion: c.direccion ?? '',
      tipo: c.tipo, estado: c.estado, notas: c.notas ?? '',
    })
    setShowForm(true)
    setMenuId(null)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !user) return
    setSaving(true)
    try {
      if (editando) {
        await updateCliente(workspaceId, editando.id, { ...form, updatedAt: new Date() })
      } else {
        await createCliente(workspaceId, { ...form, workspaceId, creadoPor: user.uid })
      }
      await load()
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    await deleteCliente(workspaceId, id)
    await load()
    setMenuId(null)
  }

  const handleEstado = async (c: Cliente, estado: ClienteEstado) => {
    await updateCliente(workspaceId, c.id, { estado, ultimoContacto: new Date() })
    await load()
    setMenuId(null)
  }

  const whatsapp = (tel: string) => {
    const clean = tel.replace(/\D/g, '')
    window.open(`https://wa.me/54${clean}`, '_blank')
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Clientes</h2>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">{clientes.length} en total</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono..."
          className="input pl-9"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {(['todos', 'final', 'revendedor', 'mayorista', 'empresa'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterTipo(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterTipo === t
                ? 'bg-[var(--surface-3)] text-white'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            }`}
          >
            {t === 'todos' ? 'Todos' : TIPO_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="empty-state mt-6">
            <div className="empty-icon"><User size={22} className="text-[var(--text-tertiary)]" /></div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              {search ? 'Sin resultados' : 'Todavía no hay clientes'}
            </p>
            <p className="text-[var(--text-tertiary)] text-xs mt-1">
              {search ? 'Probá con otro término' : 'Tocá + Nuevo para agregar el primero'}
            </p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="card card-hover relative">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center font-semibold text-[var(--text-secondary)] flex-shrink-0">
                {c.nombre.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{c.nombre}</span>
                  <span className={`badge ${TIPO_COLORS[c.tipo]}`}>{TIPO_LABELS[c.tipo]}</span>
                </div>
                {c.telefono && (
                  <p className="text-[var(--text-secondary)] text-xs mt-0.5">{c.telefono}</p>
                )}
                <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{ESTADO_LABELS[c.estado]}</p>
              </div>
              {/* Acciones rápidas */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {c.telefono && (
                  <button
                    onClick={() => whatsapp(c.telefono!)}
                    className="btn-icon text-[var(--green)] hover:bg-[var(--green-bg)]"
                  >
                    <MessageCircle size={16} />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                    className="btn-icon"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuId === c.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-modal z-50 overflow-hidden animate-scale-in">
                      <button onClick={() => openEdit(c)} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]">Editar</button>
                      <div className="px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-2)]">Cambiar estado</div>
                      {(['activo','dormido','potencial','perdido'] as ClienteEstado[]).map(est => (
                        <button key={est} onClick={() => handleEstado(c, est)} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-2)] ${c.estado === est ? 'font-semibold text-brand-600' : 'text-[var(--text-primary)]'}`}>
                          {ESTADO_LABELS[est]}
                        </button>
                      ))}
                      <div className="border-t border-[var(--border)]" />
                      <button onClick={() => handleDelete(c.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--red-bg)]">Eliminar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {c.notas && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2 pl-13 border-t border-[var(--border)] pt-2">{c.notas}</p>
            )}
          </div>
        ))}
      </div>

      {/* Backdrop para cerrar menú */}
      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-modal overflow-y-auto max-h-[90vh] animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[var(--text-primary)]">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
                <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">Nombre completo *</label>
                  <input className="input" placeholder="Juan Pérez" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" type="tel" placeholder="11 4445-2967" value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="juan@ejemplo.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Dirección</label>
                  <input className="input" placeholder="Calle 123, La Plata" value={form.direccion} onChange={e => setForm(f => ({...f, direccion: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipo</label>
                    <select className="input" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value as ClienteTipo}))}>
                      {(Object.entries(TIPO_LABELS) as [ClienteTipo, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <select className="input" value={form.estado} onChange={e => setForm(f => ({...f, estado: e.target.value as ClienteEstado}))}>
                      {(Object.entries(ESTADO_LABELS) as [ClienteEstado, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.replace(/^[^\s]+ /, '')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Notas</label>
                  <textarea className="input resize-none" rows={3} placeholder="Información adicional..." value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))} />
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
