import { z } from 'zod'

export const CreateTaskSchema = z.object({
  tipo:       z.enum(['rutina', 'puntual']),
  frecuencia: z.enum(['daily', 'weekly']).optional(),
  titulo:     z.string().min(1, 'Título requerido').max(200),
  dueAt:      z.coerce.date().optional(),
  asignadoA:  z.string().optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
