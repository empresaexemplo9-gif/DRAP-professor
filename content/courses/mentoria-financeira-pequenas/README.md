# Mentoria financeira para pequenas empresas (apostila do participante)

Material fornecido pelo cliente: `source.docx` (apostila editável) e `source.pdf` (mesma apostila em PDF). Os arquivos originais permanecem inalterados.

Conversão reproduzível (requer `pandoc`; o arquivo só é lido, nada é executado):

```sh
python3 -I scripts/import-mentorias-financeiras.py pequenas content/courses/mentoria-financeira-pequenas/source.docx
```

- `lessons.json`: "Como usar esta apostila", 8 módulos (56 h: 6, 7, 8, 7, 8, 7, 6 e 7 h, conforme a "Carga sugerida" de cada módulo), projeto final integrador e um capítulo com gabarito, bibliografia e modelo de certificado. Todo o texto do DOCX é conferido na conversão.
- `questions.json`: a "Avaliação do módulo" (5 questões por módulo) com o gabarito da própria apostila, exibida como exercício interativo no fim de cada módulo.
- `outline.json`: metadados do roteiro, sem o corpo das aulas.

O seed adiciona esses capítulos à mentoria já existente uma única vez por tenant (auditoria `drap-mentoria-financeira-pequenas-v1`), sem substituir edições posteriores. Leitura e download (PDF e DOCX): vaga ativa da empresa contratante, gestor da empresa ou equipe pedagógica.
