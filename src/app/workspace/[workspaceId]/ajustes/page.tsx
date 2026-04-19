'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronRight, Users, TrendingUp, CheckSquare,
  Pencil, Check, Zap, Package, Radio,
} from 'lucide-react'
import { useWorkspaceStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { useWorkspace } from '@/hooks/useWorkspace'

// ── Nueva arquitectura ────────────────────────────────────────────────────────
import { updateWorkspace } from '@/features/workspaces/actions'
import { ActivateSystemForm } from '@/features/systems/components/ActivateSystemForm'

export default function AjustesPage() {
  const params      = useParams()
  const router      = useRouter()
  const workspaceId = params.workspaceId as string

  const { workspaces, setWorkspaces } = useWorkspaceStore()
  const wsStore = workspaces.find(w => w.id === workspaceId)

  // Hook reactivo para el workspace (detecta cambios de sistema activo)
  const { workspace: ws } = useWorkspace(workspaceId)
  const displayWs = ws ?? wsStore   // usa el reactivo si está disponible

  const { isAdmin } = useMemberRole(workspaceId)
  const { hasSystem, definition } = useSystemConfig()
  const [isPending, startTransition] = useTransition()

  const [editandoNombre,  setEditandoNombre]  = useState(false)
  const [nuevoNombre,     setNuevoNombre]     = useState('')
  const [showActivate,    setShowActivate]    = useState(false)

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  // ── Guardar nombre ─────────────────────────────────────────────────────────
  function guardarNombre() {
    if (!nuevoNombre.trim()) return
    startTransition(async () => {
      const result = await updateWorkspace(workspaceId, { nombre: nuevoNombre.trim() })
      if (!result.ok) return
      // Actualizar store local también
      setWorkspaces(workspaces.map(w =>
        w.id === workspaceId ? { ...w, nombre: nuevoNombre.trim() } : w
      ))
      setEditandoNombre(false)
    })
  }

  // ── Navegación base — siempre visible ─────────────────────────────────────
  const coreItems = [
    { label: 'Clientes',  desc: 'Gestión de clientes',         path: 'clientes', icon: Users        },
    { label: 'Pipeline',  desc: 'Seguimiento de oportunidades', path: 'pipeline', icon: TrendingUp  },
    { label: 'Ventas',    desc: 'Registro de ventas',           path: 'ventas',   icon: TrendingUp  },
    { label: 'Tareas',    desc: 'Rutinas y tareas del día',     path: 'tareas',   icon: CheckSquare  },
    { label: 'Catálogo',  desc: 'Productos y servicios',        path: 'catalogo', icon: Package      },
    { label: 'Equipo',    desc: 'Miembros y roles',             path: 'equipo',   icon: Users        },
  ]

  // Items de sistema activo (iPhone Club o Verisure)
  const systemItems = (displayWs?.config as any)?.moduloBroadcast ? [
    { label: 'Stock',       desc: 'Inventario de productos',       path: 'iphone/stock',       icon: Package  },
    { label: 'Broadcast',   desc: 'Lista de precios por WA',       path: 'iphone/broadcast',   icon: Radio    },
    { label: 'Ventas IC',   desc: 'Historial iPhone Club',         path: 'iphone/ventas',      icon: TrendingUp },
    { label: 'Revendedores',desc: 'CRM revendedores',              path: 'iphone/revendedores',icon: Users    },
    { label: 'Resumen',     desc: 'Métricas mensuales',            path: 'iphone/resumen',     icon: TrendingUp },
  ] : (displayWs?.config as any)?.moduloVerisure ? [
    { label: 'Calculadora', desc: 'Kits y comisiones',             path: 'verisure',            icon: TrendingUp },
    { label: 'Plantillas',  desc: 'Mensajes de WhatsApp',          path: 'plantillas',          icon: Radio    },
    { label: 'Resumen',     desc: 'Resultados mensuales',          path: 'resumen-verisure',    icon: TrendingUp },
  ] : []

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Ajustes
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Configuración y accesos del negocio
        </p>
      </div>

      {/* ── Info del workspace ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: (displayWs?.color ?? '#E8001D') + '20' }}
          >
            {displayWs?.emoji ?? '🏪'}
          </div>

          <div className="flex-1 min-w-0">
            {editandoNombre ? (
              <div className="flex items-center gap-2">
                <input
                  className="input text-sm flex-1 h-8 py-1"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarNombre()}
                  autoFocus
                />
                <button
                  onClick={guardarNombre}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditandoNombre(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {displayWs?.nombre ?? ''}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => { setNuevoNombre(displayWs?.nombre ?? ''); setEditandoNombre(true) }}
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}

            {/* Tags del workspace */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {displayWs?.config?.vendeProductos && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>📦 Productos</span>
              )}
              {displayWs?.config?.vendeServicios && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>🛠 Servicios</span>
              )}
              {!!((displayWs?.config as any)?.tieneOrdenes) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>OTs</span>
              )}
            </div>
          </div>
        </div>

        {/* Sistema activo */}
        {hasSystem && definition && (
          <div
            className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <span className="text-lg">{definition.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {definition.nombre}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                Sistema activo · v{definition.version}
              </p>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
            >
              Activo
            </span>
          </div>
        )}

        {/* Activar sistema */}
        {isAdmin && !hasSystem && (
          <>
            {!showActivate ? (
              <button
                onClick={() => setShowActivate(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px dashed var(--border)' }}
              >
                <Zap size={14} /> Activar sistema con código
              </button>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Activar sistema
                  </p>
                  <button
                    onClick={() => setShowActivate(false)}
                    className="text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >✕</button>
                </div>
                <ActivateSystemForm
                  workspaceId={workspaceId}
                  onSuccess={() => setShowActivate(false)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Core — siempre visible ───────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: 'var(--text-tertiary)' }}>
          Core
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {coreItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
                style={{
                  background: 'var(--surface)',
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface-2)' }}>
                  <Icon size={15} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {item.desc}
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Sistema — solo si hay items específicos ──────────────────────── */}
      {systemItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>
            {(displayWs?.config as any)?.moduloBroadcast ? 'iPhone Club' : 'Verisure'}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {systemItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    background: 'var(--surface)',
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-2)' }}>
                    <Icon size={15} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
