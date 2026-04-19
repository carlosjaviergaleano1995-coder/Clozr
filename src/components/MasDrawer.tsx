'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { MasItem } from '@/lib/workspace-config'

interface MasDrawerProps {
  workspaceId: string
  items:       MasItem[]
  onClose:     () => void
}

export function MasDrawer({ workspaceId, items, onClose }: MasDrawerProps) {
  const router = useRouter()

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function navigate(id: string) {
    router.push(`/workspace/${workspaceId}/${id}`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
        style={{
          background:   'var(--surface)',
          borderTop:    '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          maxHeight:    '70vh',
          overflowY:    'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Más opciones</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Grid de items */}
        <div className="grid grid-cols-2 gap-2 px-4 pb-8">
          {items.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.label}
                  </p>
                  {item.desc && (
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.desc}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
