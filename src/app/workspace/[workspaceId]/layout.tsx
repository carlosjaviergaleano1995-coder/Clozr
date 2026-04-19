'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore, useWorkspaceStore } from '@/store'
import { getWorkspaces } from '@/lib/services'
import { derivarNav, derivarMas } from '@/lib/workspace-config'
import { ClozrIcon } from '@/components/ClozrLogo'
import { SystemConfigProvider } from '@/providers/SystemConfigProvider'
import { MasDrawer } from '@/components/MasDrawer'
import { useWorkspace } from '@/hooks/useWorkspace'
import type { Workspace } from '@/types'
import type { SalesSystemDefinition } from '@/features/systems/types'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const params      = useParams()
  const pathname    = usePathname()
  const workspaceId = params.workspaceId as string

  const { user, loading: authLoading }        = useAuthStore()
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore()

  const [ws,        setWs]        = useState<Workspace | null>(null)
  const [systemDef, setSystemDef] = useState<SalesSystemDefinition | null>(null)
  const [masOpen,   setMasOpen]   = useState(false)

  // Hook reactivo — detecta cambios de nombre, sistema activo, etc. en tiempo real
  const { workspace: wsLive } = useWorkspace(workspaceId)
  const displayWs = wsLive ?? ws

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  // ── Bootstrap del workspace ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !workspaceId) return
    loadWorkspace()
  }, [user, workspaceId])

  // ── Sistema activo: recarga systemDef cuando activeSystemSlug cambia ─────────
  useEffect(() => {
    const slug = (wsLive as any)?.activeSystemSlug
    if (!slug) { setSystemDef(null); return }
    import('@/lib/firebase').then(({ db }) =>
      import('firebase/firestore').then(({ doc, getDoc }) =>
        getDoc(doc(db, `system_definitions/${slug}`))
          .then(snap => { if (snap.exists()) setSystemDef((snap.data() as any).definition) })
          .catch(() => {})
      )
    )
  }, [(wsLive as any)?.activeSystemSlug])

  // ── Cerrar drawer Más al navegar ──────────────────────────────────────────────
  useEffect(() => { setMasOpen(false) }, [pathname])

  const loadWorkspace = async () => {
    if (!user) return
    let allWs = workspaces
    if (!allWs.length) {
      allWs = await getWorkspaces(user.uid)
      setWorkspaces(allWs)
    }
    const found = allWs.find(w => w.id === workspaceId)
    if (!found) { router.push('/dashboard'); return }

    setWs(found)
    setActiveWorkspace(workspaceId)

    // Cargar sistema activo si existe
    const slug = (found as any).activeSystemSlug
    if (slug) {
      import('@/lib/firebase').then(({ db }) =>
        import('firebase/firestore').then(({ doc, getDoc }) =>
          getDoc(doc(db, `system_definitions/${slug}`))
            .then(snap => { if (snap.exists()) setSystemDef((snap.data() as any).definition) })
            .catch(() => {})
        )
      )
    }
  }

  // ── Nav ──────────────────────────────────────────────────────────────────────
  const config   = displayWs?.config ?? {}
  const navItems = derivarNav(config as any)
  const masItems = derivarMas(config as any)

  // Detectar tab activo
  // Tab Inicio tiene id='hoy' — la ruta real es /hoy
  // /inicio redirige a /hoy (ver inicio/page.tsx)
  const activeTab = (() => {
    for (const item of navItems) {
      if (item.isMore) continue
      const base     = item.id.split('?')[0]
      const itemPath = `/workspace/${workspaceId}/${base}`
      if (pathname === itemPath || pathname.startsWith(itemPath + '/')) {
        return item.id
      }
    }
    // Fallback: /inicio también activa el tab hoy
    if (pathname.endsWith('/inicio')) return 'hoy'
    return 'hoy'
  })()

  if (!displayWs) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <ClozrIcon size={48} className="animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2.5">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: (displayWs.color ?? '#E8001D') + '20' }}
          >
            {displayWs.emoji}
          </div>
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {displayWs.nombre}
          </span>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-3 pb-24">
        <SystemConfigProvider definition={systemDef}>
          {children}
        </SystemConfigProvider>
      </main>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-2xl mx-auto h-16 flex items-center">
          {navItems.map(item => {
            const NavIcon  = item.icon
            const isActive = !item.isMore && activeTab === item.id
            const isMas    = item.isMore

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isMas) {
                    setMasOpen(o => !o)
                  } else {
                    router.push(`/workspace/${workspaceId}/${item.id}`)
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all"
                style={{
                  color: isMas && masOpen
                    ? '#E8001D'
                    : isActive
                    ? '#E8001D'
                    : 'var(--text-tertiary)',
                }}
              >
                <NavIcon size={21} strokeWidth={isActive || (isMas && masOpen) ? 2.5 : 1.8} />
                <span className={`text-[9px] ${isActive || (isMas && masOpen) ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Drawer Más */}
      {masOpen && (
        <MasDrawer
          workspaceId={workspaceId}
          items={masItems}
          onClose={() => setMasOpen(false)}
        />
      )}
    </div>
  )
}
