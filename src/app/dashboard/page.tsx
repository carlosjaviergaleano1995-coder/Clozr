'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, LogOut, Pencil, Trash2, X, Check } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, logOut } from '@/lib/services'
import type { Workspace, WorkspaceType } from '@/types'

const WORKSPACE_TYPES: { tipo: WorkspaceType; label: string; desc: string; emoji: string }[] = [
  { tipo: 'servicios', label: 'Servicios', desc: 'Alarmas, seguros, internet', emoji: '🛡️' },
  { tipo: 'productos', label: 'Productos', desc: 'Electrónica, ropa, accesorios', emoji: '📦' },
  { tipo: 'mixto',     label: 'Mixto',     desc: 'Productos y servicios', emoji: '⚡' },
]

const COLORS = ['#E8001D','#2563eb','#7c3aed','#059669','#d97706','#0891b2']

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const [newNombre, setNewNombre] = useState('')
  const [newTipo, setNewTipo] = useState<WorkspaceType>('servicios')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [editNombre, setEditNombre] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    loadWorkspaces()
  }, [user])

  const loadWorkspaces = async () => {
    if (!user) return
    try {
      const ws = await getWorkspaces(user.uid)
      setWorkspaces(ws)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (ws: Workspace) => {
    if (editingId || menuId) return
    setActiveWorkspace(ws.id)
    router.push(`/workspace/${ws.id}`)
  }

  const handleCreate = async () => {
    if (!newNombre.trim() || !user) return
    setCreating(true)
    try {
      const tipo = WORKSPACE_TYPES.find(t => t.tipo === newTipo)!
      const id = await createWorkspace({
        nombre: newNombre.trim(),
        tipo: newTipo,
        emoji: tipo.emoji,
        color: newColor,
        ownerId: user.uid,
        miembros: [user.uid],
        config: {
          tieneComisiones: newTipo === 'servicios' || newTipo === 'mixto',
          tieneBonos: newTipo === 'servicios',
          tieneCuotas: newTipo === 'servicios',
          tieneIVA: newTipo === 'servicios',
          tieneStock: newTipo === 'productos' || newTipo === 'mixto',
          tieneUsados: newTipo === 'productos' || newTipo === 'mixto',
          tieneVolumen: newTipo === 'productos' || newTipo === 'mixto',
          moneda: newTipo === 'productos' ? 'USD' : 'ARS',
          tieneWhatsApp: true,
          tieneTareas: true,
        },
      })
      await loadWorkspaces()
      setShowNew(false)
      setNewNombre('')
      setActiveWorkspace(id)
      router.push(`/workspace/${id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (ws: Workspace) => {
    setEditingId(ws.id)
    setEditNombre(ws.nombre)
    setEditColor(ws.color)
    setMenuId(null)
  }

  const handleSaveEdit = async (ws: Workspace) => {
    if (!editNombre.trim()) return
    await updateWorkspace(ws.id, { nombre: editNombre.trim(), color: editColor })
    await loadWorkspaces()
    setEditingId(null)
  }

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`¿Eliminar "${ws.nombre}"? Se borrarán todos los datos.`)) return
    await deleteWorkspace(ws.id)
    await loadWorkspaces()
    setMenuId(null)
  }

  const handleLogout = async () => {
    await logOut()
    router.push('/auth')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: '#141414', border: '1px solid #2a2a2e', boxShadow: '0 4px 24px rgba(232,0,29,0.2)' }}>
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
            <path d="M78 18 L82 18 L82 25 L45 65 L48 65 L82 65 L82 82 L18 82 L18 75 L55 35 L52 35 L18 35 L18 18 Z" fill="#E8001D"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#141414', border: '1px solid #2a2a2e' }}>
                <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
                  <path d="M78 18 L82 18 L82 25 L45 65 L48 65 L82 65 L82 82 L18 82 L18 75 L55 35 L52 35 L18 35 L18 18 Z" fill="#E8001D"/>
                </svg>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-white font-bold text-lg tracking-tight">clo</span>
                <span className="font-bold text-lg tracking-tight" style={{ color: '#E8001D' }}>Z</span>
                <span className="text-white font-bold text-lg tracking-tight">r</span>
              </div>
            </div>
            <p className="text-surface-500 text-sm">Hola, {user?.displayName?.split(' ')[0]} 👋</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-white text-xl font-semibold">Tus negocios</h1>
          <p className="text-surface-500 text-sm mt-0.5">Seleccioná uno para trabajar</p>
        </div>

        {/* Lista workspaces */}
        <div className="space-y-2 mb-4">
          {workspaces.map(ws => (
            <div key={ws.id} className="relative">
              {editingId === ws.id ? (
                /* Modo edición */
                <div className="bg-surface-800 border border-surface-700 rounded-2xl p-4 animate-scale-in">
                  <input
                    autoFocus
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(ws)}
                    className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-brand-600"
                  />
                  <div className="flex gap-2 mb-3">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-lg transition-all ${editColor === c ? 'ring-2 ring-offset-1 ring-offset-surface-800 scale-110' : ''}`}
                        style={{ background: c, outlineColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(ws)} className="flex-1 bg-brand-600 text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                      <Check size={14} /> Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-surface-700 text-surface-300 text-sm rounded-xl">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo normal */
                <button
                  onClick={() => handleSelect(ws)}
                  className="w-full flex items-center gap-4 bg-surface-900 hover:bg-surface-800 border border-surface-800 hover:border-surface-700 rounded-2xl p-4 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: ws.color + '20', border: `1.5px solid ${ws.color}30` }}>
                    {ws.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">{ws.nombre}</div>
                    <div className="text-surface-500 text-xs mt-0.5 capitalize">
                      {WORKSPACE_TYPES.find(t => t.tipo === ws.tipo)?.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === ws.id ? null : ws.id) }}
                      className="p-1.5 rounded-lg text-surface-600 hover:text-surface-300 hover:bg-surface-700 transition-colors"
                    >
                      ···
                    </button>
                    <ChevronRight size={16} className="text-surface-600 group-hover:text-surface-400 transition-colors" />
                  </div>
                </button>
              )}

              {/* Menú contextual */}
              {menuId === ws.id && (
                <div className="absolute right-10 top-3 bg-surface-800 border border-surface-700 rounded-xl shadow-modal z-50 overflow-hidden animate-scale-in w-36">
                  <button onClick={() => handleEdit(ws)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-700">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => handleDelete(ws)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Backdrop */}
        {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}

        {/* Nuevo workspace */}
        {!showNew ? (
          <button onClick={() => setShowNew(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-800 hover:border-surface-600 rounded-2xl p-4 text-surface-500 hover:text-surface-300 transition-all text-sm font-medium">
            <Plus size={16} /> Agregar negocio
          </button>
        ) : (
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 animate-scale-in">
            <h3 className="text-white font-semibold text-sm mb-4">Nuevo negocio</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Nombre *</label>
              <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Ej: iPhone Club, Verisure..." autoFocus
                className="w-full px-3 py-2.5 text-sm bg-surface-800 border border-surface-700 rounded-xl text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-surface-400 mb-2">Tipo</label>
              <div className="space-y-2">
                {WORKSPACE_TYPES.map(t => (
                  <button key={t.tipo} onClick={() => setNewTipo(t.tipo)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${newTipo === t.tipo ? 'border-brand-600 bg-brand-600/10' : 'border-surface-700 hover:border-surface-600'}`}>
                    <span className="text-lg">{t.emoji}</span>
                    <div>
                      <div className="text-white text-sm font-medium">{t.label}</div>
                      <div className="text-surface-500 text-xs mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-surface-400 mb-2">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-lg transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-offset-surface-900 scale-110' : 'hover:scale-105'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!newNombre.trim() || creating}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-all active:scale-95">
                {creating ? 'Creando...' : 'Crear negocio'}
              </button>
              <button onClick={() => { setShowNew(false); setNewNombre('') }}
                className="px-4 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium rounded-xl transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {workspaces.length === 0 && !showNew && (
          <div className="text-center mt-12">
            <p className="text-surface-600 text-sm">Todavía no tenés ningún negocio.<br/>Creá el primero para empezar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
