'use client'

import { useEffect, useState } from 'react'
import { Lock, Check, Plus } from 'lucide-react'
import { getTemplates, getLicenciasUsuario, activarLicencia, createWorkspace } from '@/lib/services'
import { useAuthStore, useWorkspaceStore } from '@/store'
import type { Template, Licencia, Negocio } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  negocios: Negocio[]
}

export default function LicenciasSection({ negocios }: Props) {
  const { user } = useAuthStore()
  const { workspaces, setWorkspaces } = useWorkspaceStore()
  const router = useRouter()

  const [templates, setTemplates] = useState<Template[]>([])
  const [misLicencias, setMisLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivar, setShowActivar] = useState<Template | null>(null)
  const [codigo, setCodigo] = useState('')
  const [activando, setActivando] = useState(false)
  const [error, setError] = useState('')
  const [showCrear, setShowCrear] = useState<{ template: Template; licencia: Licencia } | null>(null)
  const [negocioSel, setNegocioSel] = useState('')
  const [nombreWs, setNombreWs] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    try {
      const [t, l] = await Promise.all([
        getTemplates(),
        user ? getLicenciasUsuario(user.uid) : Promise.resolve([]),
      ])
      setTemplates(t)
      setMisLicencias(l)
    } finally { setLoading(false) }
  }

  const tieneAcceso = (templateId: string) =>
    misLicencias.some(l => l.templateId === templateId && l.estado === 'activada')

  const handleActivar = async () => {
    if (!codigo.trim() || !user || !showActivar) return
    setActivando(true); setError('')
    try {
      const result = await activarLicencia(codigo, user.uid, user.displayName ?? 'Usuario')
      if (!result.ok) { setError(result.error ?? 'Código inválido'); return }
      setMisLicencias(prev => [...prev, result.licencia!])
      const tmpl = showActivar
      setShowActivar(null); setCodigo('')
      setNombreWs(tmpl.nombre)
      setNegocioSel(negocios[0]?.id ?? '')
      setShowCrear({ template: tmpl, licencia: result.licencia! })
    } finally { setActivando(false) }
  }

  const handleCrear = async () => {
    if (!user || !showCrear) return
    setCreando(true)
    try {
      const { template } = showCrear
      const config = {
        ...template.config,
        moduloVerisure:     template.slug === 'verisure-arg',
        moduloBroadcast:    template.slug === 'iphone-club',
        moduloRevendedores: template.slug === 'iphone-club',
      }
      const tipo = template.slug === 'verisure-arg' ? 'servicios' : 'productos'
      const nombre = nombreWs || template.nombre
      const id = await createWorkspace({
        nombre, tipo, config,
        emoji: template.emoji, color: template.color,
        negocioId: negocioSel || undefined,
        ownerId: user.uid, miembros: [user.uid],
      } as any)
      setWorkspaces([...workspaces, {
        id, nombre, tipo: tipo as any, config,
        emoji: template.emoji, color: template.color,
        negocioId: negocioSel || undefined,
        ownerId: user.uid, miembros: [user.uid],
        createdAt: new Date(), updatedAt: new Date(),
      }])
      setShowCrear(null)
      router.push(`/workspace/${id}/hoy`)
    } finally { setCreando(false) }
  }

  if (loading || templates.length === 0) return null

  const conAcceso = templates.filter(t => tieneAcceso(t.id))
  const sinAcceso = templates.filter(t => !tieneAcceso(t.id))

  return (
    <div className="space-y-2">

      {/* Licencias activas */}
      {conAcceso.map(t => (
        <div key={t.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ background: t.color + '10', border: `1px solid ${t.color}30` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: t.color + '18' }}>
            {t.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.nombre}</p>
            <p className="text-[10px]" style={{ color: 'var(--green)' }}>✅ Licencia activa</p>
          </div>
          <button
            onClick={() => { setNombreWs(t.nombre); setNegocioSel(negocios[0]?.id ?? ''); setShowCrear({ template: t, licencia: misLicencias.find(l => l.templateId === t.id)! }) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={{ background: t.color + '20', color: t.color, border: `1px solid ${t.color}40` }}>
            <Plus size={12} /> Crear área
          </button>
        </div>
      ))}

      {/* Módulos bloqueados */}
      {sinAcceso.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Módulos Premium
          </p>
          {sinAcceso.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'var(--surface-2)', opacity: 0.5 }}>
                🔒
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.nombre}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.descripcion}</p>
              </div>
              <button onClick={() => { setShowActivar(t); setCodigo(''); setError('') }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <Lock size={12} /> Activar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal activar código */}
      {showActivar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowActivar(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: showActivar.color + '18' }}>{showActivar.emoji}</div>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{showActivar.nombre}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Ingresá tu código de licencia</p>
              </div>
              <button onClick={() => setShowActivar(null)} className="btn-icon">✕</button>
            </div>
            <input className="input text-center font-mono text-base tracking-widest mb-2"
              placeholder="XXX-XXXX-XXXX" value={codigo}
              onChange={e => { setCodigo(e.target.value.toUpperCase()); setError('') }}
              autoFocus onKeyDown={e => e.key === 'Enter' && handleActivar()} />
            {error && <p className="text-sm text-center mb-2" style={{ color: 'var(--brand-light)' }}>❌ {error}</p>}
            <p className="text-[10px] text-center mb-4" style={{ color: 'var(--text-tertiary)' }}>
              ¿No tenés código? Contactá a Clozr.
            </p>
            <div className="flex gap-2">
              <button onClick={handleActivar} disabled={!codigo.trim() || activando} className="btn-primary flex-1">
                {activando ? 'Verificando...' : 'Activar'}
              </button>
              <button onClick={() => setShowActivar(null)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear workspace */}
      {showCrear && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCrear(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: showCrear.template.color + '18' }}>{showCrear.template.emoji}</div>
              <div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>✅ ¡Licencia activada!</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Creá el área para empezar</p>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="label">Nombre del área</label>
                <input className="input text-sm" placeholder={showCrear.template.nombre}
                  value={nombreWs} onChange={e => setNombreWs(e.target.value)} autoFocus />
              </div>

              {negocios.length > 0 && (
                <div>
                  <label className="label">Negocio</label>
                  <div className="space-y-1.5">
                    {negocios.map(n => (
                      <button key={n.id} onClick={() => setNegocioSel(n.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={negocioSel === n.id
                          ? { background: 'rgba(232,0,29,0.08)', border: '1.5px solid var(--brand)' }
                          : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                        <span>{n.emoji}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.nombre}</span>
                        {negocioSel === n.id && <Check size={14} className="ml-auto" style={{ color: 'var(--brand)' }} />}
                      </button>
                    ))}
                    <button onClick={() => setNegocioSel('')}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs transition-all"
                      style={negocioSel === ''
                        ? { background: 'rgba(232,0,29,0.08)', border: '1.5px solid var(--brand)', color: 'var(--text-secondary)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-tertiary)' }}>
                      Sin negocio (independiente)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleCrear} disabled={creando} className="btn-primary flex-1">
                {creando ? 'Creando...' : `Crear → ${nombreWs || showCrear.template.nombre}`}
              </button>
              <button onClick={() => setShowCrear(null)} className="btn-secondary">Después</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
