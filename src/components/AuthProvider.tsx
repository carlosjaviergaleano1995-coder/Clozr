'use client'

import { useEffect } from 'react'
import { onAuthChange, saveUserProfile } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { User } from '@/types'

// ── Helpers de cookie ──────────────────────────────────────────────────────────
// La cookie __session es leída por el servidor en las Server Actions
// para verificar la identidad del usuario sin depender de cookies httpOnly.
// Se renueva automáticamente cuando Firebase renueva el token (cada ~1h).

function setSessionCookie(token: string) {
  // max-age=3600 = 1 hora (duración del idToken de Firebase)
  // SameSite=Strict previene CSRF
  document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict`
}

function clearSessionCookie() {
  document.cookie = '__session=; path=/; max-age=0'
}

// ── AuthProvider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Obtener idToken y guardarlo como cookie __session
        // Las Server Actions (createCustomer, createPipelineItem, etc.) la leen
        // vía server/auth.ts → getServerSession() → requireMembership()
        try {
          const idToken = await firebaseUser.getIdToken()
          setSessionCookie(idToken)
        } catch {
          // Si falla el token, limpiar la cookie para evitar tokens vencidos
          clearSessionCookie()
        }

        await saveUserProfile(firebaseUser)

        const user: User = {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Usuario',
          photoURL:    firebaseUser.photoURL ?? undefined,
          createdAt:   new Date(),
        }
        setUser(user)
      } else {
        clearSessionCookie()
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [setUser, setLoading])

  return <>{children}</>
}
