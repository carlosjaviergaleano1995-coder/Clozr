/**
 * SCRIPT DE MIGRACIÓN: pipeline legacy → canónico
 *
 * Actualiza los docs PipelineCliente en 'pipeline' al shape PipelineItem canónico.
 * Operación NO destructiva — solo agrega campos nuevos, no borra los viejos.
 * Después de la migración, el adapter seguirá funcionando correctamente.
 *
 * CUÁNDO EJECUTAR:
 * - Cuando se necesite precisión en inactiveDays para docs legacy
 * - Cuando se quieran eliminar los helpers de compat del adapter
 *
 * DETECCIÓN: doc con 'clienteId' y 'estado' (sin 'stageId') es legacy.
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

const STAGE_MAP: Record<string, { stageId: string; stageName: string; stageOrder: number }> = {
  prospecto:       { stageId: 'prospecto',       stageName: 'Prospecto',       stageOrder: 0 },
  contactado:      { stageId: 'contactado',      stageName: 'Contactado',      stageOrder: 1 },
  visita_agendada: { stageId: 'visita_agendada', stageName: 'Visita agendada', stageOrder: 2 },
  presupuestado:   { stageId: 'presupuestado',   stageName: 'Presupuestado',   stageOrder: 3 },
  aprobado:        { stageId: 'aprobado',        stageName: 'Aprobado',        stageOrder: 4 },
  instalado:       { stageId: 'instalado',       stageName: 'Instalado',       stageOrder: 5 },
  cobrado:         { stageId: 'cobrado',         stageName: 'Cobrado',         stageOrder: 6 },
  perdido:         { stageId: 'perdido',         stageName: 'Perdido',         stageOrder: 7 },
}

const WON_STAGES  = ['cobrado', 'instalado']
const LOST_STAGES = ['perdido']

function inferStatus(estado: string): string {
  if (WON_STAGES.includes(estado))  return 'won'
  if (LOST_STAGES.includes(estado)) return 'lost'
  return 'open'
}

async function migrateWorkspace(workspaceId: string): Promise<void> {
  const snap = await db.collection(`workspaces/${workspaceId}/pipeline`).get()
  if (snap.empty) return

  let migrated = 0
  const batch  = db.batch()

  for (const doc of snap.docs) {
    const data = doc.data()

    // Solo migrar docs legacy (tienen clienteId y estado, sin stageId)
    if (!data.clienteId || !data.estado || data.stageId) continue

    const estadoKey = data.estado as string
    const stage     = STAGE_MAP[estadoKey] ?? STAGE_MAP.prospecto
    const status    = inferStatus(estadoKey)

    // Convertir notas → activities
    const notas: any[] = data.notas ?? []
    const activities   = notas.map((nota: any, i: number) => ({
      id:              `legacy-nota-${i}`,
      type:            'note',
      description:     nota.texto ?? '',
      result:          nota.proximoPaso ?? null,
      performedAt:     nota.fecha ?? null,
      performedBy:     'legacy',
      performedByName: 'Importado',
    }))

    const updatedAt = data.updatedAt ?? FieldValue.serverTimestamp()

    batch.update(doc.ref, {
      // Campos nuevos del shape canónico
      customerId:       data.clienteId,
      customerSnapshot: { nombre: data.clienteNombre ?? '', telefono: null },
      stageId:          stage.stageId,
      stageName:        stage.stageName,
      stageOrder:       stage.stageOrder,
      activities,
      status,
      lastActivityAt:   updatedAt,
      inactiveDays:     0,   // se recalcula en el siguiente tick del Cloud Function
      // Mover datos Verisure a systemData
      systemData: {
        _legacyShape:     true,
        kitInteres:       data.kitInteres ?? null,
        presupuesto:      data.presupuesto ?? null,
        fechaInstalacion: data.fechaInstalacion ?? null,
        fechaCobro:       data.fechaCobro ?? null,
      },
      // Normalizar campo de fecha de creación
      createdAt: data.creadoAt ?? data.createdAt ?? FieldValue.serverTimestamp(),
      _migratedAt: FieldValue.serverTimestamp(),
    })
    migrated++
  }

  if (migrated > 0) {
    await batch.commit()
    console.log(`[${workspaceId}] ✅ ${migrated} items de pipeline migrados`)
  } else {
    console.log(`[${workspaceId}] Sin items legacy — skip`)
  }
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
