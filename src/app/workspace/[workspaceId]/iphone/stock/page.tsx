'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Pencil, Trash2, Check, X } from 'lucide-react'
import {
  getStockiPhones, createStockiPhone, updateStockiPhone, deleteStockiPhone,
  getConfigIPhoneClub, getDolarConfig, fetchDolarBlue, saveDolarConfig,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { StockIPhone, AppleCondicion, ConfigIPhoneClub, DolarConfig } from '@/types'

const MODELOS_COMUNES = [
  'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17', 'iPhone 16 Pro Max',
  'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16E',
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max',
  'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13',
]
const STORAGES = ['64GB', '128GB', '256GB', '512GB', '1TB']
const COLORES_COMUNES = [
  'BLACK', 'WHITE', 'PINK', 'BLUE', 'ULTRAMARINE', 'TEAL',
  'STARLIGHT', 'MIDNIGHT', 'RED', 'GOLD', 'SILVER', 'DESERT',
  'PURPLE', 'YELLOW', 'GREEN', 'NATURAL',
]

const fmtUSD = (n: number) => `U$S ${n.toLocaleString('es-AR')}`
const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type Tab = 'usados' | 'nuevos'
type FormData = Omit<StockIPhone, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'activo'>

const EMPTY_FORM: FormData = {
  modelo: '', storage: '128GB', color: '', condicion: 'usado',
  precioUSD: 0, stock: 1, bateria: undefined, ciclos: undefined, observaciones: '',
}

export default function StockPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [items, setItems] = useState<StockIPhone[]>([])
  const [config, setConfig] = useState<ConfigIPhoneClub | null>(null)
  const [dolar, setDolar] = useState<DolarConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('usados')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<StockIPhone | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [editandoDolar, setEditandoDolar] = useState(false)
  const [dolarInput, setDolarInput] = useState('')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [itemsData, configData, dolarData] = await Promise.all([
        getStockiPhones(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setItems(itemsData)
      setConfig(configData)
      setDolar(dolarData)
    } finally { setLoading(false) }
  }

  const refreshDolar = async () => {
    if (!dolar) return
    const valor = await fetchDolarBlue()
    if (valor) {
      const nuevo = { valor, actualizadoAt: new Date(), modoManual: false }
      setDolar(nuevo)
      await saveDolarConfig(workspaceId, nuevo)
    }
  }

  const saveDolarManual = async () => {
    const valor = parseFloat(dolarInput)
    if (!valor || isNaN(valor)) return
    const nuevo = { valor, actualizadoAt: new Date(), modoManual: true }
    setDolar(nuevo)
    await saveDolarConfig(workspaceId, nuevo)
    setEditandoDolar(false)
  }

  const filtered = useMemo(() => {
    const condicion: AppleCondicion = tab === 'usados' ? 'usado' : 'nuevo'
    return items
      .filter(i => i.condicion === condicion)
      .filter(i => !search || `${i.modelo} ${i.color} ${i.storage}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.modelo.localeCompare(b.modelo) || a.precioUSD - b.precioUSD)
  }, [items, tab, search])

  const openNew = (condicion: AppleCondicion) => {
    setEditando(null)
    setForm({ ...EMPTY_FORM, condicion })
    setShowForm(true)
  }

  const openEdit = (item: StockIPhone) => {
    setEditando(item)
    setForm({
      modelo: item.modelo, storage: item.storage, color: item.color,
      condicion: item.condicion, precioUSD: item.precioUSD, stock: item.stock,
      bateria: item.bateria, ciclos: item.ciclos, observaciones: item.observaciones ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.modelo || !form.color || !form.precioUSD || !user) return
    setSaving(true)
    try {
      if (editando) {
        await updateStockiPhone(workspaceId, editando.id, form)
        setItems(prev => prev.map(i => i.id === editando.id ? { ...i, ...form } : i))
      } else {
        const id = await createStockiPhone(workspaceId, { ...form, workspaceId, activo: true })
        setItems(prev => [...prev, { id, ...form, workspaceId, activo: true, createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (item: StockIPhone) => {
    if (!confirm(`¿Eliminar ${item.modelo} ${item.color}?`)) return
    await deleteStockiPhone(workspaceId, item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const precioFinal = config ? form.precioUSD + config.margenFinal : form.precioUSD + 20

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Dólar widget */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Dólar Blue</p>
          {editandoDolar ? (
            <div className="flex items-center gap-2 mt-1">
              <input type="number" value={dolarInput}
                onChange={e => setDolarInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveDolarManual()}
                className="input py-1 text-sm w-28" autoFocus placeholder="1200" />
              <button onClick={saveDolarManual} className="btn-primary py-1 px-2 text-xs"><Check size={12} /></button>
              <button onClick={() => setEditandoDolar(false)} className="btn-ghost py-1 px-2 text-xs"><X size={12} /></button>
            </div>
          ) : (
            <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--green)' }}>
              {dolar ? fmtARS(dolar.valor) : '—'}
              {dolar?.modoManual && <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>manual</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={refreshDolar}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            ↻ Auto
          </button>
          <button onClick={() => { setDolarInput(String(dolar?.valor ?? '')); setEditandoDolar(true) }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {(['usados', 'nuevos'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
              style={tab === t
                ? { background: 'var(--brand)', color: '#fff' }
                : { color: 'var(--text-tertiary)' }}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => openNew(tab === 'usados' ? 'usado' : 'nuevo')} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar modelo, color..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Sin {tab} en stock
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Tocá "Agregar" para cargar unidades
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.modelo}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {item.color} · {item.storage}
                  </span>
                  {item.condicion === 'usado' && item.bateria && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: item.bateria >= 85 ? 'var(--green-bg)' : item.bateria >= 75 ? 'var(--amber-bg)' : 'var(--red-bg)',
                        color: item.bateria >= 85 ? 'var(--green)' : item.bateria >= 75 ? 'var(--amber)' : 'var(--brand-light)',
                      }}>
                      {item.bateria}%
                    </span>
                  )}
                  {item.ciclos !== undefined && item.ciclos !== null && (
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {item.ciclos} ciclos
                    </span>
                  )}
                  {item.observaciones && (
                    <span className="text-[10px] italic" style={{ color: 'var(--amber)' }}>
                      {item.observaciones}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-bold" style={{ color: 'var(--brand-light)' }}>
                    {fmtUSD(item.precioUSD)}
                  </span>
                  {config && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Final: {fmtUSD(item.precioUSD + config.margenFinal)}
                    </span>
                  )}
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
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(item)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(item)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar' : `Agregar ${form.condicion}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              {/* Modelo */}
              <div>
                <label className="label">Modelo</label>
                <select className="input text-sm" value={form.modelo}
                  onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}>
                  <option value="">Seleccioná modelo...</option>
                  {MODELOS_COMUNES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input className="input text-sm mt-1.5" placeholder="O escribí un modelo..."
                  value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>

              {/* Storage + Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Storage</label>
                  <select className="input text-sm" value={form.storage}
                    onChange={e => setForm(f => ({ ...f, storage: e.target.value }))}>
                    {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Color</label>
                  <input className="input text-sm" placeholder="BLACK"
                    value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value.toUpperCase() }))} />
                </div>
              </div>

              {/* Colores rápidos */}
              <div className="flex flex-wrap gap-1">
                {COLORES_COMUNES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all"
                    style={form.color === c
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Precio + Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Precio USD</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={form.precioUSD || ''} onChange={e => setForm(f => ({ ...f, precioUSD: Number(e.target.value) }))} />
                  {form.precioUSD > 0 && config && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Final: U$S {form.precioUSD + config.margenFinal}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="1" className="input text-sm" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Campos de usados */}
              {form.condicion === 'usado' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Batería %</label>
                      <input type="number" min="0" max="100" className="input text-sm" placeholder="85"
                        value={form.bateria ?? ''} onChange={e => setForm(f => ({ ...f, bateria: e.target.value ? Number(e.target.value) : undefined }))} />
                    </div>
                    <div>
                      <label className="label">Ciclos</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0"
                        value={form.ciclos ?? ''} onChange={e => setForm(f => ({ ...f, ciclos: e.target.value ? Number(e.target.value) : undefined }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Observaciones</label>
                    <input className="input text-sm" placeholder="Ej: Pantalla Cambiada"
                      value={form.observaciones ?? ''} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave}
                disabled={!form.modelo || !form.color || !form.precioUSD || saving}
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
