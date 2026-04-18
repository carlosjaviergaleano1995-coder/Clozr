import { z } from 'zod'

export const InviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email('Email inválido').max(100),
  role: z.enum(['admin', 'vendedor', 'viewer']),
  // 'owner' no se puede asignar por invitación
})

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10).max(100),
})

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>
