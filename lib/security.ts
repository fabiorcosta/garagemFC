import "server-only"
import { createHash } from "node:crypto"
import { isIP } from "node:net"

/**
 * IP do cliente. No Railway o proxy de borda SOBRESCREVE o X-Forwarded-For com o IP real
 * (testado em 2026-09-30: IP forjado no cabeçalho não burlou o limite). Valor inválido vira "unknown".
 */
export function clientIp(headers: Headers) {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  return isIP(first) ? first : "unknown"
}

/** Chave de limite sem guardar IP/e-mail em claro no banco. */
export function rlKey(purpose: string, value: string) {
  return `${purpose}:${createHash("sha256").update(`${purpose}|${value.toLowerCase()}`).digest("hex").slice(0, 40)}`
}

/**
 * Defesa contra requisição forjada vinda de outro site (CSRF), além do cookie SameSite=Lax:
 * toda requisição que altera dados precisa vir da mesma origem.
 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin")
  const host = req.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
