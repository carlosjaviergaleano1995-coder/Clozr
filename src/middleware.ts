import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── MIDDLEWARE — DESHABILITADO INTENCIONALMENTE ───────────────────────────────
//
// DECISIÓN (Abril 2026):
// El auth del MVP es client-side via Firebase Auth + Zustand (AuthProvider.tsx).
// Este middleware está preparado pero NO activo.
//
// Por qué está deshabilitado:
// La protección de rutas requiere la cookie __session, que el AuthProvider
// todavía no setea. Activar esto sin esa cookie bloquea el login.
//
// Ver plan de reactivación: docs/AUTH_SERVER_SIDE.md
// Ver implementación futura: server/auth.ts → getServerSession()
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
