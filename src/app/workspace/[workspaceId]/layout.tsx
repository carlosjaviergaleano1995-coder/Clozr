'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  LayoutDashboard, Users, Package, FileText,
  CheckSquare, TrendingUp, ChevronLeft, Settings
} from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces } from '@/lib/services'
import type { Workspace } from '@/types'

const NAV_ITEMS = [
  { id: 'resumen',      label: 'Resumen',     icon: LayoutDashboard },
  { id: 'clientes',     label: 'Clientes',    icon: Users },
  { id: 'catalogo',     label: 'Catálogo',    icon: Package },
  { id: 'presupuesto',  label: 'Cotizar',     icon: FileText },
  { id: 'ventas',       label: 'Ventas',      icon: TrendingUp },
  { id: 'tareas',       label: 'Tareas',      icon: CheckSquare },
]

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const { user, loading: authLoading } = useAuthStore()
  const { workspaces, setWorkspaces, setActiveWorkspace, getActiveWorkspace } = useWorkspaceStore()

  const [activeTab, setActiveTab] = useState('resumen')
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
    if (found) {
      setWs(found)
      setActiveWorkspace(workspaceId)
    } else {
      router.push('/dashboard')
    }
  }

  if (!ws) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-brand-600 animate-pulse flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: ws.color + '15', border: `1.5px solid ${ws.color}25` }}
            >
              {ws.emoji}
            </div>
            <span className="font-semibold text-surface-900 text-sm">{ws.nombre}</span>
          </div>
          <button className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-40">
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  router.push(`/workspace/${workspaceId}/${item.id}`)
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-surface-400 hover:text-surface-700'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
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
