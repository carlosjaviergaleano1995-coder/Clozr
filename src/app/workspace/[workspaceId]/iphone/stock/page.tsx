'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Smartphone, Watch, ShoppingBag, Calculator } from 'lucide-react'
import StockiPhones   from './_tabs/StockiPhones'
import StockOtros     from './_tabs/StockOtros'
import StockAccesorios from './_tabs/StockAccesorios'
import Cotizar        from './_tabs/Cotizar'

const TABS = [
  { id: 'iphones',    label: 'iPhones',    icon: Smartphone },
  { id: 'otros',      label: 'Otros',      icon: Watch },
  { id: 'accesorios', label: 'Accesorios', icon: ShoppingBag },
  { id: 'cotizar',    label: 'Cotizar',    icon: Calculator },
] as const

type TabId = typeof TABS[number]['id']

export default function StockPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [tab, setTab] = useState<TabId>('iphones')

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Sub-nav tabs */}
      <div className="flex gap-1 p-1 rounded-2xl sticky top-[57px] z-30"
        style={{ background: 'var(--surface-2)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={isActive
                ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                : { color: 'var(--text-tertiary)' }}>
              <Icon size={13} strokeWidth={isActive ? 2.5 : 1.8} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenido — workspaceId pasado como prop para garantizar que esté disponible */}
      {tab === 'iphones'    && <StockiPhones    workspaceId={workspaceId} />}
      {tab === 'otros'      && <StockOtros      workspaceId={workspaceId} />}
      {tab === 'accesorios' && <StockAccesorios workspaceId={workspaceId} />}
      {tab === 'cotizar'    && <Cotizar         workspaceId={workspaceId} />}
    </div>
  )
}
