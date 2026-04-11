'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Check, Clock, ChevronRight, User } from 'lucide-react'
import { getTurnosHoy, createTurno, updateTurno, generarCodigo, createOrdenTrabajo } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Turno } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

const MOTIVOS = ['Reparación', 'Consulta', 'Presupuesto', 'Retiro de equipo', 'Compra', 'Otro']

export default function TurnosPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [motivo, setMotivo] = useState('Reparación')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      const data = await getTurnosHoy(workspaceId)
      // Ordenar: pendientes primero, después atendidos
      setTurnos(data.sort((a, b) => {
        if (a.atendido !== b.atendido) return a.atendido ? 1 : -1
        return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
      }))
    } finally { setLoading(false) }
  }

  const handleCrear = async () => {
    if (!user) return
    setSaving(true)
    try {
      const codigo = await generarCodigo(workspaceId, 'T')
      await createTurno(workspaceId, {
        codigo,
        workspaceId,
        clienteNombre: nombre || undefined,
        clienteTelefono: telefono || undefined,
        motivo: motivo || undefined,
        atendido: false,
      })
      await load()
      setShowForm(false)
      setNombre(''); setTelefono(''); setMotivo('Reparación')
    } finally { setSaving(false) }
  }

  const marcarAtendido = async (t: Turno) => {
    await updateTurno(workspaceId, t.id, { atendido: true })
    setTurnos(prev => prev.map(x => x.id === t.id ? { ...x, atendido: true } : x))
  }

  const pendientes = turnos.filter(t => !t.atendido)
  const atendidos = turnos.filter(t => t.atendido)

  if (loading) return (
    <div className="space-y-3 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Turnos de hoy</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {pendientes.length} pendientes · {atendidos.length} atendidos
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nuevo turno
        </button>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          {pendientes.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Número de turno */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg"
                style={{ background: 'rgba(232,0,29,0.1)', color: 'var(--brand)' }}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--brand-light)' }}>{t.codigo}</span>
                  {t.motivo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                      {t.motivo}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {t.clienteNombre || 'Sin nombre'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {format(toDate(t.createdAt), "HH:mm", { locale: es })}
                  {t.clienteTelefono && ` · ${t.clienteTelefono}`}
                </p>
              </div>
              <button onClick={() => marcarAtendido(t)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                <Check size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {pendientes.length === 0 && (
        <div className="text-center py-8">
          <Clock size={28} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sin turnos pendientes</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Agregá un turno cuando llegue un cliente</p>
        </div>
      )}

      {/* Atendidos */}
      {atendidos.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--text-tertiary)' }}>Atendidos hoy</p>
          <div className="space-y-1.5">
            {atendidos.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-60"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--green-bg)' }}>
                  <Check size={13} style={{ color: 'var(--green)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.codigo}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t.clienteNombre || 'Sin nombre'}
                    </span>
                    {t.motivo && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t.motivo}</span>}
                  </div>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  {format(toDate(t.createdAt), "HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nuevo turno */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo turno</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Nombre</label>
                  <input className="input text-sm" placeholder="Cliente (opcional)"
                    value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input text-sm" placeholder="221..."
                    value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Motivo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOTIVOS.map(m => (
                    <button key={m} onClick={() => setMotivo(m)}
                      className="py-2 rounded-xl text-xs font-medium transition-all"
                      style={motivo === m
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleCrear} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creando...' : `Crear turno · ${pendientes.length + 1}`}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
