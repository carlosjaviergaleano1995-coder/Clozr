import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── MIDDLEWARE DE CLOZR ────────────────────────────────────────────────────────
// Por ahora solo pasa todo sin bloquear.
// El auth se maneja en el cliente via Firebase Auth + Zustand (AuthProvider).
//
// FUTURO: cuando se implemente la cookie __session en AuthProvider,
// descomentar la lógica de protección de rutas.
// Ver: server/auth.ts → requireAuth() para la versión server-side.

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
