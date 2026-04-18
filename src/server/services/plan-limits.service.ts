// ── PLAN LIMITS SERVICE ───────────────────────────────────────────────────────
// Todas las verificaciones de límites de plan pasan por aquí.
// Se llama desde Server Actions — nunca desde el cliente.

import { LimitReachedError } from '@/lib/errors'
import { getPlanLimits, getNextPlan } from '@/config/plans'
import type { AppUser } from '@/features/auth/types'
import type { Workspace } from '@/features/workspaces/types'

// ── assertCanCreate ───────────────────────────────────────────────────────────
// Lanza LimitReachedError si el usuario no puede crear el recurso solicitado.
// Todos los Server Actions que crean entidades limitadas llaman a esto primero.

export async function assertCanCreate(
  user: AppUser,
  resource: 'customer' | 'member' | 'workspace',
  workspace?: Workspace,
): Promise<void> {
  const limits = getPlanLimits(user.plan)

  switch (resource) {
    case 'customer': {
      if (!workspace) throw new Error('workspace requerido para check de customer')
      if (workspace.customerCount >= limits.maxCustomers) {
        throw new LimitReachedError(
          'clientes',
          workspace.customerCount,
          limits.maxCustomers,
          getNextPlan(user.plan) ?? 'scale',
        )
      }
      break
    }

    case 'member': {
      if (!workspace) throw new Error('workspace requerido para check de member')
      if (workspace.memberCount >= limits.maxMembers) {
        throw new LimitReachedError(
          'miembros del equipo',
          workspace.memberCount,
          limits.maxMembers,
          getNextPlan(user.plan) ?? 'scale',
        )
      }
      break
    }

    case 'workspace': {
      const maxWs = limits.maxWorkspaces
      if (user.workspaceCount >= maxWs) {
        throw new LimitReachedError(
          'negocios',
          user.workspaceCount,
          maxWs === Infinity ? 999 : maxWs,
          getNextPlan(user.plan) ?? 'scale',
        )
      }
      break
    }
  }
}

// ── canExport ─────────────────────────────────────────────────────────────────
export function assertCanExport(user: AppUser): void {
  const limits = getPlanLimits(user.plan)
  if (!limits.canExport) {
    throw new LimitReachedError('exportación de datos', 0, 0, getNextPlan(user.plan) ?? 'scale')
  }
}

// ── canUseApi ─────────────────────────────────────────────────────────────────
export function assertCanUseApi(user: AppUser): void {
  const limits = getPlanLimits(user.plan)
  if (!limits.hasApi) {
    throw new LimitReachedError('acceso a API', 0, 0, getNextPlan(user.plan) ?? 'scale')
  }
}
