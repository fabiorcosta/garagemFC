"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { track } from "@/lib/gtag"
import { useDisclaimer } from "@/components/disclaimer"

export function ContactForm({
  itemId,
  itemTitle,
  status,
  texts,
}: {
  itemId: string
  itemTitle: string
  status: string
  texts: { title: string; message: string; success: string; sold: string; reserved: string }
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const disclaimer = useDisclaimer()

  if (status !== "disponivel") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border bg-muted/60 p-4 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p>
          {status === "vendido" ? texts.sold : texts.reserved}
        </p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-olive/30 bg-olive-soft p-4 text-sm text-olive">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="font-medium">{texts.success}</p>
      </div>
    )
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload: Record<string, FormDataEntryValue | boolean> = { ...Object.fromEntries(form), itemId }
    if (!payload.email && !payload.phone) {
      toast.error("Informe um telefone ou e-mail para receber a resposta.")
      return
    }
    if (!disclaimer) return
    // Aviso de garantia à frente; o servidor só aceita a mensagem com o aceite e a versão do texto
    disclaimer.confirm(() => send({ ...payload, disclaimerAccepted: true, disclaimerVersion: disclaimer.texts.version }))
  }

  async function send(payload: Record<string, FormDataEntryValue | boolean>) {
    setSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar.")
      track("contact_form", { item_name: itemTitle })
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 className="font-bold">{texts.title}</h2>
      {/* Campo-isca contra robôs: humanos não veem */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-1.5">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" required maxLength={80} autoComplete="name" className="h-10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" inputMode="tel" className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input id="email" name="email" type="email" maxLength={120} autoComplete="email" className="h-10" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          name="message"
          required
          maxLength={1000}
          rows={3}
          defaultValue={texts.message}
        />
      </div>
      <Button type="submit" disabled={sending} className="h-11 rounded-full text-base font-semibold">
        {sending && <Loader2 className="animate-spin" />}
        Enviar mensagem
      </Button>
    </form>
  )
}
