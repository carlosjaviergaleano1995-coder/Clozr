import { z } from 'zod'

export const CreatePipelineItemSchema = z.object({
  customerId: z.string().min(1, 'Cliente requerido'),
  customerSnapshot: z.object({
    nombre:   z.string(),
    telefono: z.string().optional(),
  }),
  stageId:    z.string().min(1),
  stageName:  z.string().min(1),
  stageOrder: z.number().int().nonnegative(),
  estimatedValue: z.number().nonnegative().optional(),
  currency:   z.enum(['ARS', 'USD']).default('ARS'),
  nextAction: z.string().max(200).optional(),
  nextActionAt: z.coerce.date().optional(),
  systemData: z.record(z.string(), z.unknown()).optional(),
})

export type CreatePipelineItemInput = z.infer<typeof CreatePipelineItemSchema>

export const AddActivitySchema = z.object({
  type: z.enum(['note','call','visit','whatsapp','email','status_change','custom']),
  customType:  z.string().max(50).optional(),
  description: z.string().min(1, 'Descripción requerida').max(500),
  result:      z.string().max(200).optional(),
  performedAt: z.coerce.date().optional(),
})

export type AddActivityInput = z.infer<typeof AddActivitySchema>

export const UpdateStageSchema = z.object({
  stageId:    z.string().min(1),
  stageName:  z.string().min(1),
  stageOrder: z.number().int().nonnegative(),
})

export type UpdateStageInput = z.infer<typeof UpdateStageSchema>

export const ClosePipelineItemSchema = z.object({
  outcome:      z.enum(['won', 'lost']),
  closedValue:  z.number().nonnegative().optional(),
  closedReason: z.string().max(300).optional(),
})

export type ClosePipelineItemInput = z.infer<typeof ClosePipelineItemSchema>
