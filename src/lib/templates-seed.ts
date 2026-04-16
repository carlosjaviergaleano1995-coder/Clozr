// Template oficial de Verisure Argentina para Clozr
// Se carga en Firestore la primera vez via el panel admin

import type { Template } from '@/types'

export const TEMPLATE_VERISURE: Omit<Template, 'id'> = {
  slug: 'verisure-arg',
  nombre: 'Verisure Argentina',
  descripcion: 'CRM completo para vendedores y equipos de Verisure. Calculadora de kits, comisiones, bonos, clientes y seguimiento de ventas.',
  emoji: '🛡️',
  color: '#E8001D',
  autor: 'clozr-official',
  activo: true,
  config: {
    vendeProductos: false,
    vendeServicios: true,
    tieneStock: false,
    tieneOrdenes: false,
    moduloVerisure: true,
    moneda: 'ARS',
  },
  creadoAt: new Date(),
}

export const TEMPLATE_IPHONE_CLUB: Omit<Template, 'id'> = {
  slug: 'iphone-club',
  nombre: 'iPhone Club',
  descripcion: 'CRM para revendedores de Apple. Stock, ventas, broadcast a revendedores, caja y seguimiento de equipos usados.',
  emoji: '📱',
  color: '#2563eb',
  autor: 'clozr-official',
  activo: true,
  config: {
    vendeProductos: true,
    vendeServicios: false,
    tieneStock: true,
    tieneOrdenes: false,
    moduloBroadcast: true,
    moduloRevendedores: true,
    moneda: 'USD',
  },
  creadoAt: new Date(),
}
