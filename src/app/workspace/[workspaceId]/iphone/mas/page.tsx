'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  Users, BookOpen, List, Settings,
  ChevronRight, Tag, LayoutGrid, BarChart2,
} from 'lucide-react'
import { useMemberRole } from '@/hooks/useMemberRole'

export default function IPhoneMasPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { isAdmin } = useMemberRole(workspaceId)

  const go = (path: string) => router.push(`/workspace/${workspaceId}/${path}`)

  const secciones = [
    {
      titulo: 'Análisis',
      items: [
        { label: 'Resumen',       desc: 'Métricas y evolución mensual',   icon: BarChart2,  path: 'iphone/resumen',              siempre: true },
        { label: 'Revendedores',  desc: 'CRM de revendedores',            icon: BookOpen,   path: 'iphone/revendedores',         siempre: true },
      ],
    },
    {
      titulo: 'Catálogo y listas',
      items: [
        { label: 'Accesorios',    desc: 'Listas, importados, socios…',    icon: Tag,        path: 'iphone/stock?tab=accesorios', siempre: true },
        { label: 'Catálogo',      desc: 'Modelos, productos y categorías', icon: LayoutGrid, path: 'catalogo-iphone',             soloAdmin: true },
      ],
    },
    {
      titulo: 'Configuración',
      items: [
        { label: 'Ajustes',       desc: 'Config del workspace',           icon: Settings,   path: 'ajustes',                     siempre: true },
        { label: 'Equipo',        desc: 'Miembros y roles',               icon: Users,      path: 'equipo',                      soloAdmin: true },
      ],
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Más</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>iPhone Club</p>
      </div>

      {secciones.map(sec => {
        const itemsVisibles = sec.items.filter(i => i.siempre || (i.soloAdmin && isAdmin))
        if (itemsVisibles.length === 0) return null
        return (
          <div key={sec.titulo}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              {sec.titulo}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {itemsVisibles.map((item, idx) => {
                const Icon = item.icon
                return (
                  <button key={item.path}
                    onClick={() => go(item.path)}
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
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {item.desc}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
