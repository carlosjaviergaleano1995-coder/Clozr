import { z } from 'zod'

export const CreateCatalogItemSchema = z.object({
  categoria:    z.string().min(1).max(50),
  subcategoria: z.string().min(1).max(50),
  nombre:       z.string().min(1, 'Nombre requerido').max(100),
  precio:       z.number().nonnegative().optional(),
  currency:     z.enum(['ARS', 'USD']).optional(),
  orden:        z.number().int().nonnegative().default(0),
})

export type CreateCatalogItemInput = z.infer<typeof CreateCatalogItemSchema>
