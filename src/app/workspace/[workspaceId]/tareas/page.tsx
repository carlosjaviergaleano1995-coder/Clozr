'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Plus, CheckSquare, Square, Trash2, RotateCcw } from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { useTasks } from '@/hooks/useTasks'
import { createTask, completeTask, deleteTask, resetRoutineTasks } from '@/features/tasks/actions'
import type { Task, TaskType, TaskFrequency } from '@/features/tasks/types'

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  rutina:  { label: 'Rutina',  color: 'var(--brand)'          },
  puntual: { label: 'Puntual', color: 'var(--text-tertiary)'  },
}

// Mapeo de frecuencia a display
const FREQ_LABEL: Record<string, string> = {
  daily:   'Diaria',
  weekly:  'Semanal',
  puntual: 'Solo hoy',
}

export default function TareasPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { isViewerOnly } = useMemberRole(workspaceId)
  const canEdit = !isViewerOnly

  // ── NUEVA ARQUITECTURA: datos reactivos ───────────────────────────────────
  const { tasks, rutinas, puntuales, loading } = useTasks(workspaceId)

  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm]  = useState(false)
  const [titulo,   setTitulo]    = useState('')
  const [tipo,     setTipo]      = useState<'rutina' | 'puntual'>('rutina')
  const [frecuencia, setFrecuencia] = useState<TaskFrequency>('daily')
  const [toggling, setToggling]  = useState<Set<string>>(new Set())

  // Métricas
  const rutinasCompletadas = rutinas.filter(t => t.completada).length
  const totalRutinas       = rutinas.length
  const progreso           = totalRutinas > 0 ? Math.round((rutinasCompletadas / totalRutinas) * 100) : 0

  // ── Acciones ──────────────────────────────────────────────────────────────

  const handleToggle = (t: Task) => {
    if (toggling.has(t.id)) return
    setToggling(prev => new Set(prev).add(t.id))
    startTransition(async () => {
      await completeTask(workspaceId, t.id)
      setToggling(prev => { const s = new Set(prev); s.delete(t.id); return s })
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTask(workspaceId, id)
    })
  }

  const handleReset = () => {
    startTransition(async () => {
      await resetRoutineTasks(workspaceId)
    })
  }

  const handleAdd = () => {
    if (!titulo.trim()) return
    startTransition(async () => {
      await createTask(workspaceId, {
        tipo,
        frecuencia: tipo === 'rutina' ? frecuencia : undefined,
        titulo:     titulo.trim(),
      })
      setTitulo('')
      setShowForm(false)
    })
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
            {rutinasCompletadas} de {totalRutinas} rutinas · {puntuales.length} pendientes hoy
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && rutinas.some(t => t.completada) && (
            <button onClick={handleReset} disabled={isPending}
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

      {/* Progreso rutinas */}
      {totalRutinas > 0 && (
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
            <p className="text-xs font-medium mt-2 text-center" style={{ color: 'var(--green)' }}>✅ Rutina completa</p>
          )}
        </div>
      )}

      {/* Tareas puntuales */}
      {puntuales.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Para hoy
          </p>
          <div className="space-y-2">
            {puntuales.map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}

      {/* Rutinas pendientes */}
      {rutinas.filter(t => !t.completada).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Rutina
          </p>
          <div className="space-y-2">
            {rutinas.filter(t => !t.completada).map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}

      {/* Rutinas completadas */}
      {rutinas.filter(t => t.completada).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Completadas
          </p>
          <div className="space-y-2 opacity-50">
            {rutinas.filter(t => t.completada).map(t => (
              <TareaRow key={t.id} t={t} toggling={toggling}
                onToggle={handleToggle} onDelete={handleDelete} done />
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {tasks.length === 0 && (
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
                    { k: 'rutina-daily',   tipo: 'rutina'  as const, freq: 'daily'  as const, label: '🔄 Rutina diaria',  sub: 'Se resetea cada día'    },
                    { k: 'rutina-weekly',  tipo: 'rutina'  as const, freq: 'weekly' as const, label: '📅 Rutina semanal', sub: 'Se resetea por semana'  },
                    { k: 'puntual',        tipo: 'puntual' as const, freq: undefined,          label: '⚡ Solo hoy',       sub: 'Desaparece al tildar'   },
                  ]).map(({ k, tipo: t, freq, label, sub }) => {
                    const activo = tipo === t && (t === 'puntual' || frecuencia === freq)
                    return (
                      <button key={k} onClick={() => { setTipo(t); if (freq) setFrecuencia(freq) }}
                        className="flex flex-col items-center p-2.5 rounded-xl text-center transition-all"
                        style={activo
                          ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                          : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                        <span className="text-xs font-semibold" style={{ color: activo ? '#fff' : 'var(--text-primary)' }}>
                          {label}
                        </span>
                        <span className="text-[9px] mt-0.5 leading-tight" style={{ color: activo ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>
                          {sub}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} disabled={!titulo.trim() || isPending} className="btn-primary flex-1">
                {isPending ? 'Guardando...' : 'Agregar'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TareaRow({
  t, toggling, onToggle, onDelete, done = false, canEdit = true,
}: {
  t: Task; toggling: Set<string>
  onToggle: (t: Task) => void; onDelete: (id: string) => void
  done?: boolean; canEdit?: boolean
}) {
  const freqLabel = t.tipo === 'puntual' ? 'Puntual' : FREQ_LABEL[t.frecuencia ?? 'daily']
  const color     = t.tipo === 'puntual' ? 'var(--text-tertiary)' : 'var(--brand)'
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
        <span className="text-[10px] font-semibold" style={{ color }}>
          {freqLabel}
        </span>
      </div>
      {canEdit && (
        <button onClick={() => onDelete(t.id)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text-tertiary)' }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
