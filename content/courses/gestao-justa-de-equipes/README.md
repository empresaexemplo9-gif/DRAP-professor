# Gestão justa de equipes e escalas (treinamento para empresas)

Material fornecido pelo cliente: `source.docx` (apostila) e o banner em `public/images/courses/gestao-justa-de-equipes-banner.webp`. O arquivo original permanece inalterado.

Conversão reproduzível, sem downloads ou execução de conteúdo do documento:

```sh
python3 -I scripts/import-gestao-justa-equipes.py content/courses/gestao-justa-de-equipes/source.docx
```

- `lessons.json`: apresentação, 8 módulos (12 h, conforme o "Roteiro e carga horária") e 2 capítulos de apoio, em blocos nativos. Cada parágrafo e tabela do DOCX é conferido durante a conversão.
- `outline.json`: metadados públicos do programa, sem o corpo das aulas.

Organização: a "Área especial — Saúde mental, descanso e trabalho sustentável" abre o Módulo 6; o "Plano de aplicação em 30 dias" fecha o Módulo 8. "Ferramentas de aplicação" reúne o modelo de quadro semanal, a lista de verificação da escala, o plano de 30 dias e os checklists diário e semanal. As fontes de referência são preservadas com seus links.

Público-alvo `EMPRESA`: o treinamento é vendido por contrato (Painel › Empresas) e entregue aos colaboradores pelas vagas da empresa, sem matrícula ou compra individual. O seed publica o treinamento uma única vez por tenant e não substitui edições posteriores da equipe pedagógica. O download do DOCX exige vaga ativa, gestão da empresa contratante ou permissão pedagógica.
