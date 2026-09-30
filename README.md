# Garagem do Fabio

Vitrine online para vender os itens da casa antes da mudança. Next.js 16 + Prisma 6 + PostgreSQL + NextAuth v5.

## Rodar localmente

```bash
cp .env.example .env        # preencha as URLs dos papéis, senhas, AUTH_SECRET e SEED_ADMIN_*
npm install
set -a; . ./.env; set +a    # carrega as variáveis no terminal
npm run db:deploy           # tabelas + tranca de segurança + seed (SEED_SAMPLE_ITEMS=true cria 12 exemplos)
npm run dev
```

- Site: http://localhost:3000 · Admin: http://localhost:3000/login
- Sem `S3_BUCKET`, as fotos ficam em `.uploads/` (só para desenvolvimento).
- O seed só cria categorias e itens de exemplo num banco vazio, e nunca sobrescreve a senha (só `ADMIN_PASSWORD_HASH` troca).
- Não existe cadastro público: o admin é criado apenas pelo seed.

## Segurança (resumo)

- **Banco (default deny):** dois papéis sem privilégios — `garagem_public` (visitantes: lê catálogo, só insere mensagens) e `garagem_admin` (só depois de validar a sessão). RLS forçado em todas as tabelas; `User` e `RateLimit` só por funções `SECURITY DEFINER`. Aplicado e autoverificado a cada deploy por `scripts/db-security.ts`.
- **Deploy:** `npm start` roda `db:deploy` (db push + tranca + seed) com o papel dono e depois remove a URL do dono e as senhas do processo do site.
- **Rotas:** Zod estrito em tudo, mesma origem obrigatória em alterações, respostas com campos explícitos, limite de tentativas no banco.
- **Cabeçalhos:** CSP com nonce por requisição (`proxy.ts`), HSTS, frame-ancestors none.
- **Senha do admin:** só o hash em `ADMIN_PASSWORD_HASH`. Para trocar: `npm run admin:hash` e cole o resultado no Railway.

## Deploy (Railway)

Variáveis do serviço (ver `.env.example`): `DATABASE_URL` e `ADMIN_DATABASE_URL` montadas com `APP_DB_PASSWORD_PUBLIC` / `APP_DB_PASSWORD_ADMIN` (senhas diferentes, `openssl rand -hex 24`), `MIGRATE_DATABASE_URL=${{Postgres.DATABASE_URL}}`, `AUTH_SECRET`, `AUTH_URL` (domínio oficial), `ADMIN_PASSWORD_HASH`, `SEED_ADMIN_EMAIL`, variáveis do R2. O banco não tem acesso externo.
