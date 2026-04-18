'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task } from '@/features/tasks/types'

export function useTasks(workspaceId: string) {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    const q = query(
      collection(db, `workspaces/${workspaceId}/tasks`),
      orderBy('createdAt', 'asc'),
    )

    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt:    d.data().createdAt?.toDate?.()    ?? new Date(),
        completadaAt: d.data().completadaAt?.toDate?.(),
        dueAt:        d.data().dueAt?.toDate?.(),
      } as Task)))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [workspaceId])

  const rutinas  = tasks.filter(t => t.tipo === 'rutina')
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
