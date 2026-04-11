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

// Mapa explícito: "Modelo|COLOR" → ruta relativa desde /public
// Construido desde los archivos reales del repo
const IMAGEN_MAP: Record<string, string> = {
  // iPhone 7
  'iPhone 7|BLACK':           'iPhone 7/iPhone_7_Black.jpg',
  'iPhone 7|SILVER':          'iPhone 7/iPhone_7_Silver.jpg',
  'iPhone 7|GOLD':            'iPhone 7/iPhone_7_Gold.jpg',
  'iPhone 7|ROSE GOLD':       'iPhone 7/iPhone_7_Rosegold.jpg',
  'iPhone 7 Plus|BLACK':      'iPhone 7/iPhone_7_Plus_Black.jpg',
  'iPhone 7 Plus|SILVER':     'iPhone 7/iPhone_7_Plus_Silver.jpg',
  'iPhone 7 Plus|GOLD':       'iPhone 7/iPhone_7_Plus_Gold.jpg',
  'iPhone 7 Plus|ROSE GOLD':  'iPhone 7/iPhone_7_Plus_Rosegold.jpg',

  // iPhone 8
  'iPhone 8|SILVER':          'iPhone 8/iPhone_8_Silver.jpg',
  'iPhone 8|GOLD':            'iPhone 8/iPhone_8_Gold.jpg',
  'iPhone 8|SPACE GRAY':      'iPhone 8/iPhone_8_Spacegray.jpg',
  'iPhone 8 Plus|SILVER':     'iPhone 8/iPhone_8_Plus_Silver.jpg',
  'iPhone 8 Plus|GOLD':       'iPhone 8/iPhone_8_Plus_Gold.jpg',
  'iPhone 8 Plus|SPACE GRAY': 'iPhone 8/iPhone_8_Plus_Spacegray.jpg',

  // iPhone X / XS / XR
  'iPhone X|SILVER':          'iPhone X/iPhone_X_Silver.jpg',
  'iPhone X|SPACE GRAY':      'iPhone X/iPhone_X_Spacegray.jpg',
  'iPhone XS|SILVER':         'iPhone X/iPhone_XS_Silver.jpg',
  'iPhone XS|SPACE GRAY':     'iPhone X/iPhone_XS_Spacegray.jpg',
  'iPhone XS|GOLD':           'iPhone X/iPhone_XS_Gold.jpg',
  'iPhone XS Max|SILVER':     'iPhone X/iPhone_XS_Max_Silver.jpg',
  'iPhone XS Max|SPACE GRAY': 'iPhone X/iPhone_XS_Max_Spacegray.jpg',
  'iPhone XS Max|GOLD':       'iPhone X/iPhone_XS_Max_Gold.jpg',
  'iPhone XR|BLACK':          'iPhone X/iPhone_XR_Black.jpg',
  'iPhone XR|WHITE':          'iPhone X/iPhone_XR_White.jpg',
  'iPhone XR|BLUE':           'iPhone X/iPhone_XR_Blue.jpg',
  'iPhone XR|YELLOW':         'iPhone X/iPhone_XR_Yellow.jpg',
  'iPhone XR|CORAL':          'iPhone X/iPhone_XR_Coral.jpg',
  'iPhone XR|RED':            'iPhone X/iPhone_XR_Red.jpg',

  // iPhone SE
  'iPhone SE 2da Gen|BLACK':    'iPhone SE/iPhone_SE_2nd_Gen_Black.jpg',
  'iPhone SE 2da Gen|WHITE':    'iPhone SE/iPhone_SE_2nd_Gen_White.jpg',
  'iPhone SE 2da Gen|RED':      'iPhone SE/iPhone_SE_2nd_Gen_Red.jpg',
  'iPhone SE 3ra Gen|MIDNIGHT': 'iPhone SE/iPhone_SE_3rd_Gen_Midnight.jpg',
  'iPhone SE 3ra Gen|STARLIGHT':'iPhone SE/iPhone_SE_3rd_Gen_Starlight.jpg',
  'iPhone SE 3ra Gen|RED':      'iPhone SE/iPhone_SE_3rd_Gen_Red.jpg',

  // iPhone 11
  'iPhone 11|BLACK':            'iPhone 11/iPhone_11_Black.jpg',
  'iPhone 11|WHITE':            'iPhone 11/iPhone_11_White.jpg',
  'iPhone 11|GREEN':            'iPhone 11/iPhone_11_Green.jpg',
  'iPhone 11|YELLOW':           'iPhone 11/iPhone_11_Yellow.jpg',
  'iPhone 11|PURPLE':           'iPhone 11/iPhone_11_Purple.jpg',
  'iPhone 11|RED':              'iPhone 11/iPhone_11_Red.jpg',
  'iPhone 11 Pro|SILVER':       'iPhone 11/iPhone_11_Pro_Silver.jpg',
  'iPhone 11 Pro|SPACE GRAY':   'iPhone 11/iPhone_11_Pro_Spacegrey.jpg',
  'iPhone 11 Pro|GOLD':         'iPhone 11/iPhone_11_Pro_Gold.jpg',
  'iPhone 11 Pro|MIDNIGHT GREEN':'iPhone 11/iPhone_11_Pro_Midnightgreen.jpg',
  'iPhone 11 Pro Max|SILVER':       'iPhone 11/iPhone_11_Pro_Max_Silver.jpg',
  'iPhone 11 Pro Max|SPACE GRAY':   'iPhone 11/iPhone_11_Pro_Max_Spacegrey.jpg',
  'iPhone 11 Pro Max|GOLD':         'iPhone 11/iPhone_11_Pro_Max_Gold.jpg',
  'iPhone 11 Pro Max|MIDNIGHT GREEN':'iPhone 11/iPhone_11_Pro_Max_Midnightgreen.jpg',

  // iPhone 12
  'iPhone 12|BLACK':            'iPhone 12/iPhone_12_Black.jpg',
  'iPhone 12|WHITE':            'iPhone 12/iPhone_12_White.jpg',
  'iPhone 12|BLUE':             'iPhone 12/iPhone_12_Blue.jpg',
  'iPhone 12|GREEN':            'iPhone 12/iPhone_12_Green.jpg',
  'iPhone 12|RED':              'iPhone 12/iPhone_12_Red.jpg',
  'iPhone 12|PURPLE':           'iPhone 12/iPhone_12_Purple.jpg',
  'iPhone 12 Mini|BLACK':       'iPhone 12/iPhone_12_Mini_Black.jpg',
  'iPhone 12 Mini|WHITE':       'iPhone 12/iPhone_12_Mini_White.jpg',
  'iPhone 12 Mini|BLUE':        'iPhone 12/iPhone_12_Mini_Blue.jpg',
  'iPhone 12 Mini|GREEN':       'iPhone 12/iPhone_12_Mini_Green.jpg',
  'iPhone 12 Mini|RED':         'iPhone 12/iPhone_12_Mini_Red.jpg',
  'iPhone 12 Mini|PURPLE':      'iPhone 12/iPhone_12_Mini_Purple.jpg',
  'iPhone 12 Pro|SILVER':       'iPhone 12/iPhone_12_Pro_Silver.jpg',
  'iPhone 12 Pro|GOLD':         'iPhone 12/iPhone_12_Pro_Gold.jpg',
  'iPhone 12 Pro|GRAPHITE':     'iPhone 12/iPhone_12_Pro_Graphite.jpg',
  'iPhone 12 Pro|PACIFIC BLUE': 'iPhone 12/iPhone_12_Pro_Pacific_Blue.jpg',
  'iPhone 12 Pro Max|SILVER':       'iPhone 12/iPhone_12_Pro_Max_Silver.jpg',
  'iPhone 12 Pro Max|GOLD':         'iPhone 12/iPhone_12_Pro_Max_Gold.jpg',
  'iPhone 12 Pro Max|GRAPHITE':     'iPhone 12/iPhone_12_Pro_Max_Graphite.jpg',
  'iPhone 12 Pro Max|PACIFIC BLUE': 'iPhone 12/iPhone_12_Pro_Max_Pacific_Blue.jpg',

  // iPhone 13
  'iPhone 13|MIDNIGHT':         'iPhone 13/iPhone_13_Midnight.jpg',
  'iPhone 13|STARLIGHT':        'iPhone 13/iPhone_13_Starlight.jpg',
  'iPhone 13|BLUE':             'iPhone 13/iPhone_13_Blue.jpg',
  'iPhone 13|GREEN':            'iPhone 13/iPhone_13_Green.jpg',
  'iPhone 13|PINK':             'iPhone 13/iPhone_13_Pink.jpg',
  'iPhone 13|RED':              'iPhone 13/iPhone_13_Product_Red.jpg',
  'iPhone 13 Mini|MIDNIGHT':    'iPhone 13/iPhone_13_Mini_Midnight.jpg',
  'iPhone 13 Mini|STARLIGHT':   'iPhone 13/iPhone_13_Mini_Starlight.jpg',
  'iPhone 13 Mini|BLUE':        'iPhone 13/iPhone_13_Mini_Blue.jpg',
  'iPhone 13 Mini|GREEN':       'iPhone 13/iPhone_13_Mini_Green.jpg',
  'iPhone 13 Mini|PINK':        'iPhone 13/iPhone_13_Mini_Pink.jpg',
  'iPhone 13 Mini|RED':         'iPhone 13/iPhone_13_Mini_Product_Red.jpg',
  'iPhone 13 Pro|SILVER':       'iPhone 13/iPhone_13_Pro_Silver.jpg',
  'iPhone 13 Pro|GOLD':         'iPhone 13/iPhone_13_Pro_Gold.jpg',
  'iPhone 13 Pro|GRAPHITE':     'iPhone 13/iPhone_13_Pro_Graphite.jpg',
  'iPhone 13 Pro|ALPINE GREEN': 'iPhone 13/iPhone_13_Pro_Alpine_Green.jpg',
  'iPhone 13 Pro|SIERRA BLUE':  'iPhone 13/iPhone_13_Pro_Sierra_Blue.jpg',
  'iPhone 13 Pro Max|SILVER':       'iPhone 13/iPhone_13_Pro_Max_Silver.jpg',
  'iPhone 13 Pro Max|GOLD':         'iPhone 13/iPhone_13_Pro_Max_Gold.jpg',
  'iPhone 13 Pro Max|GRAPHITE':     'iPhone 13/iPhone_13_Pro_Max_Graphite.jpg',
  'iPhone 13 Pro Max|ALPINE GREEN': 'iPhone 13/iPhone_13_Pro_Max_Alpine_Green.jpg',
  'iPhone 13 Pro Max|SIERRA BLUE':  'iPhone 13/iPhone_13_Pro_Max_Sierra_Blue.jpg',

  // iPhone 14
  'iPhone 14|BLUE':             'iPhone 14/iPhone_14_Blue.jpg',
  'iPhone 14|MIDNIGHT':         'iPhone 14/iPhone_14_Midnight.jpg',
  'iPhone 14|STARLIGHT':        'iPhone 14/iPhone_14_Starlight.jpg',  // falta en repo — fallback ok
  'iPhone 14|PURPLE':           'iPhone 14/iPhone_14_Purple.jpg',
  'iPhone 14|RED':              'iPhone 14/iPhone_14_Red.jpg',
  'iPhone 14|YELLOW':           'iPhone 14/iPhone_14_Yellow.jpg',
  'iPhone 14 Plus|BLUE':        'iPhone 14/iPhone_14_Plus_Blue.jpg',
  'iPhone 14 Plus|MIDNIGHT':    'iPhone 14/iPhone_14_Plus_Midnight.jpg',
  'iPhone 14 Plus|STARLIGHT':   'iPhone 14/iPhone_14_Plus_Starlight.jpg',
  'iPhone 14 Plus|PURPLE':      'iPhone 14/iPhone_14_Plus_Purple.jpg',
  'iPhone 14 Plus|RED':         'iPhone 14/iPhone_14_Plus_Red.jpg',
  'iPhone 14 Plus|YELLOW':      'iPhone 14/iPhone_14_Plus_Yellow.jpg',
  'iPhone 14 Pro|DEEP PURPLE':  'iPhone 14/iPhone_14_Pro_Deep_Purple.jpg',
  'iPhone 14 Pro|SILVER':       'iPhone 14/iPhone_14_Pro_Silver.jpg',
  'iPhone 14 Pro|GOLD':         'iPhone 14/iPhone_14_Pro_Gold.jpg',
  'iPhone 14 Pro|SPACE BLACK':  'iPhone 14/iPhone_14_Pro_Space_Black.jpg',
  'iPhone 14 Pro Max|DEEP PURPLE': 'iPhone 14/iPhone_14_Pro_Max_Deep_Purple.jpg',
  'iPhone 14 Pro Max|SILVER':      'iPhone 14/iPhone_14_Pro_Max_Silver.jpg',
  'iPhone 14 Pro Max|GOLD':        'iPhone 14/iPhone_14_Pro_Max_Gold.jpg',
  'iPhone 14 Pro Max|SPACE BLACK': 'iPhone 14/iPhone_14_Pro_Max_Space_Black.jpg',

  // iPhone 15
  'iPhone 15|BLACK':            'iPhone 15/iPhone_15_Black.jpg',
  'iPhone 15|BLUE':             'iPhone 15/iPhone_15_Blue.jpg',
  'iPhone 15|GREEN':            'iPhone 15/iPhone_15_Green.jpg',
  'iPhone 15|PINK':             'iPhone 15/iPhone_15_Pink.jpg',
  'iPhone 15|YELLOW':           'iPhone 15/iPhone_15_Yellow.jpg',
  'iPhone 15 Plus|BLACK':       'iPhone 15/iPhone_15_Plus_Black.jpg',
  'iPhone 15 Plus|BLUE':        'iPhone 15/iPhone_15_Plus_Blue.jpg',
  'iPhone 15 Plus|GREEN':       'iPhone 15/iPhone_15_Plus_Green.jpg',
  'iPhone 15 Plus|PINK':        'iPhone 15/iPhone_15_Plus_Pink.jpg',
  'iPhone 15 Plus|YELLOW':      'iPhone 15/iPhone_15_Plus_Yellow.jpg',
  'iPhone 15 Pro|NATURAL TITANIUM': 'iPhone 15/iPhone_15_Pro_Natural_Titanium.jpg',
  'iPhone 15 Pro|WHITE TITANIUM':   'iPhone 15/iPhone_15_Pro_White_Titanium.jpg',
  'iPhone 15 Pro|BLACK TITANIUM':   'iPhone 15/iPhone_15_Pro_Black_Titanium.jpg',
  'iPhone 15 Pro|BLUE TITANIUM':    'iPhone 15/iPhone_15_Pro_Blue_Titanium.jpg',
  'iPhone 15 Pro Max|NATURAL TITANIUM': 'iPhone 15/iPhone_15_Pro_Max_Natural_Titanium.jpg',
  'iPhone 15 Pro Max|WHITE TITANIUM':   'iPhone 15/iPhone_15_Pro_Max_White_Titanium.jpg',
  'iPhone 15 Pro Max|BLACK TITANIUM':   'iPhone 15/iPhone_15_Pro_Max_Black_Titanium.jpg',
  'iPhone 15 Pro Max|BLUE TITANIUM':    'iPhone 15/iPhone_15_Pro_Max_Blue_Titanium.jpg',

  // iPhone 16
  'iPhone 16|BLACK':            'iPhone 16/iPhone_16_Black.jpg',
  'iPhone 16|WHITE':            'iPhone 16/iPhone_16_White.jpg',
  'iPhone 16|PINK':             'iPhone 16/iPhone_16_Pink.jpg',
  'iPhone 16|TEAL':             'iPhone 16/iPhone_16_Teal.jpg',
  'iPhone 16|ULTRAMARINE':      'iPhone 16/iPhone_16_Ultramarine.jpg',
  'iPhone 16 Plus|BLACK':       'iPhone 16/iPhone_16_Plus_Black.jpg',
  'iPhone 16 Plus|WHITE':       'iPhone 16/iPhone_16_Plus_White.jpg',
  'iPhone 16 Plus|PINK':        'iPhone 16/iPhone_16_Plus_Pink.jpg',
  'iPhone 16 Plus|TEAL':        'iPhone 16/iPhone_16_Plus_Teal.jpg',
  'iPhone 16 Plus|ULTRAMARINE': 'iPhone 16/iPhone_16_Plus_Ultramarine.jpg',
  'iPhone 16 Pro|NATURAL TITANIUM': 'iPhone 16/iPhone_16_Pro_Natural_Titanium.jpg',
  'iPhone 16 Pro|WHITE TITANIUM':   'iPhone 16/iPhone_16_Pro_White_Titanium.jpg',
  'iPhone 16 Pro|BLACK TITANIUM':   'iPhone 16/iPhone_16_Pro_Black_Titanium.jpg',
  'iPhone 16 Pro|DESERT TITANIUM':  'iPhone 16/iPhone_16_Pro_Desert_Titanium.jpg',
  'iPhone 16 Pro Max|NATURAL TITANIUM': 'iPhone 16/iPhone_16_Pro_Max_Natural_Titanium.jpg',
  'iPhone 16 Pro Max|WHITE TITANIUM':   'iPhone 16/iPhone_16_Pro_Max_White_Titanium.jpg',
  'iPhone 16 Pro Max|BLACK TITANIUM':   'iPhone 16/iPhone_16_Pro_Max_Black_Titanium.jpg',
  'iPhone 16 Pro Max|DESERT TITANIUM':  'iPhone 16/iPhone_16_Pro_Max_Desert_Titanium.jpg',
  'iPhone 16E|BLACK':           'iPhone 16/iPhone_16e_Black.jpg',
  'iPhone 16E|WHITE':           'iPhone 16/iPhone_16e_White.jpg',

  // iPhone 17
  'iPhone 17|BLACK':            'iPhone 17/iPhone_17_Black.jpg',
  'iPhone 17|WHITE':            'iPhone 17/iPhone_17_White.jpg',
  'iPhone 17|LAVANDER':         'iPhone 17/iPhone_17_Lavender.jpg',
  'iPhone 17|SAGE':             'iPhone 17/iPhone_17_Sage.jpg',
  'iPhone 17|MIST BLUE':        'iPhone 17/iPhone_17_Mist_Blue.jpg',
  'iPhone 17 Pro|COSMIC ORANGE':'iPhone 17/iPhone_17_Pro_Cosmic_Orange.jpg',
  'iPhone 17 Pro|DEEP BLUE':    'iPhone 17/iPhone_17_Pro_Deep_Blue.jpg',
  'iPhone 17 Pro Max|COSMIC ORANGE':'iPhone 17/iPhone_17_Pro_Max_Cosmic_Orange.jpg',
  'iPhone 17 Pro Max|DEEP BLUE':    'iPhone 17/iPhone_17_Pro_Max_Deep_Blue.jpg',
  'iPhone 17 Pro Max|SILVER':       'iPhone 17/iPhone_17_Pro_Max_Silver.jpg',
  'iPhone 17 E|BLACK':          'iPhone 17/iPhone_17e_Black.jpg',
  'iPhone 17 E|WHITE':          'iPhone 17/iPhone_17e_White.jpg',
  'iPhone 17 E|SOFT PINK':      'iPhone 17/iPhone_17e_Pink.jpg',

  // iPhone Air
  'iPhone Air|SKY BLUE':        'iPhone Air/iPhone_Air_Sky_Blue.jpg',
  'iPhone Air|LIGHT GOLD':      'iPhone Air/iPhone_Air_Light_Gold.jpg',
  'iPhone Air|COLD WHITE':      'iPhone Air/iPhone_Air_Cloud_White.jpg',
  'iPhone Air|SPACE BLACK':     'iPhone Air/iPhone_Air_Space_Black.jpg',
}

// Ruta de imagen para un modelo + color
export const getImagenModelo = (nombre: string, color?: string): string | null => {
  if (!color) return null
  const key = `${nombre}|${color.toUpperCase()}`
  const path = IMAGEN_MAP[key]
  return path ? `/${path}` : null
}

// Todos los nombres de modelos para el selector
export const NOMBRES_MODELOS = MODELOS_IPHONE.map(m => m.nombre)
