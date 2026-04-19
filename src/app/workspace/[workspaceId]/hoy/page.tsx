'use client'

import { useParams, useRouter } from 'next/navigation'
import { Bell, CheckSquare, Square } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useTransition } from 'react'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useTasks } from '@/hooks/useTasks'
import { useCustomers } from '@/hooks/useCustomers'
import { usePipeline } from '@/hooks/usePipeline'
import { useSales } from '@/hooks/useSales'
import { completeTask } from '@/features/tasks/actions'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'
import { fmtARS, fmtUSD } from '@/lib/format'

function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HoyPage() {
  const params      = useParams()
  const router      = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces } = useWorkspaceStore()
  const ws  = workspaces.find(w => w.id === workspaceId)
  const { labels, hasSystem } = useSystemConfig()
  const { isViewerOnly } = useMemberRole(workspaceId)
  const [isPending, startTransition] = useTransition()

  // ── Datos del core ────────────────────────────────────────────────────────
  const { metrics }                                    = useDashboardMetrics(workspaceId)
  const { customers,  loading: loadingCustomers }      = useCustomers(workspaceId)
  const { rutinas, puntuales, loading: loadingTasks }  = useTasks(workspaceId)
  const { items: pipelineItems, withAlerts }           = usePipeline(workspaceId)
  const { thisMonthSales, totalThisMonth }             = useSales(workspaceId)
  const isLoading = loadingCustomers || loadingTasks

  // Métricas calculadas en cliente — sin depender de aggregate/summary
  const pipelineOpen       = pipelineItems.filter(i => i.status === 'open').length
  const tareasActivas      = rutinas.filter(t => !t.completada).length + puntuales.length
  const rutinasCompletadas = rutinas.filter(t => t.completada).length
  const progreso           = rutinas.length > 0
    ? Math.round((rutinasCompletadas / rutinas.length) * 100)
    : 0

  // Labels dinámicos del sistema activo (con fallback)
  const customerLabel   = hasSystem ? labels.customer.plural : 'Clientes'
  const createCustLabel = hasSystem ? labels.createCustomer  : 'Nuevo cliente'
  const createSaleLabel = hasSystem ? labels.createSale      : 'Nueva venta'

  function toggleTarea(taskId: string) {
    if (isViewerOnly) return
    startTransition(async () => { await completeTask(workspaceId, taskId) })
  }

  if (isLoading) return (
    <div className="space-y-4 pt-2">
      <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)', width: '60%' }} />
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
      </div>
      <div className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* Saludo */}
      <div className="pt-1">
        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {saludo()} 👋
        </p>
        <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          {ws && ` · ${ws.nombre}`}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label={customerLabel}
          value={customers.length}
          emoji="👥"
          onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
        />
        <MetricCard
          label="Pipeline"
          value={pipelineOpen}
          emoji="📊"
          onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
          accent={withAlerts.length > 0}
        />
        <MetricCard
          label="Tareas"
          value={tareasActivas}
          emoji="✅"
          sub={rutinas.length > 0 ? `${progreso}% listo` : undefined}
          onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
        />
      </div>

      {/* Alertas de inactividad */}
      {withAlerts.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--amber)', background: 'var(--amber-bg)' }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,214,10,0.2)' }}
          >
            <Bell size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>
              {withAlerts.length} {withAlerts.length === 1 ? 'cliente sin contactar' : 'clientes sin contactar'}
            </p>
          </div>
          {withAlerts.slice(0, 3).map(item => {
            const lastAct = getLastActivity(item)
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                style={{ borderBottom: '1px solid rgba(255,214,10,0.1)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {getCustomerName(item)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {item.stageName}
                    {getKitInteres(item) ? ` · ${getKitInteres(item)}` : ''}
                    {lastAct ? ` · últ. ${format(lastAct.performedAt, 'd MMM', { locale: es })}` : ''}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
                  style={{
                    background: item.inactiveDays >= 14 ? 'var(--red-bg)' : 'var(--amber-bg)',
                    color:      item.inactiveDays >= 14 ? 'var(--brand-light)' : 'var(--amber)',
                    border: `1px solid ${item.inactiveDays >= 14 ? 'var(--brand-light)' : 'var(--amber)'}`,
                  }}
                >
                  {item.inactiveDays}d
                </span>
              </button>
            )
          })}
          {withAlerts.length > 3 && (
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
              className="w-full py-2 text-[10px] text-center"
              style={{ color: 'var(--amber)' }}
            >
              +{withAlerts.length - 3} más en pipeline →
            </button>
          )}
        </div>
      )}

      {/* Tareas */}
      {(puntuales.length > 0 || rutinas.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              Tareas de hoy
            </p>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
              className="text-[10px] font-semibold"
              style={{ color: 'var(--brand)' }}
            >
              Ver todas →
            </button>
          </div>

          {rutinas.length > 0 && (
            <div className="h-1.5 rounded-full overflow-hidden mb-2"
              style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${progreso}%`,
                  background: progreso === 100 ? 'var(--green)' : 'var(--brand)',
                }} />
            </div>
          )}

          <div className="space-y-1.5">
            {puntuales.slice(0, 2).map(t => (
              <div key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => toggleTarea(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Square size={18} />
                </button>
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--amber)' }}>Hoy</span>
              </div>
            ))}
            {rutinas.filter(t => !t.completada).slice(0, 3).map(t => (
              <div key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => toggleTarea(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Square size={18} />
                </button>
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--brand)' }}>Rutina</span>
              </div>
            ))}
            {rutinas.filter(t => t.completada).slice(0, 2).map(t => (
              <div key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span className="text-sm flex-1 line-through"
                  style={{ color: 'var(--text-tertiary)' }}>{t.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas del mes */}
      {thisMonthSales.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              Ventas del mes · {thisMonthSales.length}
            </p>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/ventas`)}
              className="text-[10px] font-semibold"
              style={{ color: 'var(--brand)' }}
            >
              Ver todas →
            </button>
          </div>

          <div className="px-4 py-3 rounded-2xl mb-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total acumulado</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--green)' }}>
              {fmtARS(totalThisMonth)}
            </p>
          </div>

          <div className="space-y-1.5">
            {thisMonthSales.slice(0, 3).map(v => (
              <div key={v.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {v.customerName || 'Sin cliente'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {format(v.fecha, 'dd/MM', { locale: es })} · {v.formaPago}
                    {!v.pagado && ' · ⏳'}
                  </p>
                </div>
                <p className="text-sm font-bold flex-shrink-0 ml-3" style={{ color: 'var(--text-primary)' }}>
                  {v.currency === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <QuickActions
        workspaceId={workspaceId}
        createCustomerLabel={createCustLabel}
        createSaleLabel={createSaleLabel}
      />

      {/* Empty state */}
      {customers.length === 0 && thisMonthSales.length === 0 && tareasActivas === 0 && (
        <div className="text-center py-8">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Todo listo para empezar 🚀
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Agregá tu primer cliente para que aparezcan las métricas
          </p>
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
            className="btn-primary mt-4"
          >
            {createCustLabel}
          </button>
        </div>
      )}
    </div>
  )
}
