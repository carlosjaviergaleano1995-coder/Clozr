'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (!loading) {
      router.push(user ? '/dashboard' : '/auth')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center animate-pulse">
        <span className="text-white font-bold text-lg">C</span>
      </div>
    </div>
  )
}
