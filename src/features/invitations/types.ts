import type { MemberRole } from '@/features/team/types'

// Ciclo de vida de una invitación:
//   created → pending → accepted | rejected | expired
//
// Es completamente independiente de Membership.
// Al aceptar una invitación: se crea un Membership y se actualiza la invitación.

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  invitedEmail: string          // email al que se envió (puede diferir del uid al aceptar)
  role: MemberRole              // rol que tendrá al aceptar
  token: string                 // token único para el link — UUID v4
  invitedBy: string             // uid del que invitó
  invitedByName: string         // desnormalizado para mostrar sin join
  status: InvitationStatus
  expiresAt: Date               // createdAt + 7 días
  acceptedByUid?: string        // uid del usuario que aceptó
  acceptedAt?: Date
  createdAt: Date
}

// Vive en /workspaces/{wid}/invitations/{id}
// Se puede buscar por token con: where('token', '==', token)
