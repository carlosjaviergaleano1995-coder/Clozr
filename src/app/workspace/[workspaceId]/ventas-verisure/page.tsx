'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { getVentas, createVenta, getClientes, getConfigVerisure } from '@/lib/services'
import { CONFIG_VERISURE_DEFAULT } from '@/lib/verisure-defaults'
import { useAuthStore } from '@/store'
import { useMemberRole } from '@/hooks/useMemberRole'
import type { Cliente, ConfigVerisure } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { fmtARS } from '@/lib/format'

// Nivel de extras: 'alto' | 'bajo'
type NivelExtras = 'alto' | 'bajo'
type ExtraSeleccionado = { dispId: string; nombre: string; cantidadIdx: number; comision: number }

export default function VentasVerisurePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()
  const { isVendedor } = useMemberRole(workspaceId)
  const canEdit = isVendedor

  const [ventas, setVentas] = useState<any[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [config, setConfig] = useState<ConfigVerisure>(CONFIG_VERISURE_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [tipoVenta, setTipoVenta] = useState<'RP' | 'RE'>('RP')
  const [nivelKit, setNivelKit] = useState<string>('alto')
  const [upgrade, setUpgrade] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [extras, setExtras] = useState<ExtraSeleccionado[]>([])
  const [nivelExtras, setNivelExtras] = useState<NivelExtras>('alto')
  const [notas, setNotas] = useState('')
  const [showExtras, setShowExtras] = useState(false)

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const [v, c, cfg] = await Promise.all([
        getVentas(workspaceId),
        getClientes(workspaceId),
        getConfigVerisure(workspaceId),
      ])
      setVentas(v.sort((a: any, b: any) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()))
      setClientes(c)
      if (cfg) setConfig(cfg)
    } finally { setLoading(false) }
  }

  // ── Kits desde config ────────────────────────────────────────────────────────
  const KITS_CONFIG = [
    { id: 'catalogo', label: 'Catálogo',     re: config.comisiones.catalogo_RE, rp: config.comisiones.catalogo_RP },
    { id: 'alto',     label: 'Alto',         re: config.comisiones.alto_RE,     rp: config.comisiones.alto_RP     },
    { id: 'medio',    label: 'Medio',        re: config.comisiones.medio_RE,    rp: config.comisiones.medio_RP    },
    { id: 'bajo',     label: 'Bajo',         re: config.comisiones.bajo_RE,     rp: config.comisiones.bajo_RP     },
    { id: 'jefe',     label: 'Jefe',         re: 0,                             rp: 0                             },
    { id: 'gerente',  label: 'Gerente',      re: 0,                             rp: 0                             },
  ]

  const kitSel = KITS_CONFIG.find(k => k.id === nivelKit) ?? KITS_CONFIG[1]
  const comisionKit = tipoVenta === 'RP' ? kitSel.rp : kitSel.re

  // ── Extras desde config.dispositivos ─────────────────────────────────────────
  const dispositivosNivel = config.dispositivos.filter(
    d => d.nivel === nivelExtras || d.nivel === 'ambos'
  )
  // Un dispositivo por nombre (colapsamos alto/bajo en uno)
  const nombresExtras = dispositivosNivel
    .map(d => d.nombre)
    .filter((n, i, arr) => arr.indexOf(n) === i)

  const comisionExtras = extras.reduce((s, e) => s + e.comision, 0)
  const totalComision = comisionKit + comisionExtras

  const toggleExtra = (dispId: string, nombre: string, cantidadIdx: number, comision: number) => {
    setExtras(prev => {
      const yaIdx = prev.findIndex(e => e.dispId === dispId)
      if (yaIdx >= 0) {
        // mismo idx → quitar; distinto → actualizar
        if (prev[yaIdx].cantidadIdx === cantidadIdx) return prev.filter(e => e.dispId !== dispId)
        const nuevo = [...prev]
        nuevo[yaIdx] = { dispId, nombre, cantidadIdx, comision }
        return nuevo
      }
      return [...prev, { dispId, nombre, cantidadIdx, comision }]
    })
  }

  const handleGuardar = async () => {
    if (!nivelKit || !user) return
    setSaving(true)
    try {
      const extrasLabel = extras.map(e => {
        const disp = config.dispositivos.find(d => d.id === e.dispId)
        return disp ? `${e.nombre} x${disp.cantidades[e.cantidadIdx]}` : e.nombre
      }).join(', ')

      const descripcion = `${kitSel.label}${upgrade ? ' + Upgrade' : ''}${extrasLabel ? ' · ' + extrasLabel : ''}`

      await createVenta(workspaceId, {
        workspaceId,
        clienteId: '',
        clienteNombre: clienteNombre || 'Sin nombre',
        items: [{
          productoId: nivelKit,
          nombre: descripcion,
          cantidad: 1,
          precioUnitario: totalComision,
          descuento: 0,
        }],
        subtotal: totalComision,
        total: totalComision,
        moneda: 'ARS',
        formaPago: tipoVenta,
        estado: 'completada',
        notas: notas || undefined,
        creadoPor: user.uid,
      } as any)

      await load()
      setShowForm(false)
      setClienteNombre(''); setExtras([]); setNotas('')
      setNivelKit('alto'); setTipoVenta('RP'); setUpgrade(false)
    } finally { setSaving(false) }
  }

  // Métricas
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const ventasMes = ventas.filter((v: any) => toDate(v.createdAt) >= inicioMes)
  const ventasRP = ventasMes.filter((v: any) => v.formaPago === 'RP')
  const ventasRE = ventasMes.filter((v: any) => v.formaPago === 'RE')
  const totalMes = ventasMes.reduce((s: number, v: any) => s + (v.total ?? 0), 0)

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ventas Verisure
          </h2>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>
            {format(ahora, 'MMMM yyyy', { locale: es })} · {ventasMes.length} ventas
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1 text-sm">
            <Plus size={15} /> Registrar
          </button>
        )}
      </div>

      {/* Métricas del mes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'RP', value: ventasRP.length, color: 'var(--brand-light)' },
          { label: 'RE', value: ventasRE.length, color: 'var(--blue)' },
          { label: 'Total', value: ventasMes.length, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="px-3 py-3 rounded-2xl text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {totalMes > 0 && (
        <div className="px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--green)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Comisiones del mes</p>
          <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--green)' }}>{fmtARS(totalMes)}</p>
        </div>
      )}

      {/* Historial */}
      {ventas.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin ventas registradas</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Registrá tu primera venta para ver el historial
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.slice(0, 30).map((v: any) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={v.formaPago === 'RP'
                  ? { background: 'var(--red-bg)', color: 'var(--brand-light)' }
                  : { background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                {v.formaPago}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {v.clienteNombre}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {v.items?.[0]?.nombre ?? '—'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                  {fmtARS(v.total)}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {format(toDate(v.createdAt), "d MMM", { locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva venta Verisure</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-4">

              {/* RP / RE */}
              <div>
                <label className="label">Tipo de venta</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'RP' as const, label: 'RP', desc: 'Recurso Propio',  color: 'var(--brand)' },
                    { id: 'RE' as const, label: 'RE', desc: 'Recurso Empresa', color: 'var(--blue)'  },
                  ]).map(t => (
                    <button key={t.id} onClick={() => setTipoVenta(t.id)}
                      className="py-3 rounded-2xl text-center transition-all"
                      style={tipoVenta === t.id
                        ? { background: t.color + '18', border: `2px solid ${t.color}` }
                        : { background: 'var(--surface-2)', border: '2px solid transparent' }}>
                      <p className="text-lg font-bold" style={{ color: tipoVenta === t.id ? t.color : 'var(--text-primary)' }}>
                        {t.label}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="label">Cliente</label>
                <input className="input text-sm" placeholder="Nombre del cliente"
                  value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                  list="clientes-vv" autoFocus />
                <datalist id="clientes-vv">
                  {clientes.map(c => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </div>

              {/* Kit — desde config */}
              <div>
                <label className="label">Kit</label>
                <div className="space-y-1.5">
                  {KITS_CONFIG.map(k => {
                    const com = tipoVenta === 'RP' ? k.rp : k.re
                    return (
                      <button key={k.id} onClick={() => setNivelKit(k.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                        style={nivelKit === k.id
                          ? { background: 'rgba(232,0,29,0.08)', border: '1.5px solid var(--brand)' }
                          : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {k.label}
                        </span>
                        <span className="text-sm font-bold"
                          style={{ color: nivelKit === k.id ? 'var(--brand-light)' : 'var(--text-tertiary)' }}>
                          {fmtARS(com)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Upgrade toggle */}
              <button onClick={() => setUpgrade(!upgrade)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                style={upgrade
                  ? { background: 'var(--amber-bg)', border: '1px solid var(--amber)' }
                  : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-medium" style={{ color: upgrade ? 'var(--amber)' : 'var(--text-primary)' }}>
                  ⬆️ Con upgrade
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  +{fmtARS(config.upgrades.catalogo)} ref
                </span>
              </button>

              {/* Extras — desde config.dispositivos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setShowExtras(!showExtras)}
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: 'var(--text-secondary)' }}>
                    Dispositivos extras {extras.length > 0 ? `(${extras.length})` : ''}
                    {showExtras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <div className="flex gap-1">
                    {(['alto', 'bajo'] as const).map(n => (
                      <button key={n} onClick={() => setNivelExtras(n)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
                        style={nivelExtras === n
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                        {n === 'alto' ? 'Alto' : 'Bajo'}
                      </button>
                    ))}
                  </div>
                </div>

                {showExtras && (
                  <div className="space-y-3">
                    {nombresExtras.map(nombre => {
                      const disp = dispositivosNivel.find(d => d.nombre === nombre)
                      if (!disp) return null
                      const seleccionado = extras.find(e => e.dispId === disp.id)
                      return (
                        <div key={disp.id} className="px-3 py-2.5 rounded-xl"
                          style={{ background: 'var(--surface-2)', border: `1px solid ${seleccionado ? 'var(--brand)' : 'var(--border)'}` }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold" style={{ color: seleccionado ? 'var(--brand-light)' : 'var(--text-secondary)' }}>
                              {nombre}
                            </p>
                            {seleccionado && (
                              <button onClick={() => setExtras(prev => prev.filter(e => e.dispId !== disp.id))}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                                quitar
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {disp.cantidades.map((cant, idx) => {
                              const isSelected = seleccionado?.cantidadIdx === idx
                              return (
                                <button key={cant}
                                  onClick={() => toggleExtra(disp.id, nombre, idx, disp.comisiones[idx])}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all"
                                  style={isSelected
                                    ? { background: 'var(--brand)', color: '#fff' }
                                    : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                  x{cant} · {fmtARS(disp.comisiones[idx])}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Total comisión */}
              <div className="px-3 py-3 rounded-xl"
                style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
                    Comisión estimada
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--green)' }}>
                    {fmtARS(totalComision)}
                  </span>
                </div>
                {(extras.length > 0 || upgrade) && (
                  <div className="mt-2 space-y-1 pt-2" style={{ borderTop: '1px solid rgba(48,209,88,0.2)' }}>
                    <div className="flex justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Kit {kitSel.label} ({tipoVenta})
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {fmtARS(comisionKit)}
                      </span>
                    </div>
                    {extras.map(e => {
                      const disp = config.dispositivos.find(d => d.id === e.dispId)
                      return (
                        <div key={e.dispId} className="flex justify-between">
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {e.nombre} x{disp?.cantidades[e.cantidadIdx] ?? '?'}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {fmtARS(e.comision)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Observaciones, dirección..."
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleGuardar} disabled={!nivelKit || saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : `Registrar ${tipoVenta} · ${fmtARS(totalComision)}`}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
