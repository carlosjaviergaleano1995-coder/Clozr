'use client'

import { useRouter } from 'next/navigation'
import { UserPlus, TrendingUp, CheckSquare, GitPullRequest } from 'lucide-react'

interface QuickAction {
  label:  string
  icon:   React.ReactNode
  path:   string
  color?: string
}

interface QuickActionsProps {
  workspaceId: string
  // Labels dinámicos — se pueden pasar desde SystemConfigProvider en el futuro
  createCustomerLabel?: string
  createSaleLabel?:     string
}

export function QuickActions({
  workspaceId,
  createCustomerLabel = 'Nuevo cliente',
  createSaleLabel     = 'Nueva venta',
}: QuickActionsProps) {
  const router = useRouter()

  const actions: QuickAction[] = [
    {
      label: createCustomerLabel,
      icon:  <UserPlus size={18} />,
      path:  `clientes`,
      color: 'var(--blue)',
    },
    {
      label: createSaleLabel,
      icon:  <TrendingUp size={18} />,
      path:  `ventas`,
      color: 'var(--green)',
    },
    {
      label: 'Pipeline',
      icon:  <GitPullRequest size={18} />,
      path:  `pipeline`,
      color: 'var(--amber)',
    },
    {
      label: 'Tarea',
      icon:  <CheckSquare size={18} />,
      path:  `tareas`,
      color: 'var(--text-secondary)',
    },
  ]

  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-wide mb-2 px-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Acciones rápidas
      </p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => router.push(`/workspace/${workspaceId}/${a.path}`)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span style={{ color: a.color ?? 'var(--text-secondary)' }}>{a.icon}</span>
            <span
              className="text-[9px] font-semibold leading-tight text-center px-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
