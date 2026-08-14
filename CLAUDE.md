# [Controla Gasto]

App de control de gastos personales. Los gastos entran por WhatsApp (texto,
foto de ticket o PDF del estado de cuenta) y se consultan en reportes web.

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
- El formulario de crear/editar es **secundario**: el flujo principal es la
  captura por WhatsApp. Existe para corregir, así que prioriza que editar
  desde la lista sea cómodo por encima de que crear sea bonito.
- El diseño visual se basa en las imágenes de referencia en `/design`. Antes
  de construir o ajustar una pantalla, revisa esa carpeta por si hay una
  imagen aplicable; el usuario irá agregando más ahí con el tiempo.

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

## Estilo de código

- Sin emojis en el código fuente, comentarios, mensajes de commit ni logs.
- Nombres de variables, funciones y comentarios en español o inglés consistente
  con el resto del archivo (elige uno y dilo aquí si aplica).
- No incluir autores.


## Integración WhatsApp

**Estado:** Captura automática de gastos funcional

**Flujo:**
1. Usuario envía mensaje a número WhatsApp: `+1 415 523 8886` (sandbox de Twilio)
2. Webhook en `POST /api/webhooks/whatsapp` recibe el mensaje
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
   - Foto/PDF: OpenAI Vision extrae datos del ticket
6. Se inserta en `gastos` o `retiros` según corresponda, con validaciones de BD
7. Aparece inmediatamente en `/gastos` o `/retiros`

**Setup requerido:**
- Teléfono del usuario debe estar en `profiles.phone` (formato: +52XXXXXXXXXX)
- Variables de entorno en Vercel:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Limitación conocida:**
- Respuestas automáticas a WhatsApp no funcionan en sandbox de Twilio
- Requiere upgrade a WhatsApp Business Account para habilitar (no implementado)
- Gastos se crean correctamente; el usuario ve confirmación en app al abrir `/gastos`

**Archivos clave:**
- `web/app/api/webhooks/whatsapp/route.js` — webhook de recepción, decide gasto vs. retiro
- `web/lib/gastos/whatsapp.js` — parseo de texto/imagen y creación de gastos
- `web/lib/retiros/whatsapp.js` — parseo de texto y creación de retiros
- `web/app/(app)/profile/page.js` — donde usuario agrega su teléfono

## TODO
- Incluir carga y lectura de estados de cuenta "https://vibe-fast-web-omega.vercel.app/docs/recetas/chatbot-con-rag"

- ~~Retiros en efectivo~~ — resuelto: tabla `retiros` separada de `gastos`
  (migración `015_retiros.sql`), alimenta Cartera. Ver "Retiros de efectivo y
  Cartera" arriba.

- ~~Catálogo de bancos por usuario~~ — resuelto para la parte de débito/
  Cartera: `banco` pasó a catálogo (`013_bancos.sql`, `014_migrar_banco_a_
  catalogo.sql`) con `tipo` débito/crédito. Cartera quedó como saldo
  calculado (función `cartera_saldo()`), no como tabla propia. Pendiente:
  - Crédito: agregar fecha de corte (y probablemente fecha límite de pago)
    por banco, para reportes por periodo de corte en vez de mes calendario.

- CONFIGURACIONES: agregar un apartado para configurar zona horaria, tipo de
  moneda y formato de fecha (por usuario, no global). Ojo: `fecha` es `date`
  por diseño (ver "Reglas de esquema"); la zona horaria configurable aplica a
  cómo se interpreta la hora de captura por WhatsApp antes de guardar el
  `date`, no a que `fecha` pase a `timestamptz`.

- Ingresos recurrentes: agregar entidad de ingreso tipo "nómina", configurable
  por día(s) de la semana (p. ej. cada viernes, o quincenal). Falta definir
  monto fijo vs. variable, y si el motor de recurrencia genera los registros
  por adelantado o al vuelo al consultar un reporte.

- Ingresos no recurrentes: ingresos puntuales (bonos, reembolsos, ventas,
  regalos) capturados manualmente con monto, fecha y una nota/categoría
  opcional.

- Gastos recurrentes: mismo tipo de recurrencia que "ingresos recurrentes"
  pero para gastos fijos (renta, suscripciones, servicios). Reusar el mismo
  motor de recurrencia en vez de duplicarlo entre ingresos y gastos.

- Apartados con rendimiento (estilo Nu): sección para crear "apartados" de
  dinero separados del gasto corriente, con una tasa de interés configurable
  que simule lo que se puede ganar, como referencia
  https://nubank.com.mx/cuenta/rendimientos/. Falta definir si el interés se
  calcula real (con periodicidad, capitalización) o es solo informativo/
  proyectado, y cómo se relaciona con Cartera (ver ítem de retiros en
  efectivo) si es que comparten saldo.

