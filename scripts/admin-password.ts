/**
 * Troca a senha do admin sem a senha aparecer na tela, no histórico ou sair do computador.
 *   npm run admin:hash   → digite a senha 2x → mostra o hash para colar em ADMIN_PASSWORD_HASH no Railway.
 *   npm run admin:reset  → igual, mas já grava o hash no Railway (CLI `railway` logado e pasta vinculada)
 *                          e o site reinicia com a senha nova (~2 min).
 * Só o hash (bcrypt) sai daqui; a senha em si nunca é enviada nem exibida.
 */
import bcrypt from "bcryptjs"
import { execFileSync } from "node:child_process"

/**
 * Lê a senha tecla por tecla com o terminal em modo "raw": nada do que é digitado é ecoado
 * (só um "•" por caractere). Enter confirma, Backspace apaga, Ctrl-C cancela.
 */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    if (!stdin.isTTY) return reject(new Error("Rode este comando num terminal interativo."))
    process.stdout.write(question)
    let value = ""
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    const done = (err?: Error) => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener("data", onData)
      process.stdout.write("\n")
      if (err) reject(err)
      else resolve(value)
    }
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done()
        if (ch === "\u0003") return done(new Error("Cancelado."))
        if (ch === "\u007f" || ch === "\b") {
          if (value.length) {
            value = value.slice(0, -1)
            process.stdout.write("\b \b")
          }
          continue
        }
        if (ch < " ") continue // ignora outras teclas de controle (setas etc.)
        value += ch
        process.stdout.write("•")
      }
    }
    stdin.on("data", onData)
  })
}

async function main() {
  const apply = process.argv.includes("--apply")
  let a = ""
  // Senha curta: pergunta de novo em vez de encerrar (encerrar levava a pessoa a digitar a senha no shell)
  for (;;) {
    a = await askHidden("Nova senha do admin (mín. 14 caracteres): ")
    if (a.length >= 14) break
    console.log(`Curta demais (${a.length} caracteres). Tente de novo.`)
  }
  const b = await askHidden("Repita a senha: ")
  if (a !== b) throw new Error("As senhas não conferem.")
  const hash = await bcrypt.hash(a, 12)

  if (!apply) {
    console.log("\nCole este valor em ADMIN_PASSWORD_HASH (Railway → garagemFC → Variables):\n")
    console.log(hash)
    return
  }

  // execFile com lista de argumentos: nada passa por um shell (sem risco de injeção)
  execFileSync("railway", ["variables", "-s", "garagemFC", "--set", `ADMIN_PASSWORD_HASH=${hash}`], { stdio: "ignore" })
  console.log("\n✓ Senha nova gravada no Railway. O site reinicia sozinho; em ~2 minutos ela já vale no /admin.")
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
