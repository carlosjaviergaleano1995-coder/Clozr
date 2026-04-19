# CLOZR — ESTRATEGIA DE TRANSICIÓN Y DEUDA LEGACY

Documento de referencia para la migración de arquitectura vieja → nueva.
**No ejecutar migraciones destructivas sin revisar este doc.**

---

## MODELOS CANÓNICOS

Toda la UI nueva consume estos tipos. Nunca importar tipos de `@/types/index.ts` en componentes nuevos.

| Dominio | Tipo canónico | Definido en |
|---|---|---|
| Customer | `Customer` | `features/customers/types.ts` |
| PipelineItem | `PipelineItem` | `features/pipeline/types.ts` |
| Sale | `Sale` | `features/sales/types.ts` |
| Task | `Task` | `features/tasks/types.ts` |
| Membership | `Membership` | `features/team/types.ts` |
| WorkspaceInvitation | `WorkspaceInvitation` | `features/invitations/types.ts` |

---

## COLECCIONES FIRESTORE — MAPA COMPLETO

### Colecciones activas (la UI nueva lee/escribe aquí)

```
workspaces/{wid}/clientes       → Customer canónico
workspaces/{wid}/pipeline       → PipelineItem canónico (convive con legacy)
workspaces/{wid}/ventas         → Sale canónico (convive con legacy)
workspaces/{wid}/tasks          → Task canónico (colección nueva, vacía en mayoría de workspaces)
workspaces/{wid}/members        → Membership (sin cambios)
workspaces/{wid}/invitations    → WorkspaceInvitation (nuevo)
workspaces/{wid}/catalog        → CatalogItem (nuevo)
workspaces/{wid}/audit_log      → AuditLog (nuevo)
workspaces/{wid}/aggregate/summary → WorkspaceSummary (nuevo)
```

### Colecciones legacy (solo la UI vieja escribe aquí)

```
workspaces/{wid}/tareas         → Tarea vieja (TareaFrecuencia: diaria/semanal/unica)
                                  MIGRAR A: tasks (cuando se limpie)
                                  BLOQUEANTE: useTasks lee 'tasks', no 'tareas'

workspaces/{wid}/ventas2        → Venta2 (iPhone Club, estructura distinta)
                                  NO MIGRAR: es el sistema iPhone Club, se conserva

workspaces/{wid}/ventas_iphone  → VentaIPhone (ventas del sistema iPhone)
                                  NO MIGRAR: ídem

workspaces/{wid}/movimientos_caja → MovimientoCaja (caja del negocio)
                                  PENDIENTE: sin equivalente canónico aún

workspaces/{wid}/revendedores   → Revendedor (iPhone Club)
                                  NO MIGRAR: específico del sistema

workspaces/{wid}/stock_iphones  → StockIPhone
workspaces/{wid}/stock_accesorios → StockAccesorio
workspaces/{wid}/stock_otros    → StockOtroApple
workspaces/{wid}/listas_iphone  → ListaIPhone
                                  NO MIGRAR: todo es iPhone Club, se conserva como está

workspaces/{wid}/ordenes_trabajo → OrdenTrabajo (servicio técnico)
workspaces/{wid}/turnos         → Turno
workspaces/{wid}/cajas          → CajaDia
                                  PENDIENTE: sin equivalente canónico aún

workspaces/{wid}/plantillas     → PlantillaMensaje
                                  PENDIENTE: features/templates/ sin implementar aún

workspaces/{wid}/catalogo       → Producto (catálogo viejo)
workspaces/{wid}/catalogo_subcategorias → CatalogoSubcategoria
                                  MIGRAR A: catalog (cuando se limpie)
```

---

## SHAPES COEXISTIENDO EN LA MISMA COLECCIÓN

### pipeline (⚠️ crítico)

```
Doc legacy (PipelineCliente):
  clienteId, clienteNombre, estado: EstadoPipeline,
  notas: NotaVisita[], kitInteres?, presupuesto?,
  creadoAt, updatedAt

Doc nuevo (PipelineItem):
  customerId, customerSnapshot, stageId, stageName, stageOrder,
  activities: PipelineActivity[], systemData?,
  status: 'open'|'won'|'lost', lastActivityAt, inactiveDays,
  creadoPor, createdAt, updatedAt
```

**Discriminador:** doc tiene `stageId` → nuevo. Doc tiene `estado` sin `stageId` → legacy.
**Adapter:** `features/pipeline/adapters.ts` → `adaptPipelineDoc()`

### ventas (⚠️ moderado)

```
Doc legacy (Venta):
  clienteId, clienteNombre, items: VentaItem[],
  moneda: 'ARS'|'USD', estado: VentaEstado,
  formaPago?, creadoPor, createdAt, updatedAt

Doc nuevo (Sale):
  customerId, customerName, items: SaleItem[],
  currency: 'ARS'|'USD', pagado: boolean,
  formaPago, creadoPor, createdAt, updatedAt, fecha
```

**Discriminador:** doc tiene `estado` string → legacy. Doc tiene `pagado` boolean → nuevo.
**Adapter:** `features/sales/adapters.ts` → `adaptVentaDoc()`

---

## ESCRITURA CANÓNICA — QUÉ ESCRIBE CADA ACTION

A partir de ahora, toda escritura nueva sigue este contrato:

### createCustomer
- Colección: `clientes`
- Campos nuevos: `searchTokens`, `totalSales: 0`, `referidoPor` (id, no nombre)
- Campo legacy preservado: `referido` (nombre string) — escribe ambos si el usuario lo llena

### createPipelineItem
- Colección: `pipeline`
- Shape: nuevo (con `stageId`, `activities`, `customerSnapshot`)
- NO escribe `estado`, `notas`, `clienteId`, `clienteNombre`

### createSale
- Colección: `ventas`
- Shape: nuevo (con `pagado: boolean`, `currency`, `customerName`, `fecha`)
- NO escribe `estado`, `moneda`, `clienteNombre`

### createTask
- Colección: `tasks` (nueva, separada de `tareas`)
- Shape: nuevo (`tipo: rutina|puntual`, `frecuencia: daily|weekly`)
- NO escribe en `tareas`

---

## PLAN DE MIGRACIÓN — FASES FUTURAS

### Fase A — tareas (baja urgencia, no rompe nada)
```
PROBLEMA: useTasks lee 'tasks', los datos viejos están en 'tareas'
SÍNTOMA: pantalla de tareas muestra vacía para workspaces con datos legacy
SOLUCIÓN: Cloud Function o script que copie docs de 'tareas' → 'tasks'
          con conversión: frecuencia 'diaria'→'daily', 'semanal'→'weekly', 'unica'→tipo 'puntual'
BLOQUEANTE: no hay — la nueva colección 'tasks' está separada
SCRIPT: scripts/migrate-tareas-to-tasks.ts (pendiente crear)
```

### Fase B — pipeline (media urgencia)
```
PROBLEMA: docs legacy en 'pipeline' no tienen inactiveDays, stageId, etc.
SÍNTOMA: alertas de inactividad no son 100% precisas para docs legacy
SOLUCIÓN: Script que migra PipelineCliente → PipelineItem en la misma colección
          (batch update con el mapping del adapter)
BLOQUEANTE: no destructiva — el adapter soporta ambos shapes
SCRIPT: scripts/migrate-pipeline-legacy.ts (pendiente crear)
```

### Fase C — ventas (baja urgencia)
```
PROBLEMA: docs legacy tienen 'estado' en lugar de 'pagado'
SÍNTOMA: filtros por pagado/pendiente no funcionan para docs legacy
SOLUCIÓN: Script que actualiza docs legacy: estado:'cerrada' → pagado:true, resto → pagado:false
BLOQUEANTE: no destructiva — el adapter ya interpreta ambos
SCRIPT: scripts/migrate-ventas-legacy.ts (pendiente crear)
```

### Fase D — ventas2 + ventas_iphone (no urgente, específico iPhone Club)
```
PROBLEMA: datos del sistema iPhone dispersos en 3 colecciones
DECISIÓN: no migrar — son datos del sistema iPhone Club y se conservan como están
          Si en el futuro se quiere unificar: crear un Sale con systemData: { _source: 'iphone' }
```

---

## INVENTARIO DE lib/services — ESTADO DE DEUDA

### ✅ Reemplazado — se puede eliminar cuando se migre la pantalla correspondiente

| Función | Reemplazada por | Pantalla migrada |
|---|---|---|
| `getClientes` | `useCustomers` | ✅ clientes/page.tsx |
| `createCliente` | `createCustomer` | ✅ clientes/page.tsx |
| `updateCliente` | `updateCustomer` | ✅ clientes/page.tsx |
| `deleteCliente` | `deleteCustomer` | ✅ clientes/page.tsx |
| `getPipeline` | `usePipeline` | ✅ pipeline/page.tsx |
| `createPipeline` | `createPipelineItem` | ✅ pipeline/page.tsx |
| `updatePipeline` | `updateStage` / `addActivity` | ✅ pipeline/page.tsx |
| `getTareas` | `useTasks` | ✅ tareas/page.tsx |
| `createTarea` | `createTask` | ✅ tareas/page.tsx |
| `toggleTarea` | `completeTask` | ✅ tareas/page.tsx |
| `deleteTarea` | `deleteTask` | ✅ tareas/page.tsx |
| `getVentas` | `useSales` | ✅ ventas/page.tsx |
| `createVenta` | `createSale` | ✅ ventas/page.tsx |

### 🟡 Sigue vivo — pantalla aún no migrada (no urgente)

| Función | Pantalla que la usa | Plan |
|---|---|---|
| `getVentas` | ventas-verisure, resumen-verisure | Migrar cuando se toque Verisure |
| `getClientes` | presupuesto, resumen-verisure | Migrar cuando se toquen |
| `getPipeline` | resumen-verisure | Migrar cuando se toque |
| `getPipelineByCliente` | clientes/page.tsx (pipeline viejo) | Migrar en Bloque 2 revisión |
| `agregarNotaVisita` | clientes/page.tsx | Ídem |
| `updatePipeline` | clientes/page.tsx (pipeline viejo) | Ídem |
| `getPlantillas` | clientes/page.tsx | Sin reemplazo aún |
| `agregarMovimientoCaja` | clientes/page.tsx (seña) | Sin reemplazo aún |
| `getWorkspaces` | workspace/layout.tsx | Reemplazar con useWorkspace |
| `updateWorkspace` | ajustes/page.tsx | Reemplazar con updateWorkspace action |
| `getMemberRole` | hooks/useMemberRole.ts | Reemplazar con useWorkspaceMembership |

### 🔴 No migrar — iPhone Club (sistema específico, se conserva)

```
getProductos2, createProducto2, updateProducto2, deleteProducto2
getStockiPhones, getStockAccesorios, getStockOtrosApple
getVentasIPhone, createVentaIPhone
getConfigIPhoneClub, saveConfigIPhoneClub
getDolarConfig, saveDolarConfig, fetchDolarBlue
createVenta2, getVentas2
getRevendedores, createRevendedor, updateRevendedor
getListas, createLista, updateLista, deleteLista
registrarMovimiento, generarCodigo
```

### 🔴 No migrar — Verisure específico

```
getConfigVerisure, saveConfigVerisure
getPipelineByCliente (Verisure), agregarNotaVisita, createPipeline (viejo)
```

### 🟡 Genérico — migrar cuando se construya el equivalente

```
getPlantillas          → pendiente features/templates/
agregarMovimientoCaja  → pendiente features/cash/
getCajaHoy             → pendiente
getMovimientosCaja     → pendiente
getTurnosHistorial     → pendiente
getTurnosHoy           → pendiente
getOrdenesTrabajo      → pendiente
```

---

## REGLAS DE TRANSICIÓN

1. **Toda UI nueva importa tipos de `features/*/types.ts`**, nunca de `@/types/index.ts`
2. **Los adapters son la única capa que conoce el shape legacy**
3. **Los hooks exponen siempre el modelo canónico** — la UI no sabe si el doc es legacy o nuevo
4. **Las actions escriben siempre en formato nuevo** — nunca escribir shape legacy en docs nuevos
5. **`lib/services` es read-only para la UI nueva** — no crear funciones nuevas ahí
6. **Antes de eliminar una función de `lib/services`**, verificar que no haya ninguna pantalla importándola
