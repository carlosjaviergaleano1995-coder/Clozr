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

export const createWorkspace = async (data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'workspaces'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
  await updateDoc(doc(db, 'workspaces', id), {
    ...data,
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
    ...data,
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
    .filter(t => t.createdAt?.toString().includes(hoy) || t.codigo?.includes('T-'))
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
