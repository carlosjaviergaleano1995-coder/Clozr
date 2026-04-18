import { z } from 'zod'

export const CreateCustomerSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  telefono: z.string().max(30).optional(),
  email: z
    .string()
    .email('Email inválido')
    .max(100)
    .optional()
    .or(z.literal('')),
  tipo: z.enum(['final', 'revendedor', 'mayorista', 'empresa']),
  estado: z
    .enum(['activo', 'potencial', 'inactivo', 'perdido'])
    .default('potencial'),
  barrio:     z.string().max(100).optional(),
  direccion:  z.string().max(200).optional(),
  dni:        z.string().max(20).optional(),
  referidoPor: z.string().optional(),
  referido:    z.string().max(100).optional(),  // compatibilidad con datos existentes
  notas:      z.string().max(1000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  tags:       z.array(z.string().max(30)).max(10).optional(),
})

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

// Todos los campos opcionales para update parcial
export const UpdateCustomerSchema = CreateCustomerSchema.partial()
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
