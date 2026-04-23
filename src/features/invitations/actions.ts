import {
  collection, doc, setDoc, updateDoc, getDoc, getDocs,
  serverTimestamp, runTransaction, query, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

export async function inviteMember(
  workspaceId: string,
  input: { email: string; role: string },
): Promise<ActionResult<{ inviteLink: string; inviteId: string }>> {
  try {
    if (!input.email?.trim()) return fail('Email requerido', 'VALIDATION_ERROR')

    // Check si ya hay invitación pendiente para este email
    const existingSnap = await getDocs(query(
      collection(db, `workspaces/${workspaceId}/invitations`),
      where('email', '==', input.email.toLowerCase()),
      where('status', '==', 'pending'),
    ))
    if (!existingSnap.empty) return fail('Ya hay una invitación pendiente para este email', 'FORBIDDEN')

    const ref = doc(collection(db, `workspaces/${workspaceId}/invitations`))
    await setDoc(ref, {
      workspaceId,
      email:     input.email.toLowerCase(),
      role:      input.role,
      status:    'pending',
      invitedBy: '',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clozr.vercel.app'
    const inviteLink = `${appUrl}/invite/${ref.id}`

    return ok({ inviteLink, inviteId: ref.id })
  } catch (err) {
    return handleActionError(err, 'inviteMember')
  }
}

export async function acceptInvitation(
  inviteId: string,
  userId: string,
  userEmail: string,
  displayName: string,
): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    // Find the invitation across all workspaces
    const inviteSnap = await getDocs(
      query(collection(db, 'workspaces'), where('__name__', '!=', ''))
    )

    // Simpler: invitation doc is at /workspaces/{wid}/invitations/{inviteId}
    // We need to search — for MVP we store workspaceId in the invite
    // Actually, since we know inviteId, we need to find it
    // Better: store invitations at top level
    const topInviteRef = doc(db, `invitations/${inviteId}`)
    const topInviteDoc = await getDoc(topInviteRef)

    if (!topInviteDoc.exists()) {
      return fail('Invitación no encontrada o expirada', 'NOT_FOUND')
    }

    const invitation = topInviteDoc.data()!
    const { workspaceId } = invitation

    // Check if user is already a member
    const existingMember = await getDoc(doc(db, `workspaces/${workspaceId}/members/${userId}`))
    if (existingMember.exists()) {
      return ok({ workspaceId })
    }

    // Add member + mark invite accepted
    await setDoc(doc(db, `workspaces/${workspaceId}/members/${userId}`), {
      workspaceId,
      userId,
      email:       userEmail,
      displayName,
      photoURL:    null,
      role:        invitation.role ?? 'vendedor',
      joinedAt:    serverTimestamp(),
      invitedBy:   invitation.invitedBy,
    })

    await updateDoc(topInviteRef, {
      status:         'accepted',
      acceptedByUid:  userId,
      acceptedAt:     serverTimestamp(),
    })

    return ok({ workspaceId })
  } catch (err) {
    return handleActionError(err, 'acceptInvitation')
  }
}

export async function revokeInvitation(
  workspaceId: string,
  inviteId: string,
): Promise<ActionResult> {
  try {
    await updateDoc(
      doc(db, `workspaces/${workspaceId}/invitations/${inviteId}`),
      { status: 'revoked', revokedAt: serverTimestamp() }
    )
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'revokeInvitation')
  }
}
