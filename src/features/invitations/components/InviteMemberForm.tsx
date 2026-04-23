'use client'

import { useState, useTransition } from 'react'
import { Copy, Check, UserPlus } from 'lucide-react'
import { inviteMember } from '../actions'
import type { MemberRole } from '@/features/team/types'

interface InviteMemberFormProps {
  workspaceId: string
  onSuccess?:  () => void
}

const ROLE_OPTIONS: { value: MemberRole; label: string; desc: string }[] = [
  { value: 'admin',    label: 'Admin',    desc: 'Puede gestionar clientes, ventas y el equipo'    },
  { value: 'vendedor', label: 'Vendedor', desc: 'Puede ver y crear clientes, ventas y pipeline'   },
  { value: 'viewer',   label: 'Solo ver', desc: 'Solo puede ver, sin poder modificar nada'        },
]

export function InviteMemberForm({ workspaceId, onSuccess }: InviteMemberFormProps) {
  const [isPending, startTransition] = useTransition()
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<MemberRole>('vendedor')
  const [link,    setLink]    = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function handleSubmit() {
    if (!email.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await inviteMember(workspaceId, { email: email.trim(), role })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setLink(result.data.inviteLink)
      onSuccess?.()
    })
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Si ya tenemos el link, mostrar la pantalla de copia
  if (link) {
    return (
      <div className="space-y-4">
        <div className="text-center py-2">
          <UserPlus size={28} className="mx-auto mb-2" style={{ color: '#4ade80' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Invitación creada
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Compartí este link — expira en 7 días
          </p>
        </div>

        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs flex-1 truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
            {link}
          </span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{
              background: copied ? 'rgba(74,222,128,.15)' : 'var(--surface-3)',
              color: copied ? '#4ade80' : 'var(--text-secondary)',
            }}
          >
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>

        <button
          onClick={() => { setLink(null); setEmail(''); setRole('vendedor') }}
          className="w-full py-2 rounded-xl text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
        >
          Invitar otro miembro
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Email */}
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          className="input text-sm"
          placeholder="nombre@ejemplo.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {/* Rol */}
      <div>
        <label className="label">Rol</label>
        <div className="space-y-2">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRole(opt.value)}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                background: role === opt.value ? 'var(--red-faint, rgba(232,0,29,.08))' : 'var(--surface-2)',
                border: `1px solid ${role === opt.value ? 'rgba(232,0,29,.25)' : 'var(--border)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0"
                style={{
                  borderColor: role === opt.value ? 'var(--brand, #E8001D)' : 'var(--border)',
                  background:  role === opt.value ? 'var(--brand, #E8001D)' : 'transparent',
                }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending || !email.trim()}
        className="btn-primary w-full"
      >
        {isPending ? 'Creando link…' : 'Generar link de invitación'}
      </button>
    </div>
  )
}
