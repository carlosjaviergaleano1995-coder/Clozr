'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, X, Check, RefreshCw, Shield, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { useAuthStore } from '@/store'
import {
  getTemplates, createTemplate, updateTemplate,
  getLicencias, crearLicencia, revocarLicencia,
} from '@/lib/services'
import { TEMPLATE_VERISURE, TEMPLATE_IPHONE_CLUB } from '@/lib/templates-seed'
import type { Template, Licencia } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toDate } from '@/lib/services'

// UID del admin — solo vos podés entrar
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID ?? ''

const ESTADO_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  disponible: { color: 'var(--amber)',       bg: 'var(--amber-bg)',  label: 'Sin activar' },
  activada:   { color: 'var(--green)',        bg: 'var(--green-bg)', label: 'Activada' },
  revocada:   { color: 'var(--brand-light)',  bg: 'var(--red-bg)',   label: 'Revocada' },
  vencida:    { color: 'var(--text-tertiary)',bg: 'var(--surface-2)',label: 'Vencida' },
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()

  const [templates, setTemplates] = useState<Template[]>([])
  const [licencias, setLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [cantGenerar, setCantGenerar] = useState(1)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth'); return }
    if (user.uid !== ADMIN_UID) { router.push('/dashboard'); return }
    load()
  }, [user, authLoading])

  const load = async () => {
    try {
      const [t, l] = await Promise.all([getTemplates(), getLicencias()])
      setTemplates(t)
      setLicencias(l)
      if (t.length > 0) setSelectedTemplate(t[0])
    } finally { setLoading(false) }
  }

  const seedTemplates = async () => {
    if (!user) return
    setSaving(true)
    try {
      for (const tmpl of [TEMPLATE_VERISURE, TEMPLATE_IPHONE_CLUB]) {
        const existe = templates.find(t => t.slug === tmpl.slug)
        if (!existe) await createTemplate(tmpl)
      }
      await load()
    } finally { setSaving(false) }
  }

  const handleGenerarLicencias = async () => {
    if (!selectedTemplate || !user) return
    setSaving(true)
    try {
      const nuevas: Licencia[] = []
      for (let i = 0; i < cantGenerar; i++) {
        const l = await crearLicencia(selectedTemplate.id, selectedTemplate.slug, user.uid, notas || undefined)
        nuevas.push(l)
      }
      setLicencias(prev => [...nuevas, ...prev])
      setNotas('')
      setCantGenerar(1)
      // Expandir el template para ver los nuevos
      setExpandedTemplates(prev => new Set(Array.from(prev).concat(selectedTemplate.id)))
    } finally { setSaving(false) }
  }

  const handleRevocar = async (l: Licencia) => {
    if (!confirm(`¿Revocar licencia ${l.codigo}?`)) return
    await revocarLicencia(l.id)
    setLicencias(prev => prev.map(x => x.id === l.id ? { ...x, estado: 'revocada' } : x))
  }

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopied(texto)
    setTimeout(() => setCopied(null), 2000)
  }

  const licsDe = (templateId: string) => {
    let l = licencias.filter(l => l.templateId === templateId)
    if (filtroEstado !== 'todos') l = l.filter(x => x.estado === filtroEstado)
    return l.sort((a, b) => toDate(b.creadaEl).getTime() - toDate(a.creadaEl).getTime())
  }

  const toggleExpand = (id: string) => {
    setExpandedTemplates(prev => {
      const arr = Array.from(prev)
      return new Set(prev.has(id) ? arr.filter(x => x !== id) : [...arr, id])
    })
  }

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={20} style={{ color: 'var(--brand)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Clozr Admin
              </h1>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Panel de licencias y templates
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
            ← Dashboard
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Templates', value: templates.length, color: 'var(--blue)' },
            { label: 'Licencias activas', value: licencias.filter(l => l.estado === 'activada').length, color: 'var(--green)' },
            { label: 'Sin activar', value: licencias.filter(l => l.estado === 'disponible').length, color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} className="px-3 py-3 rounded-2xl text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Inicializar templates si no existen */}
        {templates.length === 0 && (
          <div className="px-4 py-4 rounded-2xl mb-6"
            style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--amber)' }}>
              ⚠️ No hay templates creados
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--amber)' }}>
              Creá los templates oficiales de Clozr para poder generar licencias.
            </p>
            <button onClick={seedTemplates} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--amber)', color: 'white' }}>
              <Upload size={15} />
              {saving ? 'Creando...' : 'Crear templates oficiales'}
            </button>
          </div>
        )}

        {/* Panel de generación */}
        {templates.length > 0 && (
          <div className="px-4 py-4 rounded-2xl mb-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Generar licencias
            </p>

            {/* Selector de template */}
            <div className="space-y-1.5 mb-3">
              {templates.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={selectedTemplate?.id === t.id
                    ? { background: t.color + '15', border: `1.5px solid ${t.color}` }
                    : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                  <span className="text-xl">{t.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.nombre}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {licencias.filter(l => l.templateId === t.id && l.estado === 'activada').length} activadas ·{' '}
                      {licencias.filter(l => l.templateId === t.id && l.estado === 'disponible').length} disponibles
                    </p>
                  </div>
                  {selectedTemplate?.id === t.id && <Check size={16} style={{ color: t.color }} />}
                </button>
              ))}
            </div>

            {/* Cantidad y notas */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="label">Cantidad</label>
                <input type="number" min="1" max="50" className="input text-sm"
                  value={cantGenerar} onChange={e => setCantGenerar(Math.min(50, Math.max(1, Number(e.target.value))))} />
              </div>
              <div>
                <label className="label">Notas internas</label>
                <input className="input text-sm" placeholder="Ej: Equipo Bs As"
                  value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>

            <button onClick={handleGenerarLicencias} disabled={!selectedTemplate || saving}
              className="btn-primary w-full gap-2">
              <Plus size={16} />
              {saving ? 'Generando...' : `Generar ${cantGenerar} código${cantGenerar > 1 ? 's' : ''} ${selectedTemplate ? `— ${selectedTemplate.nombre}` : ''}`}
            </button>
          </div>
        )}

        {/* Lista de licencias por template */}
        {templates.map(t => {
          const lics = licsDe(t.id)
          const isExpanded = expandedTemplates.has(t.id)
          const totalActivas = licencias.filter(l => l.templateId === t.id && l.estado === 'activada').length
          const totalDisp = licencias.filter(l => l.templateId === t.id && l.estado === 'disponible').length

          return (
            <div key={t.id} className="mb-4 rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}>

              {/* Header template */}
              <button onClick={() => toggleExpand(t.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5"
                style={{ background: 'var(--surface)' }}>
                <span className="text-xl">{t.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.nombre}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    <span style={{ color: 'var(--green)' }}>{totalActivas} activas</span>
                    {' · '}
                    <span style={{ color: 'var(--amber)' }}>{totalDisp} disponibles</span>
                    {' · '}
                    {licencias.filter(l => l.templateId === t.id).length} total
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
              </button>

              {isExpanded && (
                <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                  {/* Filtro */}
                  <div className="flex gap-1 p-2">
                    {['todos', 'disponible', 'activada', 'revocada'].map(f => (
                      <button key={f} onClick={() => setFiltroEstado(f)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                        style={filtroEstado === f
                          ? { background: 'var(--brand)', color: '#fff' }
                          : { background: 'var(--surface)', color: 'var(--text-tertiary)' }}>
                        {f === 'todos' ? 'Todos' : ESTADO_COLORS[f]?.label ?? f}
                      </button>
                    ))}
                  </div>

                  {lics.length === 0 ? (
                    <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
                      Sin licencias {filtroEstado !== 'todos' ? `con estado "${filtroEstado}"` : ''}
                    </p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {lics.map(l => {
                        const estadoInfo = ESTADO_COLORS[l.estado]
                        const isCopied = copied === l.codigo
                        return (
                          <div key={l.id} className="flex items-center gap-3 px-4 py-3"
                            style={{ background: 'var(--surface)' }}>
                            {/* Código */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold"
                                  style={{ color: 'var(--text-primary)' }}>
                                  {l.codigo}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                  style={{ background: estadoInfo.bg, color: estadoInfo.color }}>
                                  {estadoInfo.label}
                                </span>
                              </div>
                              {l.estado === 'activada' && l.activadaNombre && (
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                  {l.activadaNombre}
                                  {l.activadaEl && ` · ${format(toDate(l.activadaEl), "d MMM yyyy", { locale: es })}`}
                                </p>
                              )}
                              {l.notas && (
                                <p className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
                                  {l.notas}
                                </p>
                              )}
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => copiar(l.codigo)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                style={{
                                  background: isCopied ? 'var(--green-bg)' : 'var(--surface-2)',
                                  color: isCopied ? 'var(--green)' : 'var(--text-tertiary)',
                                }}>
                                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                              {l.estado !== 'revocada' && (
                                <button onClick={() => handleRevocar(l)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                                  style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
