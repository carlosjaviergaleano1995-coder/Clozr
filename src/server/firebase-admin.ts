// ── FIREBASE ADMIN SDK ────────────────────────────────────────────────────────
// Solo se importa desde server/. NUNCA desde componentes cliente.
// Next.js garantiza que este módulo no se incluya en el bundle del cliente
// mientras viva bajo server/ y no sea importado desde 'use client' files.

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function getAdminApp(): App {
  const apps = getApps()
  if (apps.length > 0) return apps[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[firebase-admin] Variables de entorno faltantes: ' +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  })
}

// Singletons — se inicializan una sola vez por proceso
let _db: Firestore | null = null
let _auth: Auth | null = null

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp())
  return _db
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp())
  return _auth
}

// Exports con nombres cortos para uso en server/
export const adminDb   = (() => getAdminDb())()    // lazy singleton en módulo
export const adminAuth = (() => getAdminAuth())()  // lazy singleton en módulo
