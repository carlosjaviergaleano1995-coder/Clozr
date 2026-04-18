'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { validateActivationCode, activateSystem } from '../actions'

type Step = 'input' | 'preview' | 'activating' | 'success' | 'error'

interface SystemPreview {
  systemSlug:   string
  systemNombre: string
  systemEmoji:  string
}

interface ActivateSystemFormProps {
  workspaceId: string
  onSuccess?:  (systemSlug: string) => void
}

export function ActivateSystemForm({
  workspaceId,
  onSuccess,
}: ActivateSystemFormProps) {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>('input')
  const [code,    setCode]    = useState('')
  const [preview, setPreview] = useState<SystemPreview | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Paso 1: validar el código y mostrar preview
  function handleValidate() {
    if (!code.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await validateActivationCode(code.trim())
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPreview(result.data)
      setStep('preview')
    })
  }

  // Paso 2: confirmar activación
  function handleActivate() {
    setStep('activating')

    startTransition(async () => {
      const result = await activateSystem({ workspaceId, code: code.trim() })
      if (!result.ok) {
        setError(result.error)
        setStep('error')
        return
      }
      setStep('success')
      onSuccess?.(result.data.systemSlug)
      // Reload para que el layout recargue el SystemDefinition
      setTimeout(() => router.refresh(), 1200)
    })
  }

  // ── Input step ────────────────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="space-y-4">
        <div>
          <label className="label">Código de activación</label>
          <input
            className="input text-sm font-mono uppercase tracking-widest"
            placeholder="Ej: VRS-A3F9-X2024"
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            autoFocus
            maxLength={30}
          />
          {error && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <AlertCircle size={11} />
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleValidate}
          disabled={isPending || !code.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isPending
            ? <><Loader2 size={14} className="animate-spin" /> Verificando…</>
            : <><Zap size={14} /> Verificar código</>
          }
        </button>
      </div>
    )
  }

  // ── Preview step ──────────────────────────────────────────────────────────
  if (step === 'preview' && preview) {
    return (
      <div className="space-y-5">
        {/* Vista previa del sistema */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-3">{preview.systemEmoji}</div>
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {preview.systemNombre}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Sistema verificado y listo para activar
          </p>
        </div>

        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Al activar, este negocio quedará configurado para{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {preview.systemNombre}
          </strong>
          . El menú, las herramientas y los cálculos cambiarán automáticamente.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleActivate}
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Activando…</>
              : <><Zap size={14} /> Activar sistema</>
            }
          </button>
          <button
            onClick={() => { setStep('input'); setPreview(null) }}
            disabled={isPending}
            className="btn-secondary"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ── Activating step ───────────────────────────────────────────────────────
  if (step === 'activating') {
    return (
      <div className="text-center py-8 space-y-3">
        <Loader2 size={32} className="animate-spin mx-auto" style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Configurando tu sistema…
        </p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Esto tarda unos segundos
        </p>
      </div>
    )
  }

  // ── Success step ──────────────────────────────────────────────────────────
  if (step === 'success' && preview) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle size={40} className="mx-auto" style={{ color: '#4ade80' }} />
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {preview.systemEmoji} {preview.systemNombre} activado
        </p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Tu negocio está listo. Recargando…
        </p>
      </div>
    )
  }

  // ── Error step ────────────────────────────────────────────────────────────
  return (
    <div className="text-center py-8 space-y-4">
      <AlertCircle size={36} className="mx-auto text-red-400" />
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {error ?? 'Error al activar el sistema'}
      </p>
      <button
        onClick={() => { setStep('input'); setError(null) }}
        className="btn-secondary mx-auto"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
