import {
  doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { MemberRole } from './types'

export async function changeMemberRole(
  workspaceId: string,
  input: { targetUid: string; newRole: MemberRole },
): Promise<ActionResult> {
  try {
    await updateDoc(
      doc(db, `workspaces/${workspaceId}/members/${input.targetUid}`),
      { role: input.newRole, updatedAt: serverTimestamp() }
    )
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'changeMemberRole')
  }
}

export async function removeMember(
  workspaceId: string,
  targetUid: string,
): Promise<ActionResult> {
  try {
    await deleteDoc(doc(db, `workspaces/${workspaceId}/members/${targetUid}`))
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'removeMember')
  }
}
