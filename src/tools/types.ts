// ── TOOL REGISTRY TYPES ───────────────────────────────────────────────────────
// Contrato que cada herramienta preconstruida debe implementar.

import type { ComponentType } from 'react'
import type { SystemFeatureFlags } from '@/features/systems/types'

export interface ToolProps {
  workspaceId: string
  config:      Record<string, unknown>  // JSON del ToolDefinition.config
}

export interface RegisteredTool {
  component:         ComponentType<ToolProps>
  label:             string
  // Si está definido, la herramienta solo es accesible si ese flag está activo
  requiredFlag?:     keyof SystemFeatureFlags
}
