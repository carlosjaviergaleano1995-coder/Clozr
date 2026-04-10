'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/services'

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
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (e: any) {
      setError('Error al iniciar con Google')
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
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
      router.push('/dashboard')
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Email inválido',
      }
      setError(msg[e.code] ?? 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-800/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-slide-up relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
            <span className="text-white font-bold text-2xl tracking-tight">C</span>
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Clozr</h1>
          <p className="text-surface-400 text-sm mt-1">La herramienta que entiende cómo vendés</p>
        </div>

        {/* Card */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-modal">
          <h2 className="text-white text-base font-semibold mb-5">
            {mode === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
          </h2>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-surface-50 text-surface-900 font-medium text-sm rounded-xl px-4 py-3 transition-all active:scale-95 disabled:opacity-50 mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-surface-800" />
            <span className="text-surface-600 text-xs">o con email</span>
            <div className="flex-1 h-px bg-surface-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vos@ejemplo.com"
                className="w-full px-3 py-2.5 text-sm bg-surface-800 border border-surface-700 rounded-xl text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm bg-surface-800 border border-surface-700 rounded-xl text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl px-4 py-3 transition-all active:scale-95 disabled:opacity-50 mt-1"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="w-full text-center text-surface-500 hover:text-surface-300 text-xs mt-4 transition-colors"
          >
            {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
          </button>
        </div>

        <p className="text-surface-600 text-xs text-center mt-4">
          Clozr · CRM para equipos de ventas
        </p>
      </div>
    </div>
  )
}
