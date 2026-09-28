"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, MessageSquare, Package, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/itens", label: "Itens", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
]

export function AdminNav({ unread }: { unread: number }) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <>
      {/* Desktop: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2 font-extrabold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            G
          </span>
          Painel
        </Link>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                isActive(href, exact) ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
              {href === "/admin/mensagens" && unread > 0 && <UnreadDot count={unread} />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 text-sm">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted">
            <ExternalLink className="size-4" />
            Ver site
          </Link>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile: topo + barra inferior */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <span className="font-extrabold">Painel da Garagem</span>
        <div className="flex items-center gap-1">
          <Link href="/" target="_blank" className="rounded-full p-2 hover:bg-muted" aria-label="Ver site">
            <ExternalLink className="size-5" />
          </Link>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Sair"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              isActive(href, exact) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label === "Configurações" ? "Ajustes" : label}
            {href === "/admin/mensagens" && unread > 0 && (
              <span className="absolute top-1 right-[calc(50%-18px)]">
                <UnreadDot count={unread} />
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}

function UnreadDot({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
      {count}
    </span>
  )
}
