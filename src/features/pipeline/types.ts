export type ActivityType =
  | 'note'
  | 'call'
  | 'visit'
  | 'whatsapp'
  | 'email'
  | 'status_change'
  | 'custom'

export type PipelineStatus = 'open' | 'won' | 'lost'

export interface PipelineActivity {
  id: string
  type: ActivityType
  customType?: string       // para tipos declarados por el sistema
  description: string
  result?: string
  performedAt: Date
  performedBy: string       // uid
  performedByName: string   // desnormalizado
}

export interface PipelineItem {
  id: string
  workspaceId: string
  customerId: string
  customerSnapshot: {       // desnormalizado — el cliente puede borrarse
    nombre: string
    telefono?: string
  }
  // Etapa — desnormalizada para que los históricos sean legibles si cambia el sistema
  stageId: string
  stageName: string         // snapshot del nombre al momento de escribir
  stageOrder: number
  // Próxima acción
  nextAction?: string
  nextActionAt?: Date
  // Historial — embebido (máximo ~50 actividades por item)
  activities: PipelineActivity[]
  // Valor
  estimatedValue?: number
  closedValue?: number
  currency: 'ARS' | 'USD'
  // Datos extra del sistema activo
  systemData?: Record<string, unknown>
  // Estado
  status: PipelineStatus
  closedAt?: Date
  closedReason?: string
  // Inactividad — actualizado por Cloud Function diaria
  lastActivityAt: Date
  inactiveDays: number
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}
