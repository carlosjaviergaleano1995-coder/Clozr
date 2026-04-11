'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/services'
import { ClozrLogo } from '@/components/ClozrLogo'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (e: any) {
      if (e.message === 'popup-blocked') {
        setError('El popup fue bloqueado. Habilitá los popups para este sitio en tu navegador.')
      } else if (e.message !== 'popup-closed') {
        setError('Error al iniciar con Google. Intentá con email y contraseña.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completá todos los campos'); return }
    try {
      setLoading(true)
      if (mode === 'login') await signInWithEmail(email, password)
      else await signUpWithEmail(email, password)
      router.push('/dashboard')
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':     'Usuario no encontrado',
        'auth/wrong-password':     'Contraseña incorrecta',
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/weak-password':      'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email':      'Email inválido',
        'auth/invalid-credential': 'Email o contraseña incorrectos',
      }
      setError(msg[e.code] ?? 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Glow de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #E8001D 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="w-full max-w-sm animate-slide-up relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: '#141414', border: '1px solid #2a2a2e', boxShadow: '0 4px 24px rgba(232,0,29,0.2)' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <path d="M78 18 L82 18 L82 25 L45 65 L48 65 L82 65 L82 82 L18 82 L18 75 L55 35 L52 35 L18 35 L18 18 Z" fill="#E8001D"/>
            </svg>
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="text-3xl font-bold tracking-tight" style={{ color: '#f5f5f5' }}>clo</span>
            <span className="text-3xl font-bold tracking-tight" style={{ color: '#E8001D' }}>Z</span>
            <span className="text-3xl font-bold tracking-tight" style={{ color: '#f5f5f5' }}>r</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>La herramienta que entiende cómo vendés</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
          </h2>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-medium text-sm rounded-xl px-4 py-3 transition-all active:scale-95 disabled:opacity-50 mb-4"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>o con email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vos@ejemplo.com" className="input" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input" />
            </div>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2.5" style={{ background: 'var(--red-bg)', color: '#ff6b6b', border: '1px solid rgba(232,0,29,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-semibold text-sm rounded-xl px-4 py-3 transition-all active:scale-95 disabled:opacity-50 mt-1"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="w-full text-center text-xs mt-4 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}>
            {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
          </button>
        </div>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-tertiary)' }}>
          Clozr · CRM para equipos de ventas
        </p>
      </div>
    </div>
  )
}
