import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Ordena valores de un enum alfabeticamente por su label visible (A-Z),
// para listas de seleccion (ver "Convenciones de UI" en CLAUDE.md).
export function ordenarPorLabel(valores, labels) {
  return [...valores].sort((a, b) => labels[a].localeCompare(labels[b], 'es'))
}

// Arma el mapa value->label que necesita el prop `items` de <Select> (ver
// "Convenciones de UI" en CLAUDE.md): sin el, el trigger muestra el value
// crudo en vez del label la primera vez que se pinta con un valor ya
// seleccionado (edicion, filtros con default, o justo despues de elegir
// una opcion), porque @base-ui/react/select solo conoce el label de un
// <SelectItem> que ya se monto al menos una vez.
export function selectItems(valores, labels) {
  return Object.fromEntries(valores.map(v => [v, labels[v]]))
}
