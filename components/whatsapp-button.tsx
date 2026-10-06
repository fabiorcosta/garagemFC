"use client"

import { cn } from "@/lib/utils"
import { whatsappLink } from "@/lib/format"
import { track } from "@/lib/gtag"
import { useDisclaimer } from "./disclaimer"

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.32 11.32 0 0 0 5.42 1.38h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02" />
    </svg>
  )
}

export function WhatsAppButton({
  phone,
  message,
  label = "Chamar no WhatsApp",
  floating = false,
  itemName,
  className,
}: {
  phone: string
  message: string
  label?: string
  floating?: boolean
  itemName?: string
  className?: string
}) {
  const disclaimer = useDisclaimer()
  if (!phone) return null
  const href = whatsappLink(phone, message)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!disclaimer) {
          track("contact_whatsapp", itemName ? { item_name: itemName } : {})
          return
        }
        // Aviso de garantia à frente; a conversa só abre depois do "estou ciente",
        // já com a linha de aceite na mensagem (fica registrada no próprio WhatsApp).
        e.preventDefault()
        disclaimer.confirm(() => {
          track("contact_whatsapp", itemName ? { item_name: itemName } : {})
          window.open(whatsappLink(phone, `${message}\n\n${disclaimer.texts.whatsappNote}`), "_blank", "noopener,noreferrer")
        })
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-[#08331A] shadow-lg transition hover:brightness-95 active:scale-[0.98]",
        floating ? "fixed right-4 bottom-4 z-40 h-14 px-5 text-base sm:right-6 sm:bottom-6" : "h-11 px-5 text-sm",
        className,
      )}
    >
      <WhatsAppIcon className="size-5" />
      {label}
    </a>
  )
}
