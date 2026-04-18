import { z } from 'zod'

export const WorkspaceBaseConfigSchema = z.object({
  vendeProductos: z.boolean(),
  vendeServicios: z.boolean(),
  tieneOrdenes:   z.boolean(),
  moneda:         z.enum(['ARS', 'USD', 'mixed']),
})

export const CreateWorkspaceSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  emoji:  z.string().default('🏪'),
  color:  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido')
    .default('#E8001D'),
  config: WorkspaceBaseConfigSchema,
})

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>

export const UpdateWorkspaceSchema = z.object({
  nombre: z.string().min(2).max(50).optional(),
  emoji:  z.string().optional(),
  color:  z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>
