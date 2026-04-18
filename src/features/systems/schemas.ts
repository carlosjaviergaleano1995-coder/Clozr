import { z } from 'zod'

export const ActivateSystemSchema = z.object({
  workspaceId: z.string().min(1),
  code: z
    .string()
    .min(8,  'Código demasiado corto')
    .max(30, 'Código demasiado largo')
    .regex(/^[A-Z0-9-]+$/, 'Formato de código inválido — solo mayúsculas, números y guiones'),
})

export type ActivateSystemInput = z.infer<typeof ActivateSystemSchema>
