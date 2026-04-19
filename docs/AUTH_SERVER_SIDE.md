# AUTH SERVER-SIDE — PREPARADO, NO ACTIVO

## Estado actual (MVP)

El auth de Clozr usa **Firebase Auth + Zustand en el cliente**.

```
Usuario hace login
  → Firebase Auth (client SDK)
  → onAuthStateChanged dispara en AuthProvider
  → AuthProvider guarda el usuario en Zustand (useAuthStore)
  → La UI lee el estado desde el store
```

Esto funciona correctamente para el MVP. No hay cookie de sesión.

## Por qué no está activo el auth server-side

Las piezas server-side **ya están implementadas** pero no conectadas:

| Archivo | Estado | Descripción |
|---|---|---|
| `src/middleware.ts` | ⏸ Deshabilitado | Pasa todo sin verificar |
| `src/server/auth.ts` | ✅ Listo | `requireAuth()`, `requireMembership()`, `requireClozrAdmin()` |
| `src/server/firebase-admin.ts` | ✅ Listo | Admin SDK con Proxy lazy |

El `middleware.ts` verifica la cookie `__session`. El `AuthProvider` **no la setea**.
Si se activa el middleware sin setear la cookie, el login queda bloqueado.

---

## Plan de reactivación — paso a paso

### Paso 1: Setear la cookie __session en AuthProvider

En `src/components/AuthProvider.tsx`, después de verificar el usuario:

```typescript
// Dentro del callback de onAuthChange, cuando firebaseUser !== null:
const idToken = await firebaseUser.getIdToken()

// Setear cookie legible por el servidor (no httpOnly — Firebase Auth la necesita en el cliente)
document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Strict`
```

**Importante:** el idToken de Firebase expira en 1 hora. Hay que renovarlo:

```typescript
// Renovación automática — Firebase llama a onAuthStateChanged cuando el token se renueva
// Pero también se puede forzar con:
const freshToken = await firebaseUser.getIdToken(/* forceRefresh */ true)
```

### Paso 2: Limpiar la cookie al logout

En la función de logout (en `lib/services.ts` o donde se llame a `signOut`):

```typescript
// Después de signOut(auth):
document.cookie = '__session=; path=/; max-age=0'
```

### Paso 3: Reactivar el middleware

Reemplazar el contenido de `src/middleware.ts` con:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/workspace', '/dashboard']
const PUBLIC_PATHS = ['/auth', '/login', '/register', '/invite', '/marketplace', '/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) return NextResponse.next()

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Paso 4: Verificar que Server Actions lean la cookie

`src/server/auth.ts → getServerSession()` ya está implementado correctamente:

```typescript
// Esto ya está en server/auth.ts — no hay que cambiarlo:
const cookieStore = await cookies()
const token = cookieStore.get('__session')?.value
const decoded = await adminAuth.verifyIdToken(token)
```

Solo hay que asegurarse de que el idToken que se guarda en la cookie sea el correcto
y que las variables de entorno del Admin SDK estén configuradas en Vercel:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Paso 5: Verificar en staging

Antes de activar en producción:
1. Login → verificar que se setea la cookie `__session` en DevTools > Application > Cookies
2. Navegar a `/dashboard` → verificar que no redirige a `/auth`
3. Hacer logout → verificar que la cookie se borra
4. Navegar directamente a `/workspace/xyz/hoy` sin login → verificar que redirige a `/auth`
5. Verificar que las Server Actions funcionan (crear cliente, etc.)

---

## Consideraciones adicionales

### Renovación del token

El idToken expira en 1 hora. Opciones:
- **Opción A (simple):** renovar en cada onAuthStateChanged (Firebase lo dispara automáticamente)
- **Opción B (robusta):** interceptor que renueva el token antes de requests importantes

Para el MVP, la Opción A alcanza.

### httpOnly vs no-httpOnly

El idToken de Firebase Auth se maneja en el cliente para otras operaciones (SDK calls).
Por eso la cookie **no debe ser httpOnly** — el cliente necesita poder leerla/actualizarla.

Si se quiere mayor seguridad: usar un session cookie del lado del servidor (como hace Firebase Admin con `createSessionCookie()`), que sí puede ser httpOnly. Esto es más complejo.

### Variables de entorno en Vercel

Las variables del Admin SDK ya están en el `.env.local.example`:
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Hay que configurarlas en el dashboard de Vercel para que las Server Actions funcionen en producción.
