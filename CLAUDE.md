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
| `banco`       | `text`, nullable            | "BBVA", "Nu". Lista abierta a propósito  |

**Categorías:** supermercado, restaurantes, cafeteria, transporte, gasolina,
salud, farmacia, hogar, servicios, renta, educacion, entretenimiento, ropa,
tecnologia, viajes, mascotas, regalos, impuestos, comisiones, otros.

**Tipos de pago:** efectivo, debito, credito, transferencia, domiciliado,
vales, otro.

Los valores se guardan sin acentos; las etiquetas con acento son solo de UI.

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

## Convenciones de UI

- Todo lo visible dice "gasto"/"gastos". Nunca "item" ni "core_item".
- `categoria` y `tipo_pago` van como `<select>`, nunca texto libre.
- Las listas se ordenan por `fecha` descendente.
- Montos: formato `es-MX`, alineados a la derecha, con `tabular-nums`.
- El formulario de crear/editar es **secundario**: el flujo principal es la
  captura por WhatsApp. Existe para corregir, así que prioriza que editar
  desde la lista sea cómodo por encima de que crear sea bonito.

## Base de datos

Los cambios de esquema van en migraciones nuevas dentro de
`supabase/migrations/`. Nunca edites una migración ya aplicada.

Al crear una, dime el comando exacto que debo correr.

## No tocar

El login y la protección de rutas se quedan como están. Si un cambio parece
requerir tocarlos, dímelo antes en vez de modificarlos.

## Al terminar una tarea

Reporta qué archivos cambiaste y en qué URL pruebo el cambio.

## Estilo de código

- Sin emojis en el código fuente, comentarios, mensajes de commit ni logs.
- Nombres de variables, funciones y comentarios en español o inglés consistente
  con el resto del archivo (elige uno y dilo aquí si aplica).