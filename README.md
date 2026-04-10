# Clozr — CRM para equipos de ventas

La herramienta que entiende cómo vendés.

## Stack

- **Next.js 14** — framework React con App Router
- **Firebase** — autenticación + Firestore
- **Tailwind CSS** — estilos
- **Zustand** — estado global
- **Vercel** — hosting

## Setup local

### 1. Clonar el repo
```bash
git clone https://github.com/TU_USUARIO/clozr.git
cd clozr
npm install
```

### 2. Configurar Firebase

1. Ir a [firebase.google.com](https://firebase.google.com) → crear proyecto `clozr`
2. Agregar una app web
3. Copiar las credenciales
4. Crear el archivo `.env.local` basado en `.env.local.example`

```bash
cp .env.local.example .env.local
# Completar con tus credenciales de Firebase
```

### 3. Configurar Firebase Auth y Firestore

En la consola de Firebase:
- **Authentication** → Sign-in method → habilitar Google y Email/Password
- **Firestore Database** → Crear base de datos → modo producción

### 4. Reglas de Firestore

Ir a Firestore → Reglas y pegar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuario solo puede leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Workspace accesible solo para miembros
    match /workspaces/{workspaceId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.miembros;
      allow create: if request.auth != null;
      // Subcolecciones del workspace
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.miembros;
      }
    }
  }
}
```

### 5. Correr en desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Conectar el repo de GitHub en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno de Firebase en Vercel → Settings → Environment Variables
3. Deploy automático en cada push a `main`

## Estructura del proyecto

```
src/
├── app/
│   ├── auth/           → Login / Registro
│   ├── dashboard/      → Selector de workspaces
│   └── workspace/
│       └── [workspaceId]/
│           ├── resumen/     → Métricas y resumen del día
│           ├── clientes/    → Gestión de clientes
│           ├── catalogo/    → Productos y precios
│           ├── presupuesto/ → Cotización rápida + WA
│           ├── ventas/      → Registro de ventas
│           └── tareas/      → Checklist diario
├── components/         → Componentes reutilizables
├── lib/
│   ├── firebase.ts     → Inicialización Firebase
│   └── services.ts     → Funciones CRUD
├── store/              → Estado global (Zustand)
└── types/              → TypeScript types
```

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Workspaces | Múltiples negocios en una sola app |
| Clientes | Final, revendedor, mayorista — con estados |
| Catálogo | Nuevos y usados — precios por tipo de cliente |
| Cotización | Generador de presupuesto + mensaje WhatsApp |
| Ventas | Registro y métricas del mes |
| Tareas | Checklist diario con frecuencias |

---

Construido con ❤️ para equipos de ventas que trabajan en serio.
