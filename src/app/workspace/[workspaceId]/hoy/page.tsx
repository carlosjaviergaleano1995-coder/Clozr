'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTransition, useMemo } from 'react'
import { Square, CheckSquare, ChevronRight, Plus, Bell, TrendingUp, Users, GitPullRequest, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

import { useWorkspaceStore } from '@/store'
import { useMemberRole }    from '@/hooks/useMemberRole'
import { useSystemConfig }  from '@/hooks/useSystemConfig'
import { useTasks }         from '@/hooks/useTasks'
import { useCustomers }     from '@/hooks/useCustomers'
import { usePipeline }      from '@/hooks/usePipeline'
import { useSales }         from '@/hooks/useSales'
import { useRecentActivity } from '@/hooks/useRecentActivity'
import { completeTask }     from '@/features/tasks/actions'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'
import { fmtARS, fmtUSD } from '@/lib/format'
import type { AuditAction } from '@/features/audit/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function saludo() {
  const h = new Date().getHours()
  if (h < 6)  return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function activityLabel(action: AuditAction, meta?: Record<string, unknown>): string {
  const name = (meta?.customerName ?? meta?.entityName ?? '') as string
  switch (action) {
    case 'customer.created':    return `Cliente nuevo — ${name}`
    case 'customer.updated':    return `Cliente actualizado — ${name}`
    case 'sale.created':        return `Venta registrada — ${name}`
    case 'pipeline.created':    return `Pipeline creado — ${name}`
    case 'pipeline.stage_changed': return `Etapa actualizada — ${name}`
    case 'pipeline.closed':     return `Pipeline cerrado — ${name}`
    case 'member.invited':      return `Miembro invitado`
    case 'member.removed':      return `Miembro removido`
    case 'member.role_changed': return `Rol actualizado`
    case 'system.activated':    return `Sistema activado`
    default:                    return action.replace('.', ' — ')
  }
}

function activityColor(action: AuditAction): string {
  if (action.startsWith('sale'))     return 'var(--green)'
  if (action.startsWith('customer')) return 'var(--blue)'
  if (action.startsWith('pipeline')) return 'var(--amber)'
  return 'var(--text-tertiary)'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 pt-1 pb-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-xl" style={{ background: 'var(--surface-2)' }} />
          <div className="h-4 w-32 rounded-lg" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ background: 'var(--surface-2)' }} />
      </div>
      {/* Foco */}
      <div className="h-32 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
      {/* Metrics 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--surface-2)' }} />)}
      </div>
      {/* Tasks */}
      <div className="space-y-1.5">
        {[0,1,2].map(i => <div key={i} className="h-11 rounded-xl" style={{ background: 'var(--surface-2)' }} />)}
      </div>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ label, onAction, actionLabel }: {
  label: string; onAction?: () => void; actionLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <p className="section-label">{label}</p>
      {onAction && actionLabel && (
        <button onClick={onAction} className="text-[11px] font-semibold press"
          style={{ color: 'var(--brand)' }}>
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, onClick, variant = 'default' }: {
  label: string; value: number | string; sub?: string
  onClick: () => void; variant?: 'default' | 'alert' | 'positive'
}) {
  const valueColor = variant === 'alert'    ? 'var(--brand-light)'
                   : variant === 'positive' ? 'var(--green)'
                   : 'var(--text-primary)'
  return (
    <button onClick={onClick}
      className="flex flex-col items-start p-3.5 rounded-2xl press w-full text-left"
      style={{ background: 'var(--surface)', border: `1px solid ${variant === 'alert' ? 'rgba(232,0,29,0.2)' : 'var(--border)'}` }}>
      <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="stat-number" style={{ color: valueColor }}>{value}</p>
      {sub && (
        <p className="text-[10px] font-medium mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      )}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HoyPage() {
  const params      = useParams()
  const router      = useRouter()
  const workspaceId = params.workspaceId as string

  const { workspaces }            = useWorkspaceStore()
  const ws                        = workspaces.find(w => w.id === workspaceId)
  const { labels, hasSystem }     = useSystemConfig()
  const { isViewerOnly }          = useMemberRole(workspaceId)
  const [isPending, startTrans]   = useTransition()

  // ── Datos reales ──────────────────────────────────────────────────────────
  const { customers, loading: lC }                = useCustomers(workspaceId)
  const { rutinas, puntuales, loading: lT }       = useTasks(workspaceId)
  const { items: pipeline, withAlerts }           = usePipeline(workspaceId)
  const { thisMonthSales, totalThisMonth, sales } = useSales(workspaceId)
  const { activity }                              = useRecentActivity(workspaceId, 5)

  const isLoading = lC || lT

  // ── Métricas derivadas ────────────────────────────────────────────────────
  const pipelineOpen = pipeline.filter(i => i.status === 'open').length
  const tareasPend   = rutinas.filter(t => !t.completada).length + puntuales.length
  const rutinasOk    = rutinas.filter(t => t.completada).length
  const progreso     = rutinas.length > 0 ? Math.round((rutinasOk / rutinas.length) * 100) : 0

  // ── Foco del día — insights priorizados ───────────────────────────────────
  const focoItems = useMemo(() => {
    const items: { icon: string; title: string; sub: string; color: 'red'|'amber'|'green'; path: string }[] = []

    if (withAlerts.length > 0) {
      const names = withAlerts.slice(0, 2).map(i => i.customerSnapshot.nombre.split(' ')[0])
      items.push({
        icon: 'clock',
        color: 'red',
        title: `${withAlerts.length} ${withAlerts.length === 1 ? 'lead sin contactar' : 'leads sin contactar'}`,
        sub: names.join(', ') + (withAlerts.length > 2 ? ` y ${withAlerts.length - 2} más` : ''),
        path: 'pipeline',
      })
    }

    if (puntuales.length > 0) {
      items.push({
        icon: 'tasks',
        color: 'amber',
        title: `${puntuales.length} ${puntuales.length === 1 ? 'tarea puntual' : 'tareas puntuales'} para hoy`,
        sub: puntuales.slice(0, 2).map(t => t.titulo).join(' · '),
        path: 'tareas',
      })
    }

    if (thisMonthSales.length > 0) {
      const pct = sales.length > 0 ? Math.round((thisMonthSales.length / Math.max(sales.length - thisMonthSales.length, 1)) * 100) : 0
      items.push({
        icon: 'trend',
        color: 'green',
        title: `${thisMonthSales.length} ${thisMonthSales.length === 1 ? 'venta' : 'ventas'} este mes`,
        sub: `${fmtARS(totalThisMonth)} acumulado${pct > 0 ? ` · +${pct}% vs mes anterior` : ''}`,
        path: 'ventas',
      })
    }

    if (items.length === 0 && customers.length > 0) {
      items.push({
        icon: 'trend',
        color: 'green',
        title: 'Todo al día — sin alertas',
        sub: `${customers.length} clientes · ${pipelineOpen} en pipeline activo`,
        path: 'pipeline',
      })
    }

    return items.slice(0, 3)
  }, [withAlerts, puntuales, thisMonthSales, totalThisMonth, customers, pipelineOpen])

  function toggle(id: string) {
    if (isViewerOnly) return
    startTrans(async () => { await completeTask(workspaceId, id) })
  }

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  const customerLabel   = hasSystem ? labels.customer.plural : 'Clientes'
  const createCustLabel = hasSystem ? labels.createCustomer  : 'Nuevo cliente'

  const isEmpty = customers.length === 0 && tareasPend === 0 && thisMonthSales.length === 0

  if (isLoading) return <Skeleton />

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="font-bold" style={{ fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            {saludo()} 👋
          </p>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            {ws?.nombre ? ` · ${ws.nombre}` : ''}
          </p>
        </div>
        <button
          onClick={() => go('clientes')}
          className="btn-primary flex items-center gap-1.5 mt-1 press"
          style={{ fontSize: '13px', padding: '8px 13px', borderRadius: '12px' }}
        >
          <Plus size={13} /> {createCustLabel}
        </button>
      </div>

      {/* ── 2. FOCO DEL DÍA ──────────────────────────────────────────────── */}
      {focoItems.length > 0 && (
        <section>
          <SectionHeader label="Foco del día" />
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
            {focoItems.map((item, idx) => {
              const borderColor = item.color === 'red'   ? 'rgba(232,0,29,0.15)'
                                : item.color === 'amber' ? 'rgba(255,214,10,0.15)'
                                : 'rgba(48,209,88,0.12)'
              const iconBg = item.color === 'red'   ? 'var(--red-bg)'
                           : item.color === 'amber' ? 'var(--amber-bg)'
                           : 'var(--green-bg)'
              const iconColor = item.color === 'red'   ? 'var(--brand-light)'
                              : item.color === 'amber' ? 'var(--amber)'
                              : 'var(--green)'
              return (
                <button
                  key={idx}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"
                  style={{ borderTop: idx > 0 ? `1px solid ${borderColor}` : 'none' }}
                >
                  <div className="icon-box flex-shrink-0"
                    style={{ background: iconBg, color: iconColor, borderRadius: '10px' }}>
                    {item.icon === 'clock' && <Clock size={16} />}
                    {item.icon === 'tasks' && <CheckSquare size={16} />}
                    {item.icon === 'trend' && <TrendingUp size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.35 }}>
                      {item.sub}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 3. MÉTRICAS 2x2 ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader label="Métricas" />
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard
            label={customerLabel}
            value={customers.length}
            onClick={() => go('clientes')}
          />
          <MetricCard
            label="Pipeline activo"
            value={pipelineOpen}
            sub={withAlerts.length > 0 ? `${withAlerts.length} sin contactar` : 'Todo al día'}
            onClick={() => go('pipeline')}
            variant={withAlerts.length > 0 ? 'alert' : 'default'}
          />
          <MetricCard
            label="Ventas del mes"
            value={thisMonthSales.length}
            sub={fmtARS(totalThisMonth)}
            onClick={() => go('ventas')}
            variant={thisMonthSales.length > 0 ? 'positive' : 'default'}
          />
          <MetricCard
            label="Tareas pendientes"
            value={tareasPend}
            sub={rutinas.length > 0 ? `Rutina: ${progreso}%` : 'Sin rutinas'}
            onClick={() => go('tareas')}
            variant={puntuales.length > 0 ? 'alert' : 'default'}
          />
        </div>
      </section>

      {/* ── 4. ACCIONES RÁPIDAS ──────────────────────────────────────────── */}
      <section>
        <SectionHeader label="Acciones rápidas" />
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Nueva venta', sub: 'Registrar cierre', icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-bg)', path: 'ventas' },
            { label: 'Ver pipeline', sub: 'Oportunidades abiertas', icon: GitPullRequest, color: 'var(--amber)', bg: 'var(--amber-bg)', path: 'pipeline' },
            { label: createCustLabel, sub: 'Agregar al CRM', icon: Users, color: 'var(--blue)', bg: 'var(--blue-bg)', path: 'clientes' },
            { label: 'Nueva tarea', sub: 'Para hoy', icon: CheckSquare, color: '#AF52DE', bg: 'rgba(175,82,222,0.1)', path: 'tareas' },
          ].map(({ label, sub, icon: Icon, color, bg, path }) => (
            <button
              key={label}
              onClick={() => go(path)}
              className="flex items-center gap-3 p-3.5 rounded-2xl press text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="icon-box flex-shrink-0"
                style={{ background: bg, color, borderRadius: '10px', width: '34px', height: '34px' }}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── 5. PIPELINE URGENTE ──────────────────────────────────────────── */}
      {withAlerts.length > 0 && (
        <section>
          <SectionHeader
            label="Contactos vencidos"
            onAction={() => go('pipeline')}
            actionLabel="Ver pipeline"
          />
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid rgba(255,214,10,0.25)' }}>
            {withAlerts.slice(0, 4).map((item, idx) => {
              const initials = item.customerSnapshot.nombre
                .split(' ').slice(0,2).map((p: string) => p[0]?.toUpperCase()).join('')
              const lastAct  = getLastActivity(item)
              const critical = item.inactiveDays >= 14
              return (
                <button
                  key={item.id}
                  onClick={() => go('pipeline')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left press"
                  style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {getCustomerName(item)}
                    </p>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                      {item.stageName}
                      {getKitInteres(item) ? ` · ${getKitInteres(item)}` : ''}
                      {lastAct ? ` · últ. ${format(lastAct.performedAt, 'd MMM', { locale: es })}` : ''}
                    </p>
                  </div>
                  <span className="chip flex-shrink-0"
                    style={critical
                      ? { background: 'var(--red-bg)', color: 'var(--brand-light)' }
                      : { background: 'var(--amber-bg)', color: 'var(--amber)' }
                    }>
                    {item.inactiveDays}d
                  </span>
                </button>
              )
            })}
            {withAlerts.length > 4 && (
              <button onClick={() => go('pipeline')}
                className="w-full py-2.5 press text-center"
                style={{ fontSize: '12px', color: 'var(--brand)', borderTop: '1px solid var(--border)' }}>
                +{withAlerts.length - 4} más en pipeline →
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── 6. TAREAS ────────────────────────────────────────────────────── */}
      {(puntuales.length > 0 || rutinas.length > 0) && (
        <section>
          <SectionHeader
            label="Tareas de hoy"
            onAction={() => go('tareas')}
            actionLabel="Ver todas"
          />

          {/* Barra de progreso rutinas */}
          {rutinas.length > 0 && (
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progreso}%`,
                    background: progreso === 100 ? 'var(--green)' : 'var(--brand)',
                  }} />
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600, flexShrink: 0,
                color: progreso === 100 ? 'var(--green)' : 'var(--text-tertiary)',
              }}>
                {rutinasOk}/{rutinas.length} rutinas
              </span>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

            {/* Puntuales primero */}
            {puntuales.slice(0, 2).map((t, idx) => (
              <div key={t.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer press"
                style={{
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  borderLeft: '2px solid var(--amber)',
                }}
                onClick={() => toggle(t.id)}>
                <button disabled={isPending} style={{ flexShrink: 0, lineHeight: 0, color: 'var(--text-tertiary)' }}>
                  <Square size={18} />
                </button>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t.titulo}
                </span>
                <span className="chip chip-amber">Hoy</span>
              </div>
            ))}

            {/* Rutinas pendientes */}
            {rutinas.filter(t => !t.completada).slice(0, 4).map((t, idx) => (
              <div key={t.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer press"
                style={{ borderTop: '1px solid var(--border)' }}
                onClick={() => toggle(t.id)}>
                <button disabled={isPending} style={{ flexShrink: 0, lineHeight: 0, color: 'var(--text-tertiary)' }}>
                  <Square size={18} />
                </button>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="chip chip-muted">Rutina</span>
              </div>
            ))}

            {/* Completadas */}
            {rutinas.filter(t => t.completada).slice(0, 2).map((t) => (
              <div key={t.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: '1px solid var(--border)', opacity: 0.4 }}>
                <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span className="flex-1 text-sm line-through" style={{ color: 'var(--text-tertiary)' }}>
                  {t.titulo}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. ACTIVIDAD RECIENTE ────────────────────────────────────────── */}
      {activity.length > 0 && (
        <section>
          <SectionHeader label="Actividad reciente" />
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {activity.map((entry, idx) => {
              const dot = activityColor(entry.action)
              const label = activityLabel(entry.action, entry.metadata)
              const when = formatDistanceToNow(entry.timestamp, { locale: es, addSuffix: true })
              return (
                <div key={entry.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex flex-col items-center flex-shrink-0" style={{ paddingTop: '5px' }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: dot, flexShrink: 0,
                    }} />
                    {idx < activity.length - 1 && (
                      <div style={{ width: '1px', flex: 1, background: 'var(--border)', minHeight: '16px', marginTop: '4px' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {entry.actorName} · {when}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── PIPELINE AL DÍA (si hay items y sin alertas) ─────────────────── */}
      {pipelineOpen > 0 && withAlerts.length === 0 && (
        <button onClick={() => go('pipeline')}
          className="w-full row row-pressable">
          <div className="icon-box" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
            <TrendingUp size={16} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {pipelineOpen} oportunidad{pipelineOpen !== 1 ? 'es' : ''} activa{pipelineOpen !== 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Todo al día — sin contactos vencidos
            </p>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        </button>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="text-center py-14">
          <p style={{ fontSize: '40px', lineHeight: 1, marginBottom: '16px' }}>🚀</p>
          <p className="font-bold" style={{ fontSize: '17px', color: 'var(--text-primary)' }}>
            Bienvenido a Clozr
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)', maxWidth: '240px', margin: '8px auto 24px', lineHeight: 1.5 }}>
            Empezá agregando tu primer cliente para ver las métricas aquí
          </p>
          <button onClick={() => go('clientes')} className="btn-primary">
            <Plus size={15} /> {createCustLabel}
          </button>
        </div>
      )}
    </div>
  )
}
