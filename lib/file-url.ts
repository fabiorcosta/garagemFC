/** Converte a chave salva no banco em URL pública. Seguro para usar no cliente e no servidor. */
export function getFileUrl(key: string | null | undefined): string | null {
  if (!key) return null
  if (/^https?:\/\//.test(key)) return key
  const base = (process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "").replace(/\/$/, "")
  if (!base) return `/uploads/${key}`
  return `${base}/${key}`
}

type PhotoLike = { url?: string | null; cloud_storage_path?: string | null; thumbnailPath?: string | null }

export function photoFullUrl(p: PhotoLike | undefined) {
  if (!p) return null
  return p.url || getFileUrl(p.cloud_storage_path)
}

export function photoThumbUrl(p: PhotoLike | undefined) {
  if (!p) return null
  return getFileUrl(p.thumbnailPath) ?? photoFullUrl(p)
}
