# [Controla Gasto]

App de control de gastos personales. Los gastos entran por WhatsApp (texto,
foto de ticket o PDF del estado de cuenta) y se consultan en reportes web.

## Stack

- **Monorepo**: Yarn workspaces (`yarn@1.22.x`) con dos paquetes: `web`
  (la app) y `docs` (sitio de documentación, MDX vía `next-mdx-remote` +
  `shiki`).
- **Framework**: Next.js 15 (App Router) + React 19.
- **Base de datos / auth**: Supabase (Postgres, Auth, RLS) vía
  `@supabase/supabase-js` y `@supabase/ssr`. Migraciones en
  `supabase/migrations/`.
- **UI**: Tailwind CSS 4 + shadcn/ui (componentes en `web/components/ui`,
  primitivas `@base-ui/react`, `class-variance-authority`, `tailwind-merge`)
  y daisyUI. Iconos con `lucide-react`.
- **Gráficas**: VisActor VChart (`@visactor/vchart`, `@visactor/react-vchart`).
- **IA**: OpenAI (`openai`, Vision para tickets/PDFs) y LangChain/LangGraph +
  MCP SDK (`@langchain/core`, `@langchain/langgraph`, `@langchain/openai`,
  `@modelcontextprotocol/sdk`) para el agente y RAG.
- **WhatsApp**: Kapso, integrado por REST/webhook directo (validación HMAC
  en `web/lib/whatsapp/kapso.js`), sin SDK.
- **Email**: Resend + `@react-email/components`.
- **Validación**: Zod.
- **Analytics**: Vercel Analytics + PostHog (`posthog-js`), configurados en
  el `package.json` raíz.
- **Hosting/deploy**: Vercel (deploy automático al hacer commit al entorno
  de pruebas — ver "Entorno de pruebas").
- **Lenguaje**: JavaScript (JSX), no TypeScript, salvo config (`jsconfig.json`).

## Entidad principal: `gasto`

| Campo         | Tipo                        | Notas                                    |
|---------------|-----------------------------|------------------------------------------|
| `monto`       | `integer` (centavos)        | Ver "Reglas de esquema"                  |
| `fecha`       | `date`                      | Ver "Reglas de esquema"                  |
| `tienda`      | `text`, nullable            | "OXXO", "Pemex"                          |
| `categoria`   | enum cerrado                | 20 valores, lista abajo                  |
| `tipo_pago`   | enum cerrado                | 7 valores, lista abajo                   |
| `banco_id`    | `bigint`, nullable, FK      | Referencia a `banco`. Ver "Catálogo de bancos" |
| `banco`       | `text`, nullable            | Denormalizado desde `banco_id`, solo lectura para consumidores existentes (reportes, agente). No se escribe texto libre desde el formulario. |

**Categorías:** supermercado, restaurantes, cafeteria, transporte, gasolina,
salud, farmacia, hogar, servicios, renta, educacion, entretenimiento, ropa,
tecnologia, viajes, mascotas, regalos, impuestos, comisiones, otros.

**Tipos de pago:** efectivo, debito, credito, transferencia, domiciliado,
vales, otro.

Los valores se guardan sin acentos; las etiquetas con acento son solo de UI.

## Catálogo de bancos: entidad `banco`

Antes `gasto.banco` era texto libre. Ahora es un catálogo por usuario
(tabla `bancos`): cada fila es un instrumento financiero (cuenta o
tarjeta), no solo un nombre — el mismo banco puede tener una fila
`tipo = debito` y otra `tipo = credito` si el usuario los usa por
separado (necesario para la futura fecha de corte de crédito, que
solo aplica a instrumentos de crédito).

| Campo    | Tipo                | Notas                                |
|----------|---------------------|---------------------------------------|
| `nombre` | `text`               | "BBVA", "Nu". Único por usuario+tipo  |
| `tipo`   | enum cerrado         | `debito`, `credito`                   |
| `activo` | `boolean`            | Soft delete: "eliminar" en la UI pone `activo = false`, no borra la fila (puede estar referenciada por gastos/retiros históricos) |

Se gestiona en `/bancos`. `GastoForm` y `RetiroForm` seleccionan de este
catálogo (`<select>`, nunca texto libre) — `RetiroForm` solo muestra
bancos `tipo = debito`, porque un retiro sale de una cuenta de débito.

## Retiros de efectivo y Cartera

Un retiro (banco → efectivo en mano) no es un gasto: no consume valor,
solo lo traslada. Vive en su propia tabla (`retiros`), nunca mezclado
con `gastos`, para que los reportes de gasto real no se contaminen.

**Cartera** (`/cartera`) es el saldo de efectivo disponible:
`saldo = suma(retiros.monto) − suma(gastos.monto donde tipo_pago = efectivo)`.
Se calcula en la base de datos vía la función `cartera_saldo()` (no en
JS: sumar una lista paginada en el cliente da un saldo incorrecto en
cuanto el historial pasa esa página).

## Transacciones (vista combinada)

`/transacciones` reemplazó a `/gastos` y `/ingresos` como vista principal
(decidido el 2026-08-26 tras explorar la demo de un competidor): una sola
tabla que combina `gastos`, `ingresos` y `retiros`, ordenada por fecha,
con monto en rojo (gasto, salida), verde (ingreso, entrada) o neutro
(retiro, etiquetado "Transferencia" — un retiro no es un gasto ni un
ingreso, ver "Retiros de efectivo y Cartera" arriba, así que no se
pinta como ninguno de los dos). Filtro por tipo (`?tipo=gasto|ingreso|
retiro` en la URL, usado por los redirects de abajo y por los enlaces
de Dashboard/AlertasRecurrencias).

**Las tres tablas siguen separadas.** Esto es solo una vista de
lectura que las junta (`GET /api/transacciones`, mismo patrón que ya
usaba `/api/cartera` para combinar retiros + gastos en efectivo: se
combina y ordena en JS con un límite por fuente, no es un total exacto
— para eso siguen las funciones SQL de `/reportes`). Presupuestos,
recurrencias, `cartera_saldo()`, reportes y la captura por WhatsApp no
cambiaron nada — cada uno le sigue hablando a su propia tabla. Crear y
editar tampoco cambió: cada fila enlaza al formulario de su tipo
(`/gastos/[id]/edit`, `/ingresos/[id]/edit`, `/retiros/[id]/edit`), y
"Registrar" en `/transacciones` es un menú con las tres opciones, no un
formulario nuevo.

`/gastos` y `/ingresos` (las páginas índice) ahora son un `redirect()`
a `/transacciones?tipo=...`, solo para no romper enlaces/bookmarks
viejos. `/retiros` sigue existiendo aparte (no se tocó): retiros
aparece en Transacciones además de en su propia página, no en lugar de
ella.

Esto no contradice "Todo lo visible dice gasto/gastos" (ver
"Convenciones de UI" abajo) — esa regla sigue aplicando a la entidad
`gasto` en sí (formularios, badges, columnas). "Transacciones" es
solo el nombre de la vista que las junta, igual que "Cartera" ya
nombra la vista de retiros + gastos en efectivo sin que esa tabla
se llame "cartera".

Pendiente, fuera de este alcance: no hay export CSV/JSON en
`/transacciones` (`/gastos` sí lo tenía, vía `/api/gastos/export`,
antes de este cambio). El endpoint sigue funcionando por URL directa,
solo no está expuesto en esta UI.

## Recurrencias

Motor compartido para ingresos y gastos que se repiten (nómina, renta,
suscripciones). Una fila en `recurrencias` es la regla ("cada viernes $X",
"el día 5 $Y"), no una ocurrencia: un cron diario
(`web/app/api/cron/generar-recurrencias`, programado en `web/vercel.json`)
genera **por adelantado** las filas reales en `gastos`/`ingresos`,
enlazadas por `recurrencia_id`.

El `monto_default` de la regla es solo un sugerido, no el monto real de
cada ocurrencia (nómina/renta pueden variar): cada fila generada nace con
`monto_confirmado = false` — badge "Pendiente" en `/gastos` e `/ingresos` —
hasta que el usuario la revisa. Cualquier `PATCH` manual sobre la fila
(editarla o el botón "Confirmar" de la tabla, que no toca el monto) la
marca como confirmada.

Frecuencias soportadas: semanal (`dia_semana`, 0=domingo..6=sabado),
mensual y quincenal (`dias_mes`: uno o dos días del mes; si el mes es más
corto se usa el último día). Se gestiona en `/recurrencias`; sigue las
mismas reglas de esquema que gastos/ingresos (monto en centavos, fecha
`date`, efectivo sin banco).

## Presupuestos

Límite de gasto por categoría (tabla `presupuestos`, un presupuesto activo
por categoría por usuario). El periodo del presupuesto es el mes calendario
por defecto, o el ciclo de corte de una tarjeta de crédito específica si el
presupuesto se liga a un `banco_id` (mismo cálculo de ciclo que "Reportes
por periodo de corte" arriba, pero solo el ciclo vigente). El gasto
acumulado del periodo se calcula en la función SQL `presupuestos_estado()`
(`038_presupuestos_estado_function.sql`), nunca sumando en JS — mismo
patrón que `cartera_saldo()`/`gastos_por_corte()`. Un presupuesto creado a
mitad de periodo cuenta *todo* el gasto de ese periodo, no solo el
posterior a su creación.

Dos umbrales por periodo, cada uno se avisa una sola vez: 80%
("acercándose") y 100% ("excedido"). El aviso es doble: dentro de la app
(`AlertasPresupuestos`, en `/presupuestos` y el dashboard, calculado en vivo
sin marca de idempotencia) y por WhatsApp con el template pre-aprobado
`presupuesto_alerta` (parámetros `categoria`, `porcentaje`, `monto_limite`,
`total_gastado`). La idempotencia del envío por WhatsApp vive en
`presupuestos.ultimo_alerta_pct`/`ultimo_alerta_periodo_inicio`, mismo
patrón que `bancos.ultimo_recordatorio_pago`.

**Setup requerido:** el template `presupuesto_alerta` debe crearse y
aprobarse en Meta/Kapso antes de que el envío funcione en producción —
mientras tanto los intentos fallan y quedan registrados en
`integraciones_log` (`tipo: 'presupuesto_verificacion'`), sin bloquear la
captura del gasto ni la alerta dentro de la app.

La verificación (`verificarPresupuesto()` en `web/lib/presupuestos/
verificar.js`) se llama después de cada inserción o edición de un gasto
que pueda cruzar un umbral: creación manual (`web/app/api/gastos/
route.js`), captura por WhatsApp (`web/lib/gastos/whatsapp.js`),
generación por el cron de recurrencias (`web/app/api/cron/
generar-recurrencias/route.js`), y edición de monto/categoría
(`web/app/api/gastos/[id]/route.js`). No hay un helper compartido de
creación de gasto en el proyecto — cada uno de esos archivos inserta su
propia fila, así que la llamada se agrega en los cuatro lugares.

## Reglas de esquema (no negociables)

Estas dos ya causaron bugs. No las cambies por los defaults del generador de
CRUD, que elige `numeric` y `timestamptz`.

1. **El monto es un entero en centavos**, nunca `numeric` ni float. Se captura
   y se muestra en pesos, pero la conversión ocurre en una sola capa. Con
   floats los totales de un reporte no cuadran al centavo.

2. **La fecha es `date`, no `timestamptz`.** Agrupar por día/mes/año sobre
   timestamps UTC parte mal los días: un gasto de las 11 pm en CDMX cae al día
   siguiente y el reporte del mes queda mal en los bordes.

Corolario: un monto negativo se **rechaza**, no se convierte a positivo. Casi
siempre es un abono mal clasificado como cargo, y voltearle el signo inflaría
el gasto del mes.

3. **Si `tipo_pago` es `efectivo`, `banco_id` no debe ser seleccionable.** El
   efectivo no tiene banco asociado; dejar el campo habilitado permite
   capturas inconsistentes (p. ej. "efectivo" con banco "BBVA"). En el
   formulario, deshabilita/oculta el selector de banco cuando
   `tipo_pago = efectivo`, y valida también del lado del servidor que no
   llegue un `banco_id` no nulo junto con `tipo_pago = efectivo`.

4. **Un retiro solo puede ser de un banco `tipo = debito`.** Retirar
   efectivo de una tarjeta de crédito no es el mismo movimiento (sería un
   cargo, no un traslado). Se valida en tres capas: el `<select>` de
   `RetiroForm` solo lista bancos débito, la API lo revalida antes del
   insert, y un trigger en `retiros` lo revalida en la base de datos.

## Convenciones de UI

- Todo lo visible dice "gasto"/"gastos". Nunca "item" ni "core_item".
- `categoria` y `tipo_pago` van como `<select>`, nunca texto libre.
- Las listas se ordenan por `fecha` descendente por defecto.
- Todas las tablas de la app son ordenables por columna (ascendente y
  descendente), con `fecha` y `monto` como columnas prioritarias. El
  encabezado de cada columna ordenable es clickeable y muestra un indicador
  (▲/▼) de la columna y dirección activas. Cualquier tabla nueva que se
  agregue a la app debe implementar este mismo patrón.
- Montos: formato `es-MX`, alineados a la derecha, con `tabular-nums`.
- Las listas de selección (`<select>`, dropdowns, menús de opciones) se
  ordenan alfabéticamente de A a Z por la etiqueta visible (con acentos,
  no por el valor interno del enum). Aplica a categoría, tipo de pago,
  bancos y cualquier lista nueva de este tipo.
- Todo campo de captura de un monto (`Gasto`, `Retiro`, `Ingreso`, y
  cualquier entidad nueva que capture dinero) usa `MoneyInput`
  (`web/components/ui/money-input.jsx`) en vez de `<Input type="number">`:
  agrega comas de miles mientras se escribe y acepta decimales, pero el
  valor que le llega al formulario sigue sin comas (compatible con
  `pesosTocentavos`). No repitas un `<Input type="number">` a mano para
  montos nuevos.
- El formulario de crear/editar es **secundario**: el flujo principal es la
  captura por WhatsApp. Existe para corregir, así que prioriza que editar
  desde la lista sea cómodo por encima de que crear sea bonito.
- El diseño visual se basa en las imágenes de referencia en `/design`. Antes
  de construir o ajustar una pantalla, revisa esa carpeta por si hay una
  imagen aplicable; el usuario irá agregando más ahí con el tiempo.
- Todo `<Select>` (`web/components/ui/select.jsx`, sobre `@base-ui/react`)
  que tenga un `value` controlado debe recibir también el prop `items`
  (mapa `{value: label}`, o array `{value, label}[]` para casos con label
  no serializable a string). Sin `items`, `SelectValue` solo conoce el
  label de un `<SelectItem>` que ya se montó al menos una vez -- como el
  contenido está en un portal que se desmonta al cerrar, el trigger
  muestra el `value` crudo (ej. un `banco_id` numérico) en vez del label
  en el primer render con un valor precargado (edición, filtros con
  default) o justo después de cerrar el dropdown. Para enums estáticos
  con su mapa de labels, usa el helper `selectItems(valores, labels)` de
  `web/lib/utils.js` (junto a `ordenarPorLabel`); para catálogos
  dinámicos (bancos), arma el mapa inline:
  `Object.fromEntries(bancos.map(b => [String(b.id), b.nombre]))`.

## Base de datos

Los cambios de esquema van en migraciones nuevas dentro de
`supabase/migrations/`. Nunca edites una migración ya aplicada.

Al crear una, dime el comando exacto que debo correr.

## No tocar

El login y la protección de rutas se quedan como están. Si un cambio parece
requerir tocarlos, dímelo antes en vez de modificarlos.


## Al iniciar una tarea
Haz preguntas al usuario para entender mejor sus requerimientos.

## Al terminar una tarea

Reporta qué archivos cambiaste y en qué URL pruebo el cambio.

## Entorno de pruebas

Para pasar un cambio a pruebas hay que hacer commit: Vercel despliega
automáticamente al entorno de pruebas cuando detecta el commit. No hay un
paso manual de deploy aparte del commit (y push, si el commit es local).

## Referencias de competidores

Apps similares en las que nos podemos basar para ideas de producto/UX. Lista
abierta: se agregan conforme se vayan encontrando.

- https://finchat.mx/
- https://zentavo.lat


## Estilo de código

- Sin emojis en el código fuente, comentarios, mensajes de commit ni logs.
- Nombres de variables, funciones y comentarios en español o inglés consistente
  con el resto del archivo (elige uno y dilo aquí si aplica).
- No incluir autores.


## Integración WhatsApp

**Estado:** Captura automática de gastos funcional, con confirmación de
vuelta por WhatsApp. Antes vivía sobre el sandbox de Twilio; se migró a
Kapso porque el sandbox de Twilio no permite mandar respuestas
automáticas sin pasar por la verificación de negocio de Meta, y el
"instant setup" de Kapso (número pre-verificado, Meta App administrada
por Kapso) sí lo permite sin ese trámite.

**Flujo:**
1. Usuario envía mensaje al número de WhatsApp conectado en Kapso
2. Kapso manda un webhook (JSON, evento `whatsapp.message.received`) a
   `POST /api/webhooks/whatsapp`, firmado con HMAC-SHA256
   (`X-Webhook-Signature`); el webhook rechaza requests sin firma válida
3. Se valida que el número está registrado en `profiles.phone`
4. Si el mensaje empieza con "retiro", se captura como retiro de efectivo,
   no como gasto:
   - "retiro 2000 bbva" → extrae monto ($2000) y busca "bbva" entre los
     bancos tipo débito del usuario (match exacto o por substring)
   - Si no encuentra el banco en el catálogo, pide registrarlo primero en
     `/bancos` (a diferencia de gastos, `banco_id` es obligatorio y no hay
     fallback a texto libre)
   - Solo texto por ahora, sin foto/PDF
5. Si no, se parsea como gasto:
   - Texto simple: "500 oxxo" → extrae monto ($500), tienda (oxxo), categoría (supermercado)
   - Foto/PDF: OpenAI Vision extrae datos del ticket (descargado de Kapso con la API key)
6. Se inserta en `gastos` o `retiros` según corresponda, con validaciones de BD
7. Se manda una confirmación (o el mensaje de error) de vuelta por WhatsApp,
   y aparece inmediatamente en `/gastos` o `/retiros`

**Setup requerido:**
- Teléfono del usuario debe estar en `profiles.phone` (formato: +52XXXXXXXXXX)
- Variables de entorno en Vercel:
  - `KAPSO_API_KEY`
  - `KAPSO_PHONE_NUMBER_ID`
  - `KAPSO_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- En el dashboard de Kapso, el webhook del número debe apuntar a
  `https://<tu-dominio>/api/webhooks/whatsapp` con el evento
  "Message received"

**Archivos clave:**
- `web/app/api/webhooks/whatsapp/route.js` — webhook de recepción, valida firma, decide gasto vs. retiro, manda confirmación
- `web/lib/whatsapp/kapso.js` — verificación de firma, envío de mensajes y descarga de media vía API de Kapso
- `web/lib/gastos/whatsapp.js` — parseo de texto/imagen y creación de gastos
- `web/lib/retiros/whatsapp.js` — parseo de texto y creación de retiros
- `web/app/(app)/profile/page.js` — donde usuario agrega su teléfono

## TODO
- Incluir carga y lectura de estados de cuenta "https://vibe-fast-web-omega.vercel.app/docs/recetas/chatbot-con-rag"

- ~~Alertar cuando el cron de recurrencias falla o se salta una regla~~ —
  resuelto el 2026-08-24: `alertarAdmins()` en
  `generar-recurrencias/route.js` manda un correo (Resend, template
  `CronErrorAlert`) a todos los `profiles.role = 'admin'` cuando el
  arreglo `errores` no queda vacío al terminar la corrida (antes nadie lo
  leía — un cron de Vercel que responde 200 no dispara ninguna alerta por
  sí solo). Se eligió email sobre WhatsApp porque es una alerta interna,
  no al usuario final, y así no choca con la ventana de 24h de WhatsApp.
  Además, `notificarUsuarios()` (las confirmaciones por WhatsApp a
  usuarios cuando se generan sus recurrencias) también tragaba fallos de
  envío en silencio — confirmado y resuelto el mismo día: ahora llama
  `registrarIntegracion(..., tipo: 'cron_recurrencias_notificacion')`, así
  que ese fallo también queda en el log de integraciones. Las alertas
  *dentro de la app* (pendientes de
  confirmar / próximas a generarse) ya están resueltas — ver
  `web/lib/recurrencias/alertas.js` y `AlertasRecurrencias` (dashboard,
  `/recurrencias`, badge en el nav); esto es solo para cuando el cron
  mismo no corre bien.

- ~~Retiros en efectivo~~ — resuelto: tabla `retiros` separada de `gastos`
  (migración `015_retiros.sql`), alimenta Cartera. Ver "Retiros de efectivo y
  Cartera" arriba.

- ~~Catálogo de bancos por usuario~~ — resuelto para la parte de débito/
  Cartera: `banco` pasó a catálogo (`013_bancos.sql`, `014_migrar_banco_a_
  catalogo.sql`) con `tipo` débito/crédito. Cartera quedó como saldo
  calculado (función `cartera_saldo()`), no como tabla propia.

- ~~Datos de crédito en `bancos`~~ — resuelto: `dia_corte`,
  `dia_limite_pago`, `limite_credito` (centavos), `alias` (últimos 4
  dígitos o apodo, ej. Nu clásica vs. Nu Ultravioleta) y `tasa_interes`
  (% anual/CAT), todos nullable y solo válidos con `tipo = 'credito'`
  (`022_bancos_datos_credito.sql`, formulario en `BancoForm.js`). Pago
  mínimo se descartó a propósito: varía cada estado de cuenta, no es un
  dato fijo del banco — encaja mejor con la carga de estados de cuenta
  (ítem de RAG/chatbot arriba). Esto destapa dos features aparte,
  pendientes:
  - ~~**Reportes por periodo de corte**~~ — resuelto el 2026-08-25:
    selector "Ver por" en `/reportes` (solo visible si el usuario tiene
    tarjetas de crédito con `dia_corte` configurado); al elegir una
    tarjeta, la vista cambia de mes calendario a sus ciclos de corte
    (últimos 12, incluyendo el ciclo en curso). Los totales se calculan
    en la función SQL `gastos_por_corte(p_banco_id, p_ciclos)`
    (`035_gastos_por_corte_function.sql`), mismo patrón que
    `balance_neto` — nunca sumando en JS sobre una lista paginada.
    Cuentan todos los gastos con ese `banco_id` (sin importar
    `tipo_pago`). Ciclo = `[periodo_inicio, periodo_fin)` usando las
    fechas de corte consecutivas, clampadas al último día del mes si es
    más corto (igual que `resolverDiaMes` en `lib/recurrencias/fechas.js`).
    Componente: `web/components/reportes/GastosPorCorteTable.js`.
  - ~~**Recordatorio de pago por WhatsApp**~~ — resuelto el 2026-08-25:
    cron nuevo `web/app/api/cron/recordatorio-pago-credito/route.js`
    (`0 9 * * *` en `web/vercel.json`), manda el template pre-aprobado
    `recordatorio_pago_credito` (`type: "template"`, no texto libre, para
    no chocar con la ventana de 24h de WhatsApp) vía
    `enviarPlantillaWhatsApp(to, templateName, params)` en `kapso.js`.
    Corre `DIAS_ANTES = 3` días antes de `dia_limite_pago` por cada banco
    `tipo = credito` activo; usa `bancos.ultimo_recordatorio_pago`
    (`034_bancos_ultimo_recordatorio_pago.sql`) para no reenviarlo si el
    cron corre dos veces el mismo ciclo. Errores del cron se alertan a
    `profiles.role = 'admin'` por correo con el mismo helper que usa
    `generar-recurrencias` (`alertarAdminsPorErroresCron` en
    `lib/admin/db.js`).
    - ~~Mismo problema ya existía hoy en `notificarUsuarios()`~~ —
      confirmado y resuelto el 2026-08-24, ver arriba ("Alertar cuando el
      cron de recurrencias falla").

- ~~Truncamiento silencioso en las tarjetas/gráficas de `/reportes`~~ —
  resuelto el 2026-08-25: al construir el reporte por periodo de corte se
  detectó que "Gasto Total", "Ingreso Total", "Gasto Promedio", "Días con
  Gasto" y las tres gráficas (mensual, categoría, tendencia) sumaban en JS
  sobre `listarGastos`/`listarIngresos` con `limit: 1000` — el mismo
  patrón de bug que el propio TODO ya advertía para Cartera y para este
  reporte, pero que nunca se corrigió aquí. Con más de 1000 movimientos
  en el rango filtrado, esas cifras quedaban truncadas sin ningún aviso.
  Se reemplazó por 4 funciones SQL nuevas (`gastos_ingresos_resumen`,
  `gastos_ingresos_por_mes`, `gastos_ingresos_por_dia`,
  `gastos_por_categoria`, en `036_reportes_funciones.sql`), expuestas por
  un solo endpoint (`GET /api/reportes/resumen`) — mismo patrón que
  `balance_neto`. `reportes/page.js` ya no llama `listarGastos`/
  `listarIngresos` en absoluto.

- ~~CONFIGURACIONES~~ — resuelto: apartado en `/configuraciones` para
  zona horaria, moneda y formato de fecha por usuario (columnas en
  `profiles`, migración `039_configuraciones_usuario.sql`). La zona
  horaria no cambia el tipo de `fecha` (sigue `date`, ver "Reglas de
  esquema") — solo se usa para calcular "hoy" (`hoyEnZona()` en
  `web/lib/config/fechas.js`) al interpretar la hora de captura por
  WhatsApp antes de guardar el `date` (`web/lib/gastos/whatsapp.js`). El
  formato de fecha es solo de despliegue (`formatFechaDisplay()`), nunca
  reinterpreta el string `date` con huso horario.

- ~~Control de ingresos~~ — resuelto: captura manual (monto, fecha,
  categoría/nota, tabla `ingresos`, migración `019_ingresos.sql`), vista
  `/ingresos`, balance neto en dashboard (`balance_neto()`,
  `020_balance_neto_function.sql`), y la modalidad recurrente ("nómina"
  cada viernes o quincenal, monto variable con default) vía el motor de
  recurrencia compartido — ver "Recurrencias" arriba.

- ~~Gastos recurrentes~~ — resuelto: reusa el mismo motor de recurrencia
  que ingresos (tabla `recurrencias`, migración `021_recurrencias.sql`) en
  vez de duplicarlo — ver "Recurrencias" arriba.

- Apartados con rendimiento (estilo Nu): sección para crear "apartados" de
  dinero separados del gasto corriente, con una tasa de interés configurable
  que simule lo que se puede ganar, como referencia
  https://nubank.com.mx/cuenta/rendimientos/. Falta definir si el interés se
  calcula real (con periodicidad, capitalización) o es solo informativo/
  proyectado, y cómo se relaciona con Cartera (ver ítem de retiros en
  efectivo) si es que comparten saldo.

- ~~Presupuestos~~ — resuelto el 2026-08-25: límite por categoría (tabla
  `presupuestos`, migraciones `037_presupuestos.sql` y
  `038_presupuestos_estado_function.sql`), mes calendario por defecto o
  ciclo de corte de una tarjeta si se liga a un `banco_id`, con aviso
  doble (app + WhatsApp, template `presupuesto_alerta`) en 80% y 100% del
  periodo — ver "Presupuestos" arriba. Límite global se descartó a
  propósito (solo se pidió por categoría). Pendiente: crear y aprobar el
  template en Meta/Kapso (ver "Setup requerido" en esa sección).

- Presupuestos predictivos: en vez de que el usuario capture el límite a
  mano, sugerirlo/ajustarlo con base en el historial de gastos por
  categoría. Requiere suficiente historial para que la predicción sea
  confiable, así que no lo empieces hasta que la cuenta lleve al menos 6
  meses de datos capturados (revisa la fecha del primer gasto/ingreso del
  usuario antes de construir esto).

- Alertar por correo cuando aparezca un error en los logs de Vercel: mandar
  un email (Resend) a todos los `profiles.role = 'admin'` por cada error que
  aparezca en Vercel Logs, no solo en los crons. Requiere Log Drains de
  Vercel, que solo existe en plan Pro/Enterprise — el proyecto está en
  Hobby, así que queda bloqueado hasta hacer el upgrade. Cuando se
  desbloquee: el drain apunta a un endpoint nuevo en esta misma app (ej.
  `/api/webhooks/vercel-logs`), que filtra los eventos de nivel error/fatal
  y dispara el correo con Resend — mismo patrón que
  `alertarAdminsPorErroresCron` en `web/lib/admin/db.js`. Mientras tanto, la
  cobertura de errores en flujos críticos (webhook de WhatsApp, crons) ya
  usa ese mismo mecanismo caso por caso — ver "Alertar cuando el cron de
  recurrencias falla" arriba.

- ~~Panel del dueño (`/admin`) — UI~~ — resuelto el 2026-08-26: la UI que
  consume los cuatro endpoints ya existía (backend construido antes, ver
  historial) queda armada sobre `web/lib/admin/client.js` con
  `AdminNav` (`web/components/layout/AdminNav.js`) y cuatro rutas:
  - `/admin` — cards de métricas de negocio (usuarios totales, altas de
    la semana, activos 30d, gastos/ingresos del mes), vía
    `admin_metricas_negocio`.
  - `/admin/usuarios` — tabla ordenable (mismo patrón `▲/▼` del resto de
    la app, pero con orden/paginación resueltos en el servidor vía
    `orderBy`/`orderDir`/`limit`/`offset`, no en el cliente como
    `GastoTable`, porque aquí no se cargan todas las filas de una vez)
    con acción de suspender/reactivar (`ConfirmDialog` antes de aplicar).
  - `/admin/usuarios/[id]` — detalle: perfil, actividad (conteos +
    costo de OpenAI) y auditoría. Nunca pinta montos, categorías,
    tiendas ni bancos del usuario — frontera ya impuesta por
    `obtenerUsuario()` en `db.js`, la UI solo consume lo que ese
    endpoint expone.
  - `/admin/integraciones` — filtrable por tipo/nivel/resuelto.
  - `/admin/costos` — por día y por usuario, con rango de fechas.
    `uso_openai.costo_estimado_centavos` está en centavos de **USD**, no
    MXN (ver comentario en `web/lib/admin/costos.js`) — se formatea con
    `formatMonto(centavos, 'USD')`, no con el default MXN del resto de
    la app.

  Quedan pendientes los dos huecos que ya se habían detectado y no forman
  parte de este alcance (consumir los cuatro endpoints existentes): no
  hay manera de ver en el panel si una plantilla de WhatsApp (ej.
  `presupuesto_alerta`) sigue pendiente de aprobación en Meta/Kapso — hoy
  solo se infiere de fallos repetidos en `integraciones_log`, filtrable
  en `/admin/integraciones` pero sin una señal explícita de "plantilla no
  aprobada"; y no hay vista de la última corrida de cada cron
  (recurrencias, recordatorio de pago) — esa información solo llega por
  correo vía `alertarAdminsPorErroresCron`, no queda visible en `/admin`.
  Ninguno de los dos tiene endpoint ni función SQL propia todavía.

- Plan compartido (invitar a otra persona a ver/editar el mismo conjunto de
  gastos, ej. pareja). Detectado el 2026-08-26 explorando la demo de un
  competidor (Zentavo): ellos lo resuelven invitando por correo a todo el
  "plan" completo, sin roles granulares (solo un rol, dueño). No empezar
  antes de 2027-02 — es una decisión de producto (¿roles de solo-lectura
  vs edición? ¿cómo se identifica cada persona si ambas capturan por
  WhatsApp desde números distintos hacia el mismo conjunto de gastos?) que
  no vale la pena precipitar por ver que un competidor ya lo tiene.

- Multi-moneda (varias cuentas en distintas divisas dentro del mismo
  usuario, con conversión a una moneda base en reportes/patrimonio, como
  lo resuelve Zentavo). Evaluado y descartado explícitamente el
  2026-08-26 — no se contempla. La configuración de `moneda` en
  `/configuraciones` (ver "Configuraciones" arriba) es solo la moneda de
  despliegue de un usuario, no un sistema multi-divisa por cuenta; no
  confundir ambos al retomar el tema.

- Detector de "gastos hormiga": agrupar `gastos` por `tienda` (no por
  categoría) dentro del periodo del reporte, y marcar como "hormiga" los
  grupos con 3 o más compras. Confirmado el 2026-08-26 viendo la demo de
  Zentavo (mismo criterio: agrupan por texto exacto del campo
  "Negocio", umbral de repetición ≥3 — 2 compras a Uber no calificaron, 4 a
  Oxxo sí). No requiere cambios al parseo de OpenAI Vision ni una tabla
  nueva: es una vista agregada sobre `gastos` existentes (mismo patrón que
  `gastos_por_categoria` en `036_reportes_funciones.sql` — función SQL,
  nunca sumando/agrupando en JS sobre una lista paginada), expuesta como
  una tarjeta o tabla nueva en `/reportes`.

