import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { isAdPriority } from "@/lib/ad-priority"
import { publicDb as db, rateLimitHit } from "@/lib/db"
import { getFileUrl } from "@/lib/file-url"
import { siteUrl, slugify } from "@/lib/format"
import { toDateInput, todayInput } from "@/lib/pickup-date"
import { clientIp, rlKey } from "@/lib/security"

/**
 * GET /api/produtos — catálogo para o agente de anúncios pagos. SOMENTE LEITURA.
 *
 * Acesso: cabeçalho "Authorization: Bearer <chave>". O servidor guarda só o SHA-256 da chave
 * (ADS_API_TOKEN_SHA256); sem essa variável, a API fica desligada (falha fechada).
 * Conexão de VISITANTE (garagem_public): não grava nada e, pela RLS, não enxerga rascunhos.
 * Item que some da lista (virou rascunho ou foi excluído) também deve ter o anúncio pausado.
 * Sem CORS: navegadores de outros sites não leem a resposta.
 */
export const dynamic = "force-dynamic"

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS })

function tokenOk(header: string | null) {
  const expected = process.env.ADS_API_TOKEN_SHA256?.trim().toLowerCase()
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) return null // não configurada: API desligada
  const m = header?.match(/^Bearer ([A-Za-z0-9_-]{32,200})$/)
  if (!m) return false
  const got = createHash("sha256").update(m[1]).digest()
  return timingSafeEqual(got, Buffer.from(expected, "hex"))
}

/** "Novo", "Sem uso", "Lacrado" → "sem_uso"; demais: código do texto ("Bom estado" → "bom_estado"). */
function conditionCode(text: string) {
  if (/\b(novo|nova|sem uso|lacrad[oa]|nunca usad[oa])\b/i.test(text)) return "sem_uso"
  return slugify(text).replace(/-/g, "_") || "nao_informado"
}

function absolute(url: string | null) {
  if (!url) return null
  return /^https:\/\//.test(url) ? url : `${siteUrl()}${url.startsWith("/") ? "" : "/"}${url}`
}

export async function GET(req: Request) {
  const ip = clientIp(req.headers)
  if (!(await rateLimitHit(rlKey("ads-api", ip), 60, 60))) return json({ error: "Muitas requisições" }, 429)

  const ok = tokenOk(req.headers.get("authorization"))
  if (ok === null) return json({ error: "API desativada" }, 503)
  if (!ok) {
    // Chave errada: limite bem mais curto (10 erros a cada 15 min por endereço), contra tentativa e erro
    const under = await rateLimitHit(rlKey("ads-api-fail", ip), 10, 900)
    return json({ error: under ? "Não autorizado" : "Muitas requisições" }, under ? 401 : 429)
  }

  const rows = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      condition: true,
      status: true,
      pickupFrom: true,
      adPriority: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
      photos: { orderBy: { sortOrder: "asc" }, select: { url: true, cloud_storage_path: true } },
    },
  })

  const base = siteUrl()
  // Formato combinado com o agente de anúncios: lista direta, campos em snake_case.
  const produtos = rows.map((r) => {
    const fotos = r.photos.map((p) => absolute(p.url || getFileUrl(p.cloud_storage_path))).filter((u): u is string => !!u)
    return {
      slug: r.slug,
      nome: r.title,
      preco: r.price,
      // "disponivel" | "reservado" | "vendido" — reservado/vendido: pausar anúncio
      status: r.status,
      prioridade: isAdPriority(r.adPriority) ? r.adPriority : "normal",
      categoria: r.category?.slug ?? null,
      condicao: conditionCode(r.condition),
      // AAAA-MM-DD; null = já pode retirar (sem data ou data já passou)
      disponivel_a_partir: r.pickupFrom && toDateInput(r.pickupFrom) > todayInput() ? toDateInput(r.pickupFrom) : null,
      foto_url: fotos[0] ?? null,
      atualizado_em: r.updatedAt.toISOString(),
      // Extras (não obrigatórios)
      id: r.id,
      link: `${base}/itens/${r.slug}`,
      fotos,
      condicao_texto: r.condition,
      categoria_nome: r.category?.name ?? null,
    }
  })

  return json(produtos)
}
