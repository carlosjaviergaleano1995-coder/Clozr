// Lógica central: a partir del config del workspace determina
// qué módulos mostrar, qué nav usar y qué tipo interno asignar.

import type { WorkspaceConfig, WorkspaceType } from '@/types'
import {
  Sun, Package, Users, Wallet, Settings,
  Wrench, Shield, ShoppingCart, Radio,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: any
}

// Derivar el WorkspaceType interno desde las respuestas del onboarding
export function derivarTipo(config: WorkspaceConfig): WorkspaceType {
  const { vendeProductos, vendeServicios, tieneOrdenes } = config
  if (tieneOrdenes && !vendeProductos) return 'tecnico'
  if (vendeProductos && vendeServicios) return 'mixto'
  if (vendeServicios) return 'servicios'
  return 'productos'
}

// Derivar el nav de 5 ítems según el config
export function derivarNav(config: WorkspaceConfig): NavItem[] {
  const { vendeProductos, vendeServicios, tieneStock, tieneOrdenes, moduloVerisure, moduloBroadcast } = config

  // Hoy siempre está
  const nav: NavItem[] = [
    { id: 'hoy',       label: 'Hoy',      icon: Sun },
  ]

  // Stock — si vende productos o repuestos
  if (tieneStock || vendeProductos) {
    nav.push({ id: 'inventario', label: 'Stock', icon: Package })
  }

  // Clientes — siempre
  nav.push({ id: 'clientes', label: 'Clientes', icon: Users })

  // Caja — siempre
  nav.push({ id: 'caja', label: 'Caja', icon: Wallet })

  // Ajustes — siempre
  nav.push({ id: 'ajustes', label: 'Ajustes', icon: Settings })

  return nav.slice(0, 5)
}

// Qué secciones aparecen en Ajustes
export function derivarAjustes(config: WorkspaceConfig) {
  const { vendeProductos, vendeServicios, tieneStock, tieneOrdenes, moduloVerisure, moduloBroadcast, moduloRevendedores } = config
  return {
    mostrarVentas:       vendeProductos || tieneStock,
    mostrarHistorial:    tieneStock,
    mostrarOrdenes:      tieneOrdenes,
    mostrarTurnos:       tieneOrdenes,
    mostrarBroadcast:    moduloBroadcast,
    mostrarRevendedores: moduloRevendedores,
    mostrarVerisure:     moduloVerisure,
    mostrarTareas:       true,
  }
}

// Texto descriptivo del workspace para el dashboard
export function descripcionWs(config: WorkspaceConfig): string {
  const partes: string[] = []
  if (config.vendeProductos && config.tieneStock) partes.push('stock y ventas')
  else if (config.vendeProductos) partes.push('ventas')
  if (config.tieneOrdenes) partes.push('reparaciones')
  if (config.vendeServicios && !config.tieneOrdenes) partes.push('servicios')
  if (config.moduloVerisure) partes.push('Verisure')
  return partes.join(' · ') || 'Workspace'
}
