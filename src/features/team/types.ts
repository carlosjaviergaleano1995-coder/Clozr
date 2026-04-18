// REGLA: Membership solo representa acceso activo real.
// Si el documento existe → el miembro tiene acceso.
// Al remover un miembro: se borra el documento.
// Las invitaciones pendientes son WorkspaceInvitation en features/invitations.

export type MemberRole = 'owner' | 'admin' | 'vendedor' | 'viewer'

export interface Membership {
  id: string         // uid del usuario — como doc ID para getDoc directo sin query
  workspaceId: string
  userId: string
  email: string
  displayName: string
  photoURL?: string
  role: MemberRole
  joinedAt: Date
  invitedBy?: string  // uid de quien invitó (si aplica)
}

// Jerarquía de roles para comparaciones
export const ROLE_LEVEL: Record<MemberRole, number> = {
  owner:    4,
  admin:    3,
  vendedor: 2,
  viewer:   1,
}

export function roleIsAtLeast(current: MemberRole, required: MemberRole): boolean {
  return ROLE_LEVEL[current] >= ROLE_LEVEL[required]
}
