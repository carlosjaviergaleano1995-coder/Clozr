'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, LogOut, Pencil, Trash2, X } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import {
  getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
  getNegocios, createNegocio, updateNegocio, deleteNegocio, logOut,
} from '@/lib/services'
import type { Workspace, WorkspaceType, Negocio } from '@/types'
import { ClozrLogo, ClozrIcon } from '@/components/ClozrLogo'

const WS_TYPES: { tipo: WorkspaceType; label: string; desc: string; emoji: string; color: string }[] = [
  { tipo: 'productos', label: 'Reventa',         desc: 'Stock, ventas, caja, broadcast', emoji: '🛒', color: '#2563eb' },
  { tipo: 'tecnico',   label: 'Servicio Técnico', desc: 'OTs, turnos, reparaciones',     emoji: '🔧', color: '#7c3aed' },
  { tipo: 'servicios', label: 'Servicios',        desc: 'Alarmas, seguros, Verisure',    emoji: '🛡️', color: '#E8001D' },
  { tipo: 'mixto',     label: 'Mixto',            desc: 'Productos y servicios',         emoji: '⚡', color: '#059669' },
]

const EMOJIS = ['📱','🔧','🛒','🛡️','⚡','💻','🎮','🏪','🏠','🎯']
const COLORS = ['#E8001D','#2563eb','#7c3aed','#059669','#d97706','#0891b2','#db2777']

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces } = useWorkspaceStore()

  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)

  // Modal negocio
  const [showNegocio, setShowNegocio] = useState(false)
  const [editNegocio, setEditNegocio] = useState<Negocio | null>(null)
  const [nNombre, setNNombre] = useState('')
  const [nEmoji, setNEmoji] = useState('📱')
  const [nColor, setNColor] = useState(COLORS[0])

  // Modal workspace
  const [showWs, setShowWs] = useState(false)
  const [wsNegocioId, setWsNegocioId] = useState<string | null>(null)
  const [wsTipo, setWsTipo] = useState<WorkspaceType>('productos')
  const [wsNombre, setWsNombre] = useState('')
  const [editWs, setEditWs] = useState<Workspace | null>(null)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    if (!user) return
    try {
      const [nData, wsData] = await Promise.all([
        getNegocios(user.uid),
        getWorkspaces(user.uid),
      ])
      setNegocios(nData.sort((a,b) => a.nombre.localeCompare(b.nombre)))
      setWorkspaces(wsData)
    } finally { setLoading(false) }
  }

  // Workspaces sin negocio (legacy / standalone)
  const wsSinNegocio = workspaces.filter(w => !w.negocioId)
  const wsDeNegocio = (negocioId: string) => workspaces.filter(w => w.negocioId === negocioId)

  // ── Negocio handlers ────────────────────────────────────────────────────────
  const abrirNuevoNegocio = () => {
    setEditNegocio(null)
    setNNombre(''); setNEmoji('📱'); setNColor(COLORS[0])
    setShowNegocio(true)
  }

  const abrirEditNegocio = (n: Negocio) => {
    setEditNegocio(n)
    setNNombre(n.nombre); setNEmoji(n.emoji); setNColor(n.color)
    setShowNegocio(true)
  }

  const guardarNegocio = async () => {
    if (!nNombre.trim() || !user) return
    setSaving(true)
    try {
      if (editNegocio) {
        await updateNegocio(editNegocio.id, { nombre: nNombre, emoji: nEmoji, color: nColor })
        setNegocios(prev => prev.map(n => n.id === editNegocio.id ? { ...n, nombre: nNombre, emoji: nEmoji, color: nColor } : n))
      } else {
        const id = await createNegocio({
          nombre: nNombre, emoji: nEmoji, color: nColor,
          ownerId: user.uid, miembros: [user.uid],
        })
        setNegocios(prev => [...prev, { id, nombre: nNombre, emoji: nEmoji, color: nColor, ownerId: user.uid, miembros: [user.uid], createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowNegocio(false)
    } finally { setSaving(false) }
  }

  const eliminarNegocio = async (n: Negocio) => {
    const ws = wsDeNegocio(n.id)
    if (ws.length > 0) {
      alert(`Primero eliminá los ${ws.length} workspace${ws.length > 1 ? 's' : ''} de este negocio`)
      return
    }
    if (!confirm(`¿Eliminar "${n.nombre}"?`)) return
    await deleteNegocio(n.id)
    setNegocios(prev => prev.filter(x => x.id !== n.id))
  }

  // ── Workspace handlers ──────────────────────────────────────────────────────
  const abrirNuevoWs = (negocioId: string | null = null) => {
    setEditWs(null)
    setWsNegocioId(negocioId)
    setWsTipo('productos')
    setWsNombre('')
    setShowWs(true)
  }

  const abrirEditWs = (ws: Workspace) => {
    setEditWs(ws)
    setWsNombre(ws.nombre)
    setWsTipo(ws.tipo)
    setWsNegocioId(ws.negocioId ?? null)
    setShowWs(true)
  }

  const guardarWs = async () => {
    if (!user) return
    setSaving(true)
    const tipoInfo = WS_TYPES.find(t => t.tipo === wsTipo)!
    const nombre = wsNombre.trim() || tipoInfo.label
    try {
      if (editWs) {
        await updateWorkspace(editWs.id, { nombre, tipo: wsTipo })
        setWorkspaces(workspaces.map(w => w.id === editWs.id ? { ...w, nombre, tipo: wsTipo } : w))
      } else {
        const id = await createWorkspace({
          nombre,
          tipo: wsTipo,
          emoji: tipoInfo.emoji,
          color: tipoInfo.color,
          negocioId: wsNegocioId ?? undefined,
          ownerId: user.uid,
          miembros: [user.uid],
          config: {},
        } as any)
        const newWs: Workspace = {
          id, nombre, tipo: wsTipo, emoji: tipoInfo.emoji, color: tipoInfo.color,
          negocioId: wsNegocioId ?? undefined,
          ownerId: user.uid, miembros: [user.uid], config: {},
          createdAt: new Date(), updatedAt: new Date(),
        }
        setWorkspaces([...workspaces, newWs])
      }
      setShowWs(false)
    } finally { setSaving(false) }
  }

  const eliminarWs = async (ws: Workspace) => {
    if (!confirm(`¿Eliminar "${ws.nombre}"?`)) return
    await deleteWorkspace(ws.id)
    setWorkspaces(workspaces.filter(w => w.id !== ws.id))
  }

  const irAWs = (ws: Workspace) => {
    router.push(`/workspace/${ws.id}/hoy`)
  }

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  const WsCard = ({ ws }: { ws: Workspace }) => {
    const tipoInfo = WS_TYPES.find(t => t.tipo === ws.tipo)
    return (
      <button onClick={() => irAWs(ws)}
        className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-2)', border: `1px solid ${ws.color}30` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: ws.color + '18' }}>
          {ws.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws.nombre}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{tipoInfo?.desc}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); abrirEditWs(ws) }}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
            <Pencil size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); eliminarWs(ws) }}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
            <Trash2 size={11} />
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto px-4 pt-8 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ClozrIcon size={36} />
            <div>
              <div className="flex items-center gap-1">
                <ClozrLogo height={20} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Hola, {user?.displayName?.split(' ')[0]} 👋
              </p>
            </div>
          </div>
          <button onClick={() => logOut()} className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-tertiary)' }}>
            <LogOut size={18} />
          </button>
        </div>

        {/* Negocios con sus workspaces */}
        <div className="space-y-5">
          {negocios.map(negocio => {
            const wsNeg = wsDeNegocio(negocio.id)
            return (
              <div key={negocio.id}>
                {/* Header negocio */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
                      style={{ background: negocio.color + '20' }}>
                      {negocio.emoji}
                    </div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {negocio.nombre}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEditNegocio(negocio)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => eliminarNegocio(negocio)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Workspaces del negocio */}
                <div className="space-y-2 ml-1">
                  {wsNeg.length > 0
                    ? wsNeg.map(ws => <WsCard key={ws.id} ws={ws} />)
                    : (
                      <p className="text-xs px-3 py-2" style={{ color: 'var(--text-tertiary)' }}>
                        Sin áreas — agregá una abajo
                      </p>
                    )
                  }
                  {/* Agregar workspace a este negocio */}
                  <button onClick={() => abrirNuevoWs(negocio.id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-2xl transition-all"
                    style={{ border: '1px dashed var(--border)', color: 'var(--text-tertiary)' }}>
                    <Plus size={14} />
                    <span className="text-xs">Agregar área de trabajo</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Workspaces sin negocio (legacy) */}
          {wsSinNegocio.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
                style={{ color: 'var(--text-tertiary)' }}>
                Otros
              </p>
              <div className="space-y-2">
                {wsSinNegocio.map(ws => <WsCard key={ws.id} ws={ws} />)}
              </div>
            </div>
          )}

          {/* Crear negocio + workspace independiente */}
          <div className="space-y-2 pt-2">
            <button onClick={abrirNuevoNegocio}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(232,0,29,0.1)' }}>
                <Plus size={16} style={{ color: 'var(--brand)' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Nuevo negocio
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  iPhone Club, taller, Verisure...
                </p>
              </div>
            </button>
            {(negocios.length > 0 || wsSinNegocio.length > 0) && (
              <button onClick={() => abrirNuevoWs(null)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-2xl transition-all"
                style={{ border: '1px dashed var(--border)', color: 'var(--text-tertiary)' }}>
                <Plus size={14} />
                <span className="text-xs">Workspace independiente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal negocio */}
      {showNegocio && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNegocio(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editNegocio ? 'Editar negocio' : 'Nuevo negocio'}
              </h3>
              <button onClick={() => setShowNegocio(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="iPhone Club, Mi Taller..."
                  value={nNombre} onChange={e => setNNombre(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Ícono</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNEmoji(e)}
                      className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                      style={nEmoji === e
                        ? { background: 'var(--brand)', border: '2px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNColor(c)}
                      className="w-8 h-8 rounded-xl transition-all"
                      style={{
                        background: c,
                        border: nColor === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: nColor === c ? `0 0 0 2px ${c}` : 'none',
                      }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={guardarNegocio} disabled={!nNombre.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editNegocio ? 'Guardar' : 'Crear negocio'}
              </button>
              <button onClick={() => setShowNegocio(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal workspace */}
      {showWs && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowWs(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editWs ? 'Editar área' : 'Nueva área de trabajo'}
              </h3>
              <button onClick={() => setShowWs(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Tipo de área</label>
                <div className="space-y-2">
                  {WS_TYPES.map(t => (
                    <button key={t.tipo} onClick={() => { setWsTipo(t.tipo); if (!wsNombre) setWsNombre(t.label) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={wsTipo === t.tipo
                        ? { background: t.color + '18', border: `1.5px solid ${t.color}` }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className="text-xl">{t.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: wsTipo === t.tipo ? t.color : 'var(--text-primary)' }}>
                          {t.label}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Nombre (opcional)</label>
                <input className="input text-sm" placeholder={WS_TYPES.find(t => t.tipo === wsTipo)?.label}
                  value={wsNombre} onChange={e => setWsNombre(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={guardarWs} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editWs ? 'Guardar' : 'Crear área'}
              </button>
              <button onClick={() => setShowWs(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
