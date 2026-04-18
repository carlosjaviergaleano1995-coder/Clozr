'use client'

// ── REGLA ─────────────────────────────────────────────────────────────────────
// Este hook usa Client SDK + onSnapshot para tiempo real.
// NUNCA usa Admin SDK ni importa desde server/.
// Para lectura server-side (Server Components, SSR): usar features/customers/queries.ts

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Customer, CustomerStatus, CustomerType } from '@/features/customers/types'

interface UseCustomersOptions {
  estado?:    CustomerStatus
  tipo?:      CustomerType
  search?:    string    // filtrado local — no query extra
  maxResults?: number
}

interface UseCustomersReturn {
  customers: Customer[]
  loading:   boolean
  error:     Error | null
  refetch:   () => void  // fuerza una nueva suscripción
}

export function useCustomers(
  workspaceId: string,
  options: UseCustomersOptions = {},
): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<Error | null>(null)
  const [tick,      setTick]      = useState(0)  // para refetch manual

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let q = query(
      collection(db, `workspaces/${workspaceId}/customers`),
      orderBy('updatedAt', 'desc'),
      limit(options.maxResults ?? 200),
    )

    if (options.estado) {
      q = query(q, where('estado', '==', options.estado))
    }
    if (options.tipo) {
      q = query(q, where('tipo', '==', options.tipo))
    }

    const unsub: Unsubscribe = onSnapshot(
      q,
      snap => {
        let results = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
          updatedAt: d.data().updatedAt?.toDate(),
          lastInteractionAt: d.data().lastInteractionAt?.toDate() ?? undefined,
        } as Customer))

        // Filtrado local por texto libre — evita reads extra en Firestore
        if (options.search?.trim()) {
          const term = options.search
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          results = results.filter(c =>
            c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term) ||
            c.telefono?.includes(term) ||
            c.barrio?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term),
          )
        }

        setCustomers(results)
        setLoading(false)
      },
      err => {
        setError(err)
        setLoading(false)
      },
    )

    return unsub  // cleanup: cancela la suscripción

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, options.estado, options.tipo, options.maxResults, tick])

  // search no va en el dep array — se filtra localmente sin reabrir el stream
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = options.search
    ? customers.filter(c => {
        const term = options.search!.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        return (
          c.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term) ||
          c.telefono?.includes(options.search!.trim()) ||
          c.barrio?.toLowerCase().includes(term)
        )
      })
    : customers

  return { customers: filtered, loading, error, refetch }
}

// ── useCustomerById ───────────────────────────────────────────────────────────

interface UseCustomerReturn {
  customer: Customer | null
  loading:  boolean
  error:    Error | null
}

export function useCustomerById(
  workspaceId: string,
  customerId: string,
): UseCustomerReturn {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<Error | null>(null)

  useEffect(() => {
    if (!workspaceId || !customerId) { setLoading(false); return }

    const { doc, onSnapshot: snap } = require('firebase/firestore') as typeof import('firebase/firestore')
    const ref = doc(db, `workspaces/${workspaceId}/customers/${customerId}`)

    const unsub = snap(
      ref,
      d => {
        if (!d.exists()) { setCustomer(null); setLoading(false); return }
        setCustomer({
          id: d.id,
          ...d.data(),
          createdAt: d.data()!.createdAt?.toDate(),
          updatedAt: d.data()!.updatedAt?.toDate(),
        } as Customer)
        setLoading(false)
      },
      err => { setError(err); setLoading(false) },
    )

    return unsub
  }, [workspaceId, customerId])

  return { customer, loading, error }
}
