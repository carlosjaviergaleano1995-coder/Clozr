'use client'

import { useState } from 'react'
import { saveConfigVerisure } from '@/lib/services'
import type { ConfigVerisure, NivelPrecio } from '@/types'

const NIVEL_LABEL: Record<NivelPrecio, string> = {
  catalogo: 'Catálogo', alto: 'Alto', medio: 'Medio',
  bajo: 'Bajo', jefe: 'Jefe', gerente: 'Gerente',
}

export default function ConfigPanel({ config, workspaceId, onSave }: {
  config: ConfigVerisure
  workspaceId: string
  onSave: (c: ConfigVerisure) => void
}) {
  const [draft, setDraft] = useState<ConfigVerisure>(JSON.parse(JSON.stringify(config)))
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'kits' | 'promos' | 'bonos'>('kits')

  const updateKit = (k: NivelPrecio, val: number) =>
    setDraft(d => ({ ...d, kits: { ...d.kits, [k]: val } }))
  const updateCom = (k: keyof ConfigVerisure['comisiones'], val: number) =>
    setDraft(d => ({ ...d, comisiones: { ...d.comisiones, [k]: val } }))
  const updatePromo = (id: string, field: string, val: any) =>
    setDraft(d => ({ ...d, promos: d.promos.map(p => p.id === id ? { ...p, [field]: val } : p) }))
  const handleSave = async () => {
    setSaving(true)
    try { await saveConfigVerisure(workspaceId, draft); onSave(draft) }
    finally { setSaving(false) }
  }

  return (
    <div className="card border-amber-200 bg-[var(--amber-bg)]">
      <p className="text-sm font-semibold text-[var(--amber)] mb-3">⚙️ Configuración de precios</p>
      <div className="flex gap-1 mb-4">
        {(['kits', 'promos', 'bonos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${tab === t ? 'bg-amber-800 text-white' : 'bg-amber-100 text-[var(--amber)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'kits' && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--amber)] font-medium mb-1">Precios de instalación (sin IVA)</p>
          {(Object.keys(draft.kits) as NivelPrecio[]).map(nivel => (
            <div key={nivel} className="flex items-center gap-3">
              <span className="text-xs text-[var(--amber)] w-20 font-medium">{NIVEL_LABEL[nivel]}</span>
              <input type="number" value={draft.kits[nivel]}
                onChange={e => updateKit(nivel, Number(e.target.value))}
                className="input text-sm py-1.5 bg-[var(--surface)]" />
            </div>
          ))}
          <p className="text-xs text-[var(--amber)] font-medium mt-3 mb-1">Comisiones</p>
          {(Object.keys(draft.comisiones) as (keyof ConfigVerisure['comisiones'])[]).map(k => (
            <div key={k} className="flex items-center gap-3">
              <span className="text-xs text-[var(--amber)] w-28 font-medium">{k.replace('_', ' ')}</span>
              <input type="number" value={draft.comisiones[k]}
                onChange={e => updateCom(k, Number(e.target.value))}
                className="input text-sm py-1.5 bg-[var(--surface)]" />
            </div>
          ))}
        </div>
      )}

      {tab === 'promos' && (
        <div className="space-y-3">
          {draft.promos.map(promo => (
            <div key={promo.id} className="bg-[var(--surface)] rounded-xl p-3 space-y-2">
              <input value={promo.label}
                onChange={e => updatePromo(promo.id, 'label', e.target.value)}
                className="input text-sm py-1.5" placeholder="Nombre" />
              <input value={promo.descripcion}
                onChange={e => updatePromo(promo.id, 'descripcion', e.target.value)}
                className="input text-sm py-1.5" placeholder="Descripción" />
              <div className="flex gap-2 items-center">
                <input type="number" value={promo.precio}
                  onChange={e => updatePromo(promo.id, 'precio', Number(e.target.value))}
                  className="input text-sm py-1.5 flex-1" placeholder="Precio sin IVA" />
                <button onClick={() => updatePromo(promo.id, 'activa', !promo.activa)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${promo.activa ? 'bg-green-100 text-[var(--green)]' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
                  {promo.activa ? '✅ Activa' : '⏸ Pausada'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bonos' && (
        <div className="space-y-2">
          {([
            ['Cuota base',         'cuotaBase'],
            ['Cuota upgrade',      'cuotaUpgrade'],
            ['Bono RP instalada',  'bonoInstalacionRP'],
            ['Bono Jefe/Gerente',  'bonoInstalacionJefeGerente'],
          ] as [string, string][]).map(([label, key]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-[var(--amber)] w-32">{label}</span>
              <input type="number" value={(draft as any)[key]}
                onChange={e => setDraft(d => ({ ...d, [key]: Number(e.target.value) }))}
                className="input text-sm py-1.5 bg-[var(--surface)]" />
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full mt-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-xl py-2.5 transition-all disabled:opacity-40">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
