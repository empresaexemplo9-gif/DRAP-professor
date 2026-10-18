# DRAP Professor — Plataforma de Capacitação (EAD/LMS)

Plataforma white-label e multi-segmento para vender e ministrar mentorias, treinamentos, cursos, aulas e capacitações.

**Produção:** <https://drap-professor.vercel.app>

## Situação

| Fase | Escopo | Situação |
|---|---|---|
| 1 | Design system e tema, autenticação, perfis, Nível › Segmento › Módulo › Assunto, menu por abas | ✅ Implementada — [entrega](docs/FASE-1-ENTREGA.md) |
| 2 | Biblioteca de materiais, conversão e leitor temático | Proposta aprovada — [docs](docs/FASE-2-BIBLIOTECA.md) |
| 3 | Questões, avaliações, fórum e desempenho | Proposta aprovada — [docs](docs/FASE-3-AVALIACOES-FORUM.md) |
| 4 | Certificação e validação pública | Proposta aprovada — [docs](docs/FASE-4-CERTIFICACAO.md) |
| 5 | Pagamentos, assinaturas e painel de gestão | Proposta aprovada — [docs](docs/FASE-5-COMERCIAL.md) |

Arquitetura geral: [docs/ARQUITETURA.md](docs/ARQUITETURA.md) · Implantação: [docs/DEPLOY.md](docs/DEPLOY.md)

## Stack

Next.js 15 (App Router) + TypeScript · Tailwind CSS 4 com design tokens · PostgreSQL (Supabase) com Row-Level Security · Prisma · Better Auth (e-mail/senha, Google, 2FA) · Vitest + Playwright + axe-core · Vercel (região São Paulo).

## Desenvolvimento

```bash
cp .env.example .env
npm install
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
npm run db:seed
npm run dev
```

Detalhes em [docs/DEPLOY.md](docs/DEPLOY.md).
