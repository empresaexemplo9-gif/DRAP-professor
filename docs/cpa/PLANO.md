# Preparatório CPA — auditoria e plano de implementação

Este é o registro da fase 1 do projeto CPA. O controle de execução, atualizado a cada lote, fica em [`CONTROLE.md`](CONTROLE.md).

> **Preparatório para a prova oficial da CPA. A plataforma não emite certificado deste curso** (a certificação é exclusiva da ANBIMA, pela prova oficial).
>
> Material autoral de preparação. A DRAP Professor não é a ANBIMA nem tem vínculo com ela: nenhuma questão, aula ou simulado da plataforma é publicação oficial ou questão de prova aplicada.

## 1. Auditoria do projeto existente

| Área | O que existe | Como o CPA aproveita |
|---|---|---|
| Stack | Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind 4 com tokens em `src/theme/tokens.ts`, Prisma 6 + PostgreSQL (Supabase, RLS por tenant via `withTenant`), Vercel `gru1` | Mantida. Não há troca de tecnologia. |
| Autenticação | Better Auth com argon2id, 2FA, sessões e consentimento LGPD (`/aceite`) | Reaproveitada. O acesso ao CPA exige matrícula no módulo "Preparatório CPA". |
| Autorização | `src/lib/rbac.ts`, com uma matriz única usada por páginas e APIs (`requirePermission`) | Nova permissão `cpa:manage` (ADMIN, PEDAGOGICO), verificada no servidor em toda ação administrativa. |
| Catálogo | Nível › Segmento › Módulo › Assunto, matrículas, Pix e Enterprise | O preparatório é um Módulo do nível Cursos. A matrícula e o pagamento continuam os mesmos. |
| Conteúdo | Blocos sem HTML (`src/content-blocks`), conversor Markdown → blocos (`src/content-import/markdown.ts`) e versionamento por `TopicVersion` | As aulas usam os mesmos blocos, mais um bloco de fórmula (KaTeX renderizado no servidor). |
| Avaliação | Motor do padrão 01 (`src/lib/quiz.ts`): sorteio, embaralhamento, cronômetro e correção. Métricas TCT (`src/lib/learning-metrics.ts`) | O motor de simulados estende essas funções: distribuição por macrotema, marcação para revisão, modos prova e estudo, tempo por questão. |
| Auditoria | `AuditLog` com ator, ação, entidade e IP | Cada publicação ou alteração do CPA gera um registro e uma versão. |
| Testes | Vitest (unidade e integração com RLS), Playwright + axe (desktop e celular) e CI no GitHub Actions | Mesma estrutura, com novas suítes `cpa-*`. |

**Lacunas encontradas.** Não há geração de PDF nem renderização de fórmulas. Também faltam revisão espaçada, anotações e marcadores, cronograma de estudo e árvores de decisão.

## 2. Programa oficial (fase 2)

- **Fonte:** *Programa Detalhado CPA*, ANBIMA, versão 1.2 (revisado em 04/06/2025), elaborado em 02/09/2024 e **vigente a partir de 01/01/2026**. Lido integralmente do PDF enviado pelo cliente.
- **Extração reproduzível:** `python3 -I scripts/cpa-extrair-programa.py <pdf> content/cpa/programa-oficial.json` gera o JSON com redação e numeração originais.
- **Resultado:** 4 macrotemas, **586 itens** e **445 microtemas-folha**.

| Macrotema | Proporção oficial | Itens |
|---|---|---|
| 1. Estrutura e dinâmica do sistema financeiro nacional | 20% | 139 |
| 2. Produtos do mercado financeiro | 40% | 217 |
| 3. Relacionamento com o cliente (prospecção, atendimento e suporte) | 30% | 143 |
| 4. Inovação e desenvolvimento de mercado | 10% | 87 |

**Diferenças entre o roteiro sugerido e o programa oficial.** Os capítulos seguem o programa, e o administrador pode reordená-los.

- O macrotema 4 oficial trata de ESG, DeFi/tokenização, Open Finance/Investment/Insurance, IA e fintechs/meios de pagamento. "Transformação digital" genérica não é exigência explícita e só aparece como contexto.
- O programa inclui temas ausentes do roteiro sugerido:
  - política fiscal, cambial e monetária em detalhe;
  - IMFs, Basileia e BSM;
  - Resolução CVM 30 e o Código de Distribuição ANBIMA;
  - Resolução CVM 175 (parte geral e Anexo I);
  - COE, poupança, TR e TLP;
  - produtos de financiamento e serviços bancários (Pix, tarifas, conta internacional, câmbio);
  - seguros de vida e patrimoniais;
  - finanças pessoais completas, IRPF básico, PLDFT e LGPD;
  - crimes e ilícitos de mercado (Lei 6.385/76 e Res. CVM 62).
- O programa **não traz** número de questões, duração nem nota de corte da prova. Os simulados são configuráveis, e a plataforma não afirma que reproduzem a prova oficial. A meta de acerto exibida é uma **meta pedagógica interna**.
- Itens com o nome "agronegócio" (LCA, CRA, crédito rural) **são microtemas oficiais obrigatórios** e serão tratados só como produtos financeiros.

## 3. Arquitetura

```
content/cpa/                     fonte versionada (Git) — importada pelo seed, editável no painel
  programa-oficial.json          matriz oficial (extraída do PDF)
  estrutura.json                 módulos, capítulos e aulas com os microtemas cobertos
  aulas/<CODIGO>.md              aulas (ficha + conteúdo em Markdown + exercícios + questões comentadas)
  questoes/<lote>.md             banco autoral (enunciado, alternativas, justificativa de cada uma, metadados)
  cartoes/<lote>.md              cartões de estudo
  arvores/<codigo>.json          árvores de decisão de atendimento
  simulados.json                 configuração dos simulados
  referencias.json               fontes oficiais com data de conferência
src/lib/cpa/                     serviços: matriz, validação, motor de simulados, revisão espaçada, cronograma, relatórios
src/app/(site)/cpa/...           ambiente do aluno (painel, aulas, apostila, simulados, revisões, árvores)
src/app/painel/cpa/...           administração (matriz, aulas, questões, simulados, árvores, fontes, validação, relatórios)
```

**Regra de convivência entre Git e painel.**

- O seed importa o conteúdo do repositório, e cada registro guarda o hash da origem.
- Um registro alterado no painel passa a ser `EDITADO` e não é sobrescrito pelo seed.
- Toda publicação grava a versão, o autor e a data.

## 4. Modelo de dados (fase 3)

| Tabela | Uso |
|---|---|
| `CpaSyllabusItem` | Matriz oficial: código, texto, nível, pai, macrotema, folha, versão do programa e status de cobertura |
| `CpaChapter`, `CpaLesson`, `CpaLessonVersion` | Estrutura editável, aula com ficha completa, histórico de publicação |
| `CpaLessonItem` | Aula ↔ microtema (N:N), de onde sai a matriz de conformidade |
| `CpaReference` | Fontes, URL, órgão, vigência e data de conferência |
| `CpaQuestion`, `CpaQuestionVersion` | Banco: tipo, alternativas com justificativa, gabarito, explicação, microtemas, dificuldade, competência, natureza (sempre autoral), uso (fixação, simulado ou ambos), status e verificação de cálculo |
| `CpaExam` | Simulados configuráveis: tipo, nº de questões, duração, distribuição por macrotema, modo, navegação e lista fixa ou sorteio |
| `CpaAttempt` | Tentativa com retrato das questões, respostas, marcações, tempo por questão, prazo, entrega e resultado por micro e macrotema |
| `CpaTree`, `CpaTreeRun` | Árvores de decisão editáveis (nós e transições) e execuções com competências demonstradas |
| `CpaCard`, `CpaReview` | Cartões e fila de revisão espaçada (1, 3, 7 e 14 dias, ajustável) alimentada pelos erros |
| `CpaLessonProgress`, `CpaAnnotation`, `CpaStudyPlan` | Leitura e tempo; marcadores, destaques, notas e favoritos; data da prova, horas por semana e ritmo |

Todas as tabelas têm `tenantId`, RLS forçado e políticas apenas para `drap_app`, como as demais.

## 5. Ordem de execução

| Fase | Entrega | Critério de pronto |
|---|---|---|
| 1 | Este plano | Aprovado em execução contínua |
| 2 | Matriz oficial e relatório de lacunas | 586 itens importados, painel de cobertura |
| 3 | Migração, seed e importador de `content/cpa` | Testes de integridade e RLS |
| 4 | Painel do aluno, navegação, cronograma | E2E de navegação e persistência |
| 5 | Aulas completas, em lotes por capítulo | Validador: ficha completa, todos os microtemas do lote cobertos, fontes e datas |
| 6 | Banco de questões (meta inicial de 300 ou mais, na prática cerca de 600 entre fixação e simulado) | Validador: gabarito único, justificativas, sem duplicatas, cálculos conferidos por avaliador independente |
| 7 | Simulados, relatórios e árvores de decisão | Testes de cronômetro, recuperação, encerramento automático e relatório |
| 8 | Apostila navegável e versão de impressão/PDF (capa, sumário, paginação, cabeçalho e rodapé) | Teste de exportação com Chromium |
| 9 | Painel administrativo e atualização de fontes | Testes de permissão no servidor |
| 10 | Testes finais e revisão de cobertura | Relatório final: implementado, testado e pendente |

## 6. Limites declarados

- Fontes externas (sites da ANBIMA, BCB, CVM, Receita e outros) **só serão citadas como consultadas se tiverem sido efetivamente lidas** no momento da redação. Quando o acesso não for possível, a aula registra "conferência pendente".
- Alíquotas, limites e valores (FGC, IR, IOF, tabelas de previdência) ficam numa tabela de parâmetros com fonte e data. O painel sinaliza os vencidos (revisão anual ou quando a norma mudar).
