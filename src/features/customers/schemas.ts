import { z } from 'zod'

// ── Pricing policy — tres variantes ──────────────────────────────────────────

const FixedPriceRule = z.object({
  type:  z.literal('fixed'),
  // precio fijo por categoría de producto (clave = catalogItemId o '*' para todos)
  prices: z.record(z.string(), z.number()),
})

const PercentageRule = z.object({
  type:       z.literal('percentage'),
  percentage: z.number().min(-99).max(100),  // negativo = descuento, positivo = recargo
})

const VolumeTierRule = z.object({
  type:  z.literal('volume'),
  tiers: z.array(z.object({
    minQty:     z.number().int().min(1),
    percentage: z.number().min(-99).max(100),
  })).min(1),
})

export const PricingPolicySchema = z.discriminatedUnion('type', [
  FixedPriceRule,
  PercentageRule,
  VolumeTierRule,
])

export type PricingPolicy = z.infer<typeof PricingPolicySchema>

// ── Customer schema ───────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  telefono: z.string().max(30).optional(),
  email: z.string().email('Email inválido').max(100).optional().or(z.literal('')),
  tipo: z.enum(['final', 'revendedor', 'mayorista', 'empresa']),
  estado: z.enum(['activo', 'potencial', 'dormido', 'inactivo', 'perdido']).default('potencial'),
  barrio:       z.string().max(100).optional(),
  direccion:    z.string().max(200).optional(),
  dni:          z.string().max(20).optional(),
  referidoPor:  z.string().optional(),
  referido:     z.string().max(100).optional(),
  notas:        z.string().max(1000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  tags:         z.array(z.string().max(30)).max(10).optional(),
  pricingPolicy: PricingPolicySchema.optional(),
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

export const UpdateCustomerSchema = CreateCustomerSchema.partial()
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
