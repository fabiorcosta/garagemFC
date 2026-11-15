/**
 * Lê o _chat.txt de uma conversa exportada do WhatsApp (iPhone ou Android) e devolve
 * cada foto com a sua legenda já separada em nome, número/tamanho e preço.
 * Funções puras (sem rede, sem DOM): o texto é dado do usuário, nunca código.
 *
 * Formatos aceitos (exemplos reais):
 *   iPhone:  [15/11/2026, 08:06:08] Fabio Costa: Luz da Lua\nNúmero 38\n70,00 <anexado: 00000003-PHOTO-….jpg>
 *   Android: 15/11/2026 08:06 - Fabio Costa: IMG-20261115-WA0001.jpg (arquivo anexado)\nLuz da Lua\nNúmero 38\n70,00
 */

export type ParsedPhoto = {
  /** nome do arquivo dentro do .zip */
  file: string
  name: string
  size: string
  /** "nº" para calçado/número; "tam." para tamanho */
  sizeLabel: "nº" | "tam."
  /** null = não achei o preço na legenda */
  price: number | null
  unused: boolean
  /** legenda inteira, linha a linha, sem o preço (vai para a descrição do item) */
  description: string
  /** legenda original, para conferência */
  caption: string
}

const HEADER = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-\s*)?([^:]{1,80}):\s?(.*)$/
const ATTACH_IOS = /<(?:anexado|attached|adjunto):\s*([^>]+?)\s*>/i
const ATTACH_ANDROID = /^(\S+\.(?:jpe?g|png|webp|heic))\s*\((?:arquivo anexado|file attached|archivo adjunto)\)/im
const UNUSED = /\b(?:s\/\s?uso|sem uso|nunca usad[oa]|novo na caixa)\b/i
// Rótulo seguido de ":" ou espaço (assim "Tampa azul" não vira tamanho "pa azul"); "nº39" também vale.
const SIZE_LINE = /^(?:(?:n[uú]mero|num|tamanho|tam|cal[çc]ado)\.?(?:\s*:\s*|\s+)|n[º°]\.?\s*:?\s*)(.{1,20})$/i
const PRICE_IN_LINE = /^(?:valor|pre[çc]o|r\$)?\s*:?\s*(?:r\$)?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\b/i

/** "70,00" → 70 · "1.200,00" → 1200 · "R$ 50" → 50 · arredonda centavos para reais inteiros (o site mostra sem centavos). */
export function parsePrice(text: string): number | null {
  const m = text.trim().match(PRICE_IN_LINE)
  if (!m) return null
  const n = Number(`${m[1].replace(/\./g, "")}.${m[2] ?? "0"}`)
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? Math.round(n) : null
}

/** Separa a legenda em nome / número / preço, aceitando linhas em qualquer ordem. */
export function parseCaption(caption: string) {
  const unused = UNUSED.test(caption)
  const lines = caption
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  let size = ""
  const description: string[] = []
  let sizeLabel: "nº" | "tam." = "nº"
  let price: number | null = null
  const rest: string[] = []
  for (const original of lines) {
    const line = original.replace(UNUSED, "").replace(/\s+/g, " ").trim()
    if (!line) {
      description.push(original)
      continue
    }
    const s = line.match(SIZE_LINE)
    if (!size && s) {
      size = s[1].trim()
      sizeLabel = /^tam/i.test(line) ? "tam." : "nº"
      description.push(original)
      continue
    }
    if (price === null && (/^(?:valor|pre[çc]o|r\$)/i.test(line) || /^[\d.,\sR$]+$/i.test(line))) {
      price = parsePrice(line)
      // Na descrição fica tudo menos o preço (ex.: "Valor 150,00 s/uso" → "s/uso")
      const remainder = original.replace(PRICE_IN_LINE, "").trim()
      if (remainder) description.push(remainder)
      continue
    }
    rest.push(line)
    description.push(original)
  }
  // Nome = 1ª linha que não é número nem preço; o resto da legenda fica na descrição.
  return { name: (rest[0] ?? "").slice(0, 100), size: size.slice(0, 20), sizeLabel, price, unused, description: description.join("\n").slice(0, 2000) }
}

/** Junta as linhas de cada mensagem e pega só as que têm foto. */
export function parseChat(text: string): ParsedPhoto[] {
  const clean = text.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").replace(/\r/g, "")
  const messages: string[] = []
  for (const line of clean.split("\n")) {
    const h = line.match(HEADER)
    if (h) messages.push(h[4])
    else if (messages.length) messages[messages.length - 1] += `\n${line}`
  }
  const out: ParsedPhoto[] = []
  for (const body of messages) {
    const ios = body.match(ATTACH_IOS)
    const android = ios ? null : body.match(ATTACH_ANDROID)
    const file = (ios ?? android)?.[1]
    if (!file || !/\.(jpe?g|png|webp)$/i.test(file)) continue
    const caption = body.replace(ios ? ATTACH_IOS : ATTACH_ANDROID, "").trim()
    out.push({ file, caption, ...parseCaption(caption) })
  }
  return out
}

/** Título do item: "Luz da Lua nº 38" (o número entra no título porque há vários do mesmo modelo). */
export function itemTitle(p: { name: string; size: string; sizeLabel: "nº" | "tam." }) {
  const name = p.name || "Item"
  return (p.size ? `${name} ${p.sizeLabel} ${p.size}` : name).slice(0, 120)
}
