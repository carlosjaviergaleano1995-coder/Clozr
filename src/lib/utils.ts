// ── UTILIDADES COMPARTIDAS ─────────────────────────────────────────────────────

// Convierte cualquier representación de fecha Firestore al tipo Date.
// Funciona con: Timestamp de Firestore, Date nativo, string, number.
// Es la versión canónica de la función toDate que estaba en lib/services.ts.
export function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  if (typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate()
  }
  if (typeof val === 'string' || typeof val === 'number') return new Date(val)
  return new Date()
}

// Formatea moneda ARS
export function fmtARS(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Formatea moneda USD
export function fmtUSD(n: number): string {
  return `U$S ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Formato abreviado de moneda según currency
export function fmtMoney(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  return currency === 'USD' ? fmtUSD(amount) : fmtARS(amount)
}

// cn — class names helper (simple, sin dependencias externas)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
