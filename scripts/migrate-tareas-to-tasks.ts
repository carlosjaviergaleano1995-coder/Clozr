/**
 * SCRIPT DE MIGRACIÓN: tareas → tasks
 *
 * Lee los docs de la colección legacy 'tareas' (shape antiguo)
 * y los copia a la colección nueva 'tasks' (shape canónico).
 *
 * CUÁNDO EJECUTAR:
 * - Cuando se quiera que la pantalla de tareas muestre los datos históricos
 * - No es urgente — la colección 'tasks' ya funciona para datos nuevos
 *
 * CÓMO EJECUTAR:
 *   FIREBASE_PROJECT_ID=clozr-77ee3 \
 *   FIREBASE_CLIENT_EMAIL=... \
 *   FIREBASE_PRIVATE_KEY=... \
 *   npx tsx scripts/migrate-tareas-to-tasks.ts [workspaceId]
 *
 * Si no se pasa workspaceId, migra TODOS los workspaces (⚠️ cuidado en prod).
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

// Mapeo de frecuencia legacy → canónica
const FREQ_MAP: Record<string, { tipo: string; frecuencia?: string }> = {
  diaria:  { tipo: 'rutina', frecuencia: 'daily'  },
  semanal: { tipo: 'rutina', frecuencia: 'weekly' },
  unica:   { tipo: 'puntual'                       },
}

async function migrateWorkspace(workspaceId: string): Promise<void> {
  console.log(`[${workspaceId}] Leyendo tareas legacy...`)

  const tareasSnap = await db
    .collection(`workspaces/${workspaceId}/tareas`)
    .get()

  if (tareasSnap.empty) {
    console.log(`[${workspaceId}] Sin tareas legacy — skip`)
    return
  }

  console.log(`[${workspaceId}] ${tareasSnap.size} tareas encontradas`)

  const batch = db.batch()
  let count = 0

  for (const doc of tareasSnap.docs) {
    const data = doc.data()
    const frecLegacy = data.frecuencia as string ?? 'unica'
    const mapped = FREQ_MAP[frecLegacy] ?? { tipo: 'puntual' }

    // Verificar que no exista ya en 'tasks' (idempotente)
    const existing = await db.doc(`workspaces/${workspaceId}/tasks/${doc.id}`).get()
    if (existing.exists) {
      console.log(`  → ${doc.id} ya migrado, skip`)
      continue
    }

    batch.set(db.doc(`workspaces/${workspaceId}/tasks/${doc.id}`), {
      id:          doc.id,
      workspaceId,
      tipo:        mapped.tipo,
      frecuencia:  mapped.frecuencia ?? null,
      titulo:      data.titulo ?? '',
      completada:  data.completada ?? false,
      completadaAt: data.fechaCompletada ?? null,
      completadaPor: null,
      dueAt:       null,
      asignadoA:   null,
      creadoPor:   data.creadoPor ?? '',
      createdAt:   data.createdAt ?? FieldValue.serverTimestamp(),
      // Marca para identificar que fue migrado
      _migratedFrom: 'tareas',
      _migratedAt:    FieldValue.serverTimestamp(),
    })
    count++
  }

  if (count > 0) {
    await batch.commit()
    console.log(`[${workspaceId}] ✅ ${count} tareas migradas a 'tasks'`)
  }
}

async function main() {
  const targetWorkspaceId = process.argv[2]

  if (targetWorkspaceId) {
    await migrateWorkspace(targetWorkspaceId)
  } else {
    // Migrar todos los workspaces
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
  console.error('❌ Error en migración:', err)
  process.exit(1)
})
