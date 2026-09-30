import "server-only"
import { randomUUID } from "node:crypto"
import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getS3Client, s3Config, useLocalStorage } from "./aws-config"

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads")

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function isAllowedImageType(contentType: string) {
  return contentType in EXT_BY_TYPE
}

export function buildKey(contentType: string, variant: "full" | "thumb") {
  const ext = EXT_BY_TYPE[contentType] ?? "jpg"
  return `items/${randomUUID()}-${variant}.${ext}`
}

export const MAX_UPLOAD_BYTES = { full: 600_000, thumb: 80_000 } as const
const UPLOAD_URL_TTL_SECONDS = 300

/**
 * URL para o navegador fazer PUT da foto. Tipo e TAMANHO EXATO entram na assinatura:
 * o bucket recusa arquivo diferente do declarado. Vale 5 minutos.
 * Em modo local (sem bucket), aponta para a rota interna, que refaz as mesmas checagens.
 */
export async function createPresignedUpload(key: string, contentType: string, size: number) {
  if (useLocalStorage) {
    await mkdir(path.join(LOCAL_UPLOAD_DIR, "items"), { recursive: true })
    return `/api/admin/upload/local?key=${encodeURIComponent(key)}&size=${size}`
  }
  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: "public, max-age=31536000, immutable",
  })
  return getSignedUrl(getS3Client(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type", "content-length"]),
  })
}

export async function deleteFile(key: string | null | undefined) {
  if (!key) return
  if (useLocalStorage) {
    const target = path.join(LOCAL_UPLOAD_DIR, key)
    if (target.startsWith(LOCAL_UPLOAD_DIR + path.sep)) await rm(target, { force: true })
    return
  }
  await getS3Client().send(new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: key }))
}

/** Chaves válidas: items/<uuid>-(full|thumb).(jpg|png|webp) */
export function isValidKey(key: string) {
  return /^items\/[0-9a-f-]{36}-(full|thumb)\.(jpg|png|webp)$/.test(key)
}
