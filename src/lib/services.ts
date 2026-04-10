import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
  onSnapshot, type Unsubscribe
} from 'firebase/firestore'
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  GoogleAuthProvider, onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth'
import { auth, db } from './firebase'
import type { Workspace, Cliente, Producto, Venta, Tarea, User } from '@/types'

// ── AUTH ──
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      const { signInWithRedirect } = await import('firebase/auth')
      return signInWithRedirect(auth, googleProvider)
    }
    throw error
  }
}

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const logOut = () => signOut(auth)

export const onAuthChange = (cb: (user: FirebaseUser | null) => void): Unsubscribe =>
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
    where('miembros', 'array-contains', userId),
    orderBy('createdAt', 'desc')
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

// ── CLIENTES ──
export const getClientes = async (workspaceId: string): Promise<Cliente[]> => {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'clientes'),
    orderBy('nombre', 'asc')
  )
  const snap = await getDocs(q)
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

// ── PRODUCTOS / CATÁLOGO ──
export const getProductos = async (workspaceId: string): Promise<Producto[]> => {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'catalogo'),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto))
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
  const q = query(
    collection(db, 'workspaces', workspaceId, 'ventas'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
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
  const q = query(
    collection(db, 'workspaces', workspaceId, 'tareas'),
    orderBy('orden', 'asc')
  )
  const snap = await getDocs(q)
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
