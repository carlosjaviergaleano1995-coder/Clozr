'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Check, X } from 'lucide-react'
import {
  getStockiPhones, createStockiPhone, updateStockiPhone, deleteStockiPhone,
  getConfigIPhoneClub, getDolarConfig, fetchDolarBlue, saveDolarConfig,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import { MODELOS_IPHONE, getColoresModelo, getImagenModelo } from '@/lib/iphone-modelos'
import type { StockIPhone, AppleCondicion, ConfigIPhoneClub, DolarConfig } from '@/types'

const STORAGES = ['64GB','128GB','256GB','512GB','1TB']
const NOMBRES_MODELOS = MODELOS_IPHONE.map(m => m.nombre)

const fmtUSD = (n: number) => `U$S ${n}`
const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type Tab = 'usados' | 'nuevos'
type FormData = Omit<StockIPhone,'id'|'workspaceId'|'createdAt'|'updatedAt'|'activo'>

const EMPTY: FormData = {
  modelo:'', storage:'128GB', color:'', condicion:'usado',
  precioUSD:0, stock:1, bateria:undefined, ciclos:undefined, observaciones:'',
}

export default function StockiPhones({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuthStore()

  const [items, setItems]   = useState<StockIPhone[]>([])
  const [config, setConfig] = useState<ConfigIPhoneClub|null>(null)
  const [dolar, setDolar]   = useState<DolarConfig|null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<Tab>('usados')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<StockIPhone|null>(null)
  const [form, setForm]     = useState<FormData>({...EMPTY})
  const [saving, setSaving] = useState(false)
  const [editDolar, setEditDolar] = useState(false)
  const [dolarInput, setDolarInput] = useState('')

  // Colores disponibles para el modelo seleccionado
  const coloresModelo = useMemo(() => getColoresModelo(form.modelo), [form.modelo])

  useEffect(() => { load() }, [workspaceId])

  // Cuando cambia el modelo, resetear el color si el actual no está disponible
  useEffect(() => {
    if (form.modelo && coloresModelo.length > 0 && !coloresModelo.includes(form.color)) {
      setForm(f => ({ ...f, color: '' }))
    }
  }, [form.modelo])

  const load = async () => {
    try {
      const [a,b,c] = await Promise.all([
        getStockiPhones(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setItems(a); setConfig(b); setDolar(c)
    } finally { setLoading(false) }
  }

  const refreshDolar = async () => {
    const valor = await fetchDolarBlue()
    if (valor && dolar) {
      const nuevo = { valor, actualizadoAt: new Date(), modoManual: false }
      setDolar(nuevo)
      await saveDolarConfig(workspaceId, nuevo)
    }
  }

  const saveDolarManual = async () => {
    const valor = parseFloat(dolarInput)
    if (!valor) return
    const nuevo = { valor, actualizadoAt: new Date(), modoManual: true }
    setDolar(nuevo); setEditDolar(false)
    await saveDolarConfig(workspaceId, nuevo)
  }

  const filtered = useMemo(() => {
    const cond: AppleCondicion = tab === 'usados' ? 'usado' : 'nuevo'
    return items
      .filter(i => i.condicion === cond)
      .filter(i => !search || `${i.modelo} ${i.color} ${i.storage}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => a.modelo.localeCompare(b.modelo) || a.precioUSD - b.precioUSD)
  }, [items, tab, search])

  const openNew = (c: AppleCondicion) => { setEditando(null); setForm({...EMPTY, condicion:c}); setShowForm(true) }
  const openEdit = (item: StockIPhone) => {
    setEditando(item)
    setForm({ modelo:item.modelo, storage:item.storage, color:item.color,
      condicion:item.condicion, precioUSD:item.precioUSD, stock:item.stock,
      bateria:item.bateria, ciclos:item.ciclos, observaciones:item.observaciones??'' })
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
    } catch (err) {
      console.error('Error guardando iPhone:', err)
      alert('Error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: StockIPhone) => {
    if (!confirm(`¿Eliminar ${item.modelo} ${item.color}?`)) return
    await deleteStockiPhone(workspaceId, item.id)
    setItems(prev => prev.filter(i => i.id!==item.id))
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 rounded-2xl animate-pulse" style={{background:'var(--surface-2)'}}/>)}</div>

  return (
    <div className="space-y-3 pb-4">
      {/* Dólar */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
        style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{color:'var(--text-tertiary)'}}>Dólar Blue</p>
          {editDolar ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <input type="number" value={dolarInput} onChange={e=>setDolarInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&saveDolarManual()}
                className="input py-1 text-sm w-24" autoFocus placeholder="1200"/>
              <button onClick={saveDolarManual} className="btn-primary py-1 px-2"><Check size={12}/></button>
              <button onClick={()=>setEditDolar(false)} className="btn-ghost py-1 px-2"><X size={12}/></button>
            </div>
          ) : (
            <p className="text-lg font-bold" style={{color:'var(--green)'}}>
              {dolar ? fmtARS(dolar.valor) : '—'}
              {dolar?.modoManual && <span className="text-[10px] font-normal ml-1" style={{color:'var(--text-tertiary)'}}>manual</span>}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={refreshDolar} className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>
            ↻ Auto
          </button>
          <button onClick={()=>{setDolarInput(String(dolar?.valor??''));setEditDolar(true)}}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>
            <Pencil size={12}/>
          </button>
        </div>
      </div>

      {/* Tab usados/nuevos + botón agregar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-xl flex-1" style={{background:'var(--surface-2)'}}>
          {(['usados','nuevos'] as Tab[]).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={tab===t ? {background:'var(--brand)',color:'#fff'} : {color:'var(--text-tertiary)'}}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={()=>openNew(tab==='usados'?'usado':'nuevo')} className="btn-primary gap-1 text-sm flex-shrink-0">
          <Plus size={15}/> Agregar
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--text-tertiary)'}}/>
        <input className="input pl-8 text-sm" placeholder="Buscar modelo, color..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Lista */}
      {filtered.length===0 ? (
        <div className="text-center py-8">
          <p className="text-sm" style={{color:'var(--text-tertiary)'}}>Sin {tab} en stock</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item=>{
            const imgSrc = getImagenModelo(item.modelo, item.color)
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
                {/* Imagen del modelo */}
                {imgSrc && (
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{background:'var(--surface-2)'}}>
                    <img src={imgSrc} alt={`${item.modelo} ${item.color}`}
                      className="w-9 h-9 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{item.modelo}</span>
                    <span className="text-xs" style={{color:'var(--text-tertiary)'}}>{item.color} · {item.storage}</span>
                    {item.condicion==='usado'&&item.bateria&&(
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: item.bateria>=85?'var(--green-bg)':item.bateria>=75?'var(--amber-bg)':'var(--red-bg)',
                          color: item.bateria>=85?'var(--green)':item.bateria>=75?'var(--amber)':'var(--brand-light)',
                        }}>
                        {item.bateria}%
                      </span>
                    )}
                    {item.ciclos!==undefined&&item.ciclos!==null&&(
                      <span className="text-[10px]" style={{color:'var(--text-tertiary)'}}>{item.ciclos}c</span>
                    )}
                    {item.observaciones&&(
                      <span className="text-[10px] italic" style={{color:'var(--amber)'}}>{item.observaciones}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-bold" style={{color:'var(--brand-light)'}}>{fmtUSD(item.precioUSD)}</span>
                    {config&&<span className="text-xs" style={{color:'var(--text-tertiary)'}}>Final: {fmtUSD(item.precioUSD+config.margenFinal)}</span>}
                    {dolar&&<span className="text-xs" style={{color:'var(--text-tertiary)'}}>= {fmtARS(item.precioUSD*dolar.valor)}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{background:item.stock>0?'var(--green-bg)':'var(--red-bg)',color:item.stock>0?'var(--green)':'var(--brand-light)'}}>
                      {item.stock} u
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>openEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}>
                    <Pencil size={13}/>
                  </button>
                  <button onClick={()=>handleDelete(item)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}
          onClick={()=>setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{background:'var(--surface)',border:'1px solid var(--border)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{color:'var(--text-primary)'}}>{editando?'Editar':'Agregar '+form.condicion}</h3>
              <button onClick={()=>setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">

              {/* Modelo — selector con todos los modelos */}
              <div>
                <label className="label">Modelo</label>
                <select className="input text-sm" value={form.modelo}
                  onChange={e=>setForm(f=>({...f,modelo:e.target.value,color:''}))}>
                  <option value="">Seleccioná modelo...</option>
                  {NOMBRES_MODELOS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Storage */}
              <div>
                <label className="label">Storage</label>
                <div className="flex gap-1.5 flex-wrap">
                  {STORAGES.map(s=>(
                    <button key={s} onClick={()=>setForm(f=>({...f,storage:s}))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={form.storage===s
                        ? {background:'var(--brand)',color:'#fff'}
                        : {background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color — muestra los colores del modelo seleccionado */}
              <div>
                <label className="label">Color</label>
                {coloresModelo.length > 0 ? (
                  <div className="flex gap-1.5 flex-wrap">
                    {coloresModelo.map(c=>(
                      <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={form.color===c
                          ? {background:'var(--brand)',color:'#fff'}
                          : {background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input className="input text-sm" placeholder="Seleccioná un modelo primero"
                    value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value.toUpperCase()}))}
                    disabled={coloresModelo.length===0&&form.modelo!==''}/>
                )}
              </div>

              {/* Precio + Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Precio USD</label>
                  <input type="number" className="input text-sm" value={form.precioUSD||''}
                    onChange={e=>setForm(f=>({...f,precioUSD:Number(e.target.value)}))}/>
                  {form.precioUSD>0&&config&&(
                    <p className="text-[10px] mt-1" style={{color:'var(--text-tertiary)'}}>Final: U$S {form.precioUSD+config.margenFinal}</p>
                  )}
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="1" className="input text-sm" value={form.stock}
                    onChange={e=>setForm(f=>({...f,stock:Number(e.target.value)}))}/>
                </div>
              </div>

              {/* Campos de usados */}
              {form.condicion==='usado'&&(
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Batería %</label>
                      <input type="number" min="0" max="100" className="input text-sm" placeholder="85"
                        value={form.bateria??''} onChange={e=>setForm(f=>({...f,bateria:e.target.value?Number(e.target.value):undefined}))}/>
                    </div>
                    <div>
                      <label className="label">Ciclos</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0"
                        value={form.ciclos??''} onChange={e=>setForm(f=>({...f,ciclos:e.target.value?Number(e.target.value):undefined}))}/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Observaciones</label>
                    <input className="input text-sm" placeholder="Ej: Pantalla Cambiada"
                      value={form.observaciones??''} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))}/>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.modelo||!form.color||!form.precioUSD||saving} className="btn-primary flex-1">
                {saving?'Guardando...':editando?'Guardar':'Agregar'}
              </button>
              <button onClick={()=>setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
