import { z } from 'zod'

const SaleItemSchema = z.object({
  catalogItemId:  z.string().optional(),
  descripcion:    z.string().min(1, 'Descripción requerida').max(200),
  cantidad:       z.number().int().positive('Cantidad debe ser positiva'),
  precioUnitario: z.number().nonnegative('Precio no puede ser negativo'),
  subtotal:       z.number().nonnegative(),
})

export const CreateSaleSchema = z.object({
  customerId:    z.string().optional(),
  customerName:  z.string().min(1, 'Cliente requerido').max(100),
  pipelineItemId: z.string().optional(),
  items:         z.array(SaleItemSchema).min(1, 'Al menos un item requerido'),
  subtotal:      z.number().nonnegative(),
  discount:      z.number().nonnegative().optional(),
  total:         z.number().nonnegative(),
  currency:      z.enum(['ARS', 'USD']),
  formaPago:     z.string().min(1, 'Forma de pago requerida').max(50),
  pagado:        z.boolean().default(false),
  systemData:    z.record(z.string(), z.unknown()).optional(),
  notas:         z.string().max(500).optional(),
  fecha:         z.coerce.date(),
})

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>
