/**
 * Leitor mínimo de .zip no NAVEGADOR (exportação do WhatsApp), sem dependência externa:
 * usa DecompressionStream("deflate-raw"), nativo dos navegadores atuais.
 *
 * O arquivo vem do usuário e é tratado como hostil:
 *  - nada é gravado em disco; os nomes internos nunca viram caminho de arquivo;
 *  - limites de quantidade de entradas e de tamanho descompactado (contra "zip bomb"),
 *    conferidos DURANTE a descompressão, não pelo tamanho que o próprio zip declara;
 *  - zip cifrado ou ZIP64 é recusado.
 */

export const ZIP_LIMITS = { maxEntries: 2000, maxEntryBytes: 30 * 1024 * 1024, maxZipBytes: 1024 * 1024 * 1024 } as const

export type ZipEntry = { name: string; method: number; compressedSize: number; size: number; localOffset: number }

export class ZipError extends Error {}

const u16 = (v: DataView, o: number) => v.getUint16(o, true)
const u32 = (v: DataView, o: number) => v.getUint32(o, true)

async function view(file: Blob, start: number, end: number) {
  return new DataView(await file.slice(start, end).arrayBuffer())
}

/** Lê o diretório central e devolve as entradas (sem descompactar nada ainda). */
export async function listZip(file: Blob): Promise<ZipEntry[]> {
  if (file.size > ZIP_LIMITS.maxZipBytes) throw new ZipError("Arquivo grande demais (máx. 1 GB).")
  if (file.size < 22) throw new ZipError("Arquivo não é um .zip válido.")
  const tailStart = Math.max(0, file.size - 65_557)
  const tail = await view(file, tailStart, file.size)
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ZipError("Arquivo não é um .zip válido.")
  const count = u16(tail, eocd + 10)
  const cdSize = u32(tail, eocd + 12)
  const cdOffset = u32(tail, eocd + 16)
  if (count === 0xffff || cdOffset === 0xffffffff) throw new ZipError("Formato de .zip não suportado (ZIP64).")
  if (count > ZIP_LIMITS.maxEntries) throw new ZipError(`Arquivos demais no .zip (máx. ${ZIP_LIMITS.maxEntries}).`)
  if (cdOffset + cdSize > file.size) throw new ZipError("Arquivo .zip corrompido.")

  const cd = await view(file, cdOffset, cdOffset + cdSize)
  const decoder = new TextDecoder("utf-8")
  const entries: ZipEntry[] = []
  let p = 0
  for (let n = 0; n < count; n++) {
    if (p + 46 > cd.byteLength || u32(cd, p) !== 0x02014b50) throw new ZipError("Arquivo .zip corrompido.")
    const flags = u16(cd, p + 8)
    const method = u16(cd, p + 10)
    const compressedSize = u32(cd, p + 20)
    const size = u32(cd, p + 24)
    const nameLen = u16(cd, p + 28)
    const extraLen = u16(cd, p + 30)
    const commentLen = u16(cd, p + 32)
    const localOffset = u32(cd, p + 42)
    const name = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (flags & 1) throw new ZipError("O .zip está protegido por senha.")
    if (name.endsWith("/")) continue
    entries.push({ name, method, compressedSize, size, localOffset })
  }
  return entries
}

/** Descompacta UMA entrada, interrompendo se passar do limite (o tamanho declarado não é confiável). */
export async function readEntry(file: Blob, e: ZipEntry, maxBytes: number = ZIP_LIMITS.maxEntryBytes): Promise<Blob> {
  const head = await view(file, e.localOffset, e.localOffset + 30)
  if (u32(head, 0) !== 0x04034b50) throw new ZipError("Arquivo .zip corrompido.")
  const start = e.localOffset + 30 + u16(head, 26) + u16(head, 28)
  const end = start + e.compressedSize
  if (end > file.size) throw new ZipError("Arquivo .zip corrompido.")
  const raw = file.slice(start, end)

  if (e.method === 0) {
    if (raw.size > maxBytes) throw new ZipError(`"${e.name}" é grande demais.`)
    return raw
  }
  if (e.method !== 8) throw new ZipError(`Compressão não suportada em "${e.name}".`)

  const reader = raw.stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new ZipError(`"${e.name}" é grande demais.`)
    }
    parts.push(value)
  }
  return new Blob(parts as BlobPart[])
}
