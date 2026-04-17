'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Radio, Users, Shield, TrendingUp, CheckSquare, Wrench, History, Ticket, Pencil, Check, Package, BarChart2 } from 'lucide-react'
import { useWorkspaceStore } from '@/store'
import { updateWorkspace } from '@/lib/services'
import { derivarAjustes } from '@/lib/workspace-config'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { WorkspaceConfig } from '@/types'

export default function AjustesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces, setWorkspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const cfg = ws?.config ?? {}
  const modulos = derivarAjustes(cfg)
  const { isAdmin } = useMemberRole(workspaceId)

  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(ws?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  const guardarNombre = async () => {
    if (!nuevoNombre.trim() || !ws) return
    setGuardando(true)
    try {
      await updateWorkspace(workspaceId, { nombre: nuevoNombre.trim() })
      setWorkspaces(workspaces.map(w => w.id === workspaceId ? { ...w, nombre: nuevoNombre.trim() } : w))
      setEditandoNombre(false)
    } finally { setGuardando(false) }
  }

  const toggleConfig = async (key: keyof WorkspaceConfig) => {
    if (!ws) return
    const nuevaCfg = { ...ws.config, [key]: !ws.config[key] }
    await updateWorkspace(workspaceId, { config: nuevaCfg })
    setWorkspaces(workspaces.map(w => w.id === workspaceId ? { ...w, config: nuevaCfg } : w))
  }

  const grupos = [
    {
      titulo: 'Operaciones',
      items: [
        modulos.mostrarVentas    && !cfg.moduloVerisure && { label: 'Ventas',              desc: 'Registro de ventas',             path: 'ventas2',          icon: TrendingUp },
        modulos.mostrarOrdenes   && { label: 'Órdenes de trabajo',  desc: 'Reparaciones y seguimiento',     path: 'ordenes',          icon: Wrench },
        modulos.mostrarTurnos    && { label: 'Historial de turnos',  desc: cfg.moduloVerisure ? 'Visitas anteriores' : 'Turnos anteriores', path: 'turnos', icon: Ticket },
        modulos.mostrarHistorial && { label: 'Historial de stock',  desc: 'Movimientos de inventario',      path: 'historial',        icon: History },
        modulos.mostrarTareas    && { label: 'Tareas',              desc: 'Rutina y tareas del día',        path: 'tareas',           icon: CheckSquare },
      ].filter(Boolean),
    },
    {
      titulo: 'Comunicación',
      items: [
        modulos.mostrarBroadcast    && { label: 'Broadcast',     desc: 'Lista de precios por WhatsApp',  path: 'iphone/broadcast',    icon: Radio },
        modulos.mostrarBroadcast    && { label: 'Accesorios',    desc: 'Cargadores, cables y fundas',    path: 'iphone/accesorios',   icon: Package },
        modulos.mostrarBroadcast    && { label: 'Ventas',        desc: 'Historial y ganancias',          path: 'iphone/ventas',       icon: TrendingUp },
        modulos.mostrarBroadcast    && { label: 'Resumen',       desc: 'Métricas y evolución mensual',   path: 'iphone/resumen',      icon: BarChart2 },
        modulos.mostrarRevendedores && { label: 'Revendedores',  desc: 'CRM de revendedores',            path: 'iphone/revendedores', icon: Users },
      ].filter(Boolean),
    },
    {
      titulo: '⚙️ Configuración Verisure',
      items: [
        modulos.mostrarPlantillas && { label: 'Plantillas de mensajes', desc: 'Editá tus mensajes de WhatsApp', path: 'plantillas', icon: Radio },
        modulos.mostrarVerisure   && { label: 'Ventas registradas',    desc: 'Historial de instalaciones',     path: 'ventas-verisure', icon: TrendingUp },
      ].filter(Boolean),
    },
    {
      titulo: 'Equipo',
      items: [
        { label: 'Equipo', desc: 'Miembros, roles e invitaciones', path: 'equipo', icon: Users },
      ],
    },
  ].filter(g => g.items.length > 0)

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ajustes y más</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Todas las funciones y configuraciones</p>
      </div>

      {grupos.map(grupo => (
        <div key={grupo.titulo}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>
            {grupo.titulo}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(grupo.items as any[]).map((item, idx) => {
              const Icon = item.icon
              return (
                <button key={item.path} onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
                  style={{ background: 'var(--surface)', borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  onTouchStart={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onTouchEnd={e => (e.currentTarget.style.background = 'var(--surface)')}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-2)' }}>
                    <Icon size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Info y edición del workspace */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Este workspace
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: (ws?.color ?? '#E8001D') + '20' }}>
              {ws?.emoji}
            </div>
            <div className="flex-1 min-w-0">
              {editandoNombre ? (
                <div className="flex items-center gap-2">
                  <input className="input text-sm flex-1 h-8 py-1"
                    value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                    autoFocus onKeyDown={e => e.key === 'Enter' && guardarNombre()} />
                  <button onClick={guardarNombre} disabled={guardando}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws?.nombre}</p>
                  {isAdmin && (
                    <button onClick={() => { setNuevoNombre(ws?.nombre ?? ''); setEditandoNombre(true) }}
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {cfg.vendeProductos  && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>📦 Productos</span>}
                {cfg.vendeServicios  && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>🛠 Servicios</span>}
                {cfg.tieneStock      && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>Stock</span>}
                {cfg.tieneOrdenes    && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>OTs</span>}
                {cfg.moduloVerisure  && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--red-bg)', color: 'var(--brand)' }}>🛡️ Verisure</span>}
                {cfg.moduloBroadcast && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>Broadcast</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Toggles de config — solo para admins en workspaces no-premium */}
        {isAdmin && !cfg.moduloVerisure && !cfg.moduloBroadcast && (
          <div className="px-4 py-3" style={{ background: 'var(--surface)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
              Módulos activos
            </p>
            <div className="space-y-2">
              {[
                { key: 'tieneStock',    label: 'Inventario y stock',    desc: 'Gestión de productos y cantidades' },
                { key: 'tieneOrdenes',  label: 'Órdenes de trabajo',    desc: 'Reparaciones y seguimiento técnico' },
                { key: 'vendeServicios',label: 'Ventas de servicios',   desc: 'Cobro por servicios sin stock' },
              ].map(({ key, label, desc }) => {
                const activo = !!(cfg as any)[key]
                return (
                  <button key={key} onClick={() => toggleConfig(key as keyof WorkspaceConfig)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all flex-shrink-0 ml-3 relative`}
                      style={{ background: activo ? 'var(--brand)' : 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                        style={{
                          background: activo ? '#fff' : 'var(--text-tertiary)',
                          left: activo ? '22px' : '2px',
                        }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
