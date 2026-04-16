'use client'

import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Radio, Users, Shield, TrendingUp, CheckSquare, Wrench, History, Ticket } from 'lucide-react'
import { useWorkspaceStore } from '@/store'
import { derivarAjustes } from '@/lib/workspace-config'

export default function AjustesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const cfg = ws?.config ?? {}
  const modulos = derivarAjustes(cfg)

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  const grupos = [
    {
      titulo: 'Operaciones',
      items: [
        modulos.mostrarVentas    && !cfg.moduloVerisure && { label: 'Ventas',              desc: 'Registro de ventas',             path: 'ventas2',          icon: TrendingUp },
        modulos.mostrarOrdenes   && { label: 'Órdenes de trabajo',  desc: 'Reparaciones y seguimiento',     path: 'ordenes',          icon: Wrench },
        modulos.mostrarTurnos    && { label: 'Turnos',              desc: 'Historial de todos los turnos',  path: 'turnos',           icon: Ticket },
        modulos.mostrarHistorial && { label: 'Historial de stock',  desc: 'Movimientos de inventario',      path: 'historial',        icon: History },
        modulos.mostrarTareas    && { label: 'Tareas',              desc: 'Rutina y tareas del día',        path: 'tareas',           icon: CheckSquare },
      ].filter(Boolean),
    },
    {
      titulo: 'Comunicación',
      items: [
        modulos.mostrarBroadcast    && { label: 'Broadcast',     desc: 'Lista de precios por WhatsApp',  path: 'iphone/broadcast',    icon: Radio },
        modulos.mostrarRevendedores && { label: 'Revendedores',  desc: 'CRM de revendedores',            path: 'iphone/revendedores', icon: Users },
      ].filter(Boolean),
    },
    {
      titulo: '⚙️ Configuración Verisure',
      items: [
        modulos.mostrarPlantillas && { label: 'Plantillas de mensajes', desc: 'Editá tus mensajes de WhatsApp', path: 'plantillas',      icon: Radio },
        modulos.mostrarVerisure   && { label: 'Pipeline de clientes',  desc: 'Seguimiento de instalaciones',  path: 'pipeline',        icon: TrendingUp },
        modulos.mostrarVerisure   && { label: 'Ventas registradas',    desc: 'Historial de instalaciones',    path: 'ventas-verisure', icon: Shield },
      ].filter(Boolean),
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

      {/* Info del workspace */}
      <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Este workspace
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: (ws?.color ?? '#E8001D') + '20' }}>
            {ws?.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws?.nombre}</p>
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
    </div>
  )
}
