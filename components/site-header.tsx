import Link from "next/link"
import { Truck } from "lucide-react"

export function SiteHeader({ title, announcement }: { title: string; announcement?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      {announcement && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
          {announcement}
        </div>
      )}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            G
          </span>
          {title}
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/itens" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Itens
          </Link>
          <Link href="/retirada" className="flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-muted">
            <Truck className="size-4" aria-hidden />
            <span className="hidden sm:inline">Retirada</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter({ text, privacyLabel }: { text: string; privacyLabel: string }) {
  return (
    <footer className="mt-16 flex flex-col gap-2 border-t py-8 text-center text-xs text-muted-foreground">
      <p className="px-4">{text}</p>
      <Link href="/privacidade" className="underline underline-offset-2 hover:text-primary">
        {privacyLabel}
      </Link>
    </footer>
  )
}
