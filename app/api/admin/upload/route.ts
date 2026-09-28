import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest } from "@/lib/api"
import { buildKey, createPresignedUpload, isAllowedImageType } from "@/lib/s3"

const schema = z.object({ contentType: z.string() })

/** Gera duas URLs de envio (foto completa + miniatura) para o navegador fazer PUT direto no bucket. */
export const POST = adminRoute(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !isAllowedImageType(parsed.data.contentType)) {
    return badRequest("Envie apenas imagens JPG, PNG ou WebP")
  }
  const { contentType } = parsed.data
  const fullKey = buildKey(contentType, "full")
  const thumbKey = buildKey(contentType, "thumb")
  const [fullUrl, thumbUrl] = await Promise.all([
    createPresignedUpload(fullKey, contentType),
    createPresignedUpload(thumbKey, contentType),
  ])
  return NextResponse.json({
    full: { key: fullKey, uploadUrl: fullUrl },
    thumb: { key: thumbKey, uploadUrl: thumbUrl },
  })
})
