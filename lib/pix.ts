/**
 * Dados de pagamento Pix — FIXOS no código de propósito (não editáveis pelo admin):
 * se alguém invadisse o painel, não conseguiria trocar o destino do dinheiro.
 *
 * PIX_BRCODE é o conteúdo do QR enviado pelo Fabio (public/pix-qr.png), lido em 2026-10-12.
 * As verificações abaixo rodam no build e no navegador: se a chave, o código ou o dígito
 * verificador não baterem, o site não sobe — QR e chave nunca podem divergir.
 */
export const PIX_KEY = "6b440560-84fd-40ab-8f5a-e454b7934983"

/** "Pix copia e cola" (mesmo conteúdo do QR). */
export const PIX_BRCODE =
  "00020126580014br.gov.bcb.pix01366b440560-84fd-40ab-8f5a-e454b79349835204000053039865802BR5919FABIO ROBERTO COSTA6007Jundiai62290525snVPcVp1aZuAYr6BEqFniKWSA63043830"

export const PIX_QR_IMAGE = "/pix-qr.png"

function crc16(s: string) {
  let crc = 0xffff
  for (const b of new TextEncoder().encode(s)) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

if (!PIX_BRCODE.includes(`0136${PIX_KEY}`)) throw new Error("Pix: a chave do QR não confere com PIX_KEY")
if (crc16(PIX_BRCODE.slice(0, -4)) !== PIX_BRCODE.slice(-4)) throw new Error("Pix: dígito verificador do código inválido")
