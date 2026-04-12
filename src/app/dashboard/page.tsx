'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, LogOut, Pencil, Trash2, Check } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import {
  getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
  getNegocios, createNegocio, updateNegocio, deleteNegocio, logOut,
} from '@/lib/services'
import { derivarTipo, descripcionWs } from '@/lib/workspace-config'
import type { Workspace, WorkspaceConfig, Negocio } from '@/types'
import { ClozrLogo, ClozrIcon } from '@/components/ClozrLogo'

const EMOJIS = ['📱','🔧','🛒','🛡️','⚡','💻','🎮','🏪','🏠','🎯','✂️','🍕','🚗','👗','📚']
const COLORS = ['#E8001D','#2563eb','#7c3aed','#059669','#d97706','#0891b2','#db2777']

type OnboardingState = {
  queVende: 'productos' | 'servicios' | 'ambos' | null
  tieneStock: boolean | null
  tieneOrdenes: boolean | null
  nombre: string
}

const EMPTY: OnboardingState = { queVende: null, tieneStock: null, tieneOrdenes: null, nombre: '' }

function toConfig(o: OnboardingState): WorkspaceConfig {
  return {
    vendeProductos: o.queVende === 'productos' || o.queVende === 'ambos',
    vendeServicios: o.queVende === 'servicios' || o.queVende === 'ambos',
    tieneStock: o.tieneStock ?? false,
    tieneOrdenes: o.tieneOrdenes ?? false,
    moneda: 'ARS',
  }
}

function labelAuto(o: OnboardingState) {
  if (o.tieneOrdenes && !o.tieneStock) return 'Servicio Técnico'
  if (o.queVende === 'servicios') return 'Servicios'
  if (o.queVende === 'ambos') return 'Negocio'
  return 'Reventa'
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces } = useWorkspaceStore()
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)

  const [showNeg, setShowNeg] = useState(false)
  const [editNeg, setEditNeg] = useState<Negocio | null>(null)
  const [nNombre, setNNombre] = useState('')
  const [nEmoji, setNEmoji] = useState('📱')
  const [nColor, setNColor] = useState(COLORS[0])

  const [showWs, setShowWs] = useState(false)
  const [wsNegId, setWsNegId] = useState<string | null>(null)
  const [editWs, setEditWs] = useState<Workspace | null>(null)
  const [ob, setOb] = useState<OnboardingState>({ ...EMPTY })
  const [paso, setPaso] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.push('/auth') }, [user, authLoading])
  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    if (!user) return
    try {
      const [n, w] = await Promise.all([getNegocios(user.uid), getWorkspaces(user.uid)])
      setNegocios(n.sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setWorkspaces(w)
    } finally { setLoading(false) }
  }

  const wsDe = (nid: string) => workspaces.filter(w => w.negocioId === nid)
  const wsSolos = workspaces.filter(w => !w.negocioId)

  const abrirNeg = (n?: Negocio) => {
    setEditNeg(n ?? null)
    setNNombre(n?.nombre ?? ''); setNEmoji(n?.emoji ?? '📱'); setNColor(n?.color ?? COLORS[0])
    setShowNeg(true)
  }

  const guardarNeg = async () => {
    if (!nNombre.trim() || !user) return
    setSaving(true)
    try {
      if (editNeg) {
        await updateNegocio(editNeg.id, { nombre: nNombre, emoji: nEmoji, color: nColor })
        setNegocios(negocios.map(n => n.id === editNeg.id ? { ...n, nombre: nNombre, emoji: nEmoji, color: nColor } : n))
      } else {
        const id = await createNegocio({ nombre: nNombre, emoji: nEmoji, color: nColor, ownerId: user.uid, miembros: [user.uid] })
        setNegocios([...negocios, { id, nombre: nNombre, emoji: nEmoji, color: nColor, ownerId: user.uid, miembros: [user.uid], createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowNeg(false)
    } finally { setSaving(false) }
  }

  const borrarNeg = async (n: Negocio) => {
    if (wsDe(n.id).length > 0) { alert('Primero eliminá las áreas de este negocio'); return }
    if (!confirm(`¿Eliminar "${n.nombre}"?`)) return
    await deleteNegocio(n.id)
    setNegocios(negocios.filter(x => x.id !== n.id))
  }

  const abrirWs = (negId: string | null, ws?: Workspace) => {
    setEditWs(ws ?? null); setWsNegId(negId)
    if (ws) {
      const cfg = ws.config ?? {}
      setOb({
        queVende: cfg.vendeProductos && cfg.vendeServicios ? 'ambos' : cfg.vendeProductos ? 'productos' : 'servicios',
        tieneStock: cfg.tieneStock ?? false,
        tieneOrdenes: cfg.tieneOrdenes ?? false,
        nombre: ws.nombre,
      })
    } else {
      setOb({ ...EMPTY })
    }
    setPaso(1); setShowWs(true)
  }

  const guardarWs = async () => {
    if (!user) return
    setSaving(true)
    const config = toConfig(ob)
    const tipo = derivarTipo(config)
    const nombre = ob.nombre.trim() || labelAuto(ob)
    const emojiMap: Record<string, string> = { productos: '🛒', tecnico: '🔧', servicios: '🛡️', mixto: '⚡' }
    const colorMap: Record<string, string> = { productos: '#2563eb', tecnico: '#7c3aed', servicios: '#E8001D', mixto: '#059669' }
    try {
      if (editWs) {
        await updateWorkspace(editWs.id, { nombre, tipo, config })
        setWorkspaces(workspaces.map(w => w.id === editWs.id ? { ...w, nombre, tipo, config } : w))
      } else {
        const id = await createWorkspace({ nombre, tipo, config, emoji: emojiMap[tipo] ?? '🛒', color: colorMap[tipo] ?? '#2563eb', negocioId: wsNegId ?? undefined, ownerId: user.uid, miembros: [user.uid] } as any)
        setWorkspaces([...workspaces, { id, nombre, tipo, config, emoji: emojiMap[tipo] ?? '🛒', color: colorMap[tipo] ?? '#2563eb', negocioId: wsNegId ?? undefined, ownerId: user.uid, miembros: [user.uid], createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowWs(false)
    } finally { setSaving(false) }
  }

  const borrarWs = async (ws: Workspace) => {
    if (!confirm(`¿Eliminar "${ws.nombre}"?`)) return
    await deleteWorkspace(ws.id)
    setWorkspaces(workspaces.filter(w => w.id !== ws.id))
  }

  const puedeSiguiente = paso === 1 ? ob.queVende !== null : paso === 2 ? ob.tieneStock !== null : paso === 3 ? ob.tieneOrdenes !== null : true

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  const WsCard = ({ ws }: { ws: Workspace }) => (
    <button onClick={() => router.push(`/workspace/${ws.id}/hoy`)}
      className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
      style={{ background: 'var(--surface-2)', border: `1px solid ${ws.color}30` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: ws.color + '18' }}>
        {ws.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws.nombre}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{descripcionWs(ws.config ?? {})}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); abrirWs(ws.negocioId ?? null, ws) }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
          <Pencil size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); borrarWs(ws) }}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
          <Trash2 size={11} />
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto px-4 pt-8 pb-12">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ClozrIcon size={36} />
            <div>
              <ClozrLogo height={20} />
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Hola, {user?.displayName?.split(' ')[0]} 👋
              </p>
            </div>
          </div>
          <button onClick={() => logOut()} style={{ color: 'var(--text-tertiary)' }}>
            <LogOut size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {negocios.map(neg => (
            <div key={neg.id}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: neg.color + '20' }}>{neg.emoji}</div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{neg.nombre}</h2>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirNeg(neg)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><Pencil size={13} /></button>
                  <button onClick={() => borrarNeg(neg)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="space-y-2 ml-1">
                {wsDe(neg.id).map(ws => <WsCard key={ws.id} ws={ws} />)}
                <button onClick={() => abrirWs(neg.id)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-2xl"
                  style={{ border: '1px dashed var(--border)', color: 'var(--text-tertiary)' }}>
                  <Plus size={14} /><span className="text-xs">Agregar área de trabajo</span>
                </button>
              </div>
            </div>
          ))}

          {wsSolos.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>Otros</p>
              <div className="space-y-2">{wsSolos.map(ws => <WsCard key={ws.id} ws={ws} />)}</div>
            </div>
          )}

          <button onClick={() => abrirNeg()}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(232,0,29,0.1)' }}>
              <Plus size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo negocio</p>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>iPhone Club, taller, agencia...</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal negocio */}
      {showNeg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNeg(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{editNeg ? 'Editar negocio' : 'Nuevo negocio'}</h3>
              <button onClick={() => setShowNeg(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="iPhone Club, Mi Taller..." value={nNombre} onChange={e => setNNombre(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Ícono</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNEmoji(e)}
                      className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                      style={nEmoji === e ? { background: nColor } : { background: 'var(--surface-2)' }}>
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
                      className="w-8 h-8 rounded-xl"
                      style={{ background: c, border: nColor === c ? '3px solid white' : '3px solid transparent', boxShadow: nColor === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={guardarNeg} disabled={!nNombre.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : editNeg ? 'Guardar' : 'Crear'}
              </button>
              <button onClick={() => setShowNeg(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal onboarding workspace */}
      {showWs && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowWs(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Progreso */}
            <div className="flex gap-1.5 mb-5">
              {[1,2,3,4].map(s => (
                <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
                  style={{ background: s <= paso ? 'var(--brand)' : 'var(--surface-2)' }} />
              ))}
            </div>

            {paso === 1 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Paso 1 de 3</p>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>¿Qué vendés?</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Podés cambiarlo después</p>
                </div>
                <div className="space-y-2 mt-3">
                  {[
                    { id: 'productos', emoji: '📦', label: 'Productos físicos', desc: 'Electrónica, ropa, equipos, accesorios...' },
                    { id: 'servicios', emoji: '🛠', label: 'Servicios o trabajos', desc: 'Reparaciones, alarmas, instalaciones...' },
                    { id: 'ambos',     emoji: '⚡', label: 'Productos y servicios', desc: 'Vendés cosas y también hacés trabajos' },
                  ].map(op => (
                    <button key={op.id} onClick={() => setOb(o => ({ ...o, queVende: op.id as any }))}
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
                      style={ob.queVende === op.id
                        ? { background: 'rgba(232,0,29,0.08)', border: '2px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      <span className="text-2xl">{op.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: ob.queVende === op.id ? 'var(--brand-light)' : 'var(--text-primary)' }}>{op.label}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{op.desc}</p>
                      </div>
                      {ob.queVende === op.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand)' }}>
                          <Check size={11} color="white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Paso 2 de 3</p>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>¿Manejás stock?</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>¿Necesitás registrar cuántos productos tenés?</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { val: true,  emoji: '📦', label: 'Sí', desc: 'Registro entradas y salidas' },
                    { val: false, emoji: '🚫', label: 'No', desc: 'No controlo inventario' },
                  ].map(op => (
                    <button key={String(op.val)} onClick={() => setOb(o => ({ ...o, tieneStock: op.val }))}
                      className="flex flex-col items-center gap-2 px-3 py-5 rounded-2xl transition-all"
                      style={ob.tieneStock === op.val
                        ? { background: 'rgba(232,0,29,0.08)', border: '2px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      <span className="text-3xl">{op.emoji}</span>
                      <p className="text-sm font-bold" style={{ color: ob.tieneStock === op.val ? 'var(--brand-light)' : 'var(--text-primary)' }}>{op.label}</p>
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>{op.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Paso 3 de 3</p>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>¿Hacés reparaciones?</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Servicio técnico, instalaciones, trabajos a pedido...</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { val: true,  emoji: '🔧', label: 'Sí', desc: 'Necesito órdenes de trabajo' },
                    { val: false, emoji: '🚫', label: 'No', desc: 'Solo venta directa' },
                  ].map(op => (
                    <button key={String(op.val)} onClick={() => setOb(o => ({ ...o, tieneOrdenes: op.val }))}
                      className="flex flex-col items-center gap-2 px-3 py-5 rounded-2xl transition-all"
                      style={ob.tieneOrdenes === op.val
                        ? { background: 'rgba(232,0,29,0.08)', border: '2px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      <span className="text-3xl">{op.emoji}</span>
                      <p className="text-sm font-bold" style={{ color: ob.tieneOrdenes === op.val ? 'var(--brand-light)' : 'var(--text-primary)' }}>{op.label}</p>
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>{op.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 4 && (
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>¿Cómo la llamamos?</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Opcional — si lo dejás vacío usamos "{labelAuto(ob)}"
                  </p>
                </div>
                <input className="input text-sm mt-2" placeholder={labelAuto(ob)}
                  value={ob.nombre} onChange={e => setOb(o => ({ ...o, nombre: e.target.value }))} autoFocus />
                <div className="px-3 py-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>Resumen</p>
                  {[
                    { l: 'Tipo', v: ob.queVende === 'productos' ? '📦 Productos' : ob.queVende === 'servicios' ? '🛠 Servicios' : '⚡ Mixto' },
                    { l: 'Stock', v: ob.tieneStock ? '✅ Sí' : '❌ No' },
                    { l: 'Reparaciones / OTs', v: ob.tieneOrdenes ? '✅ Sí' : '❌ No' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between py-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.l}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {paso > 1 && (
                <button onClick={() => setPaso(paso - 1)} className="btn-secondary px-4">← Atrás</button>
              )}
              <button onClick={() => paso < 4 ? setPaso(paso + 1) : guardarWs()}
                disabled={!puedeSiguiente || saving} className="btn-primary flex-1">
                {saving ? 'Creando...' : paso < 4 ? 'Siguiente →' : editWs ? 'Guardar cambios' : '✓ Crear área'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
