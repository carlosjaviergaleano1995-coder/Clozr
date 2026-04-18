'use client'
import type { ToolProps } from '@/tools/types'

// Esta herramienta reemplaza la calculadora Verisure actual.
// Recibe 'config' con kits, comisiones y bonos desde el SystemDefinition.
// Por ahora es un stub — la lógica real migra en Fase 2.

export function CommissionCalculator({ workspaceId, config }: ToolProps) {
  return (
    <div className="p-4">
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Calculadora de comisiones — stub (migración en Fase 2)
      </p>
    </div>
  )
}
