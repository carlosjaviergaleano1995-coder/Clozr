import type { StockIPhone, StockAccesorio, StockOtroApple, ConfigIPhoneClub, FormaPagoIC } from '@/types'

// Orden de modelos para el broadcast (más reciente primero)
const ORDEN_MODELOS = [
  'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Plus', 'iPhone 17',
  'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
  'iPhone 16E',
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
  'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
  'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13',
  'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12',
  'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
]

function ordenarModelos(a: string, b: string): number {
  const ia = ORDEN_MODELOS.indexOf(a)
  const ib = ORDEN_MODELOS.indexOf(b)
  if (ia === -1 && ib === -1) return a.localeCompare(b)
  if (ia === -1) return 1
  if (ib === -1) return -1
  return ia - ib
}

// Genera línea de un iPhone usado
// Formato: COLOR STORAGEbateria% USD precio. [obs]
function lineaUsado(item: StockIPhone): string {
  let linea = `${item.color} ${item.storage} ${item.bateria}% USD ${item.precioUSD}`
  if (item.observaciones) linea += ` (${item.observaciones})`
  linea += '.'
  return linea
}

// Genera línea de un iPhone nuevo
// Formato: COLOR STORAGE USD precio
function lineaNuevo(item: StockIPhone): string {
  return `${item.color} ${item.storage} USD ${item.precioUSD}.`
}

export function generarBroadcastUsados(
  items: StockIPhone[],
  config: ConfigIPhoneClub
): string {
  const usados = items.filter(i => i.condicion === 'usado' && i.stock > 0)
  if (usados.length === 0) return ''

  // Agrupar por modelo
  const porModelo: Record<string, StockIPhone[]> = {}
  usados.forEach(item => {
    if (!porModelo[item.modelo]) porModelo[item.modelo] = []
    // Expandir según stock (cada unidad es una línea)
    for (let i = 0; i < item.stock; i++) {
      porModelo[item.modelo].push(item)
    }
  })

  let msg = '*🔥𝙐𝙎𝘼𝘿𝙊𝙎🔥*\n'
  msg += '➜ Piezas y baterías originales\n\n'

  const modelos = Object.keys(porModelo).sort(ordenarModelos)
  modelos.forEach(modelo => {
    msg += ` ${modelo.toUpperCase()}\n`
    porModelo[modelo].forEach(item => {
      msg += `${lineaUsado(item)}\n`
    })
    msg += '\n'
  })

  msg += config.pieTextoUsados
  return msg.trim()
}

export function generarBroadcastNuevos(
  items: StockIPhone[],
  config: ConfigIPhoneClub
): string {
  const nuevos = items.filter(i => i.condicion === 'nuevo' && i.stock > 0)
  if (nuevos.length === 0) return ''

  // Agrupar por modelo, luego storage, listar colores disponibles
  const porModelo: Record<string, StockIPhone[]> = {}
  nuevos.forEach(item => {
    if (!porModelo[item.modelo]) porModelo[item.modelo] = []
    porModelo[item.modelo].push(item)
  })

  let msg = '*🚚 𝙉𝙐𝙀𝙑𝙊𝙎 𝙎𝙀𝙇𝙇𝘼𝘿𝙊𝙎 📦*\n\n'

  const modelos = Object.keys(porModelo).sort(ordenarModelos)
  modelos.forEach(modelo => {
    // Agrupar por storage dentro del modelo
    const porStorage: Record<string, StockIPhone[]> = {}
    porModelo[modelo].forEach(item => {
      if (!porStorage[item.storage]) porStorage[item.storage] = []
      porStorage[item.storage].push(item)
    })

    Object.entries(porStorage).forEach(([storage, storageItems]) => {
      const precio = storageItems[0].precioUSD
      const colores = storageItems.map(i => i.color).filter((c, idx, arr) => arr.indexOf(c) === idx).join('/')
      msg += `${modelo.toUpperCase()} ${storage} USD ${precio}\n`
      msg += `\`${colores}\`\n`
    })
  })

  msg += '\n' + config.pieTextoNuevos
  return msg.trim()
}

export function generarBroadcastOtrosApple(
  items: StockOtroApple[],
): string {
  const disponibles = items.filter(i => i.disponible && i.stock > 0)
  if (disponibles.length === 0) return ''

  const porTipo: Record<string, StockOtroApple[]> = {}
  disponibles.forEach(item => {
    if (!porTipo[item.tipo]) porTipo[item.tipo] = []
    porTipo[item.tipo].push(item)
  })

  const TIPO_LABELS: Record<string, string> = {
    watch: '⌚️ APPLE WATCH',
    ipad: '📱 IPAD',
    airpods: '🎧 AIRPODS',
    airtag: '🌎 AIRTAG',
    otro: '📦 OTROS',
  }

  let msg = ''
  Object.entries(porTipo).forEach(([tipo, tipoItems]) => {
    msg += `\n${TIPO_LABELS[tipo] ?? tipo.toUpperCase()}\n`
    tipoItems.forEach(item => {
      msg += `🔹 ${item.modelo}`
      if (item.descripcion) msg += ` → u$${item.precioUSD}`
      else msg += ` USD ${item.precioUSD}`
      msg += '\n'
      if (item.descripcion) msg += `\`${item.descripcion}\`\n`
    })
  })

  return msg.trim()
}

export function aplicarFormaPago(
  precioUSD: number,
  dolarValor: number,
  formaPago: FormaPagoIC | 'usd_efectivo',
  config: ConfigIPhoneClub
): { precio: number; moneda: 'USD' | 'ARS'; label: string } {
  switch (formaPago) {
    case 'usd_efectivo':
      return { precio: precioUSD, moneda: 'USD', label: 'USD efectivo' }
    case 'usdt':
      return {
        precio: precioUSD * (1 + config.formasPago.usdt / 100),
        moneda: 'USD',
        label: `USDT (${config.formasPago.usdt}%)`,
      }
    case 'transferencia_ars':
      return {
        precio: Math.round(precioUSD * dolarValor * (1 + config.formasPago.transferencia_ars / 100)),
        moneda: 'ARS',
        label: `Transferencia ARS (+${config.formasPago.transferencia_ars}%)`,
      }
    case 'manchados':
      return {
        precio: precioUSD * (1 + config.formasPago.manchados / 100),
        moneda: 'USD',
        label: `Manchados (${config.formasPago.manchados}%)`,
      }
    default:
      return { precio: precioUSD, moneda: 'USD', label: 'USD efectivo' }
  }
}

export function generarBroadcastAccesorios(items: StockAccesorio[]): string {
  const activos = items.filter(i => i.activo !== false && i.stock > 0)
  if (activos.length === 0) return ''

  // Agrupar por categoría
  const porCategoria: Record<string, StockAccesorio[]> = {}
  activos.forEach(item => {
    const cat = item.categoria
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(item)
  })

  const CATEGORIA_LABELS: Record<string, string> = {
    battery_pack:     '⚡️ Battery Pack ⚡️',
    fuente_original:  '⚡️FUENTE 20W ORIGINAL⚡️',
    cargadores:       '⚡️CARGADORES⚡️',
    cargadores_armar: '‼️CARGADORES PARA ARMAR‼️',
    cables:           '⚡️CABLES⚡️',
    cables_armar:     '‼️CABLES PARA ARMAR‼️',
    fundas:           'FUNDAS',
    templados:        'TEMPLADOS',
    pencil:           '✏️ APPLE PENCIL',
    airtag:           '🌎 AIRTAG',
    audio:            '🎧 AUDIO',
    otros:            '📦 OTROS',
  }

  const ORDEN_CATEGORIAS = [
    'battery_pack', 'fuente_original', 'cargadores', 'cargadores_armar',
    'cables', 'cables_armar', 'fundas', 'templados', 'pencil', 'airtag', 'audio', 'otros',
  ]

  let msg = '*🇨🇳IMPORTACION DIRECTA🇨🇳*\n👉 *LA MEJOR CALIDAD*\n\n'

  ORDEN_CATEGORIAS.forEach(cat => {
    const catItems = porCategoria[cat]
    if (!catItems?.length) return

    msg += `\n*${CATEGORIA_LABELS[cat] ?? cat.toUpperCase()}*\n`
    catItems.forEach(item => {
      msg += `🔹*${item.nombre}*\n`
      if (item.descripcion) msg += `\`\`\`${item.descripcion}\`\`\`\n`
      item.preciosVolumen.forEach(pv => {
        const precio = item.moneda === 'USD'
          ? `USD ${pv.precio}`
          : `$${pv.precio.toLocaleString('es-AR')}`
        msg += `x${pv.cantidad} ${precio}\n`
      })
    })
  })

  msg += '\n`Tomo pedidos hoy, despacho mañana ✍🏼`'
  return msg.trim()
}
