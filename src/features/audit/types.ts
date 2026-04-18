// Solo tipos — la lógica de escritura vive en server/audit.ts

export type AuditAction =
  // Clientes
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  // Ventas
  | 'sale.created'
  | 'sale.updated'
  // Pipeline
  | 'pipeline.created'
  | 'pipeline.stage_changed'
  | 'pipeline.closed'
  // Equipo
  | 'member.invited'
  | 'member.removed'
  | 'member.role_changed'
  // Sistema
  | 'system.activated'
  | 'system.deactivated'
  // Plan
  | 'plan.upgraded'
  | 'plan.downgraded'
  // Código de activación
  | 'activation_code.redeemed'
  | 'activation_code.revoked'

export interface AuditLog {
  id: string
  workspaceId: string
  actorUid: string
  actorName: string
  action: AuditAction
  entityType?: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  timestamp: Date
}

// Vive en /workspaces/{wid}/audit_log/{id}
// Solo escritura — nunca se edita ni se borra
// Escritura exclusiva desde server/audit.ts usando Admin SDK
