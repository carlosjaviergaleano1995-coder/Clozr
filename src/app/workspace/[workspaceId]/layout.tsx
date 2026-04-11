'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { ChevronLeft, LayoutDashboard, Users, Shield, Radio, CheckSquare, Settings, Smartphone, TrendingUp, Package, History, ShoppingCart, Ticket, Wallet } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces } from '@/lib/services'
import { ClozrIcon } from '@/components/ClozrLogo'
import type { Workspace } from '@/types'

const NAV_SERVICIOS = [
  { id: 'resumen',   label: 'Resumen',   icon: LayoutDashboard },
  { id: 'clientes',  label: 'Clientes',  icon: Users },
  { id: 'verisure',  label: 'Calc',      icon: Shield },
  { id: 'ventas',    label: 'Ventas',    icon: TrendingUp },
  { id: 'tareas',    label: 'Tareas',    icon: CheckSquare },
]

const NAV_PRODUCTOS = [
  { id: 'resumen',             label: 'Resumen',    icon: LayoutDashboard },
  { id: 'inventario',          label: 'Inventario', icon: Package },
  { id: 'ventas2',             label: 'Ventas',     icon: ShoppingCart },
  { id: 'caja',                label: 'Caja',       icon: Wallet },
  { id: 'iphone/broadcast',    label: 'Broadcast',  icon: Radio },
]

const NAV_MIXTO = [
  { id: 'resumen',          label: 'Resumen',    icon: LayoutDashboard },
  { id: 'inventario',       label: 'Inventario', icon: Package },
  { id: 'ventas2',          label: 'Ventas',     icon: ShoppingCart },
  { id: 'caja',             label: 'Caja',       icon: Wallet },
  { id: 'iphone/broadcast', label: 'Broadcast',  icon: Radio },
]

const NAV_TECNICO = [
  { id: 'resumen',    label: 'Resumen',   icon: LayoutDashboard },
  { id: 'turnos',     label: 'Turnos',    icon: Ticket },
  { id: 'ordenes',    label: 'Órdenes',   icon: Smartphone },
  { id: 'caja',       label: 'Caja',      icon: Wallet },
  { id: 'inventario', label: 'Repuestos', icon: Package },
]

function getNav(tipo: string) {
  if (tipo === 'servicios') return NAV_SERVICIOS
  if (tipo === 'productos') return NAV_PRODUCTOS
  if (tipo === 'tecnico')   return NAV_TECNICO
  return NAV_MIXTO
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const workspaceId = params.workspaceId as string

  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const [ws, setWs] = useState<Workspace | null>(null)

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
    if (found) { setWs(found); setActiveWorkspace(workspaceId) }
    else router.push('/dashboard')
  }

  const navItems = ws ? getNav(ws.tipo) : []

  // Detecta tab activo — maneja rutas anidadas como iphone/stock
  const activeTab = navItems.find(item =>
    pathname.endsWith(`/${item.id}`) || pathname.includes(`/${item.id}`)
  )?.id ?? navItems[0]?.id ?? 'resumen'

  if (!ws) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
              <ChevronLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: ws.color + '20', border: `1.5px solid ${ws.color}35` }}>
              {ws.emoji}
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ws.nombre}</span>
          </div>
          <button className="p-2 rounded-xl" style={{ color: 'var(--text-tertiary)' }}>
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Nav — siempre 5 ítems, limpio */}
      <nav className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto h-16 flex items-center">
          {navItems.map(item => {
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
