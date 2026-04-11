'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Smartphone, Watch, ShoppingBag, Calculator } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load cada sub-tab
const StockiPhones   = dynamic(() => import('./_tabs/StockiPhones'))
const StockOtros     = dynamic(() => import('./_tabs/StockOtros'))
const StockAccesorios = dynamic(() => import('./_tabs/StockAccesorios'))
const Cotizar        = dynamic(() => import('./_tabs/Cotizar'))

const TABS = [
  { id: 'iphones',     label: 'iPhones',    icon: Smartphone },
  { id: 'otros',       label: 'Otros',      icon: Watch },
  { id: 'accesorios',  label: 'Accesorios', icon: ShoppingBag },
  { id: 'cotizar',     label: 'Cotizar',    icon: Calculator },
] as const

type TabId = typeof TABS[number]['id']

export default function StockPage() {
  const [tab, setTab] = useState<TabId>('iphones')

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Sub-nav de tabs */}
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

      {/* Contenido del tab */}
      <div>
        {tab === 'iphones'    && <StockiPhones />}
        {tab === 'otros'      && <StockOtros />}
        {tab === 'accesorios' && <StockAccesorios />}
        {tab === 'cotizar'    && <Cotizar />}
      </div>
    </div>
  )
}
