'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, CheckSquare, Square, Trash2, RefreshCw, RotateCcw } from 'lucide-react'
import { getTareas, createTarea, toggleTarea, deleteTarea } from '@/lib/services'
import { useAuthStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { Tarea, TareaFrecuencia } from '@/types'

// Opción C: Tareas recurrentes fijas + tareas puntuales del día
// - Recurrentes (diaria/semanal): persisten, se resetean solas
// - Única: desaparecen al completarse

const FRECUENCIA_CONFIG: Record<TareaFrecuencia, { label: string; color: string }> = {
  diaria:  { label: 'Diaria',  color: 'var(--brand)' },
  semanal: { label: 'Semanal', color: 'var(--blue)' },
  unica:   { label: 'Puntual', color: 'var(--text-tertiary)' },
}

export default function TareasPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { isVendedor, isViewerOnly } = useMemberRole(workspaceId)
  const canEdit = !isViewerOnly

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [frecuencia, setFrecuencia] = useState<TareaFrecuencia>('diaria')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getTareas(workspaceId)
      setTareas(data)
    } finally { setLoading(false) }
  }

  // Separar por tipo
  const recurrentes = tareas.filter(t => t.frecuencia === 'diaria' || t.frecuencia === 'semanal')
  const puntuales   = tareas.filter(t => t.frecuencia === 'unica' && !t.completada)
  const completadasHoy = tareas.filter(t => t.completada)

  const totalActivas = recurrentes.length + puntuales.length
  const completadas  = recurrentes.filter(t => t.completada).length
  const progreso     = totalActivas > 0 ? Math.round((completadas / totalActivas) * 100) : 0

  const handleToggle = async (t: Tarea) => {
    if (toggling.has(t.id)) return
    const nuevaCompletada = !t.completada

    // Si es puntual y se completa, la eliminamos directamente
    if (t.frecuencia === 'unica' && nuevaCompletada) {
      setTareas(ts => ts.filter(x => x.id !== t.id))
      setToggling(prev => new Set(prev).add(t.id))
      try {
        await deleteTarea(workspaceId, t.id)
      } catch {
        await load()
      } finally {
        setToggling(prev => { const s = new Set(prev); s.delete(t.id); return s })
      }
      return
    }

    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, completada: nuevaCompletada } : x))
    setToggling(prev => new Set(prev).add(t.id))
    try {
      await toggleTarea(workspaceId, t.id, nuevaCompletada)
    } catch {
      setTareas(ts => ts.map(x => x.id === t.id ? { ...x, completada: t.completada } : x))
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(t.id); return s })
    }
  }

  const handleAdd = async () => {
    if (!titulo.trim() || !user) return
    setSaving(true)
    try {
      await createTarea(workspaceId, {
        workspaceId,
        titulo: titulo.trim(),
        frecuencia,
        completada: false,
        orden: tareas.length,
      })
      await load()
      setTitulo('')
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setTareas(ts => ts.filter(t => t.id !== id))
    try { await deleteTarea(workspaceId, id) }
    catch { await load() }
  }

  // Resetear solo las recurrentes completadas
  const handleReset = async () => {
    const aReset = recurrentes.filter(t => t.completada)
    setTareas(ts => ts.map(t => aReset.find(r => r.id === t.id) ? { ...t, completada: false } : t))
    await Promise.all(aReset.map(t => toggleTarea(workspaceId, t.id, false)))
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tareas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {completadas} de {recurrentes.length} recurrentes · {puntuales.length} pendientes hoy
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && recurrentes.some(t => t.completada) && (
            <button onClick={handleReset}
              className="btn-ghost text-xs gap-1"
              style={{ color: 'var(--text-tertiary)' }}>
              <RotateCcw size={13} /> Reset
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="btn-primary gap-1">
              <Plus size={15} /> Nueva
            </button>
          )}
        </div>
      </div>

      {/* Progreso solo de recurrentes */}
      {recurrentes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Rutina del día</span>
            <span className="text-xs font-bold" style={{ color: progreso === 100 ? 'var(--green)' : 'var(--brand)' }}>
              {progreso}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progreso}%`, background: progreso === 100 ? 'var(--green)' : 'var(--brand)' }} />
          </div>
          {progreso === 100 && (
            <p className="text-xs font-medium mt-2 text-center" style={{ color: 'var(--green)' }}>
              ✅ Rutina completa
            </p>
          )}
        </div>
      )}

      {/* Tareas de hoy (puntuales) */}
      {puntuales.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>Para hoy</p>
          <div className="space-y-2">
            {puntuales.map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}

      {/* Rutina — recurrentes pendientes */}
      {recurrentes.filter(t => !t.completada).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>Rutina</p>
          <div className="space-y-2">
            {recurrentes.filter(t => !t.completada).map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}

      {/* Rutina completada */}
      {recurrentes.filter(t => t.completada).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>Completadas</p>
          <div className="space-y-2 opacity-50">
            {recurrentes.filter(t => t.completada).map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} done />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tareas.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--surface-2)' }}>
            <CheckSquare size={22} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin tareas todavía</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Agregá tu rutina diaria o tareas puntuales de hoy
          </p>
        </div>
      )}

      {/* Modal nueva tarea */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva tarea</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">¿Qué hay que hacer?</label>
                <input className="input" placeholder="Ej: Llamar a Juan, subir historia..."
                  value={titulo} onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus />
              </div>

              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { k: 'diaria',  label: '🔄 Rutina diaria',  sub: 'Se resetea cada día' },
                    { k: 'semanal', label: '📅 Rutina semanal', sub: 'Se resetea por semana' },
                    { k: 'unica',   label: '⚡ Solo hoy',       sub: 'Desaparece al tildar' },
                  ] as const).map(({ k, label, sub }) => (
                    <button key={k} onClick={() => setFrecuencia(k)}
                      className="flex flex-col items-center p-2.5 rounded-xl text-center transition-all"
                      style={frecuencia === k
                        ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className={`text-xs font-semibold ${frecuencia === k ? 'text-white' : ''}`}
                        style={frecuencia === k ? {} : { color: 'var(--text-primary)' }}>
                        {label}
                      </span>
                      <span className={`text-[9px] mt-0.5 leading-tight ${frecuencia === k ? 'text-white/70' : ''}`}
                        style={frecuencia === k ? {} : { color: 'var(--text-tertiary)' }}>
                        {sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} disabled={!titulo.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TareaRow({ t, toggling, onToggle, onDelete, done = false, canEdit = true }: {
  t: Tarea
  toggling: Set<string>
  onToggle: (t: Tarea) => void
  onDelete: (id: string) => void
  done?: boolean
  canEdit?: boolean
}) {
  const cfg = FRECUENCIA_CONFIG[t.frecuencia]
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button onClick={() => onToggle(t)} disabled={toggling.has(t.id)}
        className="flex-shrink-0 transition-colors disabled:opacity-40"
        style={{ color: done ? 'var(--green)' : 'var(--text-tertiary)' }}>
        {done ? <CheckSquare size={20} /> : <Square size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}
          style={{ color: done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
          {t.titulo}
        </p>
        <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      {canEdit && (
        <button onClick={() => onDelete(t.id)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
