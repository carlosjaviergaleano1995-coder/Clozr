'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task, TaskType, TaskFrequency } from '@/features/tasks/types'

// Adapter de doc legacy (tareas) → Task canónico
function adaptTareaDoc(id: string, data: any): Task {
  // Mapeo de frecuencia legacy → canónica
  const freqMap: Record<string, TaskFrequency> = {
    diaria:  'daily',
    semanal: 'weekly',
    daily:   'daily',
    weekly:  'weekly',
  }
  const tipo: TaskType = data.tipo
    ?? (data.frecuencia === 'unica' ? 'puntual' : 'rutina')

  return {
    id,
    workspaceId:   data.workspaceId ?? '',
    tipo,
    frecuencia:    freqMap[data.frecuencia ?? ''] ?? undefined,
    titulo:        data.titulo ?? '',
    completada:    data.completada ?? false,
    completadaAt:  data.completadaAt?.toDate?.() ?? data.fechaCompletada?.toDate?.(),
    completadaPor: data.completadaPor ?? undefined,
    dueAt:         data.dueAt?.toDate?.(),
    asignadoA:     data.asignadoA ?? undefined,
    creadoPor:     data.creadoPor ?? '',
    createdAt:     data.createdAt?.toDate?.() ?? new Date(),
  }
}

export function useTasks(workspaceId: string) {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    let newTasks: Task[] = []
    let legacyTasks: Task[] = []
    let newLoaded     = false
    let legacyLoaded  = false

    function merge() {
      if (!newLoaded || !legacyLoaded) return
      // Prioridad: docs de 'tasks' (nuevos) sobre 'tareas' (legacy)
      // Si el mismo id existe en ambas, usar el nuevo
      const newIds = new Set(newTasks.map(t => t.id))
      const merged = [...newTasks, ...legacyTasks.filter(t => !newIds.has(t.id))]
      setTasks(merged)
      setLoading(false)
    }

    // Suscripción a colección nueva 'tasks'
    const qNew = query(
      collection(db, `workspaces/${workspaceId}/tasks`),
      orderBy('createdAt', 'asc'),
    )
    const unsubNew = onSnapshot(qNew, snap => {
      newTasks = snap.docs.map(d => adaptTareaDoc(d.id, d.data()))
      newLoaded = true
      merge()
    }, () => { newLoaded = true; merge() })

    // Suscripción a colección legacy 'tareas'
    const qLegacy = query(
      collection(db, `workspaces/${workspaceId}/tareas`),
      orderBy('createdAt', 'asc'),
    )
    const unsubLegacy = onSnapshot(qLegacy, snap => {
      legacyTasks = snap.docs.map(d => adaptTareaDoc(d.id, d.data()))
      legacyLoaded = true
      merge()
    }, () => { legacyLoaded = true; merge() })

    return () => { unsubNew(); unsubLegacy() }
  }, [workspaceId])

  const rutinas   = tasks.filter(t => t.tipo === 'rutina')
  const puntuales = tasks.filter(t => t.tipo === 'puntual' && !t.completada)
  const completedToday = tasks.filter(t => {
    if (!t.completadaAt) return false
    const today = new Date()
    const d = t.completadaAt
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear()
  })

  return { tasks, rutinas, puntuales, completedToday, loading }
}
