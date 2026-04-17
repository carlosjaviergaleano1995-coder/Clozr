'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInviteByToken, acceptInvite } from '@/lib/services'
import { useAuthStore } from '@/store'
import { ClozrIcon } from '@/components/ClozrLogo'
import type { WorkspaceInvite } from '@/types'

const ROLE_LABEL: Record<string, string> = {
  owner:    'Owner',
  admin:    'Administrador',
  vendedor: 'Vendedor',
  viewer:   'Solo lectura',
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { user } = useAuthStore()

  const [invite, setInvite] = useState<WorkspaceInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    try {
      const inv = await getInviteByToken(token)
      if (!inv) { setError('El link de invitación no existe o ya fue usado.'); return }
      if (inv.status !== 'pending') {
        setError(inv.status === 'accepted' ? 'Esta invitación ya fue aceptada.' :
                 inv.status === 'revoked'  ? 'Esta invitación fue revocada.' :
                 'Esta invitación expiró.')
        return
      }
      if (new Date(inv.expiresAt) < new Date()) {
        setError('Esta invitación expiró (válida por 7 días).')
        return
      }
      setInvite(inv)
    } catch {
      setError('Error al cargar la invitación.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!invite || !user) return
    setAccepting(true)
    try {
      await acceptInvite(invite, {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? user.email ?? '',
        photoURL: user.photoURL ?? undefined,
      })
      setDone(true)
      setTimeout(() => router.push(`/workspace/${invite.workspaceId}/hoy`), 1500)
    } catch {
      setError('Error al aceptar la invitación. Intentá de nuevo.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <ClozrIcon size={56} />
        </div>

        {error ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl mb-3">⚠️</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
            <button onClick={() => router.push('/dashboard')}
              className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Ir al inicio →
            </button>
          </div>
        ) : done ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl mb-3">✅</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              ¡Listo! Te uniste al workspace.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Redirigiendo...
            </p>
          </div>
        ) : invite ? (
          <div className="rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

            {/* Workspace info */}
            <div className="flex items-center gap-3 mb-5 pb-5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'var(--surface-2)' }}>
                {invite.workspaceEmoji}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {invite.workspaceNombre}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Te invitaron como{' '}
                  <span className="font-semibold" style={{ color: 'var(--brand-light)' }}>
                    {ROLE_LABEL[invite.role]}
                  </span>
                </p>
              </div>
            </div>

            {/* Usuario actual */}
            {user ? (
              <>
                <div className="rounded-xl px-3 py-2.5 mb-4"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Entrás como</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {user.displayName || user.email}
                  </p>
                  {user.email && (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
                  )}
                </div>

                <button onClick={handleAccept} disabled={accepting}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: accepting ? 'var(--brand-dark)' : 'var(--brand)' }}>
                  {accepting ? 'Uniéndome...' : 'Aceptar invitación'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Necesitás iniciar sesión para aceptar la invitación.
                </p>
                <button onClick={() => router.push(`/auth?redirect=/invite/${token}`)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--brand)' }}>
                  Iniciar sesión
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
