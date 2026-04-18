import type { CreateCustomerInput } from './schemas'

// ── generateSearchTokens ──────────────────────────────────────────────────────
// Genera un array de prefijos normalizados para búsqueda client-side y
// búsqueda por array-contains en Firestore.
// Se llama al crear y editar un cliente.

export function generateSearchTokens(
  customer: Partial<Pick<CreateCustomerInput, 'nombre' | 'telefono' | 'barrio' | 'email'>>,
): string[] {
  const text = [
    customer.nombre,
    customer.telefono,
    customer.barrio,
    customer.email?.split('@')[0],  // solo la parte local del email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    // Normalizar: quitar tildes y caracteres especiales
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

  const words = text.split(/\s+/).filter(w => w.length > 1)

  // Prefijos de cada palabra: "Juan" → ["ju", "jua", "juan"]
  const prefixes = words.flatMap(word =>
    Array.from(
      { length: Math.min(word.length, 10) - 1 },
      (_, i) => word.slice(0, i + 2),
    ),
  )

  // Deduplicar y limitar — Firestore rechaza arrays muy grandes
  return Array.from(new Set([...words, ...prefixes])).slice(0, 60)
}
