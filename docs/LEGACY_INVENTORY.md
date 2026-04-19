# INVENTARIO DE DEUDA LEGACY — CLOZR

Estado al cierre de la fase de integración.
Actualizar este doc cuando se migre o elimine cada item.

---

## CAPA DE ADAPTACIÓN — COMPLETA ✅

Los tres dominios del core tienen adapters, hooks canónicos y queries canónicas:

| Dominio | Adapter | Hook | Query server |
|---|---|---|---|
| Customer | `features/customers/adapters.ts` → `adaptClienteDoc()` | `useCustomers` | `customers/queries.ts` |
| PipelineItem | `features/pipeline/adapters.ts` → `adaptPipelineDoc()` | `usePipeline` | `pipeline/queries.ts` |
| Sale | `features/sales/adapters.ts` → `adaptVentaDoc()` | `useSales` | `sales/queries.ts` |

**Garantía:** toda la UI nueva recibe modelos canónicos. El shape del doc en Firestore es irrelevante para los componentes.

---

## ESCRITURA CANÓNICA — EN EFECTO ✅

| Dominio | Colección | Shape escrito desde ahora |
|---|---|---|
| Customer | `clientes` | campos: `nombre, tipo, estado, barrio, dni, referido, notas, searchTokens, totalSales` |
| PipelineItem | `pipeline` | campos: `stageId, stageName, stageOrder, activities[], customerId, customerSnapshot, status` |
| Sale | `ventas` | campos: `pagado: boolean, currency, customerName, fecha, items[]` |
| Task | `tasks` | campos: `tipo: rutina\|puntual, frecuencia: daily\|weekly` (colección nueva, sin docs legacy) |

---

## PÁGINAS MIGRADAS — ESTADO LIMPIO ✅

Las cinco páginas migradas ya no tienen lógica de compat inline:

| Página | Usa canónico | Restante legacy | Motivo |
|---|---|---|---|
| `clientes/page.tsx` | ✅ CRUD Customer | `getVentas2`, `getPlantillas`, `agregarMovimientoCaja`, pipeline Verisure | Funcionalidad sin equivalente canónico aún |
| `pipeline/page.tsx` | ✅ CRUD PipelineItem | — | Limpio |
| `ventas/page.tsx` | ✅ CRUD Sale | — | Limpio |
| `tareas/page.tsx` | ✅ CRUD Task | — | Limpio |
| `hoy/page.tsx` | ✅ métricas canónicas | turnos, OTs, caja | Funcionalidad del sistema de servicio técnico |

---

## LEGACY RESTANTE EN lib/services — CLASIFICADO

### Bloque A — Funcionalidad real sin equivalente canónico aún
*(No es deuda técnica acumulada — es funcionalidad pendiente de implementar)*

| Función | Usada en | Equivalente canónico |
|---|---|---|
| `getVentas2` | clientes/page.tsx (historial de compras) | Pendiente: `useSales({ customerId })` ya existe, pero la colección es `ventas2` no `ventas` |
| `getPlantillas` | clientes/page.tsx | Pendiente: `features/templates/` sin implementar |
| `agregarMovimientoCaja` | clientes/page.tsx (seña) | Pendiente: `features/cash/` sin implementar |
| `getPipelineByCliente` | clientes/page.tsx (pipeline Verisure) | Ya existe `usePipeline({ customerId })` — migrar cuando se unifique pipeline |
| `createPipeline` (viejo) | clientes/page.tsx | Ya existe `createPipelineItem` — migrar en mismo paso |
| `updatePipeline` (viejo) | clientes/page.tsx | Ya existe `updateStage` + `addActivity` — migrar en mismo paso |
| `agregarNotaVisita` | clientes/page.tsx | Ya existe `addActivity` — migrar en mismo paso |

**Siguiente paso para clientes:** reemplazar los 4 bloques del panel Verisure con el hook `usePipeline({ customerId })` y las actions `createPipelineItem` / `addActivity` / `updateStage`. No es urgente porque funciona.

### Bloque B — Funciones de sistemas específicos (iPhone Club / Verisure)
*(No migrar — son el núcleo de esos sistemas)*

```
iPhone Club: getProductos2, getStockiPhones, getStockAccesorios, getStockOtrosApple,
             getVentasIPhone, createVentaIPhone, getConfigIPhoneClub, getDolarConfig,
             saveDolarConfig, fetchDolarBlue, createVenta2, getVentas2, getRevendedores,
             createRevendedor, getListas, registrarMovimiento, generarCodigo

Verisure: getConfigVerisure, saveConfigVerisure, getVentas (ventas-verisure),
          getPipeline (resumen-verisure)
```

### Bloque C — Funciones de infraestructura del sistema legacy
*(Mantener mientras no se construya el equivalente)*

```
getWorkspaces    → layout usa Zustand + getWorkspaces de services
                   Reemplazar con: useWorkspace hook (ya existe)
                   Cuándo: cuando se refactorice el workspace layout

updateWorkspace  → ajustes/page.tsx
                   Reemplazar con: updateWorkspace Server Action (ya existe)
                   Cuándo: cuando se migre ajustes/page.tsx

getMemberRole    → hooks/useMemberRole.ts
                   Reemplazar con: useWorkspaceMembership (ya existe)
                   Cuándo: cuando se unifique el hook de roles

getPlantillas    → clientes/page.tsx
                   Sin equivalente canónico — pendiente features/templates/

toDate           → ELIMINADO de páginas migradas — usa lib/utils.ts
```

### Bloque D — Funciones eliminables ya
*(Pantallas migradas, función sin otros usuarios)*

```
getClientes      → reemplazado por useCustomers ✅ (pero aún importado en clientes/page.tsx como legacy)
createCliente    → reemplazado por createCustomer ✅
updateCliente    → reemplazado por updateCustomer ✅
deleteCliente    → reemplazado por deleteCustomer ✅
getPipeline      → reemplazado por usePipeline ✅ (aún en resumen-verisure)
getTareas        → reemplazado por useTasks ✅
createTarea      → reemplazado por createTask ✅
toggleTarea      → reemplazado por completeTask ✅
deleteTarea      → reemplazado por deleteTask ✅
getVentas        → reemplazado por useSales ✅ (aún en ventas-verisure/resumen-verisure)
createVenta      → reemplazado por createSale ✅ (aún en ventas-verisure)
```

**Nota:** estas funciones no se eliminan de `lib/services.ts` todavía porque las páginas de Verisure/iPhone Club aún las usan. Se eliminan cuando esas páginas se migren o se decida que no se migran.

---

## SHAPES COEXISTIENDO EN FIRESTORE — GESTIONADOS POR ADAPTERS

```
pipeline/  → PipelineCliente (legacy) + PipelineItem (nuevo) — adapter los unifica
ventas/    → Venta con estado:string (legacy) + Sale con pagado:boolean (nuevo) — adapter los unifica
clientes/  → sin shapes distintos, solo campos adicionales — adapter los normaliza
tasks/     → colección nueva, sin legacy
```

---

## REGLAS VIGENTES

1. **Ningún componente nuevo importa tipos de `@/types/index.ts`**
2. **Ninguna página nueva llama a `lib/services.ts`** para operaciones de CRUD core
3. **Los adapters son la única capa que conoce el shape legacy** — nunca inline en componentes
4. **`lib/utils.ts` es el toDate canónico** — no importar `toDate` de `lib/services`
5. **`lib/services.ts` es read-only** para la arquitectura nueva — no agregar funciones ahí
