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

// ── HELPER: convierte Timestamp o Date a Date nativo ──
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
