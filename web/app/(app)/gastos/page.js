import { redirect } from 'next/navigation'

// La lista de gastos vive en /transacciones (combinada con ingresos y
// retiros). Este redirect es solo para no romper enlaces/bookmarks
// existentes -- /gastos/create y /gastos/[id]/edit siguen igual.
export default function GastosPage() {
  redirect('/transacciones?tipo=gasto')
}