'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { ChevronLeft, LayoutDashboard, Users, Package, FileText, TrendingUp, CheckSquare, Shield, Settings, Smartphone, Radio, Watch, Calculator } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces } from '@/lib/services'
import { ClozrIcon } from '@/components/ClozrLogo'
import type { Workspace } from '@/types'

const NAV_ITEMS_BASE = [
  { id: 'resumen',             label: 'Resumen',   icon: LayoutDashboard, tipos: ['servicios','productos','mixto'] },
  { id: 'clientes',            label: 'Clientes',  icon: Users,           tipos: ['servicios','productos','mixto'] },
  { id: 'catalogo',            label: 'Catálogo',  icon: Package,         tipos: ['mixto'] },
  { id: 'verisure',            label: 'Calc',      icon: Shield,          tipos: ['servicios'] },
  { id: 'iphone/stock',        label: 'Stock',     icon: Smartphone,      tipos: ['productos','mixto'] },
  { id: 'iphone/otros',        label: 'Otros',     icon: Watch,           tipos: ['productos','mixto'] },
  { id: 'iphone/broadcast',    label: 'Broadcast', icon: Radio,           tipos: ['productos','mixto'] },
  { id: 'iphone/cotizar',      label: 'Cotizar',   icon: Calculator,      tipos: ['productos','mixto'] },
  { id: 'iphone/revendedores', label: 'Revendedores', icon: Users,        tipos: ['productos','mixto'] },
  { id: 'ventas',              label: 'Ventas',    icon: TrendingUp,      tipos: ['servicios','productos','mixto'] },
  { id: 'tareas',              label: 'Tareas',    icon: CheckSquare,     tipos: ['servicios','productos','mixto'] },
]

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const workspaceId = params.workspaceId as string

  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore()

  const [ws, setWs] = useState<Workspace | null>(null)

  const activeTab = NAV_ITEMS_BASE.find(item =>
    pathname.endsWith(`/${item.id}`) || pathname.includes(`/${item.id}/`)
  )?.id ?? 'resumen'

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || !workspaceId) return
    loadWorkspace()
  }, [user, workspaceId])

  const loadWorkspace = async () => {
    if (!user) return
    let allWs = workspaces
    if (!allWs.length) {
      allWs = await getWorkspaces(user.uid)
      setWorkspaces(allWs)
    }
    const found = allWs.find(w => w.id === workspaceId)
    if (found) {
      setWs(found)
      setActiveWorkspace(workspaceId)
    } else {
      router.push('/dashboard')
    }
  }

  if (!ws) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <ClozrIcon size={48} className="animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              <ChevronLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: ws.color + '20', border: `1.5px solid ${ws.color}35` }}>
              {ws.emoji}
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ws.nombre}</span>
          </div>
          <button className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto h-16 flex items-center">
          {NAV_ITEMS_BASE.filter(item => item.tipos.includes(ws.tipo)).map(item => {
            const NavIcon = item.icon
            const isActive = activeTab === item.id
            return (
              <button key={item.id}
                onClick={() => router.push(`/workspace/${workspaceId}/${item.id}`)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-w-0 transition-all"
                style={{ color: isActive ? '#E8001D' : 'var(--text-tertiary)' }}>
                <NavIcon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[9px] leading-tight truncate w-full text-center px-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
