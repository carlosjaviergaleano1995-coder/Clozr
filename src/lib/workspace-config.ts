import type { WorkspaceConfig, WorkspaceType } from '@/types'
import {
  Home, Users, Settings,
  Shield, BarChart2, Radio, DollarSign,
  Smartphone, GitPullRequest, CheckSquare, TrendingUp, MoreHorizontal,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: any
  isMore?: boolean  // true = abre el drawer Más en lugar de navegar
}

// ── derivarTipo ────────────────────────────────────────────────────────────────

export function derivarTipo(config: WorkspaceConfig): WorkspaceType {
  const { vendeProductos, vendeServicios, tieneOrdenes } = config
  if (tieneOrdenes && !vendeProductos) return 'tecnico'
  if (vendeProductos && vendeServicios) return 'mixto'
  if (vendeServicios) return 'servicios'
  return 'productos'
}

// ── derivarNav ────────────────────────────────────────────────────────────────
// Estructura fija: Inicio (pos 1) · 3 variables · Más (pos 5)
// Inicio y Más son invariantes — el usuario nunca pierde el hub ni el menú.

export function derivarNav(config: WorkspaceConfig): NavItem[] {
  const inicio: NavItem = { id: 'hoy', label: 'Inicio', icon: Home }
  const mas:    NavItem = { id: '__mas',  label: 'Más',    icon: MoreHorizontal, isMore: true }

  // Verisure
  if ((config as any).moduloVerisure) {
    return [
      inicio,
      { id: 'clientes',         label: 'Clientes', icon: Users       },
      { id: 'verisure',         label: 'Calc',     icon: Shield      },
      { id: 'resumen-verisure', label: 'Resumen',  icon: BarChart2   },
      mas,
    ]
  }

  // iPhone Club
  if ((config as any).moduloBroadcast) {
    return [
      inicio,
      { id: 'iphone/stock',     label: 'Stock',     icon: Smartphone  },
      { id: 'iphone/ventas',    label: 'Ventas',     icon: DollarSign  },
      { id: 'iphone/broadcast', label: 'Broadcast',  icon: Radio       },
      mas,
    ]
  }

  // Genérico — core del CRM
  return [
    inicio,
    { id: 'clientes', label: 'Clientes', icon: Users         },
    { id: 'pipeline', label: 'Pipeline', icon: GitPullRequest },
    { id: 'tareas',   label: 'Tareas',   icon: CheckSquare   },
    mas,
  ]
}

// ── derivarMas ────────────────────────────────────────────────────────────────
// Items del drawer "Más" — todo lo que no está en el nav principal.

export interface MasItem {
  id:    string
  label: string
  icon:  any
  desc?: string
}

export function derivarMas(config: WorkspaceConfig): MasItem[] {
  const base: MasItem[] = [
    { id: 'ventas',   label: 'Ventas',   icon: TrendingUp, desc: 'Registro de ventas'      },
    { id: 'catalogo', label: 'Catálogo', icon: BarChart2,  desc: 'Productos y servicios'   },
    { id: 'equipo',   label: 'Equipo',   icon: Users,      desc: 'Miembros y roles'         },
    { id: 'ajustes',  label: 'Ajustes',  icon: Settings,   desc: 'Configuración del negocio'},
  ]

  if ((config as any).moduloVerisure) {
    return [
      { id: 'pipeline',        label: 'Pipeline',   icon: GitPullRequest, desc: 'Seguimiento'          },
      { id: 'tareas',          label: 'Tareas',      icon: CheckSquare,    desc: 'Rutinas del día'      },
      { id: 'plantillas',      label: 'Plantillas',  icon: Radio,          desc: 'Mensajes de WhatsApp' },
      { id: 'ventas-verisure', label: 'Instalaciones',icon: TrendingUp,   desc: 'Historial'            },
      { id: 'equipo',          label: 'Equipo',      icon: Users,          desc: 'Miembros y roles'     },
      { id: 'ajustes',         label: 'Ajustes',     icon: Settings,       desc: 'Configuración'        },
    ]
  }

  if ((config as any).moduloBroadcast) {
    return [
      { id: 'clientes',            label: 'Clientes',     icon: Users,         desc: 'CRM'                  },
      { id: 'pipeline',            label: 'Pipeline',     icon: GitPullRequest, desc: 'Seguimiento'          },
      { id: 'tareas',              label: 'Tareas',       icon: CheckSquare,   desc: 'Rutinas del día'      },
      { id: 'iphone/revendedores', label: 'Revendedores', icon: Users,         desc: 'CRM revendedores'     },
      { id: 'iphone/resumen',      label: 'Resumen',      icon: BarChart2,     desc: 'Métricas mensuales'   },
      { id: 'catalogo-iphone',     label: 'Catálogo',     icon: Smartphone,    desc: 'Modelos y accesorios' },
      { id: 'equipo',              label: 'Equipo',       icon: Users,         desc: 'Miembros y roles'     },
      { id: 'ajustes',             label: 'Ajustes',      icon: Settings,      desc: 'Configuración'        },
    ]
  }

  return base
}

// ── derivarAjustes (backwards compat) ─────────────────────────────────────────

export function derivarAjustes(config: WorkspaceConfig) {
  return {
    mostrarVentas:       (config as any).vendeProductos || (config as any).tieneStock,
    mostrarHistorial:    (config as any).tieneStock,
    mostrarOrdenes:      (config as any).tieneOrdenes,
    mostrarTurnos:       (config as any).tieneOrdenes,
    mostrarBroadcast:    (config as any).moduloBroadcast,
    mostrarRevendedores: (config as any).moduloRevendedores,
    mostrarVerisure:     (config as any).moduloVerisure,
    mostrarPlantillas:   (config as any).moduloVerisure,
    mostrarTareas:       true,
  }
}

export function descripcionWs(config: WorkspaceConfig): string {
  if ((config as any).moduloVerisure) return '🛡️ Verisure · Alarmas y seguridad'
  if ((config as any).moduloBroadcast) return '📱 iPhone Club · Reventa Apple'
  const partes: string[] = []
  if ((config as any).vendeProductos && (config as any).tieneStock) partes.push('stock y ventas')
  else if ((config as any).vendeProductos) partes.push('ventas')
  if ((config as any).tieneOrdenes) partes.push('reparaciones')
  if ((config as any).vendeServicios && !(config as any).tieneOrdenes) partes.push('servicios')
  return partes.join(' · ') || 'Workspace'
}
