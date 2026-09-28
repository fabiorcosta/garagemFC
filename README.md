# Garagem do Fabio

Vitrine online para vender os itens da casa antes da mudança. Next.js 16 + Prisma 6 + PostgreSQL + NextAuth v5.

## Rodar localmente

```bash
cp .env.example .env        # preencha DATABASE_URL, AUTH_SECRET e SEED_ADMIN_*
npm install
npm run db:push             # cria as tabelas
npm run db:seed             # admin + 6 categorias + 12 itens de exemplo + configurações
npm run dev
```

- Site: http://localhost:3000 · Admin: http://localhost:3000/login
- Sem `S3_BUCKET`, as fotos ficam em `.uploads/` (só para desenvolvimento).
- O seed só cria itens de exemplo se o banco estiver vazio. Rodar de novo atualiza a senha do admin.
- Não existe cadastro público: o admin é criado apenas pelo seed.

## Deploy (Issue #13)

1. **Banco**: criar PostgreSQL no Railway (ou Neon/Supabase) e copiar a `DATABASE_URL`.
2. **Fotos**: criar bucket no Cloudflare R2 (recomendado: sem custo de saída) ou AWS S3, com leitura pública.
   CORS do bucket, liberando `PUT` e `GET` para `https://garagem.fabiocosta.me` e `https://*.vercel.app`:
   ```json
   [{ "AllowedOrigins": ["https://garagem.fabiocosta.me", "https://*.vercel.app"],
      "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
3. **Vercel**: importar o repositório e cadastrar todas as variáveis do `.env.example`.
4. **Banco de produção**: com a `DATABASE_URL` de produção no ambiente, rodar `npm run db:push` e `npm run db:seed`.
5. **DNS**: CNAME `garagem` → `cname.vercel-dns.com` e adicionar o domínio no projeto da Vercel.
6. Conferir o preview do link no WhatsApp e rodar o Lighthouse mobile.
