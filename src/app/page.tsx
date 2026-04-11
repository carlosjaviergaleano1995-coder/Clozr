'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center animate-pulse shadow-lg shadow-brand-600/30">
        <span className="text-white font-bold text-xl">C</span>
      </div>
    </div>
  )
}
