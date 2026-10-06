import "server-only"
import { rateLimitHit } from "./db"

/**
 * Aviso por e-mail de mensagem nova (Resend, API REST — sem biblioteca extra).
 * - Só texto puro: nada digitado pelo comprador é interpretado como HTML.
 * - Chamado DEPOIS de a mensagem estar salva; falha aqui nunca perde a mensagem.
 * - Teto de 40 e-mails/hora; acima disso a mensagem fica só no painel.
 * - Sem configuração (RESEND_API_KEY etc.), não faz nada.
 */
const API_KEY = process.env.RESEND_API_KEY
const TO = process.env.NOTIFY_EMAIL_TO
const FROM = process.env.NOTIFY_EMAIL_FROM
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/

const configured = !!API_KEY && /^re_[A-Za-z0-9_]{10,}$/.test(API_KEY) && !!TO && EMAIL.test(TO) && !!FROM && EMAIL.test(FROM)

/** Uma linha só, sem caracteres de controle (evita quebrar cabeçalhos), com tamanho limitado. */
function oneLine(s: string, max: number) {
  return s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export type NewMessage = {
  name: string
  phone: string | null
  email: string | null
  message: string
  itemTitle: string | null
  itemUrl: string | null
  adminUrl: string
}

export async function notifyNewMessage(m: NewMessage) {
  if (!configured) return
  if (!(await rateLimitHit("notify-email", 40, 3600))) {
    console.warn("[aviso-email] teto de e-mails por hora atingido; mensagem só no painel")
    return
  }

  const subject = oneLine(`Nova mensagem${m.itemTitle ? ` — ${m.itemTitle}` : ""} (${m.name})`, 150)
  const text = [
    `Nova mensagem pelo site${m.itemTitle ? ` sobre: ${oneLine(m.itemTitle, 150)}` : ""}`,
    "",
    `Nome: ${oneLine(m.name, 80)}`,
    m.phone ? `Telefone/WhatsApp: ${oneLine(m.phone, 30)}` : null,
    m.email ? `E-mail: ${oneLine(m.email, 120)}` : null,
    "",
    "Mensagem:",
    m.message.slice(0, 1000),
    "",
    m.itemUrl ? `Item: ${m.itemUrl}` : null,
    `Ver todas as mensagens: ${m.adminUrl}`,
    "",
    "O comprador aceitou o aviso de item usado, sem garantia, antes de enviar.",
  ]
    .filter((l) => l !== null)
    .join("\n")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Garagem <${FROM}>`,
        to: [TO],
        subject,
        text,
        // "Responder" no e-mail vai direto para o comprador (endereço já validado pelo formulário)
        ...(m.email ? { reply_to: m.email } : {}),
      }),
      signal: controller.signal,
    })
    // Log sem dados do comprador
    if (!res.ok) console.error(`[aviso-email] Resend respondeu ${res.status}`)
  } catch (e) {
    console.error(`[aviso-email] falha no envio: ${(e as Error).name}`)
  } finally {
    clearTimeout(timer)
  }
}
