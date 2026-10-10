/**
 * Troca a senha do admin sem a senha aparecer na tela, no histórico ou sair do computador.
 *   npm run admin:hash   → digite a senha 2x → mostra o hash para colar em ADMIN_PASSWORD_HASH no Railway.
 *   npm run admin:reset  → igual, mas já grava o hash no Railway (CLI `railway` logado e pasta vinculada)
 *                          e o site reinicia com a senha nova (~2 min).
 * Só o hash (bcrypt) sai daqui; a senha em si nunca é enviada nem exibida.
 */
import bcrypt from "bcryptjs"
import { execFileSync } from "node:child_process"
import { createInterface } from "node:readline"

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Esconde o que é digitado
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write("\n")
      resolve(answer)
    })
  })
}

async function main() {
  const apply = process.argv.includes("--apply")
  const a = await ask("Nova senha do admin (mín. 14 caracteres): ")
  if (a.length < 14) throw new Error("Senha curta demais (mínimo 14 caracteres).")
  const b = await ask("Repita a senha: ")
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
