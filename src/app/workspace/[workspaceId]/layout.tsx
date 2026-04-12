'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces } from '@/lib/services'
import { derivarNav } from '@/lib/workspace-config'
import { ClozrIcon } from '@/components/ClozrLogo'
import type { Workspace } from '@/types'

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

  const navItems = ws ? derivarNav(ws.config ?? {}) : []

  const activeTab = navItems.find(item =>
    pathname.endsWith(`/${item.id}`) || pathname.includes(`/${item.id}/`)
  )?.id ?? 'hoy'

  if (!ws) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header mínimo */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => router.push('/dashboard')} style={{ color: 'var(--text-tertiary)' }}>
              <ChevronLeft size={18} />
            </button>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm"
              style={{ background: ws.color + '20' }}>
              {ws.emoji}
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ws.nombre}</span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-3 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto h-16 flex items-center">
          {navItems.map(item => {
            const NavIcon = item.icon
            const isActive = activeTab === item.id
            return (
              <button key={item.id}
                onClick={() => router.push(`/workspace/${workspaceId}/${item.id}`)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all"
                style={{ color: isActive ? '#E8001D' : 'var(--text-tertiary)' }}>
                <NavIcon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[9px] ${isActive ? 'font-bold' : 'font-medium'}`}>
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
