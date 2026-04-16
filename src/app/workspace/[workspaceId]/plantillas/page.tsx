'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, Copy, Check, X, MessageCircle } from 'lucide-react'
import {
  getPlantillas, createPlantilla, updatePlantilla,
  deletePlantilla, initPlantillasVerisure,
} from '@/lib/services'
import { useAuthStore } from '@/store'
import type { PlantillaMensaje, PlantillaMomento } from '@/types'

const MOMENTOS: { id: PlantillaMomento; label: string; emoji: string }[] = [
  { id: 'primer_contacto',     label: 'Primer contacto',      emoji: '👋' },
  { id: 'presupuesto',         label: 'Presupuesto',          emoji: '💰' },
  { id: 'seguimiento',         label: 'Seguimiento',          emoji: '🔄' },
  { id: 'confirmacion_visita', label: 'Confirmación visita',  emoji: '📅' },
  { id: 'recordatorio',        label: 'Recordatorio',         emoji: '⏰' },
  { id: 'post_instalacion',    label: 'Post instalación',     emoji: '✅' },
  { id: 'cobranza',            label: 'Cobranza',             emoji: '💳' },
  { id: 'promocion',           label: 'Promoción',            emoji: '🔥' },
  { id: 'otro',                label: 'Otro',                 emoji: '📋' },
]

const VARIABLES = ['{nombre}', '{kit}', '{precio}', '{fecha}', '{hora}', '{direccion}']

// Reemplaza variables en el texto con valores de ejemplo para preview
const preview = (texto: string) =>
  texto
    .replace(/{nombre}/g, 'Juan')
    .replace(/{kit}/g, 'Kit Alto')
    .replace(/{precio}/g, '$180.000')
    .replace(/{fecha}/g, 'mañana')
    .replace(/{hora}/g, '15:00')
    .replace(/{direccion}/g, 'Av. Corrientes 1234')

export default function PlantillasPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { user } = useAuthStore()

  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<PlantillaMensaje | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  // Form
  const [fNombre, setFNombre] = useState('')
  const [fMomento, setFMomento] = useState<PlantillaMomento>('primer_contacto')
  const [fTexto, setFTexto] = useState('')

  useEffect(() => { load() }, [workspaceId])

  const load = async () => {
    try {
      await initPlantillasVerisure(workspaceId)
      const data = await getPlantillas(workspaceId)
      setPlantillas(data)
    } finally { setLoading(false) }
  }

  const abrirNueva = () => {
    setEditando(null)
    setFNombre(''); setFMomento('otro'); setFTexto('')
    setShowForm(true)
  }

  const abrirEditar = (p: PlantillaMensaje) => {
    setEditando(p)
    setFNombre(p.nombre); setFMomento(p.momento); setFTexto(p.texto)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!fNombre.trim() || !fTexto.trim() || !user) return
    setSaving(true)
    try {
      const orden = plantillas.length + 1
      if (editando) {
        await updatePlantilla(workspaceId, editando.id, { nombre: fNombre, momento: fMomento, texto: fTexto })
        setPlantillas(prev => prev.map(p => p.id === editando.id
          ? { ...p, nombre: fNombre, momento: fMomento, texto: fTexto } : p))
      } else {
        const id = await createPlantilla(workspaceId, {
          workspaceId, nombre: fNombre, momento: fMomento,
          texto: fTexto, activa: true, orden,
        })
        setPlantillas(prev => [...prev, {
          id, workspaceId, nombre: fNombre, momento: fMomento,
          texto: fTexto, activa: true, orden,
          creadoAt: new Date(), updatedAt: new Date(),
        }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (p: PlantillaMensaje) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    await deletePlantilla(workspaceId, p.id)
    setPlantillas(prev => prev.filter(x => x.id !== p.id))
  }

  const copiarTexto = (p: PlantillaMensaje) => {
    navigator.clipboard.writeText(p.texto)
    setCopied(p.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const insertarVariable = (variable: string) => {
    setFTexto(prev => prev + variable)
  }

  if (loading) return (
    <div className="space-y-2 mt-2">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in pb-4">

      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Plantillas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {plantillas.length} plantillas · tocá para copiar
          </p>
        </div>
        <button onClick={abrirNueva} className="btn-primary gap-1 text-sm">
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Variables disponibles */}
      <div className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Variables disponibles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => (
            <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded-lg"
              style={{ background: 'var(--surface)', color: 'var(--brand-light)', border: '1px solid rgba(232,0,29,0.2)' }}>
              {v}
            </span>
          ))}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Se reemplazan automáticamente al enviar desde el perfil del cliente
        </p>
      </div>

      {/* Lista agrupada por momento */}
      {MOMENTOS.map(momento => {
        const deMomento = plantillas.filter(p => p.momento === momento.id)
        if (deMomento.length === 0) return null
        return (
          <div key={momento.id}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-tertiary)' }}>
              {momento.emoji} {momento.label}
            </p>
            <div className="space-y-2">
              {deMomento.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <p className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                      {p.nombre}
                    </p>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setPreviewing(previewing === p.id ? null : p.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                        👁
                      </button>
                      <button onClick={() => copiarTexto(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          background: copied === p.id ? 'var(--green-bg)' : 'var(--surface-2)',
                          color: copied === p.id ? 'var(--green)' : 'var(--text-tertiary)',
                        }}>
                        {copied === p.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => abrirEditar(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--red-bg)', color: 'var(--brand-light)' }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  {previewing === p.id && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="px-3 py-2.5 rounded-xl text-sm whitespace-pre-wrap"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                        {preview(p.texto)}
                      </div>
                      <p className="text-[9px] mt-1 px-1" style={{ color: 'var(--text-tertiary)' }}>
                        Vista previa con valores de ejemplo
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Modal crear/editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up max-h-[92vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editando ? 'Editar plantilla' : 'Nueva plantilla'}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input text-sm" placeholder="Ej: Seguimiento día 3"
                  value={fNombre} onChange={e => setFNombre(e.target.value)} autoFocus />
              </div>

              <div>
                <label className="label">Momento</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOMENTOS.map(m => (
                    <button key={m.id} onClick={() => setFMomento(m.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                      style={fMomento === m.id
                        ? { background: 'var(--brand)', border: '1.5px solid var(--brand)' }
                        : { background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                      <span className="text-sm">{m.emoji}</span>
                      <span className="text-[11px] font-medium"
                        style={{ color: fMomento === m.id ? '#fff' : 'var(--text-secondary)' }}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Mensaje</label>
                <textarea className="input text-sm resize-none" rows={5}
                  placeholder="Escribí el mensaje... Usá {nombre}, {kit}, {precio} para variables"
                  value={fTexto} onChange={e => setFTexto(e.target.value)} />
                {/* Variables rápidas */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VARIABLES.map(v => (
                    <button key={v} onClick={() => insertarVariable(v)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg transition-all"
                      style={{ background: 'var(--surface-2)', color: 'var(--brand-light)', border: '1px solid rgba(232,0,29,0.2)' }}>
                      + {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {fTexto && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Vista previa
                  </p>
                  <div className="px-3 py-2.5 rounded-xl text-xs whitespace-pre-wrap"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {preview(fTexto)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={!fNombre.trim() || !fTexto.trim() || saving}
                className="btn-primary flex-1">
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear plantilla'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
