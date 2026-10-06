import { createHash } from "node:crypto"
import type { SiteTexts } from "./site-texts"

/** "Impressão digital" do texto do aviso: registra QUAL texto o comprador aceitou. */
export function disclaimerVersion(t: Pick<SiteTexts, "disclaimerTitle" | "disclaimerBody" | "disclaimerCheckbox">) {
  return createHash("sha256")
    .update([t.disclaimerTitle, t.disclaimerBody, t.disclaimerCheckbox].join("\n--\n"))
    .digest("hex")
    .slice(0, 12)
}
