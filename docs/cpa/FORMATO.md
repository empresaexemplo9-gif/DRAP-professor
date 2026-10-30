# Formato do conteúdo do preparatório CPA (`content/cpa`)

Todo o conteúdo do preparatório é texto versionado no Git. Para validar:

```
npm run cpa:validar                 # erros, avisos e cobertura por macrotema
npm run cpa:validar -- --lacunas    # lista os microtemas-folha sem aula ou sem questão
```

O seed importa o conteúdo para o banco. Um registro editado no painel administrativo deixa de ser sobrescrito pelo seed.

> O material é **autoral**. Nunca o apresente como publicação da ANBIMA nem como questão de prova aplicada. Não copie enunciados protegidos.

## 1. Aula: `content/cpa/aulas/CPA-CC-AA.md`

`CC` é o capítulo (01 a 18, em `estrutura.json`) e `AA` é a ordem da aula no capítulo.

```
---
codigo: CPA-03-02
capitulo: 3
ordem: 2
titulo: Juros simples e compostos
minutos: 50
microtemas: 1.3.2; 1.3.4.3            (códigos de content/cpa/programa-oficial.json, separados por ;)
pre_requisitos: CPA-03-01             (ou "Nenhum")
objetivos: Calcular montante a juros simples e compostos | Diferenciar capitalização simples e composta | …
proxima: CPA-03-03
conferido_em: 2026-10-29
---
```

As seções obrigatórias vêm **nesta ordem e com estes títulos** (`## `). Dentro delas valem `###`/`####`, listas, tabelas, `> [!DICA|ATENCAO|DESTAQUE|EXEMPLO|INFO] Título`, `$$ fórmula LaTeX $$`, **negrito**, *itálico* e [links](https://…). HTML não é aceito.

1. `## Introdução`: contexto e por que o tema importa para quem atende clientes.
2. `## Fundamentos`: teoria detalhada, com relações de causa e efeito e subtítulos `###`.
3. `## Termos técnicos`: definições precisas.
4. `## Exemplos resolvidos`: exemplos numéricos passo a passo. Defina **cada variável, unidade e hipótese** de toda fórmula.
5. `## Aplicações profissionais`: como o conhecimento aparece no atendimento.
6. `## Quadro comparativo`: ao menos uma tabela.
7. `## Erros comuns`: erros conceituais e como evitá-los.
8. `## Resumo`
9. `## Glossário`
10. `## Exercícios de fixação`: 3 ou mais. Cada um tem `### E1`, o enunciado e uma linha `Resposta: …` com a resolução.
11. `## Questões comentadas`: 2 ou mais, no formato de questão (item 2), com `uso: fixacao`.
12. `## Checklist de domínio`: 3 ou mais itens `- [ ] Sei …`.
13. `## Referências`: um item por fonte. Formato: `- Título — Órgão — URL — conferido em AAAA-MM-DD` ou `… — conferência pendente`.

**Regras de conteúdo**

- Toda regra legal, tributária ou numérica (alíquotas, limites do FGC, prazos) indica a **fonte e a vigência**.
- Quando a norma não pôde ser conferida na fonte oficial, a referência fica com **"conferência pendente"**. Nunca afirme ter consultado o que não foi lido.
- Distinga com `> [!INFO] Conhecimento complementar` o que vai além do programa oficial.
- Aula substantiva: o validador avisa quando o documento tem menos de 2.500 palavras. Meta: 3.000 a 4.500.

## 2. Questão: em `## Questões comentadas` ou em `content/cpa/questoes/*.md`

```
### CPA-Q-03-0007 | tipo: calculo | uso: simulado | dificuldade: 2 | microtemas: 1.3.4.1 | competencia: Calcular a taxa real pela fórmula de Fisher
Uma aplicação rendeu 12,00% em um ano em que a inflação foi de 4,50%. Qual foi a rentabilidade real aproximada?
A) 7,50%
Justificativa: Incorreta. É a diferença simples 12 − 4,5, que ignora o efeito composto entre as taxas.
B) 7,18%
Justificativa: Correta. (1,12 ÷ 1,045) − 1 = 0,0718, ou seja, 7,18%.
C) 16,50%
Justificativa: Incorreta. Soma as taxas em vez de descontar a inflação do retorno nominal.
D) 6,70%
Justificativa: Incorreta. Não corresponde a nenhuma relação válida entre taxa nominal e inflação.
Gabarito: B
Explicação: Pela fórmula de Fisher, (1 + nominal) = (1 + real) × (1 + inflação). Logo, real = 1,12 / 1,045 − 1 ≈ 7,18%. A subtração direta só é uma aproximação para taxas pequenas.
Fonte: Programa Detalhado CPA v1.2, item 1.3.4.1 (material autoral)
Verificação: (1.12 / 1.045 - 1) * 100 ≈ 7.18 | exibido: 7,18%
```

- **Códigos:**
  - Questões da aula: `CPA-CC-AA-Q01`.
  - Questões do banco: `CPA-Q-CC-NNNN`.
  - Questões do diagnóstico: `CPA-D-NNNN`.
- **tipo:** `conceito`, `calculo`, `interpretacao`, `comparacao`, `caso`, `decisao` ou `dialogo`.
- **uso:**
  - `fixacao`: exercícios das aulas.
  - `simulado`: banco dos simulados, que nunca aparece nas aulas.
  - `diagnostico`: diagnóstico inicial.
- **dificuldade:** 1 (básica), 2 (intermediária) ou 3 (avançada).
- **Alternativas:** exatamente **4 (A–D)**, cada uma com `Justificativa:`. Uma única correta. Proibido "todas/nenhuma das anteriores". Alternativas de tamanho semelhante.
- **Enunciado negativo:** destaque **NÃO**, **EXCETO** ou **INCORRETA** em maiúsculas.
- **Questões de cálculo** exigem `Verificação: <expressão> ≈ <valor> | exibido: <texto da alternativa correta>`.
  - O validador recalcula a expressão de forma independente.
  - Confere se o valor exibido está **na alternativa correta**.
  - A expressão aceita números, + − * / ^, parênteses e `pow`, `sqrt`, `ln`, `exp`, `round(x, n)`, `min`, `max`.
- **Distribuição do banco:**
  - Por tipo: conceitos, cálculos, interpretação, comparação de produtos, casos, tomada de decisão e diálogo (atendimento).
  - Por macrotema: proporcional ao peso oficial (20/40/30/10).

## 3. Cartões de estudo: `content/cpa/cartoes/*.md`

```
### CPA-C-03-001 | microtema: 1.3.4.1 | aula: CPA-03-02
Frente: O que a fórmula de Fisher relaciona?
Verso: Taxa nominal, taxa real e inflação: (1 + n) = (1 + r) × (1 + i).
Explicação: Permite separar o ganho de poder de compra do efeito da inflação.
```

## 4. Árvores de decisão: `content/cpa/arvores/CPA-T-NN.json`

```json
{ "code": "CPA-T-01", "title": "…", "scenario": "… (cenário autoral, sem dados reais)", "items": ["3.4.2.4"],
  "start": "n1",
  "nodes": {
    "n1": { "text": "…", "choices": [
      { "label": "Investigar objetivos e prazo", "next": "n2", "score": 2, "feedback": "…", "competence": "Diagnóstico" },
      { "label": "Apresentar um produto imediatamente", "next": "f-ruim", "score": -2, "feedback": "…" } ] },
    "f-ruim": { "text": "…", "outcome": "INADEQUADO" } } }
```

Requisitos:

- Todos os nós são alcançáveis a partir do início.
- Todo nó final tem `outcome` (`ADEQUADO`, `PARCIAL` ou `INADEQUADO`).
- Há ao menos 2 pontos de decisão com caminhos alternativos e ao menos um caminho adequado.

## 5. Simulados: `content/cpa/simulados.json`

Uma lista de configurações. A meta de acerto (`targetPercent`) é **meta pedagógica interna**, não critério oficial de aprovação.

| Campo | Uso |
|---|---|
| `fixedCodes` | Lista fixa de questões (simulados completos e final) |
| `distribution` | % por macrotema; vazio = proporção oficial 20/40/30/10 |
| `macros` | Restringe o sorteio a macrotemas (simulado por módulo e intermediários) |
| `pool` | `SIMULADO`, `DIAGNOSTICO` ou `FIXACAO` |

O simulado final usa apenas questões que não aparecem em nenhum outro simulado fixo nem nas aulas.
