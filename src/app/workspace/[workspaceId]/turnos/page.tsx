'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Search, Clock, Check } from 'lucide-react'
import { getTurnosHistorial } from '@/lib/services'
import type { Turno } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'
import { useWorkspaceStore } from '@/store'

const MOTIVOS_LABEL: Record<string, string> = {
  compra: '📱 Compra', plan_canje: '💱 Plan canje', reparacion: '🔧 Reparación',
  consulta: '🛒 Consulta', presupuesto: '📋 Presupuesto', retiro: '👋 Retiro',
  visita: '🏠 Visita', instalacion: '🔧 Instalación',
  seguimiento: '🔄 Seguimiento', cobranza: '💰 Cobranza', otro: '📌 Otro',
}

export default function TurnosPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { workspaces } = useWorkspaceStore()
  const ws = workspaces.find(w => w.id === workspaceId)
  const isVerisure = ws?.config?.moduloVerisure === true

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try { setTurnos(await getTurnosHistorial(workspaceId)) }
    finally { setLoading(false) }
  }

  const filtered = turnos.filter(t =>
    !search ||
    (t.clienteNombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.codigo ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const porMes = useMemo(() => {
    const groups: Record<string, Turno[]> = {}
    filtered.forEach(t => {
      const fecha = t.esAgendado && t.fechaHora ? toDate(t.fechaHora) : toDate(t.createdAt)
      const key = format(fecha, "MMMM yyyy", { locale: es })
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups)
  }, [filtered])

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in pb-4">
      <div className="pt-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isVerisure ? 'Historial de visitas' : 'Historial de turnos'}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {turnos.length} {isVerisure ? 'visitas' : 'turnos'} anteriores
        </p>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input className="input pl-8 text-sm" placeholder="Buscar por nombre o código..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {porMes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {turnos.length === 0 ? 'Sin historial todavía' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {porMes.map(([mes, items]) => (
            <div key={mes}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1 capitalize"
                style={{ color: 'var(--text-tertiary)' }}>
                {mes} · {items.length}
              </p>
              <div className="space-y-1.5">
                {items.map(t => {
                  const fecha = t.esAgendado && t.fechaHora ? toDate(t.fechaHora) : toDate(t.createdAt)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: t.atendido ? 'var(--green-bg)' : 'var(--surface-2)',
                          color: t.atendido ? 'var(--green)' : 'var(--text-tertiary)',
                        }}>
                        {t.atendido ? <Check size={14} /> : <Clock size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {t.clienteNombre || 'Sin nombre'}
                          </span>
                          {t.codigo && <span className="text-[9px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{t.codigo}</span>}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {format(fecha, t.esAgendado ? "d MMM · HH:mm" : "d MMM", { locale: es })}
                          {t.motivo && ` · ${MOTIVOS_LABEL[t.motivo] ?? t.motivo}`}
                        </p>
                        {t.notas && <p className="text-[10px] italic mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.notas}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
