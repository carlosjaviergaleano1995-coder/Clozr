import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp,
  type Timestamp
} from 'firebase/firestore'
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth'
import { auth, db } from './firebase'
import type { Workspace, Cliente, Producto, Venta, Tarea, User, ConfigVerisure } from '@/types'
import { CONFIG_VERISURE_DEFAULT } from './verisure-defaults'

// ── AUTH ──
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const signInWithGoogle = async () => {
  // Siempre popup — el redirect falla en Chrome mobile con storage particionado
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (error: any) {
    // En popup bloqueado mostramos instrucción al usuario, no hacemos redirect
    if (error.code === 'auth/popup-blocked') {
      throw new Error('popup-blocked')
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('popup-closed')
    }
    throw error
  }
}

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const logOut = () => signOut(auth)

export const onAuthChange = (cb: (user: FirebaseUser | null) => void) =>
  onAuthStateChanged(auth, cb)

export const saveUserProfile = async (user: FirebaseUser) => {
  const ref = doc(db, 'users', user.uid)
  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// ── WORKSPACES ──
export const getWorkspaces = async (userId: string): Promise<Workspace[]> => {
  const q = query(
    collection(db, 'workspaces'),
    where('miembros', 'array-contains', userId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Workspace))
}

export const createWorkspace = async (
  data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>,
  ownerUser?: { uid: string; email: string; displayName: string; photoURL?: string }
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces'), {
    ...cleanForFirestore(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  // Registrar owner como miembro automáticamente
  if (ownerUser) {
    await setDoc(doc(db, 'workspaces', ref.id, 'members', ownerUser.uid), {
      workspaceId: ref.id,
      role: 'owner',
      email: ownerUser.email,
      displayName: ownerUser.displayName,
      photoURL: ownerUser.photoURL ?? null,
      joinedAt: serverTimestamp(),
    })
  }
  return ref.id
}

export const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
  await updateDoc(doc(db, 'workspaces', id), {
    ...cleanForFirestore(data),
    updatedAt: serverTimestamp(),
  })
}

export const deleteWorkspace = async (id: string) => {
  await deleteDoc(doc(db, 'workspaces', id))
}

// ── HELPER: elimina undefined de un objeto antes de enviarlo a Firestore ──────
// Firestore no acepta undefined — reemplaza por null
export function cleanForFirestore<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : v])
  ) as T
}
export const toDate = (value: Timestamp | Date | string | null | undefined): Date => {
  if (!value) return new Date()
  if (typeof (value as Timestamp).toDate === 'function') return (value as Timestamp).toDate()
  if (value instanceof Date) return value
  return new Date(value as string)
}

// ── CLIENTES ──
export const getClientes = async (workspaceId: string): Promise<Cliente[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'clientes'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))
}

export const createCliente = async (workspaceId: string, data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'clientes'), {
    ...cleanForFirestore(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateCliente = async (workspaceId: string, clienteId: string, data: Partial<Cliente>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'clientes', clienteId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deleteCliente = async (workspaceId: string, clienteId: string) => {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'clientes', clienteId))
}

// ── PRODUCTOS ──
export const getProductos = async (workspaceId: string): Promise<Producto[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'catalogo'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Producto))
    .filter(p => p.activo !== false)
}

export const createProducto = async (workspaceId: string, data: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'catalogo'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateProducto = async (workspaceId: string, productoId: string, data: Partial<Producto>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'catalogo', productoId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deleteProducto = async (workspaceId: string, productoId: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'catalogo', productoId), {
    activo: false,
    updatedAt: serverTimestamp(),
  })
}

// ── VENTAS ──
export const getVentas = async (workspaceId: string): Promise<Venta[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'ventas'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Venta))
}

export const createVenta = async (workspaceId: string, data: Omit<Venta, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'ventas'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// ── TAREAS ──
export const getTareas = async (workspaceId: string): Promise<Tarea[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'tareas'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tarea))
}

export const createTarea = async (workspaceId: string, data: Omit<Tarea, 'id' | 'createdAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'tareas'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const toggleTarea = async (workspaceId: string, tareaId: string, completada: boolean) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'tareas', tareaId), {
    completada,
    fechaCompletada: completada ? serverTimestamp() : null,
  })
}

export const deleteTarea = async (workspaceId: string, tareaId: string) => {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'tareas', tareaId))
}

// ── VERISURE CONFIG ──
export const getConfigVerisure = async (workspaceId: string): Promise<ConfigVerisure> => {
  const ref = doc(db, 'workspaces', workspaceId, 'config', 'verisure')
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as ConfigVerisure
  return CONFIG_VERISURE_DEFAULT
}

export const saveConfigVerisure = async (workspaceId: string, config: ConfigVerisure) => {
  const ref = doc(db, 'workspaces', workspaceId, 'config', 'verisure')
  await setDoc(ref, config)
}

// ── IPHONE CLUB ──────────────────────────────────────────────────────────────
import type {
  StockIPhone, StockAccesorio, StockOtroApple,
  Revendedor, ConfigIPhoneClub, DolarConfig
} from '@/types'

// Dólar
export const getDolarConfig = async (workspaceId: string): Promise<DolarConfig> => {
  const ref = doc(db, 'workspaces', workspaceId, 'config', 'dolar')
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as DolarConfig
  return { valor: 1200, actualizadoAt: new Date(), modoManual: false }
}

export const saveDolarConfig = async (workspaceId: string, data: DolarConfig) => {
  await setDoc(doc(db, 'workspaces', workspaceId, 'config', 'dolar'), data)
}

export const fetchDolarBlue = async (): Promise<number | null> => {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue')
    const data = await res.json()
    return data.venta ?? null
  } catch { return null }
}

// Config iPhone Club
export const getConfigIPhoneClub = async (workspaceId: string): Promise<ConfigIPhoneClub> => {
  const ref = doc(db, 'workspaces', workspaceId, 'config', 'iphone_club')
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as ConfigIPhoneClub
  return {
    margenFinal: 20,
    formasPago: { usdt: -0.5, transferencia_ars: 5, manchados: -10 },
    pieTextoUsados: '🔹Entrega inmediata. 🔹Abonando la totalidad en USDT (-0,5%)\n🔹Transferencia en pesos (5%)\n🔹Garantía de 30 dias.\n❌ No aceptamos billetes rotos.\n❌ Billetes manchados o cara chica (-10%).',
    pieTextoNuevos: '🔹Entrega inmediata.\n🔹Abonando la totalidad en USDT (-0,5%)\n🔹Transferencia en pesos (5%)\n🔹Garantía oficial de Apple, sin excepción‼️\n❌ No aceptamos billetes rotos.\n❌ Billetes manchados o cara chica (-10%).',
    dolar: { valor: 1200, actualizadoAt: new Date(), modoManual: false },
  }
}

export const saveConfigIPhoneClub = async (workspaceId: string, config: ConfigIPhoneClub) => {
  await setDoc(doc(db, 'workspaces', workspaceId, 'config', 'iphone_club'), config)
}

// Stock iPhones
export const getStockiPhones = async (workspaceId: string): Promise<StockIPhone[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'stock_iphones'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockIPhone)).filter(s => s.activo !== false)
}

export const createStockiPhone = async (workspaceId: string, data: Omit<StockIPhone, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'stock_iphones'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateStockiPhone = async (workspaceId: string, id: string, data: Partial<StockIPhone>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'stock_iphones', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const deleteStockiPhone = async (workspaceId: string, id: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'stock_iphones', id), {
    activo: false, updatedAt: serverTimestamp(),
  })
}

// Stock Accesorios
export const getStockAccesorios = async (workspaceId: string): Promise<StockAccesorio[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'stock_accesorios'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockAccesorio)).filter(s => s.activo !== false)
}

export const createStockAccesorio = async (workspaceId: string, data: Omit<StockAccesorio, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'stock_accesorios'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateStockAccesorio = async (workspaceId: string, id: string, data: Partial<StockAccesorio>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'stock_accesorios', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

// Stock Otros Apple
export const getStockOtrosApple = async (workspaceId: string): Promise<StockOtroApple[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'stock_otros'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOtroApple)).filter(s => s.activo !== false)
}

export const createStockOtroApple = async (workspaceId: string, data: Omit<StockOtroApple, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'stock_otros'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateStockOtroApple = async (workspaceId: string, id: string, data: Partial<StockOtroApple>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'stock_otros', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

// Revendedores
export const getRevendedores = async (workspaceId: string): Promise<Revendedor[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'revendedores'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Revendedor))
}

export const createRevendedor = async (workspaceId: string, data: Omit<Revendedor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'revendedores'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateRevendedor = async (workspaceId: string, id: string, data: Partial<Revendedor>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'revendedores', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const deleteRevendedor = async (workspaceId: string, id: string) => {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'revendedores', id))
}

// Stock Accesorios (actualizar)
export const deleteStockAccesorio = async (workspaceId: string, id: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'stock_accesorios', id), {
    activo: false, updatedAt: serverTimestamp(),
  })
}

// ════════════════════════════════════════════════════════════════════════════
// INVENTARIO UNIFICADO (Producto2)
// ════════════════════════════════════════════════════════════════════════════
import type {
  Producto2, MovimientoStock, Venta2, OrdenTrabajo, Turno
} from '@/types'

// ── Generador de códigos correlativos ─────────────────────────────────────────
export const generarCodigo = async (
  workspaceId: string,
  prefijo: 'VTA' | 'OT' | 'T'
): Promise<string> => {
  const hoy = new Date()
  const fecha = prefijo !== 'T'
    ? hoy.toISOString().slice(0,10).replace(/-/g,'')
    : hoy.toISOString().slice(0,10)
  const colNombre = prefijo === 'VTA' ? 'ventas2'
    : prefijo === 'OT' ? 'ordenes_trabajo'
    : 'turnos'
  const col = collection(db, 'workspaces', workspaceId, colNombre)
  const snap = await getDocs(col)
  // Contar los del día de hoy
  const hoyStr = hoy.toISOString().slice(0,10).replace(/-/g,'')
  const hoyCount = snap.docs.filter(d => {
    const data = d.data()
    return data.codigo?.includes(prefijo === 'T' ? hoy.toISOString().slice(0,10) : hoyStr)
  }).length
  const num = String(hoyCount + 1).padStart(3, '0')
  return prefijo === 'T' ? `T-${num}` : `${prefijo}-${hoyStr}-${num}`
}

// ── Productos ─────────────────────────────────────────────────────────────────
export const getProductos2 = async (workspaceId: string): Promise<Producto2[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'inventario'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Producto2))
    .filter(p => p.activo !== false)
}

export const createProducto2 = async (
  workspaceId: string,
  data: Omit<Producto2, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'inventario'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateProducto2 = async (
  workspaceId: string, id: string, data: Partial<Producto2>
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'inventario', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const deleteProducto2 = async (workspaceId: string, id: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'inventario', id), {
    activo: false, updatedAt: serverTimestamp(),
  })
}

// ── Movimientos de stock ──────────────────────────────────────────────────────
export const getMovimientos = async (workspaceId: string): Promise<MovimientoStock[]> => {
  const snap = await getDocs(
    query(collection(db, 'workspaces', workspaceId, 'movimientos'),
    where('workspaceId', '==', workspaceId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MovimientoStock))
}

export const registrarMovimiento = async (
  workspaceId: string,
  data: Omit<MovimientoStock, 'id' | 'createdAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'movimientos'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(),
  })
  return ref.id
}

// ── Ventas2 ───────────────────────────────────────────────────────────────────
export const getVentas2 = async (workspaceId: string): Promise<Venta2[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'ventas2'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Venta2))
}

export const createVenta2 = async (
  workspaceId: string,
  data: Omit<Venta2, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'ventas2'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

// ── Órdenes de trabajo ────────────────────────────────────────────────────────
export const getOrdenesTrabajo = async (workspaceId: string): Promise<OrdenTrabajo[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'ordenes_trabajo'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrdenTrabajo))
}

export const createOrdenTrabajo = async (
  workspaceId: string,
  data: Omit<OrdenTrabajo, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'ordenes_trabajo'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateOrdenTrabajo = async (
  workspaceId: string, id: string, data: Partial<OrdenTrabajo>
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'ordenes_trabajo', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

// ── Turnos ────────────────────────────────────────────────────────────────────
export const getTurnosHoy = async (workspaceId: string): Promise<Turno[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'turnos'))
  const hoy = new Date().toISOString().slice(0, 10)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Turno))
    .filter(t => {
      // Walk-ins de hoy
      const creadoHoy = toDate(t.createdAt).toISOString().slice(0, 10) === hoy
      // Agendados para hoy
      const agendadoHoy = t.esAgendado && t.fechaHora
        ? toDate(t.fechaHora).toISOString().slice(0, 10) === hoy
        : false
      return creadoHoy || agendadoHoy
    })
}

export const getTurnosFuturos = async (workspaceId: string): Promise<Turno[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'turnos'))
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Turno))
    .filter(t => t.esAgendado && t.fechaHora && toDate(t.fechaHora) > hoy && !t.atendido)
    .sort((a, b) => toDate(a.fechaHora!).getTime() - toDate(b.fechaHora!).getTime())
}

// Todos los turnos pasados (antes de hoy), paginados por mes
export const getTurnosHistorial = async (workspaceId: string): Promise<Turno[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'turnos'))
  const hoy = new Date().toISOString().slice(0, 10)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Turno))
    .filter(t => {
      const fecha = t.esAgendado && t.fechaHora
        ? toDate(t.fechaHora).toISOString().slice(0, 10)
        : toDate(t.createdAt).toISOString().slice(0, 10)
      return fecha < hoy
    })
    .sort((a, b) => {
      const fa = a.esAgendado && a.fechaHora ? toDate(a.fechaHora) : toDate(a.createdAt)
      const fb = b.esAgendado && b.fechaHora ? toDate(b.fechaHora) : toDate(b.createdAt)
      return fb.getTime() - fa.getTime()
    })
}

export const createTurno = async (
  workspaceId: string,
  data: Omit<Turno, 'id' | 'createdAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'turnos'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(),
  })
  return ref.id
}

export const updateTurno = async (
  workspaceId: string, id: string, data: Partial<Turno>
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'turnos', id), cleanForFirestore(data))
}

// ════════════════════════════════════════════════════════════════════════════
// CAJA
// ════════════════════════════════════════════════════════════════════════════
import type { MovimientoCaja, CajaDia } from '@/types'

export const getCajaHoy = async (workspaceId: string): Promise<CajaDia | null> => {
  const hoy = new Date().toISOString().slice(0, 10)
  const snap = await getDocs(
    query(collection(db, 'workspaces', workspaceId, 'cajas'),
    where('fecha', '==', hoy))
  )
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as CajaDia
}

export const getCajasMes = async (workspaceId: string): Promise<CajaDia[]> => {
  const hoy = new Date()
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
  const snap = await getDocs(
    query(collection(db, 'workspaces', workspaceId, 'cajas'),
    where('fecha', '>=', desde))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CajaDia))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export const abrirCaja = async (
  workspaceId: string,
  saldoInicialUSD: number,
  saldoInicialARS: number,
  uid: string
): Promise<string> => {
  const hoy = new Date().toISOString().slice(0, 10)
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'cajas'), {
    workspaceId, fecha: hoy, abierta: true,
    saldoInicialUSD, saldoInicialARS,
    abiertaPor: uid, creadaAt: serverTimestamp(),
  })
  return ref.id
}

export const cerrarCaja = async (
  workspaceId: string,
  cajaId: string,
  saldoCierreUSD: number,
  saldoCierreARS: number,
  notas: string,
  uid: string
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'cajas', cajaId), {
    abierta: false, saldoCierreUSD, saldoCierreARS,
    notasCierre: notas || null, cerradaPor: uid, cerradaAt: serverTimestamp(),
  })
}

export const getMovimientosCaja = async (
  workspaceId: string, fecha?: string
): Promise<MovimientoCaja[]> => {
  const snap = await getDocs(
    collection(db, 'workspaces', workspaceId, 'movimientos_caja')
  )
  const todos = snap.docs.map(d => ({ id: d.id, ...d.data() } as MovimientoCaja))
  if (fecha) return todos.filter(m => toDate(m.createdAt).toISOString().slice(0,10) === fecha)
    .sort((a,b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
  return todos.sort((a,b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
}

export const agregarMovimientoCaja = async (
  workspaceId: string,
  data: Omit<MovimientoCaja, 'id' | 'createdAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'movimientos_caja'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(),
  })
  return ref.id
}

// ── NEGOCIOS ──────────────────────────────────────────────────────────────────
import type { Negocio } from '@/types'

export const getNegocios = async (userId: string): Promise<Negocio[]> => {
  const snap = await getDocs(
    query(collection(db, 'negocios'), where('ownerId', '==', userId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Negocio))
}

export const createNegocio = async (
  data: Omit<Negocio, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'negocios'), {
    ...cleanForFirestore(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateNegocio = async (id: string, data: Partial<Negocio>) => {
  await updateDoc(doc(db, 'negocios', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const deleteNegocio = async (id: string) => {
  await deleteDoc(doc(db, 'negocios', id))
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATES Y LICENCIAS
// ════════════════════════════════════════════════════════════════════════════
import type { Template, Licencia, LicenciaEstado } from '@/types'

// ── Templates ──────────────────────────────────────────────────────────────
export const getTemplates = async (): Promise<Template[]> => {
  const snap = await getDocs(collection(db, 'templates'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template))
    .filter(t => t.activo)
}

export const createTemplate = async (data: Omit<Template, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'templates'), cleanForFirestore(data))
  return ref.id
}

export const updateTemplate = async (id: string, data: Partial<Template>) => {
  await updateDoc(doc(db, 'templates', id), cleanForFirestore(data))
}

// ── Licencias ──────────────────────────────────────────────────────────────
const generarCodigoLicencia = (slug: string): string => {
  const prefix = slug.slice(0, 3).toUpperCase()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${rand(4)}-${rand(4)}`
}

export const getLicencias = async (templateId?: string): Promise<Licencia[]> => {
  const snap = await getDocs(collection(db, 'licencias'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Licencia))
  return templateId ? all.filter(l => l.templateId === templateId) : all
}

export const getLicenciasUsuario = async (uid: string): Promise<Licencia[]> => {
  const snap = await getDocs(
    query(collection(db, 'licencias'),
    where('activadaPor', '==', uid),
    where('estado', '==', 'activada'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Licencia))
}

export const crearLicencia = async (
  templateId: string, templateSlug: string, adminUid: string, notas?: string
): Promise<Licencia> => {
  const codigo = generarCodigoLicencia(templateSlug)
  const data: Omit<Licencia, 'id'> = {
    codigo, templateId, templateSlug,
    estado: 'disponible',
    creadaPor: adminUid,
    creadaEl: new Date(),
    notas: notas ?? null as any,
  }
  const ref = await addDoc(collection(db, 'licencias'), cleanForFirestore(data))
  return { id: ref.id, ...data }
}

export const activarLicencia = async (
  codigo: string, uid: string, displayName: string
): Promise<{ ok: boolean; licencia?: Licencia; error?: string }> => {
  // Buscar el código
  const snap = await getDocs(
    query(collection(db, 'licencias'), where('codigo', '==', codigo.toUpperCase().trim()))
  )
  if (snap.empty) return { ok: false, error: 'Código inválido' }

  const docRef = snap.docs[0]
  const licencia = { id: docRef.id, ...docRef.data() } as Licencia

  if (licencia.estado === 'activada') return { ok: false, error: 'Este código ya fue activado' }
  if (licencia.estado === 'revocada') return { ok: false, error: 'Este código fue revocado' }
  if (licencia.estado === 'vencida')  return { ok: false, error: 'Este código está vencido' }

  await updateDoc(docRef.ref, {
    estado: 'activada',
    activadaPor: uid,
    activadaEl: serverTimestamp(),
    activadaNombre: displayName,
  })

  return { ok: true, licencia: { ...licencia, estado: 'activada', activadaPor: uid, activadaNombre: displayName } }
}

export const revocarLicencia = async (id: string) => {
  await updateDoc(doc(db, 'licencias', id), { estado: 'revocada' })
}

// ════════════════════════════════════════════════════════════════════════════
// PLANTILLAS DE MENSAJES
// ════════════════════════════════════════════════════════════════════════════
import type { PlantillaMensaje } from '@/types'

export const getPlantillas = async (workspaceId: string): Promise<PlantillaMensaje[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'plantillas'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PlantillaMensaje))
    .filter(p => p.activa !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

export const createPlantilla = async (
  workspaceId: string,
  data: Omit<PlantillaMensaje, 'id' | 'creadoAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'plantillas'), {
    ...cleanForFirestore(data), creadoAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updatePlantilla = async (
  workspaceId: string, id: string, data: Partial<PlantillaMensaje>
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'plantillas', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const deletePlantilla = async (workspaceId: string, id: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'plantillas', id), { activa: false })
}

// Inicializar plantillas base si no existen
export const initPlantillasVerisure = async (workspaceId: string) => {
  const existentes = await getPlantillas(workspaceId)
  if (existentes.length > 0) return

  const PLANTILLAS_BASE = [
    {
      momento: 'primer_contacto' as const,
      nombre: 'Primer contacto',
      orden: 1,
      texto: `Hola {nombre}! 👋 Te contacto de parte de Verisure, la empresa líder en seguridad. Me gustaría contarte sobre nuestros sistemas de alarma con monitoreo 24hs. ¿Tenés unos minutos para charlar? 🛡️`,
    },
    {
      momento: 'presupuesto' as const,
      nombre: 'Envío de presupuesto',
      orden: 2,
      texto: `Hola {nombre}! Te paso el presupuesto que armamos 📋\n\n🛡️ Kit: {kit}\n💰 Precio: {precio}\n\nIncluye instalación profesional y monitoreo 24/7. ¿Te parece bien si coordinamos una visita sin compromiso?`,
    },
    {
      momento: 'seguimiento' as const,
      nombre: 'Seguimiento',
      orden: 3,
      texto: `Hola {nombre}! ¿Cómo estás? Te escribo para ver si tuviste la posibilidad de pensar en la propuesta de seguridad que te pasé. Cualquier consulta estoy a disposición 😊`,
    },
    {
      momento: 'confirmacion_visita' as const,
      nombre: 'Confirmación de visita',
      orden: 4,
      texto: `Hola {nombre}! Te confirmo nuestra visita para {fecha} a las {hora} en {direccion}. Voy a llevar toda la información del sistema. ¡Nos vemos! 👋`,
    },
    {
      momento: 'recordatorio' as const,
      nombre: 'Recordatorio de visita',
      orden: 5,
      texto: `Hola {nombre}! Te recuerdo que mañana tenemos coordinado vernos a las {hora}. ¿Seguimos en pie? 😊`,
    },
    {
      momento: 'post_instalacion' as const,
      nombre: 'Post instalación',
      orden: 6,
      texto: `Hola {nombre}! ¿Cómo quedaron con el sistema? Espero que todo haya salido perfecto. Ante cualquier consulta o inconveniente no dudes en escribirme. ¡Bienvenido a la familia Verisure! 🛡️✅`,
    },
    {
      momento: 'cobranza' as const,
      nombre: 'Cobranza',
      orden: 7,
      texto: `Hola {nombre}! Te escribo porque tengo pendiente coordinar el pago de la instalación. ¿Cuándo te vendría bien? Podemos hacer transferencia o efectivo 💰`,
    },
    {
      momento: 'promocion' as const,
      nombre: 'Promoción especial',
      orden: 8,
      texto: `Hola {nombre}! 🔥 Tenemos una promo especial por tiempo limitado. Sistema completo con instalación incluida a precio increíble. ¿Te interesa que te pase los detalles?`,
    },
  ]

  for (const p of PLANTILLAS_BASE) {
    await createPlantilla(workspaceId, { ...p, workspaceId, activa: true })
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PIPELINE VERISURE
// ════════════════════════════════════════════════════════════════════════════
import type { PipelineCliente, NotaVisita, EstadoPipeline } from '@/types'

export const getPipeline = async (workspaceId: string): Promise<PipelineCliente[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'pipeline'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PipelineCliente))
    .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime())
}

export const getPipelineByCliente = async (workspaceId: string, clienteId: string): Promise<PipelineCliente | null> => {
  const snap = await getDocs(
    query(collection(db, 'workspaces', workspaceId, 'pipeline'),
    where('clienteId', '==', clienteId))
  )
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as PipelineCliente
}

export const createPipeline = async (
  workspaceId: string,
  data: Omit<PipelineCliente, 'id' | 'creadoAt' | 'updatedAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'pipeline'), {
    ...cleanForFirestore(data), creadoAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updatePipeline = async (
  workspaceId: string, id: string, data: Partial<PipelineCliente>
) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'pipeline', id), {
    ...cleanForFirestore(data), updatedAt: serverTimestamp(),
  })
}

export const agregarNotaVisita = async (
  workspaceId: string, pipelineId: string,
  nota: Omit<NotaVisita, never>, notasActuales: NotaVisita[]
) => {
  const nuevasNotas = [nota, ...notasActuales]
  await updateDoc(doc(db, 'workspaces', workspaceId, 'pipeline', pipelineId), {
    notas: cleanForFirestore(nuevasNotas),
    updatedAt: serverTimestamp(),
  })
  return nuevasNotas
}

// ── MULTI-USUARIO ─────────────────────────────────────────────────────────────
import type { WorkspaceMember, WorkspaceInvite, MemberRole } from '@/types'

// Helpers
const generateToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

// ── Members ───────────────────────────────────────────────────────────────────

export const getMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'members'))
  return snap.docs.map(d => ({ ...d.data(), userId: d.id } as WorkspaceMember))
}

export const getMemberRole = async (workspaceId: string, userId: string): Promise<MemberRole | null> => {
  const snap = await getDoc(doc(db, 'workspaces', workspaceId, 'members', userId))
  if (!snap.exists()) return null
  return (snap.data() as WorkspaceMember).role
}

export const setMemberRole = async (workspaceId: string, userId: string, role: MemberRole) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'members', userId), { role })
}

export const removeMember = async (workspaceId: string, userId: string) => {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', userId))
  // También sacar del array miembros del workspace
  const wsRef = doc(db, 'workspaces', workspaceId)
  const wsSnap = await getDoc(wsRef)
  if (wsSnap.exists()) {
    const miembros = (wsSnap.data().miembros ?? []).filter((id: string) => id !== userId)
    await updateDoc(wsRef, { miembros })
  }
}

// ── Invites ───────────────────────────────────────────────────────────────────

export const getInvites = async (workspaceId: string): Promise<WorkspaceInvite[]> => {
  const snap = await getDocs(
    query(collection(db, 'invites'), where('workspaceId', '==', workspaceId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceInvite))
}

export const createInvite = async (
  workspaceId: string,
  workspaceNombre: string,
  workspaceEmoji: string,
  createdBy: string,
  role: MemberRole,
  email?: string
): Promise<WorkspaceInvite> => {
  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 días

  const data = {
    workspaceId,
    workspaceNombre,
    workspaceEmoji,
    role,
    token,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt,
    status: 'pending' as const,
    ...(email ? { email } : {}),
  }

  const ref = await addDoc(collection(db, 'invites'), data)
  return { id: ref.id, ...data, createdAt: now }
}

export const revokeInvite = async (inviteId: string) => {
  await updateDoc(doc(db, 'invites', inviteId), { status: 'revoked' })
}

export const getInviteByToken = async (token: string): Promise<WorkspaceInvite | null> => {
  const snap = await getDocs(
    query(collection(db, 'invites'), where('token', '==', token))
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as WorkspaceInvite
}

export const acceptInvite = async (
  invite: WorkspaceInvite,
  user: { uid: string; email: string; displayName: string; photoURL?: string }
): Promise<void> => {
  // 1. Agregar a members
  await setDoc(doc(db, 'workspaces', invite.workspaceId, 'members', user.uid), {
    workspaceId: invite.workspaceId,
    role: invite.role,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    joinedAt: serverTimestamp(),
  })

  // 2. Agregar al array miembros del workspace
  const wsRef = doc(db, 'workspaces', invite.workspaceId)
  const wsSnap = await getDoc(wsRef)
  if (wsSnap.exists()) {
    const miembros = wsSnap.data().miembros ?? []
    if (!miembros.includes(user.uid)) {
      await updateDoc(wsRef, { miembros: [...miembros, user.uid] })
    }
  }

  // 3. Marcar invite como aceptada
  await updateDoc(doc(db, 'invites', invite.id), {
    status: 'accepted',
    acceptedBy: user.uid,
    acceptedAt: serverTimestamp(),
  })
}

// Al crear workspace, registrar el owner como miembro también
export const registerOwnerAsMember = async (
  workspaceId: string,
  user: { uid: string; email: string; displayName: string; photoURL?: string }
) => {
  await setDoc(doc(db, 'workspaces', workspaceId, 'members', user.uid), {
    workspaceId,
    role: 'owner' as MemberRole,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    joinedAt: serverTimestamp(),
  })
}

// ── VENTAS iPHONE CLUB ────────────────────────────────────────────────────────
import type { VentaIPhone } from '@/types'

export const getVentasIPhone = async (workspaceId: string): Promise<VentaIPhone[]> => {
  const snap = await getDocs(
    query(collection(db, 'workspaces', workspaceId, 'ventas_iphone'),
    where('workspaceId', '==', workspaceId))
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as VentaIPhone))
    .sort((a, b) => {
      const fa = a.fecha instanceof Date ? a.fecha : new Date(((a.fecha as any)?.seconds ?? 0) * 1000)
      const fb = b.fecha instanceof Date ? b.fecha : new Date(((b.fecha as any)?.seconds ?? 0) * 1000)
      return fb.getTime() - fa.getTime()
    })
}

export const createVentaIPhone = async (
  workspaceId: string,
  data: Omit<VentaIPhone, 'id' | 'creadoAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'ventas_iphone'), {
    ...cleanForFirestore(data),
    creadoAt: serverTimestamp(),
  })
  return ref.id
}

export const deleteVentaIPhone = async (workspaceId: string, id: string) => {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'ventas_iphone', id))
}

// ── LISTAS iPHONE CLUB ────────────────────────────────────────────────────────
import type { ListaIPhone } from '@/types'

export const getListas = async (workspaceId: string): Promise<ListaIPhone[]> => {
  const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'listas_iphone'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ListaIPhone))
    .filter(l => l.activa !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

export const createLista = async (workspaceId: string, data: Omit<ListaIPhone, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces', workspaceId, 'listas_iphone'), {
    ...cleanForFirestore(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateLista = async (workspaceId: string, id: string, data: Partial<ListaIPhone>) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'listas_iphone', id), {
    ...cleanForFirestore(data),
    updatedAt: serverTimestamp(),
  })
}

export const deleteLista = async (workspaceId: string, id: string) => {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'listas_iphone', id), { activa: false, updatedAt: serverTimestamp() })
}
