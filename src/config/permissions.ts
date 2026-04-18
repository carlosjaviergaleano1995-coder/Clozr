import type { MemberRole } from '@/features/team/types'

// Todas las acciones que un usuario puede intentar
export type Permission =
  // Clientes
  | 'customer:read'   | 'customer:create' | 'customer:update' | 'customer:delete'
  // Ventas
  | 'sale:read'       | 'sale:create'     | 'sale:update'
  // Pipeline
  | 'pipeline:read'   | 'pipeline:create' | 'pipeline:update' | 'pipeline:stage_change'
  // Tareas
  | 'task:read'       | 'task:create'     | 'task:complete'
  // Catálogo
  | 'catalog:read'    | 'catalog:manage'
  // Equipo
  | 'member:read'     | 'member:invite'   | 'member:remove'   | 'member:role_change'
  // Workspace
  | 'workspace:settings' | 'workspace:delete'
  // Sistema
  | 'system:activate' | 'system:deactivate'
  // Admin
  | 'audit:read'      | 'export:data'

const VIEWER_PERMISSIONS: Permission[] = [
  'customer:read',
  'sale:read',
  'pipeline:read',
  'task:read',
  'catalog:read',
  'member:read',
]

const VENDEDOR_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'customer:create',  'customer:update',
  'sale:create',
  'pipeline:create',  'pipeline:update',  'pipeline:stage_change',
  'task:create',      'task:complete',
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...VENDEDOR_PERMISSIONS,
  'customer:delete',
  'sale:update',
  'catalog:manage',
  'member:invite',
  'workspace:settings',
  'system:activate',  'system:deactivate',
  'audit:read',       'export:data',
]

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  'member:remove',    'member:role_change',
  'workspace:delete',
]

export const PERMISSIONS_MAP: Record<MemberRole, Permission[]> = {
  viewer:   VIEWER_PERMISSIONS,
  vendedor: VENDEDOR_PERMISSIONS,
  admin:    ADMIN_PERMISSIONS,
  owner:    OWNER_PERMISSIONS,
}

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return PERMISSIONS_MAP[role].includes(permission)
}
