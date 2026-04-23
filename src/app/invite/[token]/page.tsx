'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { ClozrIcon } from '@/components/ClozrLogo'
import { acceptInvitation } from '@/features/invitations/actions'

const ROLE_LABEL: Record<string, string> = {
  owner:    'Owner',
  admin:    'Administrador',
  vendedor: 'Vendedor',
  viewer:   'Solo lectura',
}

export default function InvitePage() {
  const params   = useParams()
  const router   = useRouter()
  const token    = params.token as string
  const { user, loading: authLoading } = useAuthStore()

  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [done,  setDone]    = useState(false)

  // Redirigir a auth si no está logueado — con el token como redirect param
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=/invite/${token}`)
    }
  }, [user, authLoading, token, router])

  function handleAccept() {
    startTransition(async () => {
      if (!user) return
      const result = await acceptInvitation(token, user.uid, user.email, user.displayName)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone(true)
      setTimeout(() => router.push(`/workspace/${result.data.workspaceId}/hoy`), 1500)
    })
  }

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <ClozrIcon size={40} className="animate-pulse" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-3">
          <div className="text-4xl">✓</div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            ¡Bienvenido al negocio!
          </p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Redirigiendo…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-sm w-full text-center space-y-4">
          <ClozrIcon size={32} className="mx-auto opacity-40" />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-secondary mx-auto"
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div
        className="max-w-sm w-full rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center">
          <ClozrIcon size={32} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Invitación a un negocio
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Alguien te invitó a unirte a un espacio de trabajo en Clozr.
          </p>
        </div>

        <button
          onClick={handleAccept}
          disabled={isPending}
          className="btn-primary w-full"
        >
          {isPending ? 'Aceptando…' : 'Aceptar invitación'}
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2 text-sm text-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Rechazar
        </button>
      </div>
    </div>
  )
}
