// ── FIREBASE ADMIN SDK ────────────────────────────────────────────────────────
// Solo se importa desde server/. NUNCA desde componentes cliente.
// La inicialización es LAZY — no se ejecuta al importar el módulo,
// solo cuando se llama a adminDb() o adminAuth() por primera vez.

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function getAdminApp(): App {
  const apps = getApps()
  if (apps.length > 0) return apps[0]

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

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

// Singletons lazy — se inicializan solo cuando se usan por primera vez en runtime
let _db:   Firestore | null = null
let _auth: Auth      | null = null

// Funciones getters — llamar estas en vez de usar los exports directos
export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp())
  return _db
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp())
  return _auth
}

// Proxies que se comportan igual que el objeto real pero no inicializan
// hasta que se accede a una propiedad/método
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getAdminDb() as any)[prop]
  },
})

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop]
  },
})
