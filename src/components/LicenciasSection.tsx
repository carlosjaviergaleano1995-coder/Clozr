'use client'

import { useEffect, useState } from 'react'
import { Lock, Unlock, Check, ChevronRight, X } from 'lucide-react'
import { getTemplates, getLicenciasUsuario, activarLicencia } from '@/lib/services'
import { useAuthStore } from '@/store'
import type { Template, Licencia } from '@/types'

interface Props {
  onTemplateActivado?: (template: Template, licencia: Licencia) => void
}

export default function LicenciasSection({ onTemplateActivado }: Props) {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<Template[]>([])
  const [misLicencias, setMisLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showActivar, setShowActivar] = useState<Template | null>(null)
  const [codigo, setCodigo] = useState('')
  const [activando, setActivando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

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
      const result = await activarLicencia(codigo, user.uid, user.displayName ?? user.email ?? 'Usuario')
      if (!result.ok) { setError(result.error ?? 'Error desconocido'); return }
      setExito(true)
      setMisLicencias(prev => [...prev, result.licencia!])
      setTimeout(() => {
        setShowActivar(null); setCodigo(''); setExito(false)
        if (result.licencia) onTemplateActivado?.(showActivar, result.licencia)
      }, 1500)
    } finally { setActivando(false) }
  }

  if (loading || templates.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2.5 px-1"
        style={{ color: 'var(--text-tertiary)' }}>
        Módulos Premium
      </p>

      <div className="space-y-2">
        {templates.map(t => {
          const activo = tieneAcceso(t.id)
          return (
            <div key={t.id}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
              style={{
                background: activo ? t.color + '10' : 'var(--surface)',
                border: `1px solid ${activo ? t.color + '40' : 'var(--border)'}`,
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: t.color + '18' }}>
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.nombre}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {activo ? '✅ Licencia activa' : t.descripcion}
                </p>
              </div>
              {activo ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                    Activo
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              ) : (
                <button onClick={() => { setShowActivar(t); setCodigo(''); setError('') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <Lock size={12} /> Activar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal activar */}
      {showActivar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowActivar(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {exito ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--green-bg)' }}>
                  <Check size={28} style={{ color: 'var(--green)' }} />
                </div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>¡Activado!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {showActivar.nombre} está disponible
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: showActivar.color + '18' }}>
                      {showActivar.emoji}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{showActivar.nombre}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Ingresá tu código de licencia</p>
                    </div>
                  </div>
                  <button onClick={() => setShowActivar(null)} className="btn-icon">✕</button>
                </div>

                <div className="space-y-3">
                  <input
                    className="input text-center font-mono text-base tracking-widest"
                    placeholder="XXX-XXXX-XXXX"
                    value={codigo}
                    onChange={e => { setCodigo(e.target.value.toUpperCase()); setError('') }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleActivar()}
                  />
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'var(--red-bg)', border: '1px solid rgba(232,0,29,0.3)' }}>
                      <X size={14} style={{ color: 'var(--brand-light)' }} />
                      <p className="text-sm" style={{ color: 'var(--brand-light)' }}>{error}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                    ¿No tenés un código? Contactá a tu administrador o a Clozr.
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={handleActivar}
                    disabled={!codigo.trim() || activando}
                    className="btn-primary flex-1 gap-2">
                    <Unlock size={15} />
                    {activando ? 'Verificando...' : 'Activar licencia'}
                  </button>
                  <button onClick={() => setShowActivar(null)} className="btn-secondary">Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
