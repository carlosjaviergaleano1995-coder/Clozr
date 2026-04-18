import type { WorkspaceConfig, WorkspaceType } from '@/types'
import {
  Sun, Users, Wallet, Settings,
  Package, ShoppingCart, History, Shield, BarChart2,
  Radio, DollarSign, MoreHorizontal, Smartphone,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: any
}

export function derivarTipo(config: WorkspaceConfig): WorkspaceType {
  const { vendeProductos, vendeServicios, tieneOrdenes } = config
  if (tieneOrdenes && !vendeProductos) return 'tecnico'
  if (vendeProductos && vendeServicios) return 'mixto'
  if (vendeServicios) return 'servicios'
  return 'productos'
}

export function derivarNav(config: WorkspaceConfig): NavItem[] {
  // Verisure — nav completamente distinto
  if (config.moduloVerisure) {
    return [
      { id: 'hoy',               label: 'Hoy',      icon: Sun },
      { id: 'clientes',          label: 'Clientes', icon: Users },
      { id: 'verisure',          label: 'Calc',     icon: Shield },
      { id: 'resumen-verisure',  label: 'Resumen',  icon: BarChart2 },
      { id: 'ajustes',           label: 'Ajustes',  icon: Settings },
    ]
  }

  // iPhone Club — nav propio
  if (config.moduloBroadcast) {
    return [
      { id: 'iphone/stock',     label: 'Stock',      icon: Smartphone },
      { id: 'iphone/ventas',    label: 'Ventas',     icon: DollarSign },
      { id: 'iphone/resumen',   label: 'Resumen',    icon: BarChart2 },
      { id: 'iphone/broadcast', label: 'Broadcast',  icon: Radio },
      { id: 'iphone/mas',       label: 'Más',        icon: MoreHorizontal },
    ]
  }

  // Nav base
  const nav: NavItem[] = [{ id: 'hoy', label: 'Hoy', icon: Sun }]
  if (config.tieneStock || config.vendeProductos)
    nav.push({ id: 'inventario', label: 'Stock', icon: Package })
  nav.push({ id: 'clientes', label: 'Clientes', icon: Users })
  nav.push({ id: 'caja',     label: 'Caja',     icon: Wallet })
  nav.push({ id: 'ajustes',  label: 'Ajustes',  icon: Settings })
  return nav.slice(0, 5)
}

export function derivarAjustes(config: WorkspaceConfig) {
  return {
    mostrarVentas:       config.vendeProductos || config.tieneStock,
    mostrarHistorial:    config.tieneStock,
    mostrarOrdenes:      config.tieneOrdenes,
    mostrarTurnos:       config.tieneOrdenes,
    mostrarBroadcast:    config.moduloBroadcast,
    mostrarRevendedores: config.moduloRevendedores,
    mostrarVerisure:     config.moduloVerisure,
    mostrarPlantillas:   config.moduloVerisure,
    mostrarTareas:       true,
  }
}

export function descripcionWs(config: WorkspaceConfig): string {
  if (config.moduloVerisure) return '🛡️ Verisure · Alarmas y seguridad'
  if (config.moduloBroadcast) return '📱 iPhone Club · Reventa Apple'
  const partes: string[] = []
  if (config.vendeProductos && config.tieneStock) partes.push('stock y ventas')
  else if (config.vendeProductos) partes.push('ventas')
  if (config.tieneOrdenes) partes.push('reparaciones')
  if (config.vendeServicios && !config.tieneOrdenes) partes.push('servicios')
  return partes.join(' · ') || 'Workspace'
}
