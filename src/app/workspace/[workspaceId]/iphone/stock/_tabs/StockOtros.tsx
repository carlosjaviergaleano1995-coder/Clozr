'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getStockOtrosApple, createStockOtroApple,
  updateStockOtroApple,
} from '@/lib/services'
import { getDolarConfig } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { StockOtroApple, DolarConfig } from '@/types'
import { fmtARS, fmtUSD } from '@/lib/format'

const TIPOS = [
  { id: 'watch',   label: '⌚️ Apple Watch' },
  { id: 'ipad',    label: '📱 iPad' },
  { id: 'airpods', label: '🎧 AirPods' },
  { id: 'airtag',  label: '🌎 AirTag' },
  { id: 'otro',    label: '📦 Otro' },
] as const

type TipoOtro = typeof TIPOS[number]['id']

const EMPTY = {
  tipo: 'watch' as TipoOtro,
  modelo: '',
  descripcion: '',
  precioUSD: 0,
  stock: 1,
  disponible: true,
}




export default function StockOtros({ workspaceId, canEdit = true, canDelete = true }: { workspaceId: string; canEdit?: boolean; canDelete?: boolean }) {
  const { user } = useAuthStore()

  const [items, setItems] = useState<StockOtroApple[]>([])
  const [dolar, setDolar] = useState<DolarConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState<TipoOtro | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<StockOtroApple | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [itemsData, dolarData] = await Promise.all([
        getStockOtrosApple(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setItems(itemsData)
      setDolar(dolarData)
    } finally { setLoading(false) }
  }

  const filtered = items
    .filter(i => tipoFiltro === 'todos' || i.tipo === tipoFiltro)
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.modelo.localeCompare(b.modelo))

  const openNew = () => { setEditando(null); setForm({ ...EMPTY }); setShowForm(true) }
  const openEdit = (item: StockOtroApple) => {
    setEditando(item)
    setForm({
      tipo: item.tipo as TipoOtro,
      modelo: item.modelo,
      descripcion: item.descripcion ?? '',
      precioUSD: item.precioUSD,
      stock: item.stock,
      disponible: item.disponible,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.modelo || !form.precioUSD || !user) return
    setSaving(true)
    try {
      if (editando) {
        await updateStockOtroApple(workspaceId, editando.id, form)
        setItems(prev => prev.map(i => i.id === editando.id ? { ...i, ...form } : i))
      } else {
        const id = await createStockOtroApple(workspaceId, {
          ...form, workspaceId, activo: true,
        })
        setItems(prev => [...prev, {
          id, ...form, workspaceId, activo: true,
          createdAt: new Date(), updatedAt: new Date(),
        }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleToggleDisponible = async (item: StockOtroApple) => {
    await updateStockOtroApple(workspaceId, item.id, { disponible: !item.disponible })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, disponible: !i.disponible } : i))
  }

  const handleDelete = async (item: StockOtroApple) => {
    if (!confirm(`¿Eliminar ${item.modelo}?`)) return
    await updateStockOtroApple(workspaceId, item.id, { activo: false })
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Otros Apple</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Watch · iPad · AirPods · AirTag
          </p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="btn-primary gap-1 text-sm">
            <Plus size={15} /> Agregar
          </button>
        )}
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setTipoFiltro('todos')}
          className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
          style={tipoFiltro === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todos
        </button>
        {TIPOS.map(t => (
          <button key={t.id} onClick={() => setTipoFiltro(t.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
            style={tipoFiltro === t.id
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin productos</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Agregá Watch, iPad, AirPods o AirTag</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const tipoLabel = TIPOS.find(t => t.id === item.tipo)?.label ?? item.tipo
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${item.disponible ? 'var(--border)' : 'var(--surface-3)'}`,
                  opacity: item.disponible ? 1 : 0.6,
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tipoLabel}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.modelo}
                    </span>
                    {!item.disponible && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                        Próximo ingreso
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--brand-light)' }}>
                      {fmtUSD(item.precioUSD)}
                    </span>
                    {dolar && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        = {fmtARS(item.precioUSD * dolar.valor)}
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: item.stock > 0 ? 'var(--green-bg)' : 'var(--red-bg)', color: item.stock > 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                      {item.stock} u
                    </span>
                  </div>
                  {item.descripcion && (
                    <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                      {item.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {canEdit && (
                    <button onClick={() => handleToggleDisponible(item)}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                      style={item.disponible
                        ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                      {item.disponible ? 'Disp.' : 'N/D'}
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => openEdit(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Pencil size={13} />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIPOS.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                      className="py-2 rounded-xl text-xs font-medium transition-all"
                      style={form.tipo === t.id
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Modelo</label>
                <input className="input text-sm" placeholder="Ej: Apple Watch SE2 44MM"
                  value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                  autoFocus />
              </div>

              <div>
                <label className="label">Descripción / Colores</label>
                <input className="input text-sm" placeholder="Ej: Midnight · Space Gray"
                  value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Precio USD</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={form.precioUSD || ''} onChange={e => setForm(f => ({ ...f, precioUSD: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="0" className="input text-sm"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              </div>

              <button onClick={() => setForm(f => ({ ...f, disponible: !f.disponible }))}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                style={form.disponible
                  ? { background: 'var(--green-bg)', border: '1px solid var(--green)' }
                  : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-medium"
                  style={{ color: form.disponible ? 'var(--green)' : 'var(--text-secondary)' }}>
                  {form.disponible ? '✅ Disponible' : '⏳ Próximo ingreso'}
                </span>
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave}
                disabled={!form.modelo || !form.precioUSD || saving}
                className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar' : 'Agregar'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
