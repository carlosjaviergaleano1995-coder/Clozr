'use client'

import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Radio, Users, Shield, TrendingUp, CheckSquare, Wrench, History, Ticket, LayoutDashboard } from 'lucide-react'
import { useWorkspaceStore } from '@/store'

export default function AjustesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const tipo = ws?.tipo ?? 'productos'

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  const grupos: { titulo: string; items: { label: string; desc: string; path: string; icon: any; tipos?: string[] }[] }[] = [
    {
      titulo: 'Operaciones',
      items: [
        { label: 'Órdenes de trabajo', desc: 'Reparaciones y seguimiento', path: 'ordenes', icon: Wrench, tipos: ['productos','mixto','tecnico'] },
        { label: 'Turnos', desc: 'Historial de todos los turnos', path: 'turnos', icon: Ticket },
        { label: 'Historial', desc: 'Movimientos de stock', path: 'historial', icon: History, tipos: ['productos','mixto','tecnico'] },
        { label: 'Ventas', desc: 'Registro de ventas', path: 'ventas2', icon: TrendingUp, tipos: ['productos','mixto'] },
        { label: 'Tareas', desc: 'Rutina y tareas del día', path: 'tareas', icon: CheckSquare },
      ],
    },
    {
      titulo: 'Comunicación',
      items: [
        { label: 'Broadcast', desc: 'Generar lista de precios WhatsApp', path: 'iphone/broadcast', icon: Radio, tipos: ['productos','mixto'] },
        { label: 'Revendedores', desc: 'Seguimiento de revendedores', path: 'iphone/revendedores', icon: Users, tipos: ['productos','mixto'] },
      ],
    },
    {
      titulo: 'Verisure',
      items: [
        { label: 'Calculadora', desc: 'Kits, promos, extras y bonos', path: 'verisure', icon: Shield, tipos: ['servicios','mixto'] },
        { label: 'Ventas Verisure', desc: 'Registro de instalaciones', path: 'ventas', icon: TrendingUp, tipos: ['servicios','mixto'] },
      ],
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ajustes y más</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Todas las funciones y configuraciones
        </p>
      </div>

      {grupos.map(grupo => {
        const itemsFiltrados = grupo.items.filter(item =>
          !item.tipos || item.tipos.includes(tipo)
        )
        if (itemsFiltrados.length === 0) return null
        return (
          <div key={grupo.titulo}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              {grupo.titulo}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {itemsFiltrados.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button key={item.path} onClick={() => go(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
                    style={{
                      background: 'var(--surface)',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    }}
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
        )
      })}

      {/* Info del workspace */}
      <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Workspace
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: (ws?.color ?? '#E8001D') + '20' }}>
            {ws?.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ws?.nombre}</p>
            <p className="text-[10px] capitalize" style={{ color: 'var(--text-tertiary)' }}>Tipo: {ws?.tipo}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
