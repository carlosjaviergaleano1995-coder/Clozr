'use client'

import { useParams, useRouter } from 'next/navigation'
import { Bell, CheckSquare, Square, ChevronRight, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useTransition } from 'react'

import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useTasks }            from '@/hooks/useTasks'
import { useCustomers }        from '@/hooks/useCustomers'
import { usePipeline }         from '@/hooks/usePipeline'
import { useSales }            from '@/hooks/useSales'
import { completeTask }        from '@/features/tasks/actions'
import { useSystemConfig }     from '@/hooks/useSystemConfig'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'
import { fmtARS, fmtUSD } from '@/lib/format'

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function InicioPage() {
  const params      = useParams()
  const router      = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const { labels, hasSystem } = useSystemConfig()
  const { isViewerOnly } = useMemberRole(workspaceId)
  const [isPending, startTransition] = useTransition()

  const { customers, loading: loadingC }  = useCustomers(workspaceId)
  const { rutinas, puntuales, loading: loadingT } = useTasks(workspaceId)
  const { items: pipeline, withAlerts }   = usePipeline(workspaceId)
  const { thisMonthSales, totalThisMonth } = useSales(workspaceId)

  const pipelineOpen    = pipeline.filter(i => i.status === 'open').length
  const tareasActivas   = rutinas.filter(t => !t.completada).length + puntuales.length
  const rutinasTotal    = rutinas.length
  const rutinasOk       = rutinas.filter(t => t.completada).length
  const progreso        = rutinasTotal > 0 ? Math.round((rutinasOk / rutinasTotal) * 100) : 0
  const isLoading       = loadingC || loadingT

  const customerLabel = hasSystem ? labels.customer.plural : 'Clientes'

  function toggleTarea(id: string) {
    if (isViewerOnly) return
    startTransition(async () => { await completeTask(workspaceId, id) })
  }

  if (isLoading) return (
    <div className="space-y-4 pt-2">
      <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)', width: '55%' }} />
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
      </div>
      <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-6">

      {/* Saludo */}
      <div className="pt-1">
        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {saludo()} 👋
        </p>
        <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          {ws?.nombre ? ` · ${ws.nombre}` : ''}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: customerLabel, value: customers.length, emoji: '👥',
            path: 'clientes', accent: false,
          },
          {
            label: 'Pipeline', value: pipelineOpen, emoji: '📊',
            path: 'pipeline', accent: withAlerts.length > 0,
          },
          {
            label: 'Tareas', value: tareasActivas,
            emoji: progreso === 100 ? '✅' : '📋',
            path: 'tareas', accent: false,
            sub: rutinasTotal > 0 ? `${progreso}%` : undefined,
          },
        ].map(m => (
          <button
            key={m.label}
            onClick={() => router.push(`/workspace/${workspaceId}/${m.path}`)}
            className="flex flex-col items-center py-3.5 px-2 rounded-2xl text-center"
            style={{
              background: m.accent ? 'var(--amber-bg)' : 'var(--surface)',
              border:     `1px solid ${m.accent ? 'var(--amber)' : 'var(--border)'}`,
            }}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className="text-xl font-bold mt-1 tabular-nums"
              style={{ color: m.accent ? 'var(--amber)' : 'var(--text-primary)' }}>
              {m.value}
            </span>
            <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {m.label}
            </span>
            {m.sub && (
              <span className="text-[10px] mt-0.5" style={{ color: progreso === 100 ? 'var(--green)' : 'var(--text-tertiary)' }}>
                {m.sub} hecho
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Urgencias — alertas de pipeline */}
      {withAlerts.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--amber)', background: 'var(--amber-bg)' }}>
          <div className="flex items-center justify-between px-3 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,214,10,0.2)' }}>
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: 'var(--amber)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>
                {withAlerts.length} {withAlerts.length === 1 ? 'contacto vencido' : 'contactos vencidos'}
              </p>
            </div>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
              className="text-[10px] font-semibold"
              style={{ color: 'var(--amber)' }}
            >
              Ver pipeline →
            </button>
          </div>
          {withAlerts.slice(0, 3).map(item => {
            const lastAct = getLastActivity(item)
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                style={{ borderBottom: '1px solid rgba(255,214,10,0.08)' }}
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
                <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
                  style={{
                    background: item.inactiveDays >= 14 ? 'var(--red-bg)' : 'var(--amber-bg)',
                    color:      item.inactiveDays >= 14 ? 'var(--brand-light)' : 'var(--amber)',
                    border: `1px solid ${item.inactiveDays >= 14 ? 'var(--brand-light)' : 'var(--amber)'}`,
                  }}>
                  {item.inactiveDays}d
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Tareas del día */}
      {(puntuales.length > 0 || rutinas.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              Foco de hoy
            </p>
            <button onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
              className="text-[10px] font-semibold" style={{ color: 'var(--brand)' }}>
              Ver todas →
            </button>
          </div>

          {rutinasTotal > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${progreso}%`,
                    background: progreso === 100 ? 'var(--green)' : 'var(--brand)',
                  }} />
              </div>
              <span className="text-[10px] font-semibold flex-shrink-0"
                style={{ color: progreso === 100 ? 'var(--green)' : 'var(--text-tertiary)' }}>
                {rutinasOk}/{rutinasTotal}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            {/* Puntuales primero */}
            {puntuales.slice(0, 2).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--amber)' }}>
                <button onClick={() => toggleTarea(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Square size={18} />
                </button>
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>Hoy</span>
              </div>
            ))}
            {/* Rutinas pendientes */}
            {rutinas.filter(t => !t.completada).slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => toggleTarea(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <Square size={18} />
                </button>
                <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
              </div>
            ))}
            {/* Completadas (dimmed) */}
            {rutinas.filter(t => t.completada).slice(0, 2).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span className="text-sm flex-1 line-through"
                  style={{ color: 'var(--text-tertiary)' }}>{t.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actividad comercial — ventas del mes */}
      {thisMonthSales.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              Ventas del mes
            </p>
            <button onClick={() => router.push(`/workspace/${workspaceId}/ventas`)}
              className="text-[10px] font-semibold" style={{ color: 'var(--brand)' }}>
              Ver todas →
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {/* Total */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total acumulado</p>
                <p className="text-lg font-bold" style={{ color: 'var(--green)' }}>
                  {fmtARS(totalThisMonth)}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-xl"
                style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                {thisMonthSales.length} ventas
              </span>
            </div>
            {/* Últimas 2 */}
            {thisMonthSales.slice(0, 2).map((v, idx) => (
              <div key={v.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {v.customerName || 'Sin cliente'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {format(v.fecha, 'dd/MM', { locale: es })} · {v.formaPago}
                  </p>
                </div>
                <span className="text-sm font-bold flex-shrink-0 ml-3"
                  style={{ color: 'var(--text-primary)' }}>
                  {v.currency === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceso rápido al pipeline si hay items activos */}
      {pipelineOpen > 0 && withAlerts.length === 0 && (
        <button
          onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface-2)' }}>
              <TrendingUp size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {pipelineOpen} {pipelineOpen === 1 ? 'oportunidad activa' : 'oportunidades activas'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                Todo al día — sin alertas pendientes
              </p>
            </div>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
        </button>
      )}

      {/* Empty state total */}
      {customers.length === 0 && thisMonthSales.length === 0 && tareasActivas === 0 && (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">🚀</p>
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Todo listo para empezar
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-tertiary)' }}>
            Agregá tu primer cliente para ver las métricas aquí
          </p>
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
            className="btn-primary"
          >
            {hasSystem ? labels.createCustomer : 'Nuevo cliente'}
          </button>
        </div>
      )}
    </div>
  )
}
