"use client"

import Link from "next/link"
import { signOut } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Menú de usuario con avatar de Google y botón de cerrar sesión.
// El logout sigue siendo un Server Action invocado desde un <form>.
// `className` permite adaptar el trigger al lugar donde se monta (header
// angosto vs. fila de ancho completo al pie del sidebar).
export default function UserMenu({ user, className }) {
  const meta = user.user_metadata || {}
  const name = meta.full_name || meta.name || user.email
  const avatar = meta.avatar_url || meta.picture
  const initial = (name || "?").charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className={cn("gap-2 px-2", className)} />}>
        <Avatar size="sm">
          <AvatarImage src={avatar} alt={name} referrerPolicy="no-referrer" />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>Perfil</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/bancos" />}>Bancos</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/configuraciones" />}>Configuraciones</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="p-0">
          <form action={signOut} className="w-full">
            <button type="submit" className="w-full px-1.5 py-1 text-left">
              Cerrar sesión
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
