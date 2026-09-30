import "server-only"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin, type AdminContext } from "./admin-auth"
import { rateLimitHit } from "./db"
import { isSameOrigin, rlKey } from "./security"

// Mensagens de validação em pt-BR em todas as rotas
z.config(z.locales.ptBR())

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: "Requisição recusada" }, { status: 403 })
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export function notFound() {
  return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
}

export function tooMany() {
  return NextResponse.json({ error: "Muitas requisições. Aguarde um pouco e tente de novo." }, { status: 429 })
}

/** IDs gerados pelo Prisma (cuid). Qualquer outra coisa é rejeitada antes de tocar o banco. */
export const idSchema = z.string().regex(/^c[a-z0-9]{20,31}$/)

export async function parseId(params: Promise<{ id: string }>) {
  const parsed = idSchema.safeParse((await params).id)
  return parsed.success ? parsed.data : null
}

/** Lê o corpo como JSON (só aceita Content-Type JSON e até 64 KB). */
export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null
  const text = await req.text()
  if (text.length > 64 * 1024) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Envolve toda rota /api/admin:
 *  - mesma origem obrigatória em alterações (CSRF);
 *  - sessão validada no servidor + usuário ainda admin no banco (senão 401);
 *  - limite de 300 requisições / 5 min por admin;
 *  - entrega ao handler o banco já no contexto admin.
 */
export function adminRoute<P>(handler: (req: Request, ctx: { params: Promise<P> }, admin: AdminContext) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    if (MUTATING.has(req.method) && !isSameOrigin(req)) return forbidden()
    const admin = await requireAdmin()
    if (!admin) return unauthorized()
    if (!(await rateLimitHit(rlKey("admin", admin.session.user.id), 300, 300))) return tooMany()
    return handler(req, ctx, admin)
  }
}

/** Atualiza as páginas públicas logo após uma alteração no admin. */
export function revalidatePublic() {
  revalidatePath("/", "layout")
}
