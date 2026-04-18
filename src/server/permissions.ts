import { ForbiddenError } from '@/lib/errors'
import { hasPermission, type Permission } from '@/config/permissions'
import type { MemberRole } from '@/features/team/types'

// ── requirePermission ─────────────────────────────────────────────────────────
// Lanza ForbiddenError si el rol no tiene el permiso requerido.
// Se llama después de requireMembership en cada Server Action.

export function requirePermission(role: MemberRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Sin permiso para: ${permission}`)
  }
}

// Re-exportar para conveniencia — los actions solo importan desde server/
export { hasPermission } from '@/config/permissions'
export type { Permission } from '@/config/permissions'
