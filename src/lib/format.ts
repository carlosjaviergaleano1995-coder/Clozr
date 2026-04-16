// Utilidades de formato de moneda — usadas en toda la app
// Nunca redondear valores monetarios — mostrar exactamente lo que es

const OPTS_ARS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}

const OPTS_USD: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}

export const fmtARS = (n: number): string =>
  `$${n.toLocaleString('es-AR', OPTS_ARS)}`

export const fmtUSD = (n: number): string =>
  `U$S ${n.toLocaleString('es-AR', OPTS_USD)}`

export const fmtMonto = (n: number, moneda: 'ARS' | 'USD'): string =>
  moneda === 'USD' ? fmtUSD(n) : fmtARS(n)

// Para porcentajes exactos
export const fmtPct = (n: number): string =>
  `${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
