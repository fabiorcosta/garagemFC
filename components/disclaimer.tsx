"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { CalendarClock, Check, Copy, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { PIX_BRCODE, PIX_KEY, PIX_QR_IMAGE } from "@/lib/pix"

export type DisclaimerTexts = {
  title: string
  body: string
  checkbox: string
  confirm: string
  whatsappNote: string
  version: string
  pickupHighlight: string
  pickupHighlightNow: string
  pixTitle: string
  pixReserveNote: string
  pixAfter: string
}

/** Dados do item que abriu o aviso (data de retirada já formatada; null = imediata). */
export type ItemContext = { pickup: string | null; price: number } | null

type Ctx = {
  texts: DisclaimerTexts
  /** Abre o aviso; `onAccept` roda no clique de "continuar" (mantém o gesto do usuário, sem bloqueio de pop-up). */
  confirm: (onAccept: () => void, item?: ItemContext) => void
}

const DisclaimerContext = createContext<Ctx | null>(null)

export function useDisclaimer() {
  return useContext(DisclaimerContext)
}

/**
 * Aviso "item usado, sem garantia" que aparece à frente antes de chamar no WhatsApp ou enviar mensagem.
 * O botão de continuar só libera com a caixa marcada. A validação que vale é a do servidor (formulário)
 * e o registro na própria mensagem do WhatsApp — isto aqui é a camada de apresentação.
 */
export function DisclaimerProvider({ texts, children }: { texts: DisclaimerTexts; children: React.ReactNode }) {
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [item, setItem] = useState<ItemContext>(null)
  const [checked, setChecked] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)

  const open = pending !== null
  const close = () => {
    setPending(null)
    setChecked(false)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    dialog.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <DisclaimerContext.Provider
      value={{
        texts,
        confirm: (fn, it) => {
          setItem(it ?? null)
          setPending(() => fn)
        },
      }}
    >
      {children}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={close}>
          <div
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl outline-none"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-[#8A5A0B]">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <h2 id="disclaimer-title" className="pt-1.5 text-lg leading-snug font-bold">
                {texts.title}
              </h2>
            </div>
            {item && (
              <p className="flex items-center gap-2 rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-base font-bold text-destructive">
                <CalendarClock className="size-5 shrink-0" aria-hidden />
                {item.pickup ? texts.pickupHighlight.replace("{data}", item.pickup) : texts.pickupHighlightNow}
              </p>
            )}
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{texts.body}</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-dashed p-3 text-sm font-medium has-[:checked]:border-solid has-[:checked]:border-olive has-[:checked]:bg-olive-soft">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--olive)]"
              />
              {texts.checkbox}
            </label>
            <PixBlock texts={texts} price={item?.price ?? null} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-full" onClick={close}>
                Voltar
              </Button>
              <Button
                className="h-11 rounded-full font-semibold"
                disabled={!checked}
                onClick={() => {
                  const fn = pending
                  close()
                  fn?.()
                }}
              >
                {texts.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DisclaimerContext.Provider>
  )
}

/** Aviso sempre visível na página do item (o modal reforça na hora do contato). */
export function DisclaimerNotice() {
  const ctx = useDisclaimer()
  if (!ctx) return null
  return (
    <details className="group rounded-2xl border border-amber/60 bg-amber-soft/60 p-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-[#6B4708]">
        <ShieldAlert className="size-4 shrink-0" aria-hidden />
        {ctx.texts.title}
        <span className="ml-auto text-xs font-medium underline group-open:hidden">ler</span>
      </summary>
      <p className="mt-3 leading-relaxed whitespace-pre-line text-foreground/85">{ctx.texts.body}</p>
    </details>
  )
}

/** Pix: QR (para pagar de outro aparelho) + "copia e cola" e chave com botão de copiar (para pagar no mesmo celular). */
function PixBlock({ texts, price }: { texts: DisclaimerTexts; price: number | null }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-4" aria-labelledby="pix-title">
      <div>
        <h3 id="pix-title" className="font-bold">
          {texts.pixTitle}
          {price != null && <span className="font-semibold text-primary"> · {formatPrice(price)}</span>}
        </h3>
        <p className="text-sm font-semibold">{texts.pixReserveNote}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR estático, já otimizado (~40 KB) */}
      <img
        src={PIX_QR_IMAGE}
        alt="QR code Pix para pagamento"
        width={200}
        height={200}
        className="mx-auto size-48 rounded-xl bg-white p-1"
      />
      <CopyField label="Pix copia e cola (para pagar pelo celular)" value={PIX_BRCODE} buttonLabel="Copiar código" />
      <CopyField label="Chave Pix" value={PIX_KEY} buttonLabel="Copiar chave" />
      <p className="text-xs text-muted-foreground">{texts.pixAfter}</p>
    </section>
  )
}

function CopyField({ label, value, buttonLabel }: { label: string; value: string; buttonLabel: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle")
  const field = useRef<HTMLInputElement>(null)
  const copied = state === "copied"

  async function copy() {
    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch {
      // Área de transferência bloqueada: seleciona o texto e tenta o método antigo
      field.current?.focus()
      field.current?.select()
      try {
        ok = document.execCommand("copy")
      } catch {
        ok = false
      }
    }
    setState(ok ? "copied" : "manual")
    if (ok) setTimeout(() => setState("idle"), 2500)
  }

  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={field}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 w-full min-w-0 flex-1 rounded-lg border bg-card px-3 font-mono text-xs"
          aria-label={label}
        />
        <Button type="button" variant={copied ? "secondary" : "default"} className="h-11 shrink-0 rounded-lg sm:h-10" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copiado!" : buttonLabel}
        </Button>
      </div>
      {state === "manual" && (
        <span className="text-xs font-medium text-primary">Texto selecionado: toque e segure no campo para copiar.</span>
      )}
    </div>
  )
}
