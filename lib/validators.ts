import { z } from "zod"

/** Fotos por item (o formulário também limita, mas quem manda é o servidor). */
export const MAX_PHOTOS = 8

/** Só https:// com host de verdade (sem javascript:, data:, credenciais no link ou IP local). */
export const referenceUrlSchema = z
  .string()
  .trim()
  .max(500, "Link longo demais")
  .refine((v) => {
    if (v === "") return true
    try {
      const u = new URL(v)
      return u.protocol === "https:" && !u.username && !u.password && u.hostname.includes(".") && !/^[\d.]+$/.test(u.hostname)
    } catch {
      return false
    }
  }, "O link de referência precisa ser um endereço https:// válido")
