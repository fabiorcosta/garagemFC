"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export type DisclaimerTexts = {
  title: string
  body: string
  checkbox: string
  confirm: string
  whatsappNote: string
  version: string
}

type Ctx = {
  texts: DisclaimerTexts
  /** Abre o aviso; `onAccept` roda no clique de "continuar" (mantém o gesto do usuário, sem bloqueio de pop-up). */
  confirm: (onAccept: () => void) => void
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
    <DisclaimerContext.Provider value={{ texts, confirm: (fn) => setPending(() => fn) }}>
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
