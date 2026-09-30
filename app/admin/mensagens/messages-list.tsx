"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Mail, MailOpen, Phone } from "lucide-react"
import { toast } from "sonner"
import { WhatsAppIcon } from "@/components/whatsapp-button"
import { cn } from "@/lib/utils"
import { adminFetch } from "@/lib/admin-fetch"
import { onlyDigits, whatsappLink } from "@/lib/format"
import { fill } from "@/lib/site-texts"

type Msg = {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string
  read: boolean
  createdAt: string
  item: { title: string; slug: string } | null
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
})

export function MessagesList({ messages, replyTemplate }: { messages: Msg[]; replyTemplate: string }) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)

  async function setRead(id: string, read: boolean) {
    try {
      await adminFetch(`/api/admin/messages/${id}`, "PATCH", { read })
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (messages.length === 0) {
    return <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {messages.map((m) => {
        const expanded = open === m.id
        return (
          <li key={m.id} className={cn(!m.read && "bg-terracotta-soft/40")}>
            <button
              onClick={() => {
                setOpen(expanded ? null : m.id)
                if (!m.read && !expanded) setRead(m.id, true)
              }}
              className="flex w-full items-center gap-3 p-3 text-left"
              aria-expanded={expanded}
            >
              <span className={cn("size-2 shrink-0 rounded-full", m.read ? "bg-transparent" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate text-sm", !m.read && "font-bold")}>{m.name}</p>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{dateFmt.format(new Date(m.createdAt))}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {m.item ? <span className="font-medium text-foreground">{m.item.title} · </span> : null}
                  {m.message}
                </p>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 transition", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <div className="flex flex-col gap-3 px-8 pb-4 text-sm">
                {m.item && (
                  <Link href={`/itens/${m.item.slug}`} target="_blank" className="font-medium text-primary hover:underline">
                    {m.item.title}
                  </Link>
                )}
                <p className="whitespace-pre-line">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  {m.phone && (
                    <>
                      <a
                        href={whatsappLink(m.phone, fill(replyTemplate, { nome: m.name.split(" ")[0] }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-[#08331A]"
                      >
                        <WhatsAppIcon className="size-4" /> {m.phone}
                      </a>
                      <a href={`tel:${onlyDigits(m.phone)}`} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold">
                        <Phone className="size-3.5" /> Ligar
                      </a>
                    </>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold">
                      <Mail className="size-3.5" /> {m.email}
                    </a>
                  )}
                  <button
                    onClick={() => setRead(m.id, !m.read)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    <MailOpen className="size-3.5" /> Marcar como {m.read ? "não lida" : "lida"}
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
