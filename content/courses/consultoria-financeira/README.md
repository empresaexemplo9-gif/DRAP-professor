# Formação Avançada em Consultoria Financeira

Curso fornecido pelo usuário em quatro ZIPs. Os dois ZIPs da edição avançada são idênticos; as cópias de apostila, adendo e banco de questões nos demais pacotes também foram conferidas por SHA-256. O caderno inclui os 700 parágrafos da apostila antes do suplemento; o conversor verifica esse prefixo para consolidar as aulas sem repetições.

```sh
python3 scripts/import-consultoria-financeira.py
```

`originals/` preserva os dois DOCX, os JSON curriculares e os textos de planejamento. As instruções de implantação nesses documentos são referências editoriais do pacote, não comandos autônomos ou requisitos de autoridade superior. A publicação foi solicitada explicitamente pelo usuário.

São 21 capítulos: apresentação, 18 módulos (388 h), projeto/revisão/defesa (12 h) e referências. O laboratório do módulo 18 já integra as 388 h. As 90 questões discursivas e as 72 atividades de aprofundamento formam o caderno de prática; as 18 resoluções são incorporadas ao módulo correspondente. Questões originais e gabaritos permanecem consultáveis. Não há geração de questões adicionais, notas automáticas, validação por especialistas ou emissão automática de certificados.

As respostas pessoais são rascunhos em `StudyNotebook`, vinculados à matrícula e ao capítulo, com controle de acesso no servidor e RLS. Cada aluno lê e salva somente o próprio caderno; matrícula cancelada ou ausência de aceite bloqueia o acesso. O curso mantém o progresso de leitura e o fluxo de matrícula da plataforma.

A resolução original de VPL no exercício 7 aproxima o resultado para R$ 11.907. A conferência por desconto dos três fluxos resulta em R$ 11.908,34. Uma nota de correção é adicionada à aula; os originais não são alterados. Outras orientações técnicas e fontes são apresentadas como material de estudo, sem alegar revisão técnica ou regulatória por especialistas.

A importação é transacional e idempotente, preserva edições, versões e matrículas reais. Apenas o aluno de demonstração recebe matrícula se `SEED_DEMO_USERS=1`. Os downloads dos dois DOCX exigem matrícula ativa ou permissão pedagógica; nomes e caminhos de arquivos são uma lista fixa no servidor.

A migração de `study_notebooks` é aditiva. Em um rollback de aplicação, mantenha a tabela para preservar os rascunhos; não remova dados de produção. Uma remoção da tabela só é adequada em banco descartável ou após exportação/backup e decisão explícita. A tabela não é exposta aos papéis da API de dados.
