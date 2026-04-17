'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, UserX, ChevronDown, Plus, Mail, Link } from 'lucide-react'
import {
  getMembers, getInvites, createInvite,
  revokeInvite, removeMember, setMemberRole,
} from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { WorkspaceMember, WorkspaceInvite, MemberRole } from '@/types'

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
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const { role: myRole, isOwner, isAdmin } = useMemberRole(workspaceId)

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nueva invitación
  const [showModal, setShowModal] = useState(false)
  const [inviteMode, setInviteMode] = useState<'email' | 'link'>('link')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('vendedor')
  const [creating, setCreating] = useState(false)
  const [newInvite, setNewInvite] = useState<WorkspaceInvite | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [m, i] = await Promise.all([
        getMembers(workspaceId),
        getInvites(workspaceId),
      ])
      setMembers(m)
      setInvites(i.filter(i => i.status === 'pending'))
    } finally { setLoading(false) }
  }

  const handleCreateInvite = async () => {
    if (!user || !ws) return
    setCreating(true)
    try {
      const inv = await createInvite(
        workspaceId,
        ws.nombre,
        ws.emoji,
        user.uid,
        inviteRole,
        inviteMode === 'email' ? inviteEmail : undefined,
      )
      setNewInvite(inv)
      setInvites(prev => [inv, ...prev])
    } finally { setCreating(false) }
  }

  const inviteLink = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://clozr.vercel.app'}/invite/${token}`

  const copiarLink = (token: string) => {
    navigator.clipboard.writeText(inviteLink(token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('¿Eliminar este miembro del workspace?')) return
    await removeMember(workspaceId, userId)
    setMembers(prev => prev.filter(m => m.userId !== userId))
  }

  const handleChangeRole = async (userId: string, newRole: MemberRole) => {
    await setMemberRole(workspaceId, userId, newRole)
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m))
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  const pendingInvites = invites.filter(i => i.status === 'pending')

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Equipo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowModal(true); setNewInvite(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'var(--brand)' }}>
            <Plus size={13} /> Invitar
          </button>
        )}
      </div>

      {/* Miembros actuales */}
      <div className="space-y-2">
        {members.map(member => {
          const isMe = member.userId === user?.uid
          const canEdit = isOwner && !isMe && member.role !== 'owner'

          return (
            <div key={member.userId}
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                {member.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {member.displayName}
                    {isMe && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(vos)</span>}
                  </p>
                </div>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {member.email}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {canEdit ? (
                  <div className="relative">
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.userId, e.target.value as MemberRole)}
                      className="text-[11px] font-semibold rounded-lg px-2 py-1 appearance-none pr-5 cursor-pointer"
                      style={{
                        background: 'var(--surface-2)',
                        color: ROLE_COLOR[member.role],
                        border: '1px solid var(--border)',
                      }}>
                      {ROLES_ASIGNABLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: ROLE_COLOR[member.role] }}>
                    {ROLE_LABEL[member.role]}
                  </span>
                )}

                {canEdit && (
                  <button onClick={() => handleRemoveMember(member.userId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    <UserX size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Invitaciones pendientes */}
      {pendingInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>
            Invitaciones pendientes
          </p>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {inv.email ?? 'Link de invitación'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {ROLE_LABEL[inv.role]} · expira {new Date(inv.expiresAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => copiarLink(inv.token)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'var(--surface-2)', color: copied ? 'var(--green)' : 'var(--text-tertiary)' }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleRevoke(inv.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <UserX size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva invitación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Invitar miembro</h3>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>✕</button>
            </div>

            {newInvite ? (
              /* Link generado */
              <div className="space-y-4">
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Link de invitación
                  </p>
                  <p className="text-xs break-all" style={{ color: 'var(--text-secondary)' }}>
                    {inviteLink(newInvite.token)}
                  </p>
                </div>
                <button onClick={() => copiarLink(newInvite.token)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={copied
                    ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }
                    : { background: 'var(--brand)', color: '#fff' }}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copiado ✓' : 'Copiar link'}
                </button>
                <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                  Válido por 7 días · Rol: {ROLE_LABEL[newInvite.role]}
                </p>
              </div>
            ) : (
              /* Formulario */
              <div className="space-y-4">

                {/* Modo */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'link' as const,  label: '🔗 Link copiable', icon: Link },
                    { id: 'email' as const, label: '📧 Por email',      icon: Mail },
                  ]).map(({ id, label }) => (
                    <button key={id} onClick={() => setInviteMode(id)}
                      className="py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={inviteMode === id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {inviteMode === 'email' && (
                  <div>
                    <label className="label">Email</label>
                    <input className="input text-sm" type="email" placeholder="nombre@email.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoFocus />
                  </div>
                )}

                {/* Rol */}
                <div>
                  <label className="label">Rol</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES_ASIGNABLES.map(r => (
                      <button key={r} onClick={() => setInviteRole(r)}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={inviteRole === r
                          ? { background: 'var(--surface-3)', color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}` }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {ROLE_LABEL[r]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    {inviteRole === 'admin'    && 'Ve y edita todo. No puede borrar el workspace.'}
                    {inviteRole === 'vendedor' && 'Puede agregar clientes, ventas y tareas. Sin config.'}
                    {inviteRole === 'viewer'   && 'Solo puede ver, no puede editar nada.'}
                  </p>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={creating || (inviteMode === 'email' && !inviteEmail)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: creating ? 'var(--brand-dark)' : 'var(--brand)', opacity: (inviteMode === 'email' && !inviteEmail) ? 0.5 : 1 }}>
                  {creating ? 'Generando...' : inviteMode === 'link' ? 'Generar link' : 'Enviar invitación'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
