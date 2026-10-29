# Mentoria financeira para médias empresas (curso livre avançado)

Material fornecido pelo cliente: `source.md` e `source.pdf` (mesma apostila). Os arquivos originais permanecem inalterados.

Conversão reproduzível (requer `pandoc`; o arquivo só é lido, nada é executado):

```sh
python3 -I scripts/import-mentorias-financeiras.py medias content/courses/mentoria-financeira-medias/source.md
```

- `lessons.json`: apresentação, 8 módulos de 8 h com a prova de cada módulo (8 objetivas + caso discursivo), projeto integrador de 16 h e um capítulo com certificação (Apêndice B), bibliografia, cronograma e aviso (Apêndice C). Total: 80 h. Todo o texto da apostila é conferido na conversão.
- `teacher-guide.json`: Apêndice A (gabaritos e critérios de correção). A apostila determina que ele fique restrito à equipe docente: aparece apenas para quem tem permissão pedagógica, nunca nos capítulos publicados. O importador confere o gabarito estruturado contra a tabela A.1.
- `outline.json`: metadados do roteiro, sem o corpo das aulas.

Como os originais (PDF e MD) contêm o Apêndice A, o download deles é exclusivo da equipe pedagógica. Participantes (vaga ativa da empresa) e gestores da empresa contratante leem a apostila na plataforma. O seed adiciona os capítulos à mentoria existente uma única vez por tenant (auditoria `drap-mentoria-financeira-medias-v1`).
