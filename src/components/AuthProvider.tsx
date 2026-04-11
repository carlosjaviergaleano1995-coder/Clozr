'use client'

import { useEffect } from 'react'
import { onAuthChange, saveUserProfile } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { User } from '@/types'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        await saveUserProfile(firebaseUser)
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Usuario',
          photoURL: firebaseUser.photoURL ?? undefined,
          createdAt: new Date(),
        }
        setUser(user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [setUser, setLoading])

  return <>{children}</>
}
