"use client"

import { useRef } from "react"
import { Input } from "@/components/ui/input"

// Limpia a solo dígitos + un punto decimal (máx. 2 decimales) y separa
// la versión con comas de miles (para mostrar) de la cruda (para el
// resto del form, igual formato que espera pesosTocentavos).
function formatearMonto(raw) {
  let limpio = (raw ?? "").replace(/[^\d.]/g, "")
  const primerPunto = limpio.indexOf(".")
  if (primerPunto !== -1) {
    limpio = limpio.slice(0, primerPunto + 1) + limpio.slice(primerPunto + 1).replace(/\./g, "")
  }

  const [enteroRaw, decimal] = limpio.split(".")
  const entero = enteroRaw || ""
  const decimalCorto = decimal !== undefined ? decimal.slice(0, 2) : undefined

  const enteroConComas = entero === "" ? "" : Number(entero).toLocaleString("en-US")
  const formateado = decimalCorto !== undefined ? `${enteroConComas}.${decimalCorto}` : enteroConComas
  const crudo = decimalCorto !== undefined ? `${entero}.${decimalCorto}` : entero

  return { formateado, crudo }
}

// Input de monto con comas de miles mientras se escribe (ej. "1,234.56").
// Drop-in por <Input type="number">: mismo contrato onChange({ target:
// { name, value } }) que ya usan los forms de gastos/retiros/ingresos,
// pero `value` sale sin comas -- el mismo string que espera
// pesosTocentavos.
export function MoneyInput({ name, value, onChange, ...props }) {
  const inputRef = useRef(null)
  const { formateado } = formatearMonto(value)

  function handleChange(e) {
    const input = e.target
    const cursor = input.selectionStart
    const digitosAntesDelCursor = input.value.slice(0, cursor).replace(/[^\d.]/g, "").length

    const { formateado: nuevoFormateado, crudo } = formatearMonto(input.value)

    onChange({ target: { name, value: crudo } })

    // Reubica el cursor por cantidad de dígitos, no por índice: si cambió
    // el número de comas, la posición del carácter sí se mueve pero el
    // dígito donde estaba el cursor debe seguir siendo el mismo.
    requestAnimationFrame(() => {
      if (!inputRef.current) return
      let pos = nuevoFormateado.length
      if (digitosAntesDelCursor === 0) {
        pos = 0
      } else {
        let contados = 0
        for (let i = 0; i < nuevoFormateado.length; i++) {
          if (/[\d.]/.test(nuevoFormateado[i])) contados++
          if (contados === digitosAntesDelCursor) {
            pos = i + 1
            break
          }
        }
      }
      inputRef.current.setSelectionRange(pos, pos)
    })
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      name={name}
      value={formateado}
      onChange={handleChange}
      {...props}
    />
  )
}
