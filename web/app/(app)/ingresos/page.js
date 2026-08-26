import { redirect } from 'next/navigation'

// La lista de ingresos vive en /transacciones (combinada con gastos y
// retiros). Este redirect es solo para no romper enlaces/bookmarks
// existentes -- /ingresos/create y /ingresos/[id]/edit siguen igual.
export default function IngresosPage() {
  redirect('/transacciones?tipo=ingreso')
}