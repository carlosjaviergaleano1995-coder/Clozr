// ── ERROR TYPES ───────────────────────────────────────────────────────────────

export type FieldErrors = Record<string, string>

export type ActionErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'LIMIT_REACHED'
  | 'SYSTEM_NOT_FOUND'
  | 'CODE_INVALID'
  | 'CODE_ALREADY_USED'
  | 'INTERNAL_ERROR'

// ── ACTION RESULT ─────────────────────────────────────────────────────────────
// Contrato estándar para todas las Server Actions.
// Nunca se hace throw hacia el cliente — siempre se retorna ActionResult.

export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string; code: ActionErrorCode; fields?: FieldErrors }

// Helpers para construir resultados
export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
export const fail = (
  error: string,
  code: ActionErrorCode,
  fields?: FieldErrors,
): ActionResult<never> => ({ ok: false, error, code, fields })

// ── APP ERROR CLASSES ─────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ActionErrorCode,
    public readonly statusCode = 400,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sin permisos para esta acción') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class LimitReachedError extends AppError {
  constructor(
    public readonly limitType: string,
    public readonly current: number,
    public readonly max: number,
    public readonly requiredPlan: string,
  ) {
    super(`Límite de ${limitType} alcanzado`, 'LIMIT_REACHED', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity} no encontrado`, 'NOT_FOUND', 404)
  }
}

// ── ZOD HELPERS ───────────────────────────────────────────────────────────────

import type { ZodError } from 'zod'

export function parseZodError(error: ZodError<unknown>): FieldErrors {
  return error.issues.reduce<FieldErrors>((acc, err) => {
    const key = err.path.join('.')
    if (!acc[key]) acc[key] = err.message   // primera vez — el mensaje más relevante
    return acc
  }, {})
}

// ── ACTION ERROR HANDLER ──────────────────────────────────────────────────────
// Convierte cualquier error catcheado en un ActionResult fail uniforme.
// Se usa al final del catch en todas las Server Actions.

export function handleActionError(err: unknown, context?: string): ActionResult<never> {
  if (err instanceof LimitReachedError) {
    return fail(err.message, 'LIMIT_REACHED')
  }
  if (err instanceof ForbiddenError) {
    return fail(err.message, 'FORBIDDEN')
  }
  if (err instanceof UnauthorizedError) {
    return fail(err.message, 'UNAUTHORIZED')
  }
  if (err instanceof NotFoundError) {
    return fail(err.message, 'NOT_FOUND')
  }
  if (err instanceof AppError) {
    return fail(err.message, err.code)
  }
  const msg = err instanceof Error ? err.message : 'Error desconocido'
  // Surfacear el código de error de Firestore si existe
  const firestoreCode = (err as any)?.code ?? ''
  console.error(`[${context ?? 'action'}] code=${firestoreCode}`, err)
  if (firestoreCode === 'permission-denied') {
    return fail('Sin permisos: verificá que estés logueado correctamente (permission-denied)', 'FORBIDDEN')
  }
  if (firestoreCode === 'unavailable' || firestoreCode === 'deadline-exceeded') {
    return fail('Sin conexión. Revisá tu red e intentá de nuevo.', 'INTERNAL_ERROR')
  }
  return fail(`Error: ${msg || 'Error interno del servidor'}`, 'INTERNAL_ERROR')
}
