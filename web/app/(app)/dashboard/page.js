import { redirect } from "next/navigation"

// El dashboard genérico del boilerplate (CRUD sobre core_items) ya no
// aplica: el dominio real de la app es "gasto" y vive en /gastos.
// Esta ruta se conserva solo por links/bookmarks viejos a /dashboard.
export default function DashboardPage() {
  redirect("/gastos")
}
