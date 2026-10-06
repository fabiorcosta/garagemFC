/**
 * Tranca o banco (default deny). Roda com o papel DONO (MIGRATE_DATABASE_URL) a cada deploy, depois do db push.
 * Idempotente.
 *
 * Modelo: um papel de banco por nível de confiança, cada um com senha própria.
 *  - garagem_public: visitantes. Lê catálogo e configurações; só INSERE mensagens (não lê);
 *    executa as funções de login e de limite de tentativas. NÃO consegue virar admin:
 *    não é membro de garagem_admin e não tem privilégio para trocar de papel.
 *  - garagem_admin: usado só depois de a sessão ser validada no servidor (lib/admin-auth.ts).
 *  - Ambos: sem superusuário, sem BYPASSRLS, sem CREATE.
 *  - RLS ligado e FORÇADO em todas as tabelas; sem política = nada passa.
 *  - "User" e "RateLimit": nenhum GRANT a ninguém; só por funções SECURITY DEFINER.
 */
import { PrismaClient } from "@prisma/client"

const url = process.env.MIGRATE_DATABASE_URL
if (!url) throw new Error("MIGRATE_DATABASE_URL não definida")

const PASSWORDS = {
  garagem_public: process.env.APP_DB_PASSWORD_PUBLIC,
  garagem_admin: process.env.APP_DB_PASSWORD_ADMIN,
}
for (const [role, pw] of Object.entries(PASSWORDS)) {
  // Só letras/números: a senha entra no ALTER ROLE (que não aceita parâmetro), então o formato é travado.
  if (!pw || !/^[A-Za-z0-9]{32,}$/.test(pw)) throw new Error(`Senha do papel ${role} ausente ou fraca (32+ letras/números)`)
}
if (PASSWORDS.garagem_public === PASSWORDS.garagem_admin) throw new Error("Os dois papéis precisam de senhas diferentes")

const db = new PrismaClient({ datasourceUrl: url })

const CATALOG = ["Category", "Item", "ItemPhoto", "SiteSettings"]
const BUSINESS = [...CATALOG, "ContactMessage"]
const ALL_TABLES = [...BUSINESS, "User", "RateLimit"]
const ROLES = Object.keys(PASSWORDS)

const statements: string[] = [
  ...ROLES.flatMap((role) => [
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} LOGIN; END IF;
     END $$`,
    `ALTER ROLE ${role} WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION
       CONNECTION LIMIT 30 PASSWORD '${PASSWORDS[role as keyof typeof PASSWORDS]}'`,
  ]),
  // Nenhum papel é membro de outro (impede SET ROLE para subir de nível)
  `DO $$ DECLARE r record; BEGIN
     FOR r IN SELECT g.rolname AS grp, m.rolname AS member FROM pg_auth_members am
       JOIN pg_roles g ON g.oid = am.roleid JOIN pg_roles m ON m.oid = am.member
       WHERE m.rolname IN ('garagem_public', 'garagem_admin') LOOP
       EXECUTE format('REVOKE %I FROM %I', r.grp, r.member);
     END LOOP;
   END $$`,
  // Remove as políticas deste script (recriadas abaixo) — antes de apagar o papel antigo que as referencia
  `DO $$ DECLARE r record; BEGIN
     FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'gar_%' LOOP
       EXECUTE format('DROP POLICY %I ON %I', r.policyname, r.tablename);
     END LOOP;
   END $$`,
  // Papel da versão anterior deste script, se existir
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'garagem_app') THEN
       REVOKE ALL ON ALL TABLES IN SCHEMA public FROM garagem_app;
       REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM garagem_app;
       REVOKE ALL ON SCHEMA public FROM garagem_app;
       DROP ROLE garagem_app;
     END IF;
   END $$`,

  `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
  `GRANT USAGE ON SCHEMA public TO garagem_public, garagem_admin`,
  `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, garagem_public, garagem_admin`,
  `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, garagem_public, garagem_admin`,
  `GRANT SELECT ON ${CATALOG.map((t) => `"${t}"`).join(", ")} TO garagem_public`,
  `GRANT INSERT ON "ContactMessage" TO garagem_public`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ${BUSINESS.map((t) => `"${t}"`).join(", ")} TO garagem_admin`,

  ...ALL_TABLES.flatMap((t) => [
    `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY`,
  ]),
  ...["Category", "SiteSettings"].map((t) => `CREATE POLICY gar_public_read ON "${t}" FOR SELECT TO garagem_public USING (true)`),
  // Rascunhos (published = false) e suas fotos nunca chegam ao visitante, mesmo que uma consulta esqueça o filtro
  `CREATE POLICY gar_public_read ON "Item" FOR SELECT TO garagem_public USING ("published" = true)`,
  `CREATE POLICY gar_public_read ON "ItemPhoto" FOR SELECT TO garagem_public
     USING ("isPublic" = true AND EXISTS (SELECT 1 FROM "Item" i WHERE i.id = "ItemPhoto"."itemId" AND i."published" = true))`,
  // Visitante só cria mensagem nova, não lida, e com o aceite do aviso de garantia registrado
  `CREATE POLICY gar_public_insert ON "ContactMessage" FOR INSERT TO garagem_public
     WITH CHECK ("read" = false AND "disclaimerAcceptedAt" IS NOT NULL AND "disclaimerVersion" IS NOT NULL)`,
  ...BUSINESS.map((t) => `CREATE POLICY gar_admin_all ON "${t}" FOR ALL TO garagem_admin USING (true) WITH CHECK (true)`),

  // Login: devolve só o registro do e-mail pedido
  `CREATE OR REPLACE FUNCTION auth_find_user(p_email text)
     RETURNS TABLE (id text, email text, name text, "passwordHash" text, role text)
     LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
       SELECT u.id, u.email, u.name, u."passwordHash", u.role FROM "User" u WHERE u.email = lower(p_email) LIMIT 1
     $$`,
  // Revalida a sessão a cada acesso admin: o usuário ainda existe e ainda é admin?
  `CREATE OR REPLACE FUNCTION auth_is_admin(p_id text)
     RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
       SELECT EXISTS (SELECT 1 FROM "User" u WHERE u.id = p_id AND u.role = 'admin')
     $$`,
  // Limite de tentativas atômico: true = pode seguir
  `CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_max int, p_window_seconds int)
     RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
   DECLARE c int;
   BEGIN
     IF length(p_key) > 128 OR p_max < 1 OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
       RAISE EXCEPTION 'parâmetros inválidos';
     END IF;
     INSERT INTO "RateLimit" (key, "windowStart", count) VALUES (p_key, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE "RateLimit".count + 1 END,
       "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => p_window_seconds) THEN now() ELSE "RateLimit"."windowStart" END
     RETURNING count INTO c;
     IF random() < 0.01 THEN DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day'; END IF;
     RETURN c <= p_max;
   END $$`,
  `REVOKE ALL ON FUNCTION auth_find_user(text), auth_is_admin(text), rate_limit_hit(text, int, int) FROM PUBLIC`,
  `GRANT EXECUTE ON FUNCTION auth_find_user(text), auth_is_admin(text) TO garagem_public`,
  `GRANT EXECUTE ON FUNCTION rate_limit_hit(text, int, int) TO garagem_public, garagem_admin`,
]

async function main() {
  await db.$transaction(async (tx) => {
    for (const sql of statements) await tx.$executeRawUnsafe(sql)
  })

  // Auto-verificação: o deploy falha se a tranca não estiver como esperado
  const tables = await db.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'`
  const open = tables.filter((r) => !r.relrowsecurity || !r.relforcerowsecurity).map((r) => r.relname)
  if (open.length) throw new Error(`Tabelas sem RLS forçado: ${open.join(", ")}`)

  const roles = await db.$queryRaw<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean; memberships: bigint }[]>`
    SELECT r.rolname, r.rolsuper, r.rolbypassrls,
      (SELECT count(*) FROM pg_auth_members am WHERE am.member = r.oid) AS memberships
    FROM pg_roles r WHERE r.rolname IN ('garagem_public', 'garagem_admin')`
  const bad = roles.filter((r) => r.rolsuper || r.rolbypassrls || r.memberships > BigInt(0))
  if (roles.length !== 2 || bad.length) throw new Error(`Papéis com privilégios indevidos: ${bad.map((r) => r.rolname).join(", ")}`)

  const userGrants = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name IN ('User', 'RateLimit') AND grantee IN ('garagem_public', 'garagem_admin', 'PUBLIC')`
  if (userGrants[0].n > BigInt(0)) throw new Error("Tabelas User/RateLimit com acesso direto concedido")

  console.log(`Segurança do banco ok: RLS forçado em ${tables.length} tabelas; papéis garagem_public e garagem_admin restritos.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
