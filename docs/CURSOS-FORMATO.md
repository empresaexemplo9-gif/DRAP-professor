# Formato dos cursos (content/cursos/*.md)

Cada curso livre da plataforma é um arquivo Markdown em `content/cursos/`. A cada deploy de produção o seed lê os arquivos **em ordem numérica do nome** e publica ou atualiza o curso, os módulos, as aulas e o banco de questões. Se o texto de um módulo não mudou, nenhuma versão nova é criada. Se uma questão mudou, ela ganha uma nova versão. Questões removidas do arquivo são desativadas, nunca apagadas, para manter o histórico das tentativas.

O formato segue o **Padrão de curso e avaliação** (arquivo 01), e o leitor (`src/content-import/course.ts`) recusa o arquivo quando alguma regra falha.

```
npm run cursos:validar                       # todos os cursos
npx tsx scripts/validar-cursos.ts content/cursos/02-01-rh-001.md
```

## Nome do arquivo

`<arquivo de origem>-<ordem>-<código>.md`, por exemplo `02-01-rh-001.md` e `03-04-ate-001.md`. A ordem do nome é a ordem do catálogo.

## Ficha do curso

```
---
codigo: RH-001
titulo: Recrutamento e seleção por competências
slug: recrutamento-e-selecao-por-competencias      (opcional; padrão: título)
segmento: Gestão de Pessoas e RH
segmento_descricao: Recrutamento, clima, desempenho e desenvolvimento.
area: Psicologia organizacional e do trabalho
instrutor: Psicólogo(a) organizacional e do trabalho — sócio responsável técnico
revisor: Sócio gestor (visão de negócio)
carga_horaria: 12
questoes_por_prova: 10
publico: Analistas de RH, gestores que contratam, donos de pequenas empresas
pre_requisitos: Nenhum
objetivo_geral: Conduzir um processo seletivo estruturado, do perfil da vaga ao onboarding.
versao: 1.0
revisao: 2026-10-19
proxima_revisao: 2027-10
aviso: (opcional) texto obrigatório exibido em todos os módulos
---
```

## Textos do curso (antes do primeiro módulo)

Cada `## Título` antes de `# M1` vira uma seção da página do curso, por exemplo: Apresentação, Mapa de objetivos e avaliação, Indicadores de sucesso do curso, Como estudar, Bibliografia e fontes.

## Módulos

```
# M1 — Perfil da vaga
Objetivos:
- O1 (compreender): Diferenciar descrição de cargo e perfil de competências.
- O2 (aplicar): Construir o mapa CHA de uma vaga.
- O3 (analisar): Classificar requisitos em obrigatórios e desejáveis com justificativa.

## Aula 1 — Título da aula [15 min]
## Aula 2 — … [15 min]
## Material de apoio — Título [30 min]
## Atividade prática — Título [65 min]
## Questões
```

- Os níveis de Bloom aceitos são lembrar, compreender, aplicar e analisar. Cada módulo tem de 3 a 4 objetivos.
- Todo `##` precisa de `[N min]`. Os minutos de todas as seções, somados aos da prova (2 min por questão aplicada), têm de bater **exatamente** com `carga_horaria × 60`.
- Somente as seções "Aula" contam para a presença mínima de 80%.

### Distribuição-padrão de tempo

| Carga | Módulos | Por módulo |
|---|---|---|
| 8 h | 4 | 3 aulas × 15 + material 20 + atividade 35 + prova 20 = 120 min |
| 12 h | 4 | 4 aulas × 15 + material 30 + atividade 70 + prova 20 = 180 min |
| 16 h | 5 | 4 aulas × 15 + material 38 + atividade 70 + prova 24 (12 questões) = 192 min |

### Densidade mínima (validador)

- Aula: pelo menos 90 palavras por minuto declarado, ou seja, cerca de 1.350 palavras numa aula de 15 min. A diferença em relação a uma leitura corrida fica para as pausas de reflexão e a verificação rápida.
- Material de apoio: pelo menos 35 palavras por minuto, porque o restante do tempo é de preenchimento.

## Roteiro didático obrigatório de cada aula

1. **Situação de abertura**: um caso curto e realista, que gera a pergunta da aula.
2. **Conceitos**: explicação progressiva, com definições claras e exemplos de empresas de pequeno e médio porte.
3. **Exemplo aplicado**: `> [!EXEMPLO]`, o conceito usado num caso concreto, passo a passo.
4. **Erros comuns**: `> [!ATENCAO]`.
5. **Pausa para reflexão**: `> [!DICA] Pausa para reflexão`, uma ou duas perguntas que ligam o conteúdo ao trabalho do aluno.
6. **Verificação rápida**: 2 ou 3 perguntas de autoavaliação, com a resposta comentada logo abaixo.
7. **Síntese**: de 3 a 5 tópicos.
8. **Para aprofundar**: referências reais e verificáveis.

## Material de apoio

Inclui checklist (`- [ ]`), modelo para preencher (tabela), glossário e cartão de consulta rápida.

## Atividade prática

Tem os seguintes blocos:

- Contexto.
- Passo a passo numerado.
- Entregável.
- Exemplo parcialmente resolvido.
- **Rubrica de autoavaliação**: uma tabela de critérios por níveis (Inicial, Adequado, Avançado).

## Banco de questões

```
### Q01 | O2 | aplicar | caso
Diante da situação X…, qual a melhor conduta?
A) …
B) …
C) …
D) …
Gabarito: C
Comentário: Por que C é correta; por que A, B e D não são.
```

Marcadores opcionais no cabeçalho: `caso` (estudo de caso), `vf` (verdadeiro ou falso justificado) e `associacao`.

| Regra | Mínimo |
|---|---|
| Banco | 2x as questões aplicadas (20 no banco para 10 na prova; 24 para 12) |
| Estudo de caso | 60% do banco |
| Alternativas | exatamente 4 (A a D), uma correta, três plausíveis, nenhuma do tipo "todas/nenhuma das anteriores" |
| Gabarito | distribuído entre as letras (nenhuma letra com mais de 40%) |
| Comentário | 25 palavras ou mais, explicando a correta e cada distrator |
| Objetivos | cada objetivo com pelo menos 4 questões; questão sempre ligada a um objetivo do módulo |
| Bloom | até 30% lembrar/compreender, 40% ou mais aplicar e 20% ou mais analisar |

- **Verdadeiro ou falso justificado**: a afirmação vai no enunciado. As alternativas são "Verdadeira, porque…" e "Falsa, porque…", com justificativas diferentes.
- **Associação**: as colunas vão no enunciado. As alternativas são combinações, como "1-b, 2-d, 3-a, 4-c".

## Métricas de ensino e aprendizagem

O painel fica em `/painel/conteudo/metricas/<id>` e é calculado a partir das tentativas reais.

| Nível | Métrica | Meta de referência |
|---|---|---|
| Reação (Kirkpatrick 1) | Clareza, aplicabilidade e avaliação geral (1 a 5) | ≥ 4,0 |
| Aprendizagem (Kirkpatrick 2) | Aprovação na 1ª tentativa | 60% a 85% |
| | Ganho normalizado de Hake (1ª tentativa → melhor nota) | ≥ 0,30 |
| | Tentativas até aprovar | ≤ 1,6 |
| Qualidade do item | Dificuldade p | 0,30 a 0,80; alerta abaixo de 0,20 e acima de 0,80 |
| | Discriminação ponto-bisserial D | ≥ 0,20; negativa indica revisar gabarito ou enunciado |
| | Distrator | escolhido por ao menos 5% |
| Comportamento (Kirkpatrick 3) | Plano de aplicação da atividade final retomado em 30/60/90 dias | registro do aluno |

Os alertas só aparecem a partir de 10 respostas por questão.

## Linguagem e limites

- Português do Brasil, segunda pessoa ("você"), exemplos de empresas brasileiras de pequeno e médio porte, sem nomes ou dados reais de clientes.
- Os cursos de psicologia, RH e liderança são de **capacitação em gestão de pessoas**. Não ensinam avaliação psicológica, diagnóstico nem atendimento clínico, e testes psicológicos (uso restrito do psicólogo, CFP) não entram como ferramenta para o aluno aplicar.
- Leis e normas são citadas com número e ano e marcadas para revisão anual.
- Nenhum termo como "habilitação" ou "formação profissional": são cursos livres.
