import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación
const PROTECTED_PREFIXES = ['/workspace', '/dashboard']

// Rutas públicas (siempre permitidas)
const PUBLIC_PATHS = ['/auth', '/login', '/register', '/invite', '/marketplace', '/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas de API — no aplicar middleware de auth aquí
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // Rutas públicas — siempre permitir
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Rutas protegidas — verificar cookie de sesión
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const session = request.cookies.get('__session')?.value
  if (!session) {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Aplicar a todo excepto static files y _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
