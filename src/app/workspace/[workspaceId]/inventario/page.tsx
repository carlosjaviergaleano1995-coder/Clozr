'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { getProductos2, createProducto2, updateProducto2, deleteProducto2, getConfigIPhoneClub, getDolarConfig } from '@/lib/services'
import { useAuthStore } from '@/store'
import { CATEGORIAS, type Producto2, type CategoriaCodigo, type Condicion, type CamposSmartphone } from '@/types'
import { MODELOS_IPHONE, getColoresModelo, getImagenModelo } from '@/lib/iphone-modelos'

const MARCAS_COMUNES: Record<CategoriaCodigo, string[]> = {
  smartphones:  ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Google'],
  computadoras: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus'],
  gaming:       ['Sony', 'Microsoft', 'Nintendo'],
  wearables:    ['Apple', 'Samsung', 'Garmin', 'Fitbit'],
  tablets:      ['Apple', 'Samsung', 'Lenovo'],
  audio:        ['JBL', 'Sony', 'Bose', 'Apple', 'Sennheiser'],
  accesorios:   ['Apple', 'Anker', 'Baseus', 'Belkin'],
  repuestos:    ['Original', 'Compatible', 'Aftermarket'],
  otros:        [],
}

const STORAGES = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
const COLORES_COMUNES = ['BLACK', 'WHITE', 'SILVER', 'GOLD', 'BLUE', 'RED', 'PINK', 'GREEN', 'PURPLE', 'YELLOW']

const fmtUSD = (n: number) => `U$S ${n.toLocaleString('es-AR')}`
const fmtARS = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

type FormData = {
  categoria: CategoriaCodigo
  marca: string
  modelo: string
  color: string
  storage: string
  precioUSD: number
  moneda: 'USD' | 'ARS'
  stock: number
  condicion: Condicion
  smartphone: CamposSmartphone
  compatibleCon: string
}

const EMPTY_FORM: FormData = {
  categoria: 'smartphones',
  marca: 'Apple', modelo: '', color: '', storage: '',
  precioUSD: 0, moneda: 'USD', stock: 1, condicion: 'nuevo',
  smartphone: {},
  compatibleCon: '',
}

export default function InventarioPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [productos, setProductos] = useState<Producto2[]>([])
  const [dolar, setDolar] = useState<number>(1200)
  const [margenFinal, setMargenFinal] = useState(20)
  const [loading, setLoading] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaCodigo | 'todos'>('todos')
  const [condicionFiltro, setCondicionFiltro] = useState<Condicion | 'todos'>('todos')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto2 | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [showCamposExtra, setShowCamposExtra] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [prods, config, dolarData] = await Promise.all([
        getProductos2(workspaceId),
        getConfigIPhoneClub(workspaceId),
        getDolarConfig(workspaceId),
      ])
      setProductos(prods)
      setMargenFinal(config.margenFinal)
      setDolar(dolarData.valor)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    return productos
      .filter(p => categoriaFiltro === 'todos' || p.categoria === categoriaFiltro)
      .filter(p => condicionFiltro === 'todos' || p.condicion === condicionFiltro)
      .filter(p => !search || `${p.marca} ${p.modelo} ${p.color ?? ''} ${p.storage ?? ''}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo))
  }, [productos, categoriaFiltro, condicionFiltro, search])

  // Colores según modelo (solo para iPhones Apple)
  const coloresDisponibles = useMemo(() => {
    if (form.marca === 'Apple' && form.categoria === 'smartphones') {
      const cols = getColoresModelo(form.modelo)
      return cols.length > 0 ? cols : COLORES_COMUNES
    }
    return COLORES_COMUNES
  }, [form.marca, form.modelo, form.categoria])

  // Modelos según marca/categoría
  const modelosDisponibles = useMemo(() => {
    if (form.marca === 'Apple' && form.categoria === 'smartphones') {
      return MODELOS_IPHONE.map(m => m.nombre)
    }
    return []
  }, [form.marca, form.categoria])

  const esSmartphoneUsado = form.categoria === 'smartphones' && form.condicion === 'usado'
  const esRepuesto = form.categoria === 'repuestos'

  const openNew = () => {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setShowCamposExtra(false)
    setShowForm(true)
  }

  const openEdit = (p: Producto2) => {
    setEditando(p)
    setForm({
      categoria: p.categoria, marca: p.marca, modelo: p.modelo,
      color: p.color ?? '', storage: p.storage ?? '',
      precioUSD: p.precioUSD, moneda: p.moneda,
      stock: p.stock, condicion: p.condicion,
      smartphone: p.smartphone ?? {},
      compatibleCon: p.compatibleCon ?? '',
    })
    setShowCamposExtra(!!(p.smartphone && Object.keys(p.smartphone).some(k => (p.smartphone as any)[k] !== undefined)))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.marca || !form.modelo || !user) return
    setSaving(true)
    try {
      const data: Omit<Producto2, 'id' | 'createdAt' | 'updatedAt'> = {
        workspaceId,
        categoria: form.categoria,
        marca: form.marca,
        modelo: form.modelo,
        color: form.color || undefined,
        storage: form.storage || undefined,
        precioUSD: form.precioUSD,
        moneda: form.moneda,
        stock: form.stock,
        condicion: form.condicion,
        activo: true,
        creadoPor: user.uid,
        smartphone: esSmartphoneUsado ? form.smartphone : undefined,
        compatibleCon: esRepuesto ? form.compatibleCon : undefined,
      }
      if (editando) {
        await updateProducto2(workspaceId, editando.id, data)
        setProductos(prev => prev.map(p => p.id === editando.id ? { ...p, ...data } : p))
      } else {
        const id = await createProducto2(workspaceId, data)
        setProductos(prev => [...prev, { id, ...data, createdAt: new Date(), updatedAt: new Date() }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (p: Producto2) => {
    if (!confirm(`¿Eliminar ${p.marca} ${p.modelo}?`)) return
    await deleteProducto2(workspaceId, p.id)
    setProductos(prev => prev.filter(x => x.id !== p.id))
  }

  const getCatInfo = (codigo: CategoriaCodigo) => CATEGORIAS.find(c => c.codigo === codigo)!

  const imgSrc = (p: Producto2) => {
    if (p.marca === 'Apple' && p.categoria === 'smartphones') {
      return getImagenModelo(p.modelo, p.color)
    }
    return null
  }

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Inventario</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {productos.length} productos · {productos.filter(p => p.stock > 0).length} con stock
          </p>
        </div>
        <button onClick={openNew} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Filtros categoría */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        <button onClick={() => setCategoriaFiltro('todos')}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
          style={categoriaFiltro === 'todos'
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
          Todo
        </button>
        {CATEGORIAS.map(cat => {
          const count = productos.filter(p => p.categoria === cat.codigo).length
          if (count === 0) return null
          return (
            <button key={cat.codigo} onClick={() => setCategoriaFiltro(cat.codigo)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
              style={categoriaFiltro === cat.codigo
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
              {cat.emoji} {cat.label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Filtro condición + búsqueda */}
      <div className="flex gap-2">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {(['todos', 'nuevo', 'usado'] as const).map(c => (
            <button key={c} onClick={() => setCondicionFiltro(c)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize"
              style={condicionFiltro === c
                ? { background: 'var(--surface)', color: 'var(--text-primary)' }
                : { color: 'var(--text-tertiary)' }}>
              {c === 'todos' ? 'Todos' : c}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input className="input pl-8 text-sm h-full" placeholder="Buscar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {productos.length === 0 ? 'Sin productos en el inventario' : 'Sin resultados'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {productos.length === 0 ? 'Tocá + Agregar para cargar el primer producto' : 'Probá otro filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cat = getCatInfo(p.categoria)
            const img = imgSrc(p)
            return (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Imagen o emoji */}
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--surface-2)' }}>
                  {img
                    ? <img src={img} alt={p.modelo} className="w-9 h-9 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="text-xl">{cat.emoji}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {p.marca} {p.modelo}
                    </span>
                    {p.storage && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.storage}</span>}
                    {p.color && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.color}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: p.condicion === 'nuevo' ? 'var(--green-bg)' : 'var(--amber-bg)',
                        color: p.condicion === 'nuevo' ? 'var(--green)' : 'var(--amber)',
                      }}>
                      {p.condicion}
                    </span>
                    {p.smartphone?.bateria && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: p.smartphone.bateria >= 85 ? 'var(--green-bg)' : p.smartphone.bateria >= 75 ? 'var(--amber-bg)' : 'var(--red-bg)',
                          color: p.smartphone.bateria >= 85 ? 'var(--green)' : p.smartphone.bateria >= 75 ? 'var(--amber)' : 'var(--brand-light)',
                        }}>
                        🔋{p.smartphone.bateria}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: 'var(--brand-light)' }}>
                      {p.moneda === 'USD' ? fmtUSD(p.precioUSD) : fmtARS(p.precioUSD)}
                    </span>
                    {p.moneda === 'USD' && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Final: {fmtUSD(p.precioUSD + margenFinal)}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: p.stock > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: p.stock > 0 ? 'var(--green)' : 'var(--brand-light)',
                      }}>
                      {p.stock} u
                    </span>
                    {p.compatibleCon && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        compat: {p.compatibleCon}
                      </span>
                    )}
                  </div>
                  {p.smartphone?.detalles && (
                    <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--amber)' }}>
                      {p.smartphone.detalles}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    <Trash2 size={13} />
                  </button>
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
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">

              {/* Categoría */}
              <div>
                <label className="label">Categoría</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIAS.map(cat => (
                    <button key={cat.codigo}
                      onClick={() => setForm(f => ({ ...f, categoria: cat.codigo, marca: MARCAS_COMUNES[cat.codigo][0] ?? '' }))}
                      className="py-2 rounded-xl text-xs font-medium transition-all"
                      style={form.categoria === cat.codigo
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condición */}
              <div>
                <label className="label">Condición</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['nuevo', 'usado', 'reacondicionado'] as Condicion[]).map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, condicion: c }))}
                      className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                      style={form.condicion === c
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marca */}
              <div>
                <label className="label">Marca</label>
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {MARCAS_COMUNES[form.categoria].map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, marca: m }))}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={form.marca === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
                <input className="input text-sm" placeholder="O escribí la marca..."
                  value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>

              {/* Modelo */}
              <div>
                <label className="label">Modelo</label>
                {modelosDisponibles.length > 0 ? (
                  <select className="input text-sm" value={form.modelo}
                    onChange={e => setForm(f => ({ ...f, modelo: e.target.value, color: '' }))}>
                    <option value="">Seleccioná modelo...</option>
                    {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input className="input text-sm" placeholder="Ej: PS5, WH-1000XM5, Galaxy S24..."
                    value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
                )}
              </div>

              {/* Storage + Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Storage</label>
                  <div className="flex gap-1 flex-wrap">
                    {STORAGES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, storage: form.storage === s ? '' : s }))}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={form.storage === s
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Color</label>
                  <input className="input text-sm" placeholder="Ej: BLACK"
                    value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value.toUpperCase() }))} />
                  {coloresDisponibles.length > 0 && form.marca === 'Apple' && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {coloresDisponibles.slice(0, 6).map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium transition-all"
                          style={form.color === c
                            ? { background: 'var(--brand)', color: '#fff' }
                            : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Precio + Stock + Moneda */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="label">Moneda</label>
                  <div className="flex gap-1">
                    {(['USD', 'ARS'] as const).map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, moneda: m }))}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                        style={form.moneda === m
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Precio</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={form.precioUSD || ''} onChange={e => setForm(f => ({ ...f, precioUSD: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input type="number" min="0" className="input text-sm"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Compatible con (repuestos) */}
              {esRepuesto && (
                <div>
                  <label className="label">Compatible con</label>
                  <input className="input text-sm" placeholder="Ej: iPhone 13 / 14"
                    value={form.compatibleCon} onChange={e => setForm(f => ({ ...f, compatibleCon: e.target.value }))} />
                </div>
              )}

              {/* Campos extra smartphone usado */}
              {esSmartphoneUsado && (
                <div>
                  <button onClick={() => setShowCamposExtra(!showCamposExtra)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      📋 Detalle del equipo (caja, reparaciones, batería...)
                    </span>
                    <ChevronDown size={14} style={{
                      color: 'var(--text-tertiary)',
                      transform: showCamposExtra ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }} />
                  </button>

                  {showCamposExtra && (
                    <div className="mt-2 space-y-2 px-3 py-3 rounded-xl"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>

                      {/* Batería */}
                      <div>
                        <label className="label">Batería %</label>
                        <input type="number" min="0" max="100" className="input text-sm" placeholder="85"
                          value={form.smartphone.bateria ?? ''}
                          onChange={e => setForm(f => ({ ...f, smartphone: { ...f.smartphone, bateria: e.target.value ? Number(e.target.value) : undefined } }))} />
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { key: 'tieneCaja',       label: '📦 Tiene caja' },
                          { key: 'tieneAccesorios',  label: '🔌 Accesorios' },
                          { key: 'fuéReparado',      label: '🔧 Fue reparado' },
                          { key: 'cambióPantalla',   label: '📱 Cambió pantalla' },
                          { key: 'cambióBateria',    label: '🔋 Cambió batería' },
                        ] as { key: keyof CamposSmartphone; label: string }[]).map(({ key, label }) => (
                          <button key={key}
                            onClick={() => setForm(f => ({ ...f, smartphone: { ...f.smartphone, [key]: !f.smartphone[key] } }))}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                            style={(form.smartphone[key] as boolean)
                              ? { background: 'rgba(232,0,29,0.1)', border: '1px solid var(--brand)', color: 'var(--brand-light)' }
                              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: (form.smartphone[key] as boolean) ? 'var(--brand)' : 'var(--surface-3)' }}>
                              {(form.smartphone[key] as boolean) && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            <span className="text-[11px] font-medium">{label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Detalles libres */}
                      <div>
                        <label className="label">Detalles / Observaciones</label>
                        <textarea className="input text-sm resize-none" rows={2}
                          placeholder="Rayones, golpes, estado general..."
                          value={form.smartphone.detalles ?? ''}
                          onChange={e => setForm(f => ({ ...f, smartphone: { ...f.smartphone, detalles: e.target.value } }))} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave}
                disabled={!form.marca || !form.modelo || saving}
                className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar producto'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
