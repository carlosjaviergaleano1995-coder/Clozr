'use client'

// REGLA: hook solo, Client SDK + onSnapshot.
// Toda traducción de docs legacy → canónico se hace en adapters.ts
// La UI consume SIEMPRE Customer canónico.

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Customer, CustomerStatus, CustomerType } from '@/features/customers/types'
import { adaptClienteDoc } from '@/features/customers/adapters'

interface UseCustomersOptions {
  estado?:     CustomerStatus
  tipo?:       CustomerType
  search?:     string
  maxResults?: number
}

export function useCustomers(workspaceId: string, options: UseCustomersOptions = {}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<Error | null>(null)
  const [tick,      setTick]      = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    let q = query(
      collection(db, `workspaces/${workspaceId}/clientes`),
      orderBy('updatedAt', 'desc'),
      limit(options.maxResults ?? 200),
    )

    if (options.estado) q = query(q, where('estado', '==', options.estado))
    if (options.tipo)   q = query(q, where('tipo',   '==', options.tipo))

    const unsub = onSnapshot(
      q,
      snap => {
        // Adapter centraliza toda la lógica de compatibilidad
        let results = snap.docs.map(d => adaptClienteDoc(d.id, d.data()))

        if (options.search?.trim()) {
          const term = options.search.trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          results = results.filter(c =>
            c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term) ||
            c.telefono?.includes(options.search!.trim()) ||
            c.barrio?.toLowerCase().includes(term)
          )
        }

        setCustomers(results)
        setLoading(false)
      },
      err => { setError(err); setLoading(false) }
    )

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.estado, options.tipo, options.maxResults, tick])

  return { customers, loading, error, refetch }
}

export function useCustomerById(workspaceId: string, customerId: string) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!workspaceId || !customerId) { setLoading(false); return }
    const { doc, onSnapshot: snap } = require('firebase/firestore') as typeof import('firebase/firestore')
    const ref = doc(db, `workspaces/${workspaceId}/clientes/${customerId}`)
    const unsub = snap(
      ref,
      d => {
        setCustomer(d.exists() ? adaptClienteDoc(d.id, d.data()) : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [workspaceId, customerId])

  return { customer, loading }
}
