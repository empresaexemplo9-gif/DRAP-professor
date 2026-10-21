# Implantação

## Visão geral

| Peça | Onde | Observações |
|---|---|---|
| Aplicação (Next.js) | Vercel, projeto `drap-professor`, região `gru1` (São Paulo) | Deploy automático a cada push. `main` = produção; demais branches = preview |
| Banco (PostgreSQL 17) | Supabase, projeto `drap-professor`, região `sa-east-1` (São Paulo) | Plano gratuito. Acesso pelo pooler (Supavisor) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | Lint, tipos, testes unitários/RLS, build e E2E com Postgres em container |

## Papéis do banco

| Papel | Uso | Privilégios |
|---|---|---|
| `drap_migrator` | Migrações (`DIRECT_URL`) | Dono das tabelas; sem BYPASSRLS |
| `drap_app` | Aplicação em execução (`DATABASE_URL`) | SELECT/INSERT/UPDATE/DELETE; sujeito às políticas de RLS; sem UPDATE/DELETE em `audit_logs` |

Os papéis `anon` e `authenticated` do Supabase não têm acesso a nenhuma tabela (a aplicação não usa a API de dados do Supabase).

## Variáveis de ambiente (Vercel)

| Variável | Produção | Preview | Descrição |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | `postgresql://drap_app.<ref>:<senha>@<pooler>:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | ✅ | ✅ | `postgresql://drap_migrator.<ref>:<senha>@<pooler>:5432/postgres` (modo sessão, para migrações) |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | Segredo das sessões (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | — | URL pública de produção |
| `DATA_ENCRYPTION_KEY` | ✅ | ✅ | 32 bytes em base64 para cifrar CPF |
| `DEFAULT_TENANT_SLUG` | ✅ | ✅ | `drap` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | ✅ | — | Administrador inicial (criado uma única vez) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opcional | opcional | Login com Google (redirect: `<URL>/api/auth/callback/google`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | opcional | opcional | E-mails transacionais; ao configurar, a confirmação de e-mail passa a ser exigida |
| `ASAAS_ENVIRONMENT` | ✅ | ✅ | `sandbox` em Preview; `production` apenas após homologação |
| `ASAAS_API_KEY` | ✅ | ✅ | Chave privada do Asaas; nunca expor no navegador ou no repositório |
| `ASAAS_WEBHOOK_TOKEN` | ✅ | ✅ | Token secreto configurado no webhook do Asaas |

### Matrícula paga por Pix (primeiro escopo)

- Um administrador configura o preço em cada curso publicado, no campo **Preço do curso** do módulo. Cursos sem preço não exibem checkout.
- O aluno autenticado gera uma cobrança Pix no Asaas. A página mostra QR Code e Pix copia e cola; o navegador consulta o estado a cada 8 segundos.
- Configure o webhook Asaas em `https://<dominio-de-producao>/api/webhooks/asaas`, com os eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`. Use o mesmo `ASAAS_WEBHOOK_TOKEN` no cabeçalho secreto `asaas-access-token`.
- O retorno do navegador e o payload do webhook não liberam acesso. O servidor consulta a cobrança no Asaas, confere ID, referência externa e valor; só então cria/reativa a matrícula `COMPRA` numa transação.
- **Painel › Financeiro** (somente Administrador): totais de receita, lista de cobranças Pix com filtros por situação e, por cobrança, **Verificar no Asaas** (reconsulta o provedor), **Cancelar** (remove a cobrança no Asaas e marca como `Cancelado`) e **Confirmar pagamento manualmente** (baixa com justificativa obrigatória, que libera a matrícula e fica na auditoria). A seção **Preços dos cursos** edita o valor de cada curso; vazio retira o curso do checkout.
- **Painel › Matrículas** (Administrador e Pedagógico): matricula uma conta existente em qualquer curso (origem Atribuição, Cortesia, Compra ou Assinatura), com prazo opcional de acesso e observação interna; edita situação, origem, prazo e observação de cada matrícula. Matrículas com prazo vencido deixam de liberar o conteúdo e passam a `Expirada`. Todas as alterações são auditadas.
- Configure primeiro chaves distintas de sandbox em Preview e conclua uma compra de teste. Em produção, use chave e token próprios do ambiente live. A tela de preços suporta Pix à vista por curso; descontos, reembolsos e outros meios não fazem parte deste escopo.

## Fluxo de deploy

1. Push na `main` → a Vercel executa `npm run vercel-build` (`scripts/vercel-build.sh`).
2. Em **produção**: `prisma migrate deploy` (com `DIRECT_URL`) → seed idempotente (tenant, níveis, segmentos, módulos de exemplo e administrador) → `next build`.
3. Em **preview**: só o build. Previews **não** alteram o banco.
4. Saúde: `GET /api/health` responde `{"status":"ok"}` quando o banco está acessível.

## Rodar localmente

```bash
cp .env.example .env              # ajuste as URLs
npm install
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
psql "$DIRECT_URL" -c "ALTER ROLE drap_app LOGIN PASSWORD 'drap_app';"
npm run db:seed                   # cria admin e, com SEED_DEMO_USERS=1, usuários de demonstração
npm run dev                       # http://localhost:3000
```

Testes: `npm run lint`, `npm run typecheck`, `npm test` (unitários + RLS, exige banco), `npm run build && npm run test:e2e`.

## Domínio próprio

1. Adicione o domínio no projeto da Vercel.
2. Inclua o domínio em `tenants.domains` (ou rode o seed com `SEED_TENANT_DOMAINS=cursos.exemplo.com.br`).
3. Atualize `BETTER_AUTH_URL` se for o domínio principal.

## Rollback

- Aplicação: na Vercel, *Deployments* → deploy anterior → *Promote to Production*.
- Banco: migrações são somente aditivas nesta fase; para reverter dados, use o PITR/backup do Supabase (planos pagos) ou um dump `pg_dump` agendado.
