import type { ConfigVerisure, DispositivoExtra } from '@/types'

// Mapa de imágenes por nombre de dispositivo
export const DEVICE_IMAGES: Record<string, string> = {
  'Shock Sensor':              '/devices/shock-sensor.png',
  'Orion':                     '/devices/aquila.png',       // negro
  'Orion Close Pack':          '/devices/fotodetector.png', // blanco
  'Aquila Outdoor':            '/devices/aquila.png',       // negro
  'Arlo Indoor':               '/devices/arlo-indoor.png',
  'Arlo Outdoor':              '/devices/arlo-outdoor.png',
  'Zerovision':                '/devices/zerovision.png',
  'Botón emergencias':         '/devices/boton-emergencias.png',
  'Control remoto':            '/devices/control-remoto.png',
  'HUB Arlo':                  '/devices/arlo-outdoor.png',
  'Panel de Control (SVK)':    '/devices/panel.png',
  'Starkey Llaves extra (x3)': '/devices/starkey.png',
  'Placa disuasoria':          '/devices/placa.png',
  'Unidad Central':            '/devices/panel.png',
  'Panel Solar':               '/devices/arlo-outdoor.png',
}

export const DISPOSITIVOS_DEFAULT: DispositivoExtra[] = [

  // ── SHOCK SENSOR ──────────────────────────────────────────────────────────
  {
    id: 'shock_alto',
    nombre: 'Shock Sensor',
    nivel: 'alto',
    cantidades: [1, 2, 3, 4, 6],
    precios:    [59999, 79999, 99999, 129999, 189999],
    cuotas:     [1999,  2999,  3999,  4999,   5999],
    comisiones: [20000, 30000, 40000, 50000,  70000],
  },
  {
    id: 'shock_bajo',
    nombre: 'Shock Sensor',
    nivel: 'bajo',
    cantidades: [1, 2, 3, 4, 6],
    precios:    [39999, 59999, 79999, 99999, 149999],
    cuotas:     [1999,  2999,  3999,  4999,  5999],
    comisiones: [8000,  12000, 16000, 20000, 28000],
  },

  // ── ORION ─────────────────────────────────────────────────────────────────
  {
    id: 'orion_alto',
    nombre: 'Orion',
    nivel: 'alto',
    cantidades: [1, 2, 3],
    precios:    [169999, 319999, 459999],
    cuotas:     [3999,   4999,   5999],
    comisiones: [56000,  112000, 168000],
  },
  {
    id: 'orion_bajo',
    nombre: 'Orion',
    nivel: 'bajo',
    cantidades: [1, 2, 3],
    precios:    [99999, 219999, 319999],
    cuotas:     [3999,  4999,   5999],
    comisiones: [20000, 40000,  60000],
  },

  // ── ORION CLOSE PACK — solo existe en Bajo (69.999 confirmado) ────────────
  {
    id: 'orion_close',
    nombre: 'Orion Close Pack',
    nivel: 'ambos',
    cantidades: [1],
    precios:    [69999],
    cuotas:     [3999],
    comisiones: [20000],
  },

  // ── AQUILA OUTDOOR ────────────────────────────────────────────────────────
  {
    id: 'aquila_alto',
    nombre: 'Aquila Outdoor',
    nivel: 'alto',
    cantidades: [1, 2],
    precios:    [299999, 499999],
    cuotas:     [4999,   5999],
    comisiones: [100000, 200000],
  },
  {
    id: 'aquila_bajo',
    nombre: 'Aquila Outdoor',
    nivel: 'bajo',
    cantidades: [1, 2],
    precios:    [216999, 449999],
    cuotas:     [4999,   5999],
    comisiones: [50000,  100000],
  },

  // ── ARLO INDOOR ───────────────────────────────────────────────────────────
  {
    id: 'arlo_indoor_alto',
    nombre: 'Arlo Indoor',
    nivel: 'alto',
    cantidades: [1, 2],
    precios:    [149999, 299998],
    cuotas:     [6999,   13998],
    comisiones: [50000,  100000],
  },
  {
    id: 'arlo_indoor_bajo',
    nombre: 'Arlo Indoor',
    nivel: 'bajo',
    cantidades: [1, 2],
    precios:    [110999, 221998],
    cuotas:     [6999,   13998],
    comisiones: [20000,  40000],
  },

  // ── ARLO OUTDOOR ──────────────────────────────────────────────────────────
  {
    id: 'arlo_outdoor_alto',
    nombre: 'Arlo Outdoor',
    nivel: 'alto',
    cantidades: [1, 2],
    precios:    [179999, 359998],
    cuotas:     [6999,   13998],
    comisiones: [60000,  120000],
  },
  {
    id: 'arlo_outdoor_bajo',
    nombre: 'Arlo Outdoor',
    nivel: 'bajo',
    cantidades: [1, 2],
    precios:    [119999, 239998],
    cuotas:     [6999,   13998],
    comisiones: [24000,  48000],
  },

  // ── ZEROVISION ────────────────────────────────────────────────────────────
  {
    id: 'zerovision_alto',
    nombre: 'Zerovision',
    nivel: 'alto',
    cantidades: [1],
    precios:    [349999],
    cuotas:     [11999],
    comisiones: [112000],
  },
  {
    id: 'zerovision_bajo',
    nombre: 'Zerovision',
    nivel: 'bajo',
    cantidades: [1],
    precios:    [141999],
    cuotas:     [11999],
    comisiones: [40000],
  },

  // ── BOTÓN DE EMERGENCIAS ──────────────────────────────────────────────────
  {
    id: 'boton_alto',
    nombre: 'Botón emergencias',
    nivel: 'alto',
    cantidades: [1, 2],
    precios:    [59999, 119999],
    cuotas:     [1999,  2999],
    comisiones: [20000, 40000],
  },
  {
    id: 'boton_bajo',
    nombre: 'Botón emergencias',
    nivel: 'bajo',
    cantidades: [1, 2],
    precios:    [39999, 79999],
    cuotas:     [1999,  2999],
    comisiones: [8000,  16000],
  },

  // ── CONTROL REMOTO ────────────────────────────────────────────────────────
  {
    id: 'control_alto',
    nombre: 'Control remoto',
    nivel: 'alto',
    cantidades: [1, 2],
    precios:    [59999, 119999],
    cuotas:     [1999,  2999],
    comisiones: [20000, 40000],
  },
  {
    id: 'control_bajo',
    nombre: 'Control remoto',
    nivel: 'bajo',
    cantidades: [1, 2],
    precios:    [39999, 79999],
    cuotas:     [1999,  2999],
    comisiones: [8000,  16000],
  },

  // ── HUB ARLO — sin cuota, sin comisión ───────────────────────────────────
  {
    id: 'hub_arlo_alto',
    nombre: 'HUB Arlo',
    nivel: 'alto',
    cantidades: [1],
    precios:    [99999],
    cuotas:     [0],
    comisiones: [0],
  },
  {
    id: 'hub_arlo_bajo',
    nombre: 'HUB Arlo',
    nivel: 'bajo',
    cantidades: [1],
    precios:    [61999],
    cuotas:     [0],
    comisiones: [0],
  },

  // ── PANEL DE CONTROL (SVK) ────────────────────────────────────────────────
  {
    id: 'panel_alto',
    nombre: 'Panel de Control (SVK)',
    nivel: 'alto',
    cantidades: [1],
    precios:    [169999],
    cuotas:     [2999],
    comisiones: [56000],
  },
  {
    id: 'panel_bajo',
    nombre: 'Panel de Control (SVK)',
    nivel: 'bajo',
    cantidades: [1],
    precios:    [99999],
    cuotas:     [2999],
    comisiones: [20000],
  },

  // ── STARKEY LLAVES EXTRA (pack x3) — sin cuota ───────────────────────────
  {
    id: 'starkey_alto',
    nombre: 'Starkey Llaves extra (x3)',
    nivel: 'alto',
    cantidades: [1],
    precios:    [49999],
    cuotas:     [0],
    comisiones: [20000],
  },
  {
    id: 'starkey_bajo',
    nombre: 'Starkey Llaves extra (x3)',
    nivel: 'bajo',
    cantidades: [1],
    precios:    [19999],
    cuotas:     [0],
    comisiones: [8000],
  },

  // ── PLACA DISUASORIA — gratis ─────────────────────────────────────────────
  {
    id: 'placa',
    nombre: 'Placa disuasoria',
    nivel: 'ambos',
    cantidades: [1],
    precios:    [0],
    cuotas:     [0],
    comisiones: [0],
  },

  // ── UNIDAD CENTRAL — sin cuota ────────────────────────────────────────────
  {
    id: 'unidad_alto',
    nombre: 'Unidad Central',
    nivel: 'alto',
    cantidades: [1],
    precios:    [199999],
    cuotas:     [0],
    comisiones: [0],
  },
  {
    id: 'unidad_bajo',
    nombre: 'Unidad Central',
    nivel: 'bajo',
    cantidades: [1],
    precios:    [129999],
    cuotas:     [0],
    comisiones: [0],
  },


]

export const CONFIG_VERISURE_DEFAULT: ConfigVerisure = {
  cuotaBase: 62999,
  cuotaUpgrade: 5999,
  ivaPct: 21,

  kits: {
    catalogo: 689999,
    alto:     599999,
    medio:    469999,
    bajo:     369999,
    jefe:     199999,
    gerente:  149999,
  },

  upgrades: {
    catalogo:       299999,
    alto:           199999,
    medioBajo:      99999,
    cuotaAdicional: 5999,
  },

  comisiones: {
    catalogo_RE: 140000,
    catalogo_RP: 200000,
    alto_RE:     70000,
    alto_RP:     100000,
    medio_RE:    35000,
    medio_RP:    50000,
    bajo_RE:     0,
    bajo_RP:     0,
  },

  promos: [
    { id: 'p1', label: 'Básico',                 precio: 249999, descripcion: '6/12 cuotas',               activa: true },
    { id: 'p2', label: 'Básico + 3 ShockSensors', precio: 299999, descripcion: '3 ShockSensors de regalo',  activa: true },
    { id: 'p3', label: 'Básico + Upgrade',         precio: 349999, descripcion: 'Con upgrade incluido',     activa: true },
  ],

  dispositivos: DISPOSITIVOS_DEFAULT,

  bonoPerformance: [
    { ventas: 8,  monto: 170000 },
    { ventas: 10, monto: 300000 },
    { ventas: 12, monto: 500000 },
  ],
  bonoPerformanceExtra: 80000,

  bonoRP: [
    { rp: 5, monto: 300000 },
    { rp: 7, monto: 600000 },
  ],
  bonoRPExtra: 100000,

  bonoExpress: [
    { express: 2, monto: 40000 },
    { express: 4, monto: 100000 },
    { express: 8, monto: 250000 },
  ],

  bonoInstalacionRP:          10000,
  bonoInstalacionJefeGerente: 40000,
  xvenConCertificado:         -60000,
  xvenSinCertificado:         -80000,
}
