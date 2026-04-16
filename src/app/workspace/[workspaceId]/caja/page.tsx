'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Lock, Unlock, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import {
  getCajaHoy, getCajasMes, abrirCaja, cerrarCaja,
  getMovimientosCaja, agregarMovimientoCaja,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { CajaDia, MovimientoCaja, MovCajaTipo, MonedaCaja } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { fmtARS, fmtUSD, fmtMonto } from '@/lib/format'

const TIPOS_MOV: { id: MovCajaTipo; label: string; emoji: string; esIngreso: boolean }[] = [
  { id: 'venta',     label: 'Venta',       emoji: '🛒', esIngreso: true  },
  { id: 'seña',      label: 'Seña',        emoji: '📌', esIngreso: true  },
  { id: 'cobro_ot',  label: 'Cobro OT',    emoji: '🔧', esIngreso: true  },
  { id: 'ingreso',   label: 'Ingreso',     emoji: '💰', esIngreso: true  },
  { id: 'gasto',     label: 'Gasto',       emoji: '📤', esIngreso: false },
  { id: 'retiro',    label: 'Retiro',      emoji: '👋', esIngreso: false },
  { id: 'ajuste',    label: 'Ajuste',      emoji: '⚙️', esIngreso: true  },
]



export default function CajaPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [caja, setCaja] = useState<CajaDia | null>(null)
  const [cajasMes, setCajasMes] = useState<CajaDia[]>([])
  const [movs, setMovs] = useState<MovimientoCaja[]>([])
  const [loading, setLoading] = useState(true)

  // Modal abrir caja
  const [showAbrir, setShowAbrir] = useState(false)
  const [saldoIniUSD, setSaldoIniUSD] = useState(0)
  const [saldoIniARS, setSaldoIniARS] = useState(0)

  // Modal cerrar caja
  const [showCerrar, setShowCerrar] = useState(false)
  const [saldoCierreUSD, setSaldoCierreUSD] = useState(0)
  const [saldoCierreARS, setSaldoCierreARS] = useState(0)
  const [notasCierre, setNotasCierre] = useState('')

  // Modal nuevo movimiento
  const [showMov, setShowMov] = useState(false)
  const [movTipo, setMovTipo] = useState<MovCajaTipo>('venta')
  const [movDescripcion, setMovDescripcion] = useState('')
  const [movMonto, setMovMonto] = useState(0)
  const [movMoneda, setMovMoneda] = useState<MonedaCaja>('USD')

  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'hoy' | 'mes'>('hoy')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const [cajaData, cajasData, movsData] = await Promise.all([
        getCajaHoy(workspaceId),
        getCajasMes(workspaceId),
        getMovimientosCaja(workspaceId, hoy),
      ])
      setCaja(cajaData)
      setCajasMes(cajasData)
      setMovs(movsData)
    } finally { setLoading(false) }
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const calcTotales = (movimientos: MovimientoCaja[]) => {
    const ingUSD = movimientos.filter(m => m.esIngreso && m.moneda === 'USD').reduce((a, m) => a + m.monto, 0)
    const ingARS = movimientos.filter(m => m.esIngreso && m.moneda === 'ARS').reduce((a, m) => a + m.monto, 0)
    const egrUSD = movimientos.filter(m => !m.esIngreso && m.moneda === 'USD').reduce((a, m) => a + m.monto, 0)
    const egrARS = movimientos.filter(m => !m.esIngreso && m.moneda === 'ARS').reduce((a, m) => a + m.monto, 0)
    return { ingUSD, ingARS, egrUSD, egrARS, netUSD: ingUSD - egrUSD, netARS: ingARS - egrARS }
  }

  const totalesHoy = calcTotales(movs)

  // Totales del mes (sumando todas las cajas del mes)
  const calcTotalesMes = async () => {
    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
    const hasta = new Date().toISOString().slice(0, 10)
    const allMovs = await getMovimientosCaja(workspaceId)
    const mesMovs = allMovs.filter(m => {
      const f = toDate(m.createdAt).toISOString().slice(0, 10)
      return f >= desde && f <= hasta
    })
    return calcTotales(mesMovs)
  }

  const señasHoy = movs.filter(m => m.tipo === 'seña')
  const totalSeñasUSD = señasHoy.filter(m => m.moneda === 'USD').reduce((a, m) => a + m.monto, 0)
  const totalSeñasARS = señasHoy.filter(m => m.moneda === 'ARS').reduce((a, m) => a + m.monto, 0)

  const handleAbrir = async () => {
    if (!user) return
    setSaving(true)
    try {
      await abrirCaja(workspaceId, saldoIniUSD, saldoIniARS, user.uid)
      await load()
      setShowAbrir(false)
      setSaldoIniUSD(0); setSaldoIniARS(0)
    } finally { setSaving(false) }
  }

  const handleCerrar = async () => {
    if (!caja || !user) return
    setSaving(true)
    try {
      await cerrarCaja(workspaceId, caja.id, saldoCierreUSD, saldoCierreARS, notasCierre, user.uid)
      await load()
      setShowCerrar(false)
    } finally { setSaving(false) }
  }

  const handleAgregarMov = async () => {
    if (!movDescripcion || !movMonto || !user || !caja?.abierta) return
    setSaving(true)
    const tipoInfo = TIPOS_MOV.find(t => t.id === movTipo)!
    try {
      await agregarMovimientoCaja(workspaceId, {
        workspaceId,
        tipo: movTipo,
        descripcion: movDescripcion,
        monto: movMonto,
        moneda: movMoneda,
        esIngreso: tipoInfo.esIngreso,
        creadoPor: user.uid,
      })
      const hoy = new Date().toISOString().slice(0, 10)
      const movsActualizados = await getMovimientosCaja(workspaceId, hoy)
      setMovs(movsActualizados)
      setShowMov(false)
      setMovDescripcion(''); setMovMonto(0)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header + estado de caja */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Caja</h2>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>{hoy}</p>
        </div>
        {caja?.abierta ? (
          <div className="flex gap-2">
            <button onClick={() => { setShowMov(true) }}
              className="btn-primary gap-1 text-sm">
              <Plus size={15} /> Movimiento
            </button>
            <button onClick={() => { setSaldoCierreUSD(0); setSaldoCierreARS(0); setNotasCierre(''); setShowCerrar(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--red-bg)', color: 'var(--brand-light)', border: '1px solid rgba(232,0,29,0.3)' }}>
              <Lock size={14} /> Cerrar
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAbrir(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
            <Unlock size={14} /> Abrir caja
          </button>
        )}
      </div>

      {/* Estado de caja */}
      {!caja && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
          <AlertCircle size={18} style={{ color: 'var(--amber)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>Caja cerrada</p>
            <p className="text-xs" style={{ color: 'var(--amber)' }}>Abrí la caja para registrar movimientos</p>
          </div>
        </div>
      )}

      {caja?.abierta && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
          <Unlock size={18} style={{ color: 'var(--green)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Caja abierta</p>
            <p className="text-xs" style={{ color: 'var(--green)' }}>
              Saldo inicial: {fmtUSD(caja.saldoInicialUSD)} · {fmtARS(caja.saldoInicialARS)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs hoy / mes */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
        {(['hoy', 'mes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
            style={tab === t
              ? { background: 'var(--brand)', color: '#fff' }
              : { color: 'var(--text-tertiary)' }}>
            {t === 'hoy' ? 'Hoy' : 'Este mes'}
          </button>
        ))}
      </div>

      {tab === 'hoy' && (
        <>
          {/* Resumen del día */}
          <div className="grid grid-cols-2 gap-2">
            {/* USD */}
            <div className="px-3 py-3 rounded-2xl space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>USD</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} style={{ color: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--green)' }}>{fmtUSD(totalesHoy.ingUSD)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown size={12} style={{ color: 'var(--brand-light)' }} />
                  <span className="text-xs" style={{ color: 'var(--brand-light)' }}>{fmtUSD(totalesHoy.egrUSD)}</span>
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: totalesHoy.netUSD >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                {fmtUSD(totalesHoy.netUSD)}
              </p>
            </div>
            {/* ARS */}
            <div className="px-3 py-3 rounded-2xl space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>ARS</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} style={{ color: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--green)' }}>{fmtARS(totalesHoy.ingARS)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown size={12} style={{ color: 'var(--brand-light)' }} />
                  <span className="text-xs" style={{ color: 'var(--brand-light)' }}>{fmtARS(totalesHoy.egrARS)}</span>
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: totalesHoy.netARS >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                {fmtARS(totalesHoy.netARS)}
              </p>
            </div>
          </div>

          {/* Señas del día */}
          {señasHoy.length > 0 && (
            <div className="px-3 py-3 rounded-2xl"
              style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid var(--amber)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--amber)' }}>
                📌 Señas del día — {señasHoy.length} operación{señasHoy.length > 1 ? 'es' : ''}
              </p>
              <div className="flex gap-3">
                {totalSeñasUSD > 0 && <span className="text-sm font-bold" style={{ color: 'var(--amber)' }}>{fmtUSD(totalSeñasUSD)}</span>}
                {totalSeñasARS > 0 && <span className="text-sm font-bold" style={{ color: 'var(--amber)' }}>{fmtARS(totalSeñasARS)}</span>}
              </div>
            </div>
          )}

          {/* Movimientos del día */}
          {movs.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
                Movimientos de hoy
              </p>
              <div className="space-y-1.5">
                {movs.map(m => {
                  const tipoInfo = TIPOS_MOV.find(t => t.id === m.tipo)
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="text-lg flex-shrink-0">{tipoInfo?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.descripcion}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {tipoInfo?.label} · {format(toDate(m.createdAt), "HH:mm")}
                        </p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0"
                        style={{ color: m.esIngreso ? 'var(--green)' : 'var(--brand-light)' }}>
                        {m.esIngreso ? '+' : '-'}{fmtMonto(m.monto, m.moneda)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            caja?.abierta && (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin movimientos hoy</p>
              </div>
            )
          )}
        </>
      )}

      {tab === 'mes' && (
        <div className="space-y-2">
          {cajasMes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sin cajas registradas este mes</p>
            </div>
          ) : cajasMes.map(c => {
            const fecha = format(new Date(c.fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
            return (
              <div key={c.id} className="px-3 py-3 rounded-xl"
                style={{ background: 'var(--surface)', border: `1px solid ${c.abierta ? 'var(--green)' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{fecha}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={c.abierta
                      ? { background: 'var(--green-bg)', color: 'var(--green)' }
                      : { background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                    {c.abierta ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
                {c.saldoCierreUSD !== undefined && (
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Cierre: <strong style={{ color: 'var(--text-primary)' }}>{fmtUSD(c.saldoCierreUSD)}</strong>
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{fmtARS(c.saldoCierreARS ?? 0)}</strong>
                    </span>
                  </div>
                )}
                {c.notasCierre && (
                  <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>{c.notasCierre}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal abrir caja */}
      {showAbrir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAbrir(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Abrir caja</h3>
              <button onClick={() => setShowAbrir(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Saldo inicial USD</label>
                <input type="number" className="input text-sm" placeholder="0"
                  value={saldoIniUSD || ''} onChange={e => setSaldoIniUSD(Number(e.target.value))} autoFocus />
              </div>
              <div>
                <label className="label">Saldo inicial ARS</label>
                <input type="number" className="input text-sm" placeholder="0"
                  value={saldoIniARS || ''} onChange={e => setSaldoIniARS(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAbrir} disabled={saving} className="btn-primary flex-1 gap-2">
                <Unlock size={15} /> {saving ? 'Abriendo...' : 'Abrir caja'}
              </button>
              <button onClick={() => setShowAbrir(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cerrar caja */}
      {showCerrar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCerrar(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Cerrar caja</h3>
              <button onClick={() => setShowCerrar(false)} className="btn-icon">✕</button>
            </div>
            {/* Resumen antes de cerrar */}
            <div className="px-3 py-2.5 rounded-xl mb-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Resumen del día</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>USD neto</p>
                  <p className="text-sm font-bold" style={{ color: totalesHoy.netUSD >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                    {fmtUSD(totalesHoy.netUSD)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>ARS neto</p>
                  <p className="text-sm font-bold" style={{ color: totalesHoy.netARS >= 0 ? 'var(--green)' : 'var(--brand-light)' }}>
                    {fmtARS(totalesHoy.netARS)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Saldo físico en caja USD</label>
                <input type="number" className="input text-sm" placeholder="0"
                  value={saldoCierreUSD || ''} onChange={e => setSaldoCierreUSD(Number(e.target.value))} autoFocus />
              </div>
              <div>
                <label className="label">Saldo físico en caja ARS</label>
                <input type="number" className="input text-sm" placeholder="0"
                  value={saldoCierreARS || ''} onChange={e => setSaldoCierreARS(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Notas de cierre</label>
                <textarea className="input text-sm resize-none" rows={2} placeholder="Observaciones..."
                  value={notasCierre} onChange={e => setNotasCierre(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCerrar} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--red-bg)', color: 'var(--brand-light)', border: '1px solid rgba(232,0,29,0.3)' }}>
                <Lock size={14} className="inline mr-1.5" />
                {saving ? 'Cerrando...' : 'Cerrar caja'}
              </button>
              <button onClick={() => setShowCerrar(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo movimiento */}
      {showMov && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowMov(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo movimiento</h3>
              <button onClick={() => setShowMov(false)} className="btn-icon">✕</button>
            </div>
            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIPOS_MOV.map(t => (
                    <button key={t.id} onClick={() => setMovTipo(t.id)}
                      className="flex flex-col items-center py-2 rounded-xl transition-all"
                      style={movTipo === t.id
                        ? { background: t.esIngreso ? 'var(--green-bg)' : 'var(--red-bg)',
                            border: `1.5px solid ${t.esIngreso ? 'var(--green)' : 'var(--brand-light)'}` }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className="text-base">{t.emoji}</span>
                      <span className="text-[9px] font-semibold mt-0.5"
                        style={{ color: movTipo === t.id ? (t.esIngreso ? 'var(--green)' : 'var(--brand-light)') : 'var(--text-tertiary)' }}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Descripción */}
              <div>
                <label className="label">Descripción</label>
                <input className="input text-sm" placeholder="Ej: Venta iPhone 16, Seña Juan..."
                  value={movDescripcion} onChange={e => setMovDescripcion(e.target.value)} autoFocus />
              </div>
              {/* Monto + Moneda */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Monto</label>
                  <input type="number" className="input text-sm" placeholder="0"
                    value={movMonto || ''} onChange={e => setMovMonto(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <div className="flex gap-1.5 h-[42px] items-center">
                    {(['USD', 'ARS'] as MonedaCaja[]).map(m => (
                      <button key={m} onClick={() => setMovMoneda(m)}
                        className="flex-1 px-3 h-full rounded-xl text-sm font-bold transition-all"
                        style={movMoneda === m
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAgregarMov}
                disabled={!movDescripcion || !movMonto || saving}
                className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
              <button onClick={() => setShowMov(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
