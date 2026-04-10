'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, CheckSquare, Square, Trash2, RefreshCw } from 'lucide-react'
import { getTareas, createTarea, toggleTarea, deleteTarea } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Tarea, TareaFrecuencia } from '@/types'

const FRECUENCIA_LABELS: Record<TareaFrecuencia, string> = {
  diaria: '🔄 Diaria',
  semanal: '📅 Semanal',
  unica: '1️⃣ Una vez',
}

const TAREAS_SUGERIDAS = [
  { titulo: 'Subir historia a Instagram', frecuencia: 'diaria' as TareaFrecuencia },
  { titulo: 'Publicar en feed', frecuencia: 'diaria' as TareaFrecuencia },
  { titulo: 'Enviar 20 mensajes a prospectos', frecuencia: 'diaria' as TareaFrecuencia },
  { titulo: 'Contactar revendedores dormidos', frecuencia: 'semanal' as TareaFrecuencia },
  { titulo: 'Actualizar lista de precios', frecuencia: 'semanal' as TareaFrecuencia },
  { titulo: 'Revisar stock disponible', frecuencia: 'diaria' as TareaFrecuencia },
]

export default function TareasPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [frecuencia, setFrecuencia] = useState<TareaFrecuencia>('diaria')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getTareas(workspaceId)
      setTareas(data)
    } finally { setLoading(false) }
  }

  const pendientes = tareas.filter(t => !t.completada)
  const completadas = tareas.filter(t => t.completada)
  const progreso = tareas.length > 0 ? Math.round((completadas.length / tareas.length) * 100) : 0

  const handleToggle = async (t: Tarea) => {
    await toggleTarea(workspaceId, t.id, !t.completada)
    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, completada: !x.completada } : x))
  }

  const handleAdd = async () => {
    if (!titulo.trim()) return
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

  const handleSugerida = async (s: typeof TAREAS_SUGERIDAS[0]) => {
    await createTarea(workspaceId, {
      workspaceId,
      titulo: s.titulo,
      frecuencia: s.frecuencia,
      completada: false,
      orden: tareas.length,
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    await deleteTarea(workspaceId, id)
    setTareas(ts => ts.filter(t => t.id !== id))
  }

  const resetDiarias = async () => {
    const diarias = tareas.filter(t => t.frecuencia === 'diaria' && t.completada)
    await Promise.all(diarias.map(t => toggleTarea(workspaceId, t.id, false)))
    await load()
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-200 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Tareas del día</h2>
          <p className="text-surface-500 text-xs mt-0.5">
            {completadas.length} de {tareas.length} completadas
          </p>
        </div>
        <div className="flex gap-2">
          {completadas.filter(t => t.frecuencia === 'diaria').length > 0 && (
            <button onClick={resetDiarias} className="btn-ghost text-xs">
              <RefreshCw size={13} /> Reiniciar
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Nueva
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      {tareas.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-700">Progreso de hoy</span>
            <span className="text-sm font-bold text-brand-600">{progreso}%</span>
          </div>
          <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          {progreso === 100 && (
            <p className="text-xs text-green-600 font-medium mt-2 text-center">
              ✅ ¡Todo listo por hoy!
            </p>
          )}
        </div>
      )}

      {/* Tareas pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          {pendientes.map(t => (
            <div key={t.id} className="card flex items-center gap-3">
              <button
                onClick={() => handleToggle(t)}
                className="text-surface-300 hover:text-brand-600 transition-colors flex-shrink-0"
              >
                <Square size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900">{t.titulo}</p>
                <p className="text-xs text-surface-400 mt-0.5">{FRECUENCIA_LABELS[t.frecuencia]}</p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="btn-icon text-surface-300 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tareas completadas */}
      {completadas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-surface-400 mb-2 px-1">Completadas</p>
          <div className="space-y-2">
            {completadas.map(t => (
              <div key={t.id} className="card flex items-center gap-3 opacity-60">
                <button
                  onClick={() => handleToggle(t)}
                  className="text-green-500 flex-shrink-0"
                >
                  <CheckSquare size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-500 line-through">{t.titulo}</p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="btn-icon text-surface-300 hover:text-red-400 flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugeridas si no hay tareas */}
      {tareas.length === 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-surface-700 mb-3">Tareas sugeridas para arrancar</p>
          <div className="space-y-2">
            {TAREAS_SUGERIDAS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSugerida(s)}
                className="w-full flex items-center justify-between p-3 bg-surface-50 hover:bg-surface-100 rounded-xl transition-colors text-left"
              >
                <span className="text-sm text-surface-700">{s.titulo}</span>
                <span className="text-xs text-surface-400">{FRECUENCIA_LABELS[s.frecuencia]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva tarea */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal animate-slide-up p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900">Nueva tarea</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">¿Qué hay que hacer?</label>
                <input
                  className="input"
                  placeholder="Ej: Subir historia a Instagram"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Frecuencia</label>
                <div className="flex gap-2">
                  {(Object.entries(FRECUENCIA_LABELS) as [TareaFrecuencia, string][]).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setFrecuencia(k)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                        frecuencia === k ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} disabled={!titulo.trim() || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Agregar tarea'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
