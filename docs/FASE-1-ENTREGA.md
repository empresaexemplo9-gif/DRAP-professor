# Fase 1 — Entrega

Design system e tema, autenticação, perfis, estrutura Nível › Segmento › Módulo › Assunto e menu por abas.

## O que foi feito

| Área | Entrega | Onde |
|---|---|---|
| Design system | Arquivo único de tokens (cores claro/escuro, tipografia Playfair Display + Inter, escala 1,25, raios, sombras, movimento). Paleta padrão do Tailwind desligada: só existem cores do tema. Lint que bloqueia cor literal fora do arquivo de tema | `src/theme/tokens.ts`, `src/app/globals.css`, `scripts/check-tokens.mjs` |
| Componentes | Botões, cards, selos, campos, abas, tabelas responsivas, modal (Radix), barras de progresso, alertas, estado vazio, trilha de navegação, menu lateral/gaveta | `src/components/ui`, `src/components/shell` |
| Tema por tenant | Configurações e Tema: cores de cada modo, fontes, logotipo e modo padrão, com **validação de contraste WCAG AA** antes de salvar. Alternância claro/escuro/sistema por visitante | `/painel/configuracoes`, `src/theme/contrast.ts` |
| Design system vivo | Página com todos os tokens e componentes | `/painel/design-system` |
| Conteúdo em blocos | Schema dos blocos (sem campo de aparência nem HTML livre), renderizador único, editor de blocos com prévia celular/tablet/desktop, seções (dividir/juntar), versionamento com restauração | `src/content-blocks`, `/painel/conteudo/assuntos/[id]` |
| Autenticação | E-mail e senha (argon2id), Google (opcional, por variável de ambiente), 2FA TOTP com códigos de recuperação, recuperação de senha, limite de sessões simultâneas, encerrar sessões, limite de tentativas | `src/lib/auth.ts`, `/entrar`, `/painel/conta` |
| LGPD | Aceite versionado de Termos e Privacidade (e marketing opcional) com IP; CPF cifrado (AES-256-GCM) com índice cego | `consents`, `src/lib/crypto.ts` |
| Perfis | Administrador, Pedagógico, Instrutor/Mentor e Aluno, combináveis; matriz de permissões única para páginas e API; convites por link; desativação | `src/lib/rbac.ts`, `/painel/usuarios` |
| Multi-tenant | Tenant pelo domínio; **Row-Level Security** no PostgreSQL com papel de aplicação sem BYPASSRLS (falha fechada) | `prisma/migrations/*_rls` |
| Hierarquia | 5 níveis com comportamento próprio (configuração por nível), segmentos reutilizáveis, módulos e assuntos com URL própria, breadcrumb, navegação lateral e índice; redirecionamento 301 ao trocar o endereço | `src/app/(site)/[nivel]/…` |
| Menu por abas | Início, Meu Aprendizado, Catálogo, Agenda, Fórum, Certificados, Conteúdo, Financeiro, Biblioteca, Usuários, Configurações e Tema — conforme o perfil | `src/lib/rbac.ts` (`NAV_ITEMS`) |
| Matrículas e progresso | Matrícula manual pela equipe, marcar assunto como concluído, progresso no módulo, "continuar de onde parei" | `/painel/conteudo/modulos/[id]` |
| Auditoria | Registro somente-inserção das ações sensíveis | `/painel/auditoria` |
| API REST | `/api/v1/me`, `/levels`, `/segments`, `/modules` (paginação por cursor), `/modules/{id}/topics`; erros RFC 9457; `/api/health` | `src/app/api` |

### Ajustes em relação à proposta

- **Um app Next.js em vez de monorepo.** Nesta fase não há worker. A organização interna (`theme`, `components/ui`, `content-blocks`, `lib`) espelha os pacotes previstos e vira monorepo quando o worker de conversão entrar (Fase 2).
- **Reordenação por botões ↑/↓** em vez de arrastar: funciona por teclado e leitor de tela. Arrastar pode ser somado depois.
- **Imagens por URL https** no editor; o upload de arquivos chega com a Biblioteca (Fase 2).
- Nome e domínio do tenant de demonstração (decisão D9): usei **"DRAP Professor"** em `drap-professor.vercel.app`, alterável a qualquer momento.

## Como testar

**No ar:** <https://drap-professor.vercel.app>. O administrador inicial é o e-mail do dono do projeto; a senha foi entregue na conversa e deve ser trocada no primeiro acesso.

**Localmente:** ver [DEPLOY.md](DEPLOY.md#rodar-localmente). Com `SEED_DEMO_USERS=1`, o seed cria `pedagogico@`, `instrutor@` e `aluno@exemplo.com.br` (senha `Demo@12345678`), com o aluno matriculado nos módulos de exemplo.

Roteiro manual:

1. Abra `/` e navegue por **Cursos › Gestão e Liderança › Fundamentos de Liderança › Papéis do líder**: cada nível tem URL, breadcrumb e navegação lateral.
2. Entre como administrador → **Conteúdo** → crie um segmento, um módulo (escolha o nível e veja os campos próprios dele) e um assunto; adicione blocos, veja a prévia no celular e publique.
3. Publique o módulo e abra a página pública: o conteúdo aparece 100% no tema.
4. **Configurações e Tema**: mude o fundo e a cor de destaque e salve; volte ao assunto — ele já usa as novas cores, sem ser editado. Tente uma cor de texto ilegível: o salvamento é recusado com a explicação do contraste.
5. **Usuários**: gere um convite de Instrutor, abra o link numa janela anônima e crie a conta; o menu dessa pessoa mostra só as abas do perfil.
6. **Minha conta**: ative a verificação em duas etapas e entre de novo.

## Testes automatizados

| Comando | Cobertura |
|---|---|
| `npm run lint` | ESLint + regra "nenhuma cor literal fora do arquivo de tema" |
| `npm run typecheck` | TypeScript estrito |
| `npm test` | 26 testes: contraste WCAG, saneamento do tema, matriz de permissões, blocos (rejeita HTML/estilo), marcação inline (sem `javascript:`), CPF, configuração por nível e **isolamento RLS entre tenants** |
| `npm run test:e2e` | Desktop e celular: navegação pública nos dois temas, 5 níveis, permissões por perfil, leitura e conclusão de assunto, troca de senha, criação → publicação de conteúdo, troca de tema refletindo no conteúdo publicado, recusa de contraste ruim, sem rolagem horizontal; **axe-core (WCAG 2.1 AA)** em cada tela |

A CI (`.github/workflows/ci.yml`) roda tudo isso a cada PR.

## Critérios de aceite

- [x] Nenhuma cor, fonte ou espaçamento literal fora do arquivo de tema (lint).
- [x] Páginas sem violações do axe, inclusive contraste, nos modos claro e escuro.
- [x] Layout funcional em celular e desktop (E2E nos dois tamanhos, sem rolagem horizontal).
- [x] Cadastro/login por e-mail; Google habilitado por variável; 2FA ativável; sessões revogáveis.
- [x] Cada perfil vê só as abas e ações da matriz.
- [x] Um tenant não acessa dados de outro, mesmo com consulta sem filtro (teste de RLS).
- [x] Segmento › Módulo › Assunto em cada um dos 5 níveis, com URL, breadcrumb e navegação lateral.
- [x] Assunto em blocos renderizado só com tokens; trocar o tema altera todo o conteúdo sem editar o assunto.

## Pendências conhecidas

- **E-mail transacional** (Resend) não configurado: sem ele, a confirmação de e-mail não é exigida e os links de recuperação de senha e de convite só aparecem no log do servidor. O convite também mostra o link na tela para o administrador copiar.
- **Login com Google**: requer criar as credenciais OAuth no Google Cloud e preencher `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
- **Previews da Vercel** usam o mesmo banco da produção (só leitura/escrita pela aplicação; migrações nunca rodam em preview). Para isolar, criar um projeto/branch de banco para preview.
