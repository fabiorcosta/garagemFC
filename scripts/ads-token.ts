/**
 * Cria a chave da API de anúncios (/api/anuncios/itens) sem ela aparecer na tela nem no histórico.
 *   npm run ads:token          → grava a chave num arquivo só seu e mostra o valor para ADS_API_TOKEN_SHA256.
 *   npm run ads:token:apply    → igual, e já grava ADS_API_TOKEN_SHA256 no Railway (CLI `railway` logado).
 * O site guarda só o SHA-256; a chave em si fica no arquivo (permissão 600) para você passar ao agente.
 * Rodar de novo troca a chave: a antiga para de funcionar assim que o Railway reiniciar.
 */
import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

const apply = process.argv.includes("--apply")
const file = path.join(homedir(), "garagem-chave-api-anuncios.txt")
const token = randomBytes(32).toString("base64url")
const hash = createHash("sha256").update(token).digest("hex")

writeFileSync(file, `${token}\n`, { mode: 0o600 })
console.log(`\n✓ Chave nova gravada em ${file} (só o seu usuário consegue ler).`)
console.log("  Passe o conteúdo desse arquivo ao agente de anúncios, no cabeçalho: Authorization: Bearer <chave>\n")

if (!apply) {
  console.log("Cole este valor em ADS_API_TOKEN_SHA256 (Railway → garagemFC → Variables):\n")
  console.log(hash)
} else {
  // execFile com lista de argumentos: nada passa por um shell
  execFileSync("railway", ["variables", "-s", "garagemFC", "--set", `ADS_API_TOKEN_SHA256=${hash}`], { stdio: "ignore" })
  console.log("✓ ADS_API_TOKEN_SHA256 gravada no Railway. O site reinicia sozinho; em ~2 minutos a chave vale.")
}
