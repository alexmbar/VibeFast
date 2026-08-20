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
