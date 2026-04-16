'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useWorkspaceStore } from '@/store'
import type { WorkspaceConfig } from '@/types'

type ModuloKey = keyof Pick<WorkspaceConfig,
  'moduloVerisure' | 'moduloBroadcast' | 'moduloRevendedores' |
  'tieneStock' | 'tieneOrdenes' | 'vendeProductos' | 'vendeServicios'
>

// Hook que redirige a /ajustes si el módulo no está habilitado
export function useModuloGuard(modulo: ModuloKey) {
  const params = useParams()
  const router = useRouter()
  const { workspaces } = useWorkspaceStore()
  const workspaceId = params.workspaceId as string
  const ws = workspaces.find(w => w.id === workspaceId)

  useEffect(() => {
    if (!ws) return
    const config = ws.config ?? {}
    if (!config[modulo]) {
      router.replace(`/workspace/${workspaceId}/ajustes`)
    }
  }, [ws, workspaceId])

  return ws?.config?.[modulo] ?? false
}
