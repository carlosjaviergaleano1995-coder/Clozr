// ── SERVER AUTH — PREPARADO, NO ACTIVO EN MVP ────────────────────────────────
//
// ESTADO: implementado y listo, pero no conectado al flujo de login actual.
//
// El MVP usa auth client-side (Firebase Auth + Zustand).
// requireAuth() y requireMembership() están listos para cuando se active
// la cookie __session en AuthProvider.
//
// Ver plan de activación: docs/AUTH_SERVER_SIDE.md
//
// Para que funcionen en producción también hacen falta estas env vars en Vercel:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { adminAuth, adminDb } from './firebase-admin'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { roleIsAtLeast } from '@/features/team/types'
import type { AppUser } from '@/features/auth/types'
import type { Membership, MemberRole } from '@/features/team/types'

// ── getServerSession ──────────────────────────────────────────────────────────
// Lee el token de sesión de la cookie y lo verifica con Admin SDK.
// Retorna null si no hay sesión válida — nunca lanza.

export async function getServerSession(): Promise<AppUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('__session')?.value
    if (!token) return null

    const decoded = await adminAuth.verifyIdToken(token)
    const userDoc = await adminDb.doc(`users/${decoded.uid}`).get()
    if (!userDoc.exists) return null

    return {
      uid: decoded.uid,
      ...userDoc.data(),
    } as AppUser
  } catch {
    return null
  }
}

// ── requireAuth ───────────────────────────────────────────────────────────────
// Versión estricta de getServerSession — lanza si no hay sesión.

export async function requireAuth(): Promise<AppUser> {
  const user = await getServerSession()
  if (!user) throw new UnauthorizedError()
  return user
}

// ── requireMembership ─────────────────────────────────────────────────────────
// Verifica que el usuario autenticado sea miembro activo del workspace.
// Opcionalmente exige un rol mínimo.
//
// REGLA: el doc Membership existe ↔ el miembro es activo.
// No hay status field — si el doc existe, tiene acceso.

export async function requireMembership(
  workspaceId: string,
  minRole?: MemberRole,
): Promise<{ user: AppUser; membership: Membership }> {
  const user = await requireAuth()

  const memberDoc = await adminDb
    .doc(`workspaces/${workspaceId}/members/${user.uid}`)
    .get()

  if (!memberDoc.exists) {
    throw new ForbiddenError('No sos miembro de este negocio')
  }

  const membership = { id: memberDoc.id, ...memberDoc.data() } as Membership

  if (minRole && !roleIsAtLeast(membership.role, minRole)) {
    throw new ForbiddenError(`Rol mínimo requerido: ${minRole}`)
  }

  return { user, membership }
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Para el panel admin de Clozr — distinto de admin del workspace.

export async function requireClozrAdmin(): Promise<AppUser> {
  const user = await requireAuth()
  if (!user.isClozrAdmin) {
    throw new ForbiddenError('Acceso restringido al panel admin')
  }
  return user
}
