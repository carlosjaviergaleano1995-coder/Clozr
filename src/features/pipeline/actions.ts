import {
  collection, doc, setDoc, updateDoc, getDoc, arrayUnion,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'

const WON_STAGES  = ['cobrado', 'instalado', 'cerrado']
const LOST_STAGES = ['perdido', 'lost']

function inferStatus(stageId: string): 'open' | 'won' | 'lost' {
  if (WON_STAGES.includes(stageId))  return 'won'
  if (LOST_STAGES.includes(stageId)) return 'lost'
  return 'open'
}

export async function createPipelineItem(
  workspaceId: string,
  input: {
    customerId: string
    customerSnapshot: { nombre: string; telefono?: string }
    stageId: string
    stageName: string
    stageOrder: number
    currency?: 'ARS' | 'USD'
    systemData?: Record<string, unknown>
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const ref = doc(collection(db, `workspaces/${workspaceId}/pipeline`))
    const status = inferStatus(input.stageId)

    await setDoc(ref, {
      workspaceId,
      customerId:       input.customerId,
      customerSnapshot: input.customerSnapshot,
      stageId:          input.stageId,
      stageName:        input.stageName,
      stageOrder:       input.stageOrder,
      activities:       [],
      status,
      currency:         input.currency ?? 'ARS',
      systemData:       input.systemData ?? null,
      estimatedValue:   null,
      closedValue:      null,
      nextAction:       null,
      nextActionAt:     null,
      lastActivityAt:   serverTimestamp(),
      inactiveDays:     0,
      creadoPor:        '',
      createdAt:        serverTimestamp(),
      updatedAt:        serverTimestamp(),
    })

    return ok({ id: ref.id })
  } catch (err) {
    return handleActionError(err, 'createPipelineItem')
  }
}

export async function addActivity(
  workspaceId: string,
  pipelineItemId: string,
  input: {
    type: 'note' | 'call' | 'visit' | 'email' | 'status_change'
    description: string
    result?: string
    performedAt: Date
  },
): Promise<ActionResult> {
  try {
    const activity = {
      id:             `act-${Date.now()}`,
      type:           input.type,
      description:    input.description,
      result:         input.result ?? null,
      performedAt:    Timestamp.fromDate(input.performedAt),
      performedBy:    '',
      performedByName: '',
    }

    await updateDoc(
      doc(db, `workspaces/${workspaceId}/pipeline/${pipelineItemId}`),
      {
        activities:     arrayUnion(activity),
        lastActivityAt: serverTimestamp(),
        inactiveDays:   0,
        updatedAt:      serverTimestamp(),
      }
    )

    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'addActivity')
  }
}

export async function updateStage(
  workspaceId: string,
  pipelineItemId: string,
  input: { stageId: string; stageName: string; stageOrder: number },
): Promise<ActionResult> {
  try {
    const status = inferStatus(input.stageId)
    const activity = {
      id:              `act-${Date.now()}`,
      type:            'status_change',
      description:     `Etapa actualizada a ${input.stageName}`,
      result:          null,
      performedAt:     Timestamp.fromDate(new Date()),
      performedBy:     '',
      performedByName: '',
    }

    const updates: Record<string, unknown> = {
      stageId:        input.stageId,
      stageName:      input.stageName,
      stageOrder:     input.stageOrder,
      status,
      activities:     arrayUnion(activity),
      lastActivityAt: serverTimestamp(),
      inactiveDays:   0,
      updatedAt:      serverTimestamp(),
    }

    if (status !== 'open') {
      updates.closedAt = serverTimestamp()
    }

    await updateDoc(doc(db, `workspaces/${workspaceId}/pipeline/${pipelineItemId}`), updates)
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'updateStage')
  }
}

export async function closePipelineItem(
  workspaceId: string,
  pipelineItemId: string,
  outcome: 'won' | 'lost',
  closedValue?: number,
): Promise<ActionResult> {
  try {
    await updateDoc(
      doc(db, `workspaces/${workspaceId}/pipeline/${pipelineItemId}`),
      {
        status:    outcome,
        closedAt:  serverTimestamp(),
        closedValue: closedValue ?? null,
        updatedAt: serverTimestamp(),
      }
    )
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'closePipelineItem')
  }
}
