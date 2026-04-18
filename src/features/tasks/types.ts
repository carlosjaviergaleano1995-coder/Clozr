export type TaskType      = 'rutina' | 'puntual'
export type TaskFrequency = 'daily' | 'weekly'

export interface Task {
  id: string
  workspaceId: string
  tipo: TaskType
  frecuencia?: TaskFrequency  // solo para rutinas
  titulo: string
  completada: boolean
  completadaAt?: Date
  completadaPor?: string      // uid
  dueAt?: Date
  asignadoA?: string          // uid — null = del creador
  creadoPor: string
  createdAt: Date
}
