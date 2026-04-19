'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { UserX, Plus, Shield, Eye } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { changeMemberRole, removeMember } from '@/features/team/actions'
import { InviteMemberForm } from '@/features/invitations/components/InviteMemberForm'
import { useMembers } from '@/hooks/useMembers'
import type { Membership, MemberRole } from '@/features/team/types'

const ROLE_LABEL: Record<MemberRole, string> = {
  owner:    'Owner',
  admin:    'Admin',
  vendedor: 'Vendedor',
  viewer:   'Viewer',
}

const ROLE_COLOR: Record<MemberRole, string> = {
  owner:    'var(--brand-light)',
  admin:    'var(--blue)',
  vendedor: 'var(--green)',
  viewer:   'var(--text-tertiary)',
}

const ROLES_ASIGNABLES: MemberRole[] = ['admin', 'vendedor', 'viewer']

export default function EquipoPage() {
  const params      = useParams()
  const workspaceId = params.workspaceId as string
  const { user }    = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)

  const { role: myRole, isAdmin } = useMemberRole(workspaceId)
  const canManage = isAdmin  // admin u owner pueden gestionar el equipo

  const { members, loading } = useMembers(workspaceId)
  const [showInvite, setShowInvite] = useState(false)
  const [isPending,  startTransition] = useTransition()
  const [error,      setError]      = useState<string | null>(null)

  function handleChangeMemberRole(targetUid: string, newRole: MemberRole) {
    setError(null)
    startTransition(async () => {
      const result = await changeMemberRole(workspaceId, { targetUid, newRole })
      if (!result.ok) { setError(result.error); return }
      // useMembers onSnapshot actualiza automáticamente
    })
  }

  function handleRemoveMember(targetUid: string, displayName: string) {
    if (!confirm(`¿Remover a ${displayName} del equipo?`)) return
    setError(null)
    startTransition(async () => {
      const result = await removeMember(workspaceId, targetUid)
      if (!result.ok) { setError(result.error); return }
      // useMembers onSnapshot actualiza automáticamente
    })
  }

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-16 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-2)' }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Equipo
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'} · {ws?.nombre ?? ''}
          </p>
        </div>
        {canManage && !showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="btn-primary gap-1.5 text-sm"
          >
            <Plus size={14} /> Invitar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-xl text-sm"
          style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
          {error}
        </div>
      )}

      {/* Formulario de invitación */}
      {showInvite && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Invitar miembro
            </h3>
            <button
              onClick={() => setShowInvite(false)}
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ✕
            </button>
          </div>
          <InviteMemberForm
            workspaceId={workspaceId}
            onSuccess={() => setShowInvite(false)}
          />
        </div>
      )}

      {/* Lista de miembros */}
      <div className="space-y-2">
        {members
          .sort((a, b) => {
            // Owner primero, luego admin, luego vendedor, luego viewer
            const order: Record<string, number> = { owner: 0, admin: 1, vendedor: 2, viewer: 3 }
            return (order[a.role] ?? 9) - (order[b.role] ?? 9)
          })
          .map(member => {
            const isMe    = member.userId === user?.uid
            const isOwner = member.role === 'owner'

            return (
              <div
                key={member.id}
                className="px-3 py-3 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                  >
                    {member.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}>
                        {member.displayName}
                        {isMe && <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>(vos)</span>}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${ROLE_COLOR[member.role as MemberRole]}20`, color: ROLE_COLOR[member.role as MemberRole] }}
                      >
                        {ROLE_LABEL[member.role as MemberRole] ?? member.role}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {member.email}
                    </p>
                  </div>

                  {/* Acciones — solo si puedo gestionar y no es el owner */}
                  {canManage && !isOwner && !isMe && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Cambiar rol */}
                      <select
                        className="text-[10px] px-1.5 py-1 rounded-lg font-medium"
                        style={{
                          background: 'var(--surface-2)',
                          color:      'var(--text-secondary)',
                          border:     '1px solid var(--border)',
                        }}
                        value={member.role}
                        disabled={isPending}
                        onChange={e => handleChangeMemberRole(member.userId, e.target.value as MemberRole)}
                      >
                        {ROLES_ASIGNABLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>

                      {/* Remover */}
                      <button
                        onClick={() => handleRemoveMember(member.userId, member.displayName ?? '')}
                        disabled={isPending}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                        title="Remover del equipo"
                      >
                        <UserX size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Leyenda de roles */}
      <div
        className="rounded-2xl p-3 space-y-1.5"
        style={{ background: 'var(--surface-2)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--text-tertiary)' }}>
          Niveles de acceso
        </p>
        {([
          { role: 'owner',    icon: '👑', desc: 'Control total — puede eliminar el negocio'   },
          { role: 'admin',    icon: '🛡️', desc: 'Gestiona equipo, clientes, ventas y ajustes'  },
          { role: 'vendedor', icon: '💼', desc: 'Crea y edita clientes, pipeline y ventas'     },
          { role: 'viewer',   icon: '👁️', desc: 'Solo puede ver — sin permisos de escritura'  },
        ] as { role: MemberRole; icon: string; desc: string }[]).map(r => (
          <div key={r.role} className="flex items-start gap-2">
            <span className="text-xs">{r.icon}</span>
            <div>
              <span className="text-[10px] font-semibold" style={{ color: ROLE_COLOR[r.role] }}>
                {ROLE_LABEL[r.role]}
              </span>
              <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>
                — {r.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
