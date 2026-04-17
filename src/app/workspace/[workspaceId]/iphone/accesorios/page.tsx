'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import {
  getStockAccesorios, createStockAccesorio, updateStockAccesorio, deleteStockAccesorio,
  getListas, createLista, updateLista, deleteLista,
} from '@/lib/services'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { StockAccesorio, PrecioVolumen, ListaIPhone, CondicionCompra } from '@/types'
import { fmtARS, fmtUSD, fmtMonto } from '@/lib/format'

const CATEGORIAS = [
  { id: 'battery_pack',    label: '🔋 Battery Pack' },
  { id: 'cargadores',      label: '⚡ Cargadores' },
  { id: 'cargadores_armar',label: '🔧 Cargadores p/armar' },
  { id: 'cables',          label: '🔌 Cables' },
  { id: 'cables_armar',    label: '🔧 Cables p/armar' },
  { id: 'fundas',          label: '📱 Fundas' },
  { id: 'templados',       label: '🔲 Templados' },
  { id: 'pencil',          label: '✏️ Apple Pencil' },
  { id: 'airtag',          label: '🌎 AirTag' },
  { id: 'audio',           label: '🎧 Audio' },
  { id: 'otros',           label: '📦 Otros' },
]

const EMOJIS_LISTA = ['🇨🇳','🤝','🍎','📦','⭐','🔥','💎','🛒','🏷️','🎯']
const COLORES_LISTA = ['#E8001D','#0a84ff','#30d158','#ffd60a','#a855f7','#ff9f0a','#64d2ff','#ff375f']

// ── Seed con catálogo real ────────────────────────────────────────────────────
const SEED: Omit<StockAccesorio, 'id'|'workspaceId'|'createdAt'|'updatedAt'>[] = [
  // Battery Pack
  { nombre:'Battery Pack', categoria:'battery_pack', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:20000},{cantidad:10,precio:15000},{cantidad:30,precio:13000},{cantidad:50,precio:10000},{cantidad:100,precio:9200}] },
  // Fuente 20W Original
  { nombre:'Fuente 20W Original', categoria:'cargadores', descripcion:'Europeas', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:25},{cantidad:10,precio:20},{cantidad:20,precio:19},{cantidad:50,precio:17}] },
  // Cargadores
  { nombre:'Fuente 5W', categoria:'cargadores', descripcion:'Americana', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:5,precio:7000},{cantidad:10,precio:6200},{cantidad:30,precio:5900},{cantidad:50,precio:5500}] },
  { nombre:'Fuente 20W', categoria:'cargadores', descripcion:'Americano', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:5,precio:7.5},{cantidad:10,precio:7},{cantidad:30,precio:6.5},{cantidad:50,precio:5.5}] },
  // Cargadores para armar
  { nombre:'Fuente 20W', categoria:'cargadores_armar', descripcion:'Americano', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:5,precio:7.5},{cantidad:10,precio:7},{cantidad:30,precio:6.5},{cantidad:50,precio:4.7},{cantidad:100,precio:4},{cantidad:250,precio:3}] },
  // Cables
  { nombre:'Cable USB a Lightning', categoria:'cables', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:10,precio:3800},{cantidad:30,precio:3000},{cantidad:50,precio:2500},{cantidad:100,precio:2000}] },
  { nombre:'Cable C a Lightning', categoria:'cables', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:10,precio:4300},{cantidad:30,precio:3800},{cantidad:50,precio:3300},{cantidad:100,precio:2800}] },
  { nombre:'Cable C a C (Mallado)', categoria:'cables', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:10,precio:5000},{cantidad:30,precio:4000},{cantidad:50,precio:3500},{cantidad:100,precio:3000}] },
  // Cables para armar
  { nombre:'Cable USB a Lightning', categoria:'cables_armar', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:50,precio:1900},{cantidad:100,precio:1500},{cantidad:300,precio:1200},{cantidad:500,precio:1050}] },
  { nombre:'Cable C a Lightning', categoria:'cables_armar', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:50,precio:2500},{cantidad:100,precio:1950},{cantidad:300,precio:1650},{cantidad:500,precio:1500}] },
  { nombre:'Cable C a C (Mallado)', categoria:'cables_armar', descripcion:'', moneda:'ARS', stock:0, activo:true,
    preciosVolumen:[{cantidad:50,precio:2300},{cantidad:100,precio:1900},{cantidad:300,precio:1750},{cantidad:500,precio:1600}] },
  // Apple Pencil
  { nombre:'Apple Pencil 2da Gen', categoria:'pencil', descripcion:'', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:120}] },
  { nombre:'Apple Pencil USB-C', categoria:'pencil', descripcion:'', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:105}] },
  { nombre:'Apple Pencil Pro', categoria:'pencil', descripcion:'', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:130}] },
  // AirTag
  { nombre:'AirTag Pack x1', categoria:'airtag', descripcion:'', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:65}] },
  { nombre:'AirTag Pack x4', categoria:'airtag', descripcion:'', moneda:'USD', stock:0, activo:true,
    preciosVolumen:[{cantidad:1,precio:95}] },
]

type FormData = {
  nombre: string; categoria: string; descripcion: string
  moneda: 'ARS'|'USD'; stock: number; listaId: string
  preciosVolumen: PrecioVolumen[]
}
const EMPTY_FORM: FormData = {
  nombre:'', categoria:'cables', descripcion:'', moneda:'ARS', stock:0, listaId:'',
  preciosVolumen:[{cantidad:1,precio:0},{cantidad:10,precio:0}],
}

type ListaForm = {
  nombre:string; emoji:string; color:string; descripcion:string
  condicionCompra: { montoMinimo:number; descuentos:{desde:number;pct:number}[]; notas:string }
}
const EMPTY_LISTA: ListaForm = {
  nombre:'', emoji:'🇨🇳', color:'#E8001D', descripcion:'',
  condicionCompra:{ montoMinimo:0, descuentos:[], notas:'' },
}

export default function AccesoriosPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { isVendedor, isAdmin } = useMemberRole(workspaceId)
  const canEdit = isVendedor

  const [items, setItems]   = useState<StockAccesorio[]>([])
  const [listas, setListas] = useState<ListaIPhone[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const [listaFiltro, setListaFiltro] = useState<string>('todas')
  const [catFiltro, setCatFiltro]     = useState<string>('todas')

  // Modales
  const [showForm, setShowForm]         = useState(false)
  const [editando, setEditando]         = useState<StockAccesorio|null>(null)
  const [form, setForm]                 = useState<FormData>({...EMPTY_FORM})
  const [saving, setSaving]             = useState(false)
  const [showListaForm, setShowListaForm] = useState(false)
  const [editandoLista, setEditandoLista] = useState<ListaIPhone|null>(null)
  const [listaForm, setListaForm]       = useState<ListaForm>({...EMPTY_LISTA})
  const [savingLista, setSavingLista]   = useState(false)
  const [showCondiciones, setShowCondiciones] = useState<string|null>(null)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [acc, lst] = await Promise.all([getStockAccesorios(workspaceId), getListas(workspaceId)])
      setItems(acc)
      setListas(lst)
    } finally { setLoading(false) }
  }

  const cargarSeed = async () => {
    setSeeding(true)
    try {
      for (const item of SEED) await createStockAccesorio(workspaceId, { ...item, workspaceId })
      await load()
    } finally { setSeeding(false) }
  }

  const filtered = useMemo(() => {
    return items
      .filter(i => listaFiltro === 'todas' || i.listaId === listaFiltro || (listaFiltro === 'sin_lista' && !i.listaId))
      .filter(i => catFiltro === 'todas' || i.categoria === catFiltro)
      .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()) || i.descripcion?.toLowerCase().includes(search.toLowerCase()))
  }, [items, listaFiltro, catFiltro, search])

  // Agrupar por lista para mostrar
  const porLista = useMemo(() => {
    const grupos: Record<string, StockAccesorio[]> = {}
    filtered.forEach(i => {
      const key = i.listaId || '__sin_lista__'
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(i)
    })
    return grupos
  }, [filtered])

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY_FORM, listaId: listaFiltro === 'todas' || listaFiltro === 'sin_lista' ? '' : listaFiltro })
    setShowForm(true)
  }
  const openEdit = (item: StockAccesorio) => {
    setEditando(item)
    setForm({ nombre:item.nombre, categoria:item.categoria, descripcion:item.descripcion??'', moneda:item.moneda, stock:item.stock, listaId:item.listaId??'', preciosVolumen:[...item.preciosVolumen] })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre) return
    setSaving(true)
    try {
      const data = { nombre:form.nombre, categoria:form.categoria, descripcion:form.descripcion||undefined, moneda:form.moneda, stock:form.stock, listaId:form.listaId||undefined, preciosVolumen:form.preciosVolumen.filter(p=>p.cantidad>0&&p.precio>0), activo:true }
      if (editando) {
        await updateStockAccesorio(workspaceId, editando.id, data)
        setItems(prev => prev.map(i => i.id===editando.id ? {...i,...data} : i))
      } else {
        const id = await createStockAccesorio(workspaceId, {...data, workspaceId})
        setItems(prev => [...prev, {id,...data,workspaceId,createdAt:new Date(),updatedAt:new Date()}])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (item: StockAccesorio) => {
    if (!confirm(`¿Eliminar ${item.nombre}?`)) return
    await deleteStockAccesorio(workspaceId, item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  // Lista handlers
  const openNewLista = () => { setEditandoLista(null); setListaForm({...EMPTY_LISTA}); setShowListaForm(true) }
  const openEditLista = (l: ListaIPhone) => {
    setEditandoLista(l)
    setListaForm({ nombre:l.nombre, emoji:l.emoji, color:l.color, descripcion:l.descripcion??'', condicionCompra:l.condicionCompra ? { montoMinimo:l.condicionCompra.montoMinimo, descuentos:l.condicionCompra.descuentos, notas:l.condicionCompra.notas??'' } : { montoMinimo:0, descuentos:[], notas:'' } })
    setShowListaForm(true)
  }
  const handleSaveLista = async () => {
    if (!listaForm.nombre) return
    setSavingLista(true)
    try {
      const condicion: CondicionCompra|undefined = listaForm.condicionCompra.montoMinimo > 0 || listaForm.condicionCompra.descuentos.length > 0
        ? { montoMinimo:listaForm.condicionCompra.montoMinimo, descuentos:listaForm.condicionCompra.descuentos, notas:listaForm.condicionCompra.notas||undefined }
        : undefined
      const data = { workspaceId, nombre:listaForm.nombre, emoji:listaForm.emoji, color:listaForm.color, descripcion:listaForm.descripcion||undefined, condicionCompra:condicion, activa:true, orden:listas.length }
      if (editandoLista) {
        await updateLista(workspaceId, editandoLista.id, data)
        setListas(prev => prev.map(l => l.id===editandoLista.id ? {...l,...data} : l))
      } else {
        const id = await createLista(workspaceId, data)
        setListas(prev => [...prev, {id,...data,createdAt:new Date(),updatedAt:new Date()}])
      }
      setShowListaForm(false)
    } finally { setSavingLista(false) }
  }
  const handleDeleteLista = async (l: ListaIPhone) => {
    if (!confirm(`¿Eliminar la lista "${l.nombre}"? Los productos quedarán sin lista.`)) return
    await deleteLista(workspaceId, l.id)
    setListas(prev => prev.filter(x => x.id !== l.id))
    setItems(prev => prev.map(i => i.listaId===l.id ? {...i,listaId:undefined} : i))
  }

  const addPrecio = () => setForm(f => ({...f, preciosVolumen:[...f.preciosVolumen,{cantidad:0,precio:0}]}))
  const updPrecio = (idx:number, field:keyof PrecioVolumen, val:number) => setForm(f => ({...f, preciosVolumen:f.preciosVolumen.map((p,i) => i===idx ? {...p,[field]:val} : p)}))
  const remPrecio = (idx:number) => setForm(f => ({...f, preciosVolumen:f.preciosVolumen.filter((_,i) => i!==idx)}))

  const addDescuento = () => setListaForm(f => ({...f, condicionCompra:{...f.condicionCompra, descuentos:[...f.condicionCompra.descuentos,{desde:0,pct:0}]}}))
  const updDescuento = (idx:number, field:'desde'|'pct', val:number) => setListaForm(f => ({...f, condicionCompra:{...f.condicionCompra, descuentos:f.condicionCompra.descuentos.map((d,i) => i===idx ? {...d,[field]:val} : d)}}))
  const remDescuento = (idx:number) => setListaForm(f => ({...f, condicionCompra:{...f.condicionCompra, descuentos:f.condicionCompra.descuentos.filter((_,i) => i!==idx)}}))

  if (loading) return (
    <div className="space-y-3 mt-2">{[1,2,3].map(i=><div key={i} className="h-16 rounded-2xl animate-pulse" style={{background:'var(--surface-2)'}}/>)}</div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{color:'var(--text-primary)'}}>Accesorios</h2>
          <p className="text-xs mt-0.5" style={{color:'var(--text-tertiary)'}}>{items.length} productos · {listas.length} listas</p>
        </div>
        <div className="flex gap-1.5">
          {isAdmin && (
            <button onClick={openNewLista} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>
              <Settings size={14}/>
            </button>
          )}
          {canEdit && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{background:'var(--brand)'}}>
              <Plus size={13}/> Agregar
            </button>
          )}
        </div>
      </div>

      {/* Listas — tabs horizontales */}
      {listas.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          <button onClick={()=>setListaFiltro('todas')}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
            style={listaFiltro==='todas' ? {background:'var(--brand)',color:'#fff'} : {background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>
            Todas
          </button>
          {listas.map(l => (
            <button key={l.id} onClick={()=>setListaFiltro(l.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
              style={listaFiltro===l.id ? {background:l.color+'22',color:l.color,border:`1.5px solid ${l.color}`} : {background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>
              {l.emoji} {l.nombre}
            </button>
          ))}
          <button onClick={()=>setListaFiltro('sin_lista')}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
            style={listaFiltro==='sin_lista' ? {background:'var(--surface-3)',color:'var(--text-secondary)',border:'1.5px solid var(--border-strong)'} : {background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>
            Sin lista
          </button>
        </div>
      )}

      {/* Condiciones de compra de la lista activa */}
      {listaFiltro !== 'todas' && listaFiltro !== 'sin_lista' && (() => {
        const lista = listas.find(l=>l.id===listaFiltro)
        if (!lista?.condicionCompra) return null
        const cc = lista.condicionCompra
        return (
          <div className="rounded-2xl overflow-hidden" style={{border:`1px solid ${lista.color}40`,background:`${lista.color}10`}}>
            <button onClick={()=>setShowCondiciones(showCondiciones===lista.id?null:lista.id)}
              className="w-full flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{lista.emoji}</span>
                <p className="text-xs font-semibold" style={{color:lista.color}}>CONDICIONES DE COMPRA 🚩</p>
              </div>
              {showCondiciones===lista.id ? <ChevronUp size={13} style={{color:lista.color}}/> : <ChevronDown size={13} style={{color:lista.color}}/>}
            </button>
            {showCondiciones===lista.id && (
              <div className="px-3 pb-3 space-y-1">
                {cc.montoMinimo > 0 && (
                  <p className="text-xs font-medium" style={{color:'var(--text-primary)'}}>
                    Compra mínima: <span style={{color:lista.color}}>{fmtARS(cc.montoMinimo)}</span>
                  </p>
                )}
                {cc.descuentos.map((d,i) => (
                  <p key={i} className="text-xs" style={{color:'var(--text-secondary)'}}>
                    Más de {fmtARS(d.desde)} → <span className="font-bold" style={{color:'var(--green)'}}>{d.pct}% OFF</span>
                  </p>
                ))}
                {cc.notas && <p className="text-[10px] mt-1 italic" style={{color:'var(--text-tertiary)'}}>{cc.notas}</p>}
                {isAdmin && (
                  <button onClick={()=>openEditLista(lista)} className="text-[10px] mt-1" style={{color:lista.color}}>Editar condiciones →</button>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Filtro categoría */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={()=>setCatFiltro('todas')} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all" style={catFiltro==='todas'?{background:'var(--brand)',color:'#fff'}:{background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>Todas</button>
        {CATEGORIAS.map(c=>(
          <button key={c.id} onClick={()=>setCatFiltro(c.id)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all" style={catFiltro===c.id?{background:'var(--brand)',color:'#fff'}:{background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>{c.label}</button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--text-tertiary)'}}/>
        <input className="input pl-8 text-sm" placeholder="Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-sm font-medium mb-1" style={{color:'var(--text-primary)'}}>Sin productos</p>
          <p className="text-xs mb-4" style={{color:'var(--text-tertiary)'}}>Cargá tu catálogo de un toque o agregá uno por uno</p>
          {canEdit && (
            <button onClick={cargarSeed} disabled={seeding} className="btn-primary mx-auto">
              {seeding ? 'Cargando...' : '⚡ Cargar catálogo base'}
            </button>
          )}
          <p className="text-[10px] mt-2" style={{color:'var(--text-tertiary)'}}>{SEED.length} productos reales con precios por volumen</p>
        </div>
      )}

      {/* Lista de productos — agrupada por lista */}
      {filtered.length > 0 && (
        <div className="space-y-5">
          {Object.entries(porLista).map(([listaId, productos]) => {
            const lista = listas.find(l=>l.id===listaId)
            return (
              <div key={listaId}>
                {listaId !== '__sin_lista__' && lista && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span style={{color:lista.color}}>{lista.emoji}</span>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{color:lista.color}}>{lista.nombre}</p>
                    <div className="flex-1 h-px" style={{background:`${lista.color}30`}}/>
                    <span className="text-[10px]" style={{color:'var(--text-tertiary)'}}>{productos.length}p</span>
                  </div>
                )}
                <div className="space-y-2">
                  {productos.map(item => (
                    <div key={item.id} className="px-3 py-3 rounded-xl" style={{background:'var(--surface)',border:`1px solid ${lista ? lista.color+'30' : 'var(--border)'}`}}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{item.nombre}</span>
                            {item.descripcion && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}>{item.descripcion}</span>}
                            <span className="text-[10px]" style={{color:'var(--text-tertiary)'}}>{CATEGORIAS.find(c=>c.id===item.categoria)?.label}</span>
                          </div>
                          {/* Precios por volumen */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.preciosVolumen.map((pv,i) => (
                              <div key={i} className="flex flex-col items-center px-2.5 py-1.5 rounded-xl" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>
                                <span className="text-[9px] font-medium" style={{color:'var(--text-tertiary)'}}>x{pv.cantidad}</span>
                                <span className="text-xs font-bold mt-0.5" style={{color:'var(--brand-light)'}}>{fmtMonto(pv.precio,item.moneda)}</span>
                              </div>
                            ))}
                          </div>
                          {/* Stock */}
                          <div className="mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{background:item.stock>0?'var(--green-bg)':'var(--red-bg)',color:item.stock>0?'var(--green)':'var(--brand-light)'}}>
                              {item.stock>0?`${item.stock} u`:'Sin stock'}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={()=>openEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}><Pencil size={13}/></button>
                            <button onClick={()=>handleDelete(item)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}><Trash2 size={13}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal producto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}} onClick={()=>setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto" style={{background:'var(--surface)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{color:'var(--text-primary)'}}>{editando?'Editar producto':'Nuevo producto'}</h3>
              <button onClick={()=>setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Nombre</label><input className="input text-sm" placeholder="Ej: Cable USB-C a Lightning" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} autoFocus/></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Descripción</label><input className="input text-sm" placeholder="Ej: 1m Trenzado" value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}/></div>
                <div><label className="label">Stock</label><input type="number" min="0" className="input text-sm" value={form.stock||''} onChange={e=>setForm(f=>({...f,stock:Number(e.target.value)}))}/></div>
              </div>
              {/* Categoría */}
              <div><label className="label">Categoría</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIAS.map(c=><button key={c.id} onClick={()=>setForm(f=>({...f,categoria:c.id}))} className="py-2 rounded-xl text-xs font-medium transition-all" style={form.categoria===c.id?{background:'var(--brand)',color:'#fff'}:{background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>{c.label}</button>)}
                </div>
              </div>
              {/* Lista */}
              {listas.length > 0 && (
                <div><label className="label">Lista</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={()=>setForm(f=>({...f,listaId:''}))} className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={!form.listaId?{background:'var(--surface-3)',color:'var(--text-primary)',border:'1px solid var(--border-strong)'}:{background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>Sin lista</button>
                    {listas.map(l=><button key={l.id} onClick={()=>setForm(f=>({...f,listaId:l.id}))} className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all" style={form.listaId===l.id?{background:l.color+'22',color:l.color,border:`1.5px solid ${l.color}`}:{background:'var(--surface-2)',color:'var(--text-tertiary)',border:'1px solid var(--border)'}}>{l.emoji} {l.nombre}</button>)}
                  </div>
                </div>
              )}
              {/* Moneda */}
              <div><label className="label">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ARS','USD'] as const).map(m=><button key={m} onClick={()=>setForm(f=>({...f,moneda:m}))} className="py-2 rounded-xl text-sm font-semibold transition-all" style={form.moneda===m?{background:'var(--brand)',color:'#fff'}:{background:'var(--surface-2)',color:'var(--text-secondary)',border:'1px solid var(--border)'}}>{m}</button>)}
                </div>
              </div>
              {/* Precios por volumen */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Precios por cantidad</label>
                  <button onClick={addPrecio} className="text-xs px-2 py-1 rounded-lg transition-all" style={{background:'var(--surface-2)',color:'var(--brand-light)',border:'1px solid var(--border)'}}>+ Tramo</button>
                </div>
                <div className="space-y-2">
                  {form.preciosVolumen.map((pv,idx)=>(
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs w-3" style={{color:'var(--text-tertiary)'}}>x</span>
                      <input type="number" min="1" className="input text-sm py-1.5 w-20" placeholder="cant" value={pv.cantidad||''} onChange={e=>updPrecio(idx,'cantidad',Number(e.target.value))}/>
                      <input type="number" min="0" className="input text-sm py-1.5 flex-1" placeholder={form.moneda==='USD'?'precio USD':'precio ARS'} value={pv.precio||''} onChange={e=>updPrecio(idx,'precio',Number(e.target.value))}/>
                      {form.preciosVolumen.length>1&&<button onClick={()=>remPrecio(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!form.nombre||saving} className="btn-primary flex-1">{saving?'Guardando...':editando?'Guardar':'Agregar'}</button>
              <button onClick={()=>setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lista */}
      {showListaForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}} onClick={()=>setShowListaForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto" style={{background:'var(--surface)',border:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{color:'var(--text-primary)'}}>{editandoLista?'Editar lista':'Nueva lista'}</h3>
              <button onClick={()=>setShowListaForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Nombre</label><input className="input text-sm" placeholder="Ej: Importados China" value={listaForm.nombre} onChange={e=>setListaForm(f=>({...f,nombre:e.target.value}))} autoFocus/></div>
                <div><label className="label">Descripción</label><input className="input text-sm" placeholder="Opcional" value={listaForm.descripcion} onChange={e=>setListaForm(f=>({...f,descripcion:e.target.value}))}/></div>
              </div>
              {/* Emoji */}
              <div><label className="label">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS_LISTA.map(e=><button key={e} onClick={()=>setListaForm(f=>({...f,emoji:e}))} className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all" style={listaForm.emoji===e?{background:'var(--surface-3)',border:'2px solid var(--brand)'}:{background:'var(--surface-2)'}}>{e}</button>)}
                </div>
              </div>
              {/* Color */}
              <div><label className="label">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORES_LISTA.map(c=><button key={c} onClick={()=>setListaForm(f=>({...f,color:c}))} className="w-8 h-8 rounded-full transition-all" style={{background:c,outline:listaForm.color===c?`3px solid ${c}`:'none',outlineOffset:'2px'}}/>)}
                </div>
              </div>
              {/* Condiciones de compra */}
              <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--border)'}}>
                <div className="px-3 py-2.5" style={{background:'var(--surface-2)'}}>
                  <p className="text-xs font-semibold" style={{color:'var(--text-secondary)'}}>🚩 Condiciones de compra</p>
                  <p className="text-[10px] mt-0.5" style={{color:'var(--text-tertiary)'}}>Se muestra en la lista como referencia</p>
                </div>
                <div className="p-3 space-y-3">
                  <div><label className="label">Compra mínima</label>
                    <input type="number" min="0" className="input text-sm" placeholder="0 = sin mínimo" value={listaForm.condicionCompra.montoMinimo||''} onChange={e=>setListaForm(f=>({...f,condicionCompra:{...f.condicionCompra,montoMinimo:Number(e.target.value)}}))}/>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Descuentos escalonados</label>
                      <button onClick={addDescuento} className="text-xs px-2 py-1 rounded-lg" style={{background:'var(--surface-2)',color:'var(--brand-light)',border:'1px solid var(--border)'}}>+ Escala</button>
                    </div>
                    {listaForm.condicionCompra.descuentos.map((d,idx)=>(
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] whitespace-nowrap" style={{color:'var(--text-tertiary)'}}>Más de</span>
                        <input type="number" className="input text-sm py-1.5 flex-1" placeholder="monto ARS" value={d.desde||''} onChange={e=>updDescuento(idx,'desde',Number(e.target.value))}/>
                        <input type="number" className="input text-sm py-1.5 w-16" placeholder="%" value={d.pct||''} onChange={e=>updDescuento(idx,'pct',Number(e.target.value))}/>
                        <span className="text-xs" style={{color:'var(--text-tertiary)'}}>%</span>
                        <button onClick={()=>remDescuento(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--surface-2)',color:'var(--text-tertiary)'}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div><label className="label">Notas adicionales</label>
                    <input className="input text-sm" placeholder="Ej: Pago en efectivo o transferencia" value={listaForm.condicionCompra.notas} onChange={e=>setListaForm(f=>({...f,condicionCompra:{...f.condicionCompra,notas:e.target.value}}))}/>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveLista} disabled={!listaForm.nombre||savingLista} className="btn-primary flex-1">{savingLista?'Guardando...':editandoLista?'Guardar':'Crear lista'}</button>
              {editandoLista && <button onClick={()=>{handleDeleteLista(editandoLista);setShowListaForm(false)}} className="px-3 py-2 rounded-xl text-xs" style={{background:'var(--red-bg)',color:'var(--brand-light)'}}>Eliminar</button>}
              <button onClick={()=>setShowListaForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
