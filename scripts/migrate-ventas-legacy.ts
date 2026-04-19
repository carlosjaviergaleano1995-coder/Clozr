/**
 * SCRIPT DE MIGRACIÓN: ventas legacy → canónico
 *
 * Agrega campo 'pagado: boolean' y 'fecha' a docs legacy que solo tienen 'estado'.
 * Operación NO destructiva — no borra campos viejos.
 *
 * CUÁNDO EJECUTAR:
 * - Cuando se necesite que el filtro pagado/pendiente funcione en docs legacy
 * - Cuando se quiera que 'fecha' esté presente para ordenamiento correcto
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const app = initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore(app)

async function migrateWorkspace(workspaceId: string): Promise<void> {
  const snap = await db
    .collection(`workspaces/${workspaceId}/ventas`)
    .where('pagado', '==', null)    // No tienen 'pagado' aún
    .get()
    .catch(async () => {
      // Si el índice no existe, traer todos y filtrar
      const all = await db.collection(`workspaces/${workspaceId}/ventas`).get()
      return { docs: all.docs.filter(d => !('pagado' in d.data())) }
    }) as any

  if (!snap.docs?.length) {
    console.log(`[${workspaceId}] Sin ventas legacy — skip`)
    return
  }

  let migrated = 0
  const BATCH_SIZE = 400
  let batch = db.batch()

  for (const doc of snap.docs) {
    const data = doc.data()
    // Solo migrar si tiene 'estado' y no tiene 'pagado'
    if (!data.estado || 'pagado' in data) continue

    const pagado = data.estado === 'cerrada'

    batch.update(doc.ref, {
      pagado,
      pagadoAt: pagado ? (data.updatedAt ?? data.createdAt ?? FieldValue.serverTimestamp()) : null,
      // Agregar 'fecha' si no existe (para ordenamiento correcto)
      fecha: data.fecha ?? data.createdAt ?? FieldValue.serverTimestamp(),
      // Normalizar nombre de campos
      customerName: data.customerName ?? data.clienteNombre ?? '',
      currency:     data.currency ?? data.moneda ?? 'ARS',
      _migratedAt:  FieldValue.serverTimestamp(),
    })
    migrated++

    if (migrated % BATCH_SIZE === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`[${workspaceId}] ... ${migrated} ventas migradas`)
    }
  }

  if (migrated % BATCH_SIZE !== 0) {
    await batch.commit()
  }

  console.log(`[${workspaceId}] ✅ ${migrated} ventas migradas`)
}

async function main() {
  const targetWorkspaceId = process.argv[2]
  if (targetWorkspaceId) {
    await migrateWorkspace(targetWorkspaceId)
  } else {
    console.log('⚠️  Migrando TODOS los workspaces...')
    const wsSnap = await db.collection('workspaces').get()
    for (const ws of wsSnap.docs) {
      await migrateWorkspace(ws.id)
    }
  }
  console.log('✅ Migración completada')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
