'use client'
import type { ToolProps } from '@/tools/types'

export function GenericSummary({ workspaceId, config }: ToolProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Resumen mensual
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Próximamente — métricas del mes actual.
      </p>
    </div>
  )
}
