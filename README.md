# Clozr — CRM para equipos de ventas

**URL producción:** https://clozr.vercel.app  
**Repositorio:** https://github.com/carlosjaviergaleano1995-coder/Clozr  
**Firebase project:** clozr-77ee3

---

## Stack

- Next.js 14 + TypeScript
- Firebase (Auth + Firestore)
- Tailwind CSS
- Zustand (estado global)
- Deploy: Vercel (auto-deploy en push a `main`)

## Estructura

```
src/
├── app/
│   ├── auth/               Login con Google y email
│   ├── dashboard/          Selector de workspaces
│   └── workspace/[id]/
│       ├── layout.tsx      Nav + header del workspace
│       ├── resumen/        Métricas del mes
│       ├── clientes/       CRUD clientes
│       ├── catalogo/       Productos (tipo Productos/Mixto)
│       ├── presupuesto/    Cotización WhatsApp (tipo Productos/Mixto)
│       ├── verisure/       Calculadora Verisure (tipo Servicios)
│       ├── ventas/         Registro de ventas
│       └── tareas/         Rutina diaria + tareas puntuales
├── components/
│   ├── AuthProvider.tsx    Manejo de sesión Firebase
│   ├── ClozrLogo.tsx       Logo SVG + ícono Z
│   └── Icon.tsx            Iconos custom SVG
├── lib/
│   ├── firebase.ts         Inicialización Firebase
│   ├── services.ts         Todas las operaciones Firestore/Auth
│   └── verisure-defaults.ts Precios y config default Verisure
├── store/index.ts          Zustand: auth + workspace state
└── types/index.ts          Tipos TypeScript globales
```

## Tipos de workspace

| Tipo | Módulos activos |
|------|----------------|
| Servicios | Resumen, Clientes, Calc (Verisure), Ventas, Tareas |
| Productos | Resumen, Clientes, Catálogo, Cotizar, Ventas, Tareas |
| Mixto | Todos |

## Variables de entorno

En Vercel y `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Assets

- `/public/devices/` — Imágenes de dispositivos Verisure (sin fondo)
- `/public/icons/` — Iconos SVG custom

## Fases de desarrollo

- ✅ **Fase 1** — Core CRM (auth, workspaces, clientes, catálogo, ventas, tareas, resumen)
- ✅ **Fase 2A** — Calculadora Verisure (kits, promos, extras, bonos, mensajes)
- 🔜 **Fase 2B** — iPhone Club (lista USD, broadcast WhatsApp, revendedores)
- 🔜 **Fase 2C** — Multi-usuario (owner + miembros por workspace)
