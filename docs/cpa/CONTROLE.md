# Preparatório CPA: controle do projeto

Última atualização: 2026-11-11. Este arquivo é atualizado ao fim de cada lote. O plano está em [`PLANO.md`](PLANO.md).

## Próxima tarefa

1. Retomar os redatores dos capítulos 3, 4, 5, 6, 9, 12, 13, 14 e 15 (lacunas e 3 questões sem justificativa completa).
2. Telas pendentes: apostila (navegável e impressão/PDF), simulados (execução, relatório), revisões, casos (árvores), desempenho, plano de estudo.
3. Painel administrativo do CPA e simulados.json (diagnóstico, por macrotema, intermediários, 5 completos, final).
4. Testes E2E do CPA e relatório final.

Regra do cliente: o preparatório **não emite certificado** (preparação para a prova oficial da ANBIMA).

## Fases

| Fase | Status | Observações |
|---|---|---|
| 1. Auditoria e plano | ✅ concluída | `docs/cpa/PLANO.md` |
| 2. Matriz oficial | ✅ extraída | `content/cpa/programa-oficial.json`: 586 itens, 445 folhas, PDF v1.2 (vigência 01/01/2026). O painel de cobertura entra na fase 3 |
| 3. Modelo de dados e estrutura | ✅ concluída | 17 tabelas com RLS, importador e motor testados |
| 4. Painel do aluno e navegação | ⏳ em andamento | painel, sumário de aulas e página da aula prontos |
| 5. Conteúdo das aulas | pendente | Em lotes por capítulo (tabela abaixo) |
| 6. Banco de questões | pendente | Meta inicial: 300 ou mais, distribuídas pelos microtemas |
| 7. Simulados, relatórios e árvores | pendente | |
| 8. Apostila e exportação | pendente | |
| 9. Administração e fontes | pendente | |
| 10. Testes e revisão de cobertura | pendente | |

## Capítulos (seguem o 2º nível do programa oficial)

| Cap. | Item oficial | Título | Aulas | Status |
|---|---|---|---|---|
| 1 | 1.1 | Sistema financeiro nacional | — | pendente |
| 2 | 1.2 | Política econômica | — | pendente |
| 3 | 1.3 | Operações do mercado financeiro (matemática financeira) | — | pendente |
| 4 | 1.4 | Regulação e infraestrutura de mercado | — | pendente |
| 5 | 2.1 | Produtos de investimentos | — | pendente |
| 6 | 2.2 | Previdência complementar (PGBL e VGBL) | — | pendente |
| 7 | 2.3 | Produtos de financiamento | — | pendente |
| 8 | 2.4 | Serviços bancários | — | pendente |
| 9 | 2.5 | Seguros de vida e patrimoniais | — | pendente |
| 10 | 3.1 | Finanças pessoais | — | pendente |
| 11 | 3.2 | Orientações financeiras para o cliente | — | pendente |
| 12 | 3.3 | Classificação das pessoas investidoras | — | pendente |
| 13 | 3.4 | Regras e condutas na atuação profissional | — | pendente |
| 14 | 4.1–4.3 | ESG no mercado financeiro e fundos IS | — | pendente |
| 15 | 4.4 | Finanças descentralizadas (DeFi) e tokenização | — | pendente |
| 16 | 4.5 | Open finance, open investment e open insurance | — | pendente |
| 17 | 4.6 | Inteligência artificial | — | pendente |
| 18 | 4.7 | Fintechs e meios de pagamento | — | pendente |

## Contadores

- Capítulos completos e publicados: 1, 2, 7, 8, 10, 11, 16, 17, 18 (31 aulas, 209 questões, 175 cartões)
- Em redação: 3, 4, 5, 6, 9, 12, 13, 14, 15 (no disco: 69 aulas, 295 questões, 195 cartões no total; cobertura 300/445)
- Árvores de decisão: 3 (capítulo 13, ainda não publicadas)
- Simulados prontos: 0 (diagnóstico, por macrotema, intermediários, 5 completos, final e atendimento)

## Fontes: situação de acesso

| Fonte | Acesso em 2026-10-29 |
|---|---|
| Programa Detalhado CPA (PDF v1.2) | ✅ lido integralmente (arquivo enviado pelo cliente) |
| gov.br/cvm | ✅ acessível |
| anbima.com.br (guia de elaboração de questões, educação) | ❌ bloqueado pela política de rede do ambiente; conferência pendente |
| bcb.gov.br, planalto.gov.br, tesourodireto.com.br | ❌ bloqueados; conferência pendente |
| b3.com.br, gov.br/receitafederal, gov.br/susep, gov.br/previc | a verificar no lote correspondente |

Quando uma fonte não puder ser lida, a aula registra a referência com o status "conferência pendente" e não afirma consulta.

## Revisões pendentes

- Conferir parâmetros sujeitos a mudança: alíquotas de IR e IOF, limites do FGC, tabelas de previdência e regras de tarifas e de câmbio.
- Liberar os domínios oficiais na rede do ambiente para concluir as conferências.
