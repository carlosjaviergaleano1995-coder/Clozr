// Catálogo completo de modelos y colores de iPhone
// Los colores están normalizados para coincidir con los nombres del stock

export interface ModeloiPhone {
  id: string           // slug para carpeta de imágenes (ej: "iphone-16")
  nombre: string       // nombre display (ej: "iPhone 16")
  colores: string[]    // colores exactos como aparecen en el stock
  orden: number        // para ordenar (más reciente = número más bajo)
}

export const MODELOS_IPHONE: ModeloiPhone[] = [
  // ── iPhone 17 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-17-pro-max', nombre: 'iPhone 17 Pro Max', orden: 1,
    colores: ['COSMIC ORANGE', 'DEEP BLUE', 'SILVER'],
  },
  {
    id: 'iphone-17-pro', nombre: 'iPhone 17 Pro', orden: 2,
    colores: ['COSMIC ORANGE', 'DEEP BLUE', 'SILVER'],
  },
  {
    id: 'iphone-17-air', nombre: 'iPhone Air', orden: 3,
    colores: ['SKY BLUE', 'LIGHT GOLD', 'COLD WHITE', 'SPACE BLACK'],
  },
  {
    id: 'iphone-17', nombre: 'iPhone 17', orden: 4,
    colores: ['LAVANDER', 'SAGE', 'MIST BLUE', 'WHITE', 'BLACK'],
  },
  {
    id: 'iphone-17e', nombre: 'iPhone 17 E', orden: 5,
    colores: ['SOFT PINK', 'BLACK', 'WHITE'],
  },

  // ── iPhone 16 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-16-pro-max', nombre: 'iPhone 16 Pro Max', orden: 10,
    colores: ['DESERT TITANIUM', 'NATURAL TITANIUM', 'WHITE TITANIUM', 'BLACK TITANIUM'],
  },
  {
    id: 'iphone-16-pro', nombre: 'iPhone 16 Pro', orden: 11,
    colores: ['DESERT TITANIUM', 'NATURAL TITANIUM', 'WHITE TITANIUM', 'BLACK TITANIUM'],
  },
  {
    id: 'iphone-16-plus', nombre: 'iPhone 16 Plus', orden: 12,
    colores: ['ULTRAMARINE', 'TEAL', 'PINK', 'WHITE', 'BLACK'],
  },
  {
    id: 'iphone-16', nombre: 'iPhone 16', orden: 13,
    colores: ['ULTRAMARINE', 'TEAL', 'PINK', 'WHITE', 'BLACK'],
  },
  {
    id: 'iphone-16e', nombre: 'iPhone 16E', orden: 14,
    colores: ['WHITE', 'BLACK'],
  },

  // ── iPhone 15 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-15-pro-max', nombre: 'iPhone 15 Pro Max', orden: 20,
    colores: ['NATURAL TITANIUM', 'BLUE TITANIUM', 'WHITE TITANIUM', 'BLACK TITANIUM'],
  },
  {
    id: 'iphone-15-pro', nombre: 'iPhone 15 Pro', orden: 21,
    colores: ['NATURAL TITANIUM', 'BLUE TITANIUM', 'WHITE TITANIUM', 'BLACK TITANIUM'],
  },
  {
    id: 'iphone-15-plus', nombre: 'iPhone 15 Plus', orden: 22,
    colores: ['PINK', 'YELLOW', 'GREEN', 'BLUE', 'BLACK'],
  },
  {
    id: 'iphone-15', nombre: 'iPhone 15', orden: 23,
    colores: ['PINK', 'YELLOW', 'GREEN', 'BLUE', 'BLACK'],
  },

  // ── iPhone 14 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-14-pro-max', nombre: 'iPhone 14 Pro Max', orden: 30,
    colores: ['DEEP PURPLE', 'GOLD', 'SILVER', 'SPACE BLACK'],
  },
  {
    id: 'iphone-14-pro', nombre: 'iPhone 14 Pro', orden: 31,
    colores: ['DEEP PURPLE', 'GOLD', 'SILVER', 'SPACE BLACK'],
  },
  {
    id: 'iphone-14-plus', nombre: 'iPhone 14 Plus', orden: 32,
    colores: ['BLUE', 'PURPLE', 'YELLOW', 'MIDNIGHT', 'STARLIGHT', 'RED'],
  },
  {
    id: 'iphone-14', nombre: 'iPhone 14', orden: 33,
    colores: ['BLUE', 'PURPLE', 'YELLOW', 'MIDNIGHT', 'STARLIGHT', 'RED'],
  },

  // ── iPhone 13 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-13-pro-max', nombre: 'iPhone 13 Pro Max', orden: 40,
    colores: ['ALPINE GREEN', 'SILVER', 'GOLD', 'GRAPHITE', 'SIERRA BLUE'],
  },
  {
    id: 'iphone-13-pro', nombre: 'iPhone 13 Pro', orden: 41,
    colores: ['ALPINE GREEN', 'SILVER', 'GOLD', 'GRAPHITE', 'SIERRA BLUE'],
  },
  {
    id: 'iphone-13', nombre: 'iPhone 13', orden: 42,
    colores: ['GREEN', 'PINK', 'BLUE', 'MIDNIGHT', 'STARLIGHT', 'RED'],
  },
  {
    id: 'iphone-13-mini', nombre: 'iPhone 13 Mini', orden: 43,
    colores: ['GREEN', 'PINK', 'BLUE', 'MIDNIGHT', 'STARLIGHT', 'RED'],
  },

  // ── iPhone 12 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-12-pro-max', nombre: 'iPhone 12 Pro Max', orden: 50,
    colores: ['PACIFIC BLUE', 'GOLD', 'GRAPHITE', 'SILVER'],
  },
  {
    id: 'iphone-12-pro', nombre: 'iPhone 12 Pro', orden: 51,
    colores: ['PACIFIC BLUE', 'GOLD', 'GRAPHITE', 'SILVER'],
  },
  {
    id: 'iphone-12', nombre: 'iPhone 12', orden: 52,
    colores: ['PURPLE', 'BLUE', 'GREEN', 'RED', 'WHITE', 'BLACK'],
  },
  {
    id: 'iphone-12-mini', nombre: 'iPhone 12 Mini', orden: 53,
    colores: ['PURPLE', 'BLUE', 'GREEN', 'RED', 'WHITE', 'BLACK'],
  },

  // ── iPhone SE ────────────────────────────────────────────────────────────────
  {
    id: 'iphone-se-3', nombre: 'iPhone SE 3ra Gen', orden: 60,
    colores: ['MIDNIGHT', 'STARLIGHT', 'RED'],
  },
  {
    id: 'iphone-se-2', nombre: 'iPhone SE 2da Gen', orden: 61,
    colores: ['BLACK', 'WHITE', 'RED'],
  },

  // ── iPhone 11 ───────────────────────────────────────────────────────────────
  {
    id: 'iphone-11-pro-max', nombre: 'iPhone 11 Pro Max', orden: 70,
    colores: ['MIDNIGHT GREEN', 'SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-11-pro', nombre: 'iPhone 11 Pro', orden: 71,
    colores: ['MIDNIGHT GREEN', 'SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-11', nombre: 'iPhone 11', orden: 72,
    colores: ['PURPLE', 'YELLOW', 'GREEN', 'BLACK', 'WHITE', 'RED'],
  },

  // ── iPhone X / XS / XR ──────────────────────────────────────────────────────
  {
    id: 'iphone-xs-max', nombre: 'iPhone XS Max', orden: 80,
    colores: ['SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-xs', nombre: 'iPhone XS', orden: 81,
    colores: ['SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-xr', nombre: 'iPhone XR', orden: 82,
    colores: ['BLUE', 'WHITE', 'BLACK', 'YELLOW', 'CORAL', 'RED'],
  },
  {
    id: 'iphone-x', nombre: 'iPhone X', orden: 83,
    colores: ['SILVER', 'SPACE GRAY'],
  },

  // ── iPhone 8 / 7 ────────────────────────────────────────────────────────────
  {
    id: 'iphone-8-plus', nombre: 'iPhone 8 Plus', orden: 90,
    colores: ['SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-8', nombre: 'iPhone 8', orden: 91,
    colores: ['SILVER', 'SPACE GRAY', 'GOLD'],
  },
  {
    id: 'iphone-7-plus', nombre: 'iPhone 7 Plus', orden: 92,
    colores: ['SILVER', 'BLACK', 'GOLD', 'ROSE GOLD'],
  },
  {
    id: 'iphone-7', nombre: 'iPhone 7', orden: 93,
    colores: ['SILVER', 'BLACK', 'GOLD', 'ROSE GOLD'],
  },
]

// Búsqueda rápida por nombre de modelo
export const getModeloInfo = (nombre: string): ModeloiPhone | undefined =>
  MODELOS_IPHONE.find(m =>
    m.nombre.toLowerCase() === nombre.toLowerCase()
  )

// Colores de un modelo específico
export const getColoresModelo = (nombre: string): string[] =>
  getModeloInfo(nombre)?.colores ?? []

// Ruta de imagen para un modelo + color
// Las imágenes se sirven desde /public/apple/{modelo-id}/{color-slug}.png
export const getImagenModelo = (nombre: string, color?: string): string | null => {
  const modelo = getModeloInfo(nombre)
  if (!modelo) return null
  if (!color) return `/apple/${modelo.id}/default.png`
  const colorSlug = color.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `/apple/${modelo.id}/${colorSlug}.png`
}

// Todos los nombres de modelos para el selector
export const NOMBRES_MODELOS = MODELOS_IPHONE.map(m => m.nombre)
