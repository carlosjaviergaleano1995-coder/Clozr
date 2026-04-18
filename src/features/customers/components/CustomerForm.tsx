'use client'

import { useTransition, useState, type FormEvent } from 'react'
import { createCustomer, updateCustomer } from '../actions'
import type { Customer, CustomerType, CustomerStatus } from '../types'
import type { ActionResult } from '@/lib/errors'

interface CustomerFormProps {
  workspaceId: string
  editingCustomer?: Customer
  // Labels dinámicos del sistema activo — el form no importa useSystemConfig
  // para mantenerse testeable sin el provider
  labels?: {
    singular?: string
    createLabel?: string
    customerTypes?: Record<string, string>
  }
  onSuccess?: (id: string) => void
  onCancel?:  () => void
}

const DEFAULT_TYPES: Record<CustomerType, string> = {
  final:       'Cliente final',
  revendedor:  'Revendedor',
  mayorista:   'Mayorista',
  empresa:     'Empresa',
}

const DEFAULT_STATES: Record<CustomerStatus, string> = {
  activo:    'Activo',
  potencial: 'Potencial',
  dormido:   'Dormido',
  inactivo:  'Inactivo',
  perdido:   'Perdido',
}

export function CustomerForm({
  workspaceId,
  editingCustomer,
  labels,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const singularLabel = labels?.singular ?? 'cliente'
  const typeLabels    = labels?.customerTypes ?? DEFAULT_TYPES

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const input = {
      nombre:    (fd.get('nombre')    as string).trim(),
      telefono:  (fd.get('telefono')  as string).trim() || undefined,
      email:     (fd.get('email')     as string).trim() || undefined,
      tipo:      fd.get('tipo')       as CustomerType,
      estado:    fd.get('estado')     as CustomerStatus,
      barrio:    (fd.get('barrio')    as string).trim() || undefined,
      notas:     (fd.get('notas')     as string).trim() || undefined,
    }

    startTransition(async () => {
      let result: ActionResult<{ id: string } | void>

      if (editingCustomer) {
        result = await updateCustomer(workspaceId, editingCustomer.id, input)
      } else {
        result = await createCustomer(workspaceId, input)
      }

      if (!result.ok) {
        if (result.fields)  setFieldErrors(result.fields)
        if (result.code === 'LIMIT_REACHED') {
          // Emite un evento global — el layout puede mostrar el modal de upgrade
          window.dispatchEvent(
            new CustomEvent('clozr:limit-reached', { detail: result }),
          )
        }
        setGlobalError(result.error)
        return
      }

      setFieldErrors({})
      setGlobalError(null)
      const id = editingCustomer
        ? editingCustomer.id
        : (result.data as { id: string }).id
      onSuccess?.(id)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {globalError && !Object.keys(fieldErrors).length && (
        <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-xl">
          {globalError}
        </div>
      )}

      {/* Nombre */}
      <div>
        <label className="label">Nombre *</label>
        <input
          name="nombre"
          className={`input text-sm ${fieldErrors.nombre ? 'border-red-500' : ''}`}
          placeholder={`Nombre del ${singularLabel}`}
          defaultValue={editingCustomer?.nombre}
          required
        />
        {fieldErrors.nombre && (
          <p className="text-xs text-red-400 mt-1">{fieldErrors.nombre}</p>
        )}
      </div>

      {/* Teléfono + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Teléfono</label>
          <input
            name="telefono"
            className="input text-sm"
            placeholder="Ej: 11-1234-5678"
            defaultValue={editingCustomer?.telefono}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            name="email"
            type="email"
            className={`input text-sm ${fieldErrors.email ? 'border-red-500' : ''}`}
            placeholder="email@ejemplo.com"
            defaultValue={editingCustomer?.email}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      {/* Tipo + Estado */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo</label>
          <select
            name="tipo"
            className="input text-sm"
            defaultValue={editingCustomer?.tipo ?? 'final'}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select
            name="estado"
            className="input text-sm"
            defaultValue={editingCustomer?.estado ?? 'potencial'}
          >
            {Object.entries(DEFAULT_STATES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Barrio */}
      <div>
        <label className="label">Barrio / Zona</label>
        <input
          name="barrio"
          className="input text-sm"
          placeholder="Ej: Palermo, La Plata centro"
          defaultValue={editingCustomer?.barrio}
        />
      </div>

      {/* Notas */}
      <div>
        <label className="label">Notas</label>
        <textarea
          name="notas"
          rows={3}
          className="input text-sm resize-none"
          placeholder="Observaciones..."
          defaultValue={editingCustomer?.notas}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex-1"
        >
          {isPending
            ? 'Guardando...'
            : editingCustomer
            ? 'Guardar cambios'
            : `Agregar ${singularLabel}`}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
