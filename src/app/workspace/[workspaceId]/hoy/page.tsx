'use client'

import { useParams, useRouter } from 'next/navigation'
import { Bell, Square, CheckSquare, ChevronRight, TrendingUp, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useTransition } from 'react'

import { useTasks }        from '@/hooks/useTasks'
import { useCustomers }    from '@/hooks/useCustomers'
import { usePipeline }     from '@/hooks/usePipeline'
import { useSales }        from '@/hooks/useSales'
import { completeTask }    from '@/features/tasks/actions'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { getCustomerName, getKitInteres, getLastActivity } from '@/features/pipeline/adapters'
import { fmtARS, fmtUSD } from '@/lib/format'

// ── Helpers ───────────────────────────────────────────────────────────────────

function saludo() {
  const h = new Date().getHours()
  if (h < 6)  return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function mesActual() {
  return format(new Date(), "MMMM yyyy", { locale: es })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 pt-1 animate-pulse">
      <div className="h-9 rounded-xl" style={{ background: 'var(--surface-2)', width: '52%' }} />
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(i => <div key={i} className="h-[72px] rounded-2xl" style={{ background: 'var(--surface-2)' }} />)}
      </div>
      <div className="h-20 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
      <div className="space-y-1.5">
        {[0,1,2].map(i => <div key={i} className="h-11 rounded-xl" style={{ background: 'var(--surface-2)' }} />)}
      </div>
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({
  label, value, sub, onClick, alert = false,
}: {
  label:   string
  value:   number
  sub?:    string
  onClick: () => void
  alert?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-3 px-1 rounded-2xl press w-full"
      style={{
        background: alert ? 'rgba(255,214,10,0.08)' : 'var(--surface)',
        border:     `1px solid ${alert ? 'rgba(255,214,10,0.35)' : 'var(--border)'}`,
      }}
    >
      <span
        className="stat-number"
        style={{ color: alert ? 'var(--amber)' : 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold mt-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      {sub && (
        <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {sub}
        </span>
      )}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HoyPage() {
  const params      = useParams()
  const router      = useRouter()
  const workspaceId = params.workspaceId as string

  const { workspaces }      = useWorkspaceStore()
  const ws                  = workspaces.find(w => w.id === workspaceId)
  const { labels, hasSystem } = useSystemConfig()
  const { isViewerOnly }    = useMemberRole(workspaceId)
  const [isPending, startTransition] = useTransition()

  // ── Datos ──────────────────────────────────────────────────────────────────
  const { customers,  loading: lC } = useCustomers(workspaceId)
  const { rutinas, puntuales, loading: lT } = useTasks(workspaceId)
  const { items: pipeline, withAlerts }     = usePipeline(workspaceId)
  const { thisMonthSales, totalThisMonth }  = useSales(workspaceId)

  const pipelineOpen = pipeline.filter(i => i.status === 'open').length
  const tareasPend   = rutinas.filter(t => !t.completada).length + puntuales.length
  const rutinasOk    = rutinas.filter(t => t.completada).length
  const progreso     = rutinas.length > 0
    ? Math.round((rutinasOk / rutinas.length) * 100) : 0

  const customerLabel   = hasSystem ? labels.customer.plural : 'Clientes'
  const createCustLabel = hasSystem ? labels.createCustomer  : 'Nuevo cliente'

  function toggle(id: string) {
    if (isViewerOnly) return
    startTransition(async () => { await completeTask(workspaceId, id) })
  }

  if (lC || lT) return <Skeleton />

  const isEmpty = customers.length === 0 && thisMonthSales.length === 0 && tareasPend === 0

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* ── Saludo ─────────────────────────────────────────────────────── */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <p className="font-bold" style={{ fontSize: 'var(--text-display)', color: 'var(--text-primary)' }}>
            {saludo()} 👋
          </p>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        {/* Acceso rápido crear */}
        <button
          onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
          className="btn-primary gap-1.5 mt-1"
          style={{ fontSize: '13px', padding: '7px 12px' }}
        >
          <Plus size={13} /> {createCustLabel}
        </button>
      </div>

      {/* ── Métricas ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <MetricTile
          label={customerLabel}
          value={customers.length}
          onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
        />
        <MetricTile
          label="Pipeline"
          value={pipelineOpen}
          onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
          alert={withAlerts.length > 0}
          sub={withAlerts.length > 0 ? `${withAlerts.length} sin contactar` : undefined}
        />
        <MetricTile
          label="Tareas"
          value={tareasPend}
          onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
          sub={rutinas.length > 0 ? `${progreso}% rutina` : undefined}
        />
      </div>

      {/* ── Urgencias ──────────────────────────────────────────────────── */}
      {withAlerts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label flex items-center gap-1.5">
              <Bell size={11} style={{ color: 'var(--amber)' }} />
              Contactos vencidos
            </span>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
              className="text-[11px] font-semibold press"
              style={{ color: 'var(--brand)' }}
            >
              Ver pipeline →
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,214,10,0.3)', background: 'rgba(255,214,10,0.05)' }}>
            {withAlerts.slice(0, 3).map((item, idx) => {
              const lastAct   = getLastActivity(item)
              const esCritico = item.inactiveDays >= 14
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left press"
                  style={{ borderTop: idx > 0 ? '1px solid rgba(255,214,10,0.12)' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {getCustomerName(item)}
                    </p>
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>
                      {item.stageName}
                      {getKitInteres(item) ? ` · ${getKitInteres(item)}` : ''}
                      {lastAct ? ` · últ. ${format(lastAct.performedAt, 'd MMM', { locale: es })}` : ''}
                    </p>
                  </div>
                  <span
                    className="chip flex-shrink-0"
                    style={esCritico
                      ? { background: 'var(--red-bg)', color: 'var(--brand-light)' }
                      : { background: 'var(--amber-bg)', color: 'var(--amber)' }
                    }
                  >
                    {item.inactiveDays}d
                  </span>
                </button>
              )
            })}
            {withAlerts.length > 3 && (
              <button
                onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
                className="w-full py-2.5 press"
                style={{ fontSize: 'var(--text-micro)', color: 'var(--amber)', borderTop: '1px solid rgba(255,214,10,0.12)' }}
              >
                +{withAlerts.length - 3} más →
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Foco del día ───────────────────────────────────────────────── */}
      {(puntuales.length > 0 || rutinas.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">Foco del día</span>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/tareas`)}
              className="text-[11px] font-semibold press"
              style={{ color: 'var(--brand)' }}
            >
              Ver todas →
            </button>
          </div>

          {/* Barra de progreso */}
          {rutinas.length > 0 && (
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width:      `${progreso}%`,
                    background: progreso === 100 ? 'var(--green)' : 'var(--brand)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 'var(--text-micro)',
                  fontWeight: 600,
                  color: progreso === 100 ? 'var(--green)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              >
                {rutinasOk}/{rutinas.length}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            {/* Puntuales primero — borde amber */}
            {puntuales.slice(0, 2).map(t => (
              <div key={t.id} className="row" style={{ borderColor: 'rgba(255,214,10,0.3)' }}>
                <button
                  onClick={() => toggle(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0, lineHeight: 0 }}
                >
                  <Square size={18} />
                </button>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="chip chip-amber">Hoy</span>
              </div>
            ))}
            {/* Rutinas pendientes */}
            {rutinas.filter(t => !t.completada).slice(0, 4).map(t => (
              <div key={t.id} className="row">
                <button
                  onClick={() => toggle(t.id)} disabled={isPending}
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0, lineHeight: 0 }}
                >
                  <Square size={18} />
                </button>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
                <span className="chip chip-muted">Rutina</span>
              </div>
            ))}
            {/* Completadas (dim) */}
            {rutinas.filter(t => t.completada).slice(0, 2).map(t => (
              <div key={t.id} className="row" style={{ opacity: 0.4 }}>
                <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span className="flex-1 text-sm line-through" style={{ color: 'var(--text-tertiary)' }}>{t.titulo}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Ventas del mes ─────────────────────────────────────────────── */}
      {thisMonthSales.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">
              {mesActual()}
            </span>
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/ventas`)}
              className="text-[11px] font-semibold press"
              style={{ color: 'var(--brand)' }}
            >
              Ver todas →
            </button>
          </div>

          {/* Card total */}
          <div
            className="rounded-2xl px-4 py-3 mb-2 flex items-center justify-between"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div>
              <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>
                Total acumulado
              </p>
              <p className="stat-number mt-0.5" style={{ fontSize: '20px', color: 'var(--green)' }}>
                {fmtARS(totalThisMonth)}
              </p>
            </div>
            <span className="chip chip-green">{thisMonthSales.length} ventas</span>
          </div>

          {/* Últimas ventas */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {thisMonthSales.slice(0, 3).map((v, idx) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-3 py-2.5"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {v.customerName || 'Sin cliente'}
                  </p>
                  <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>
                    {format(v.fecha, 'dd/MM', { locale: es })} · {v.formaPago}
                    {!v.pagado ? ' · ⏳' : ''}
                  </p>
                </div>
                <span className="text-sm font-bold flex-shrink-0 ml-3"
                  style={{ color: 'var(--text-primary)' }}>
                  {v.currency === 'USD' ? fmtUSD(v.total) : fmtARS(v.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Pipeline al día ────────────────────────────────────────────── */}
      {pipelineOpen > 0 && withAlerts.length === 0 && (
        <button
          onClick={() => router.push(`/workspace/${workspaceId}/pipeline`)}
          className="w-full row row-pressable"
        >
          <div className="icon-box" style={{ color: 'var(--green)', background: 'var(--green-bg)' }}>
            <TrendingUp size={16} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {pipelineOpen} oportunidad{pipelineOpen !== 1 ? 'es' : ''} activa{pipelineOpen !== 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>
              Todo al día · sin contactos vencidos
            </p>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        </button>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">🚀</p>
          <p className="font-bold" style={{ fontSize: 'var(--text-title)', color: 'var(--text-primary)' }}>
            Bienvenido a Clozr
          </p>
          <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-tertiary)', maxWidth: '260px', margin: '8px auto 24px' }}>
            Empezá agregando tu primer cliente para ver las métricas del negocio
          </p>
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/clientes`)}
            className="btn-primary"
          >
            <Plus size={15} /> {createCustLabel}
          </button>
        </div>
      )}
    </div>
  )
}
