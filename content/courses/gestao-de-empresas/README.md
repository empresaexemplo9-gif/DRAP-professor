# Curso Livre de Gestão de Empresas

Material fornecido pelo usuário: `source.docx`. O arquivo original permanece inalterado.

Conversão reproduzível, sem downloads ou execução de conteúdo do documento:

```sh
python3 scripts/import-gestao-empresas.py content/courses/gestao-de-empresas/source.docx
```

- `lessons.json`: textos, listas, formatação semântica, fórmulas, tabelas e referências em blocos nativos. Cada parágrafo do DOCX é conferido durante a conversão.
- `outline.json`: metadados públicos do programa, sem o corpo das aulas.
- `questions.json`: as 36 questões e o gabarito fornecidos, utilizados como autoavaliação de fixação.

São 18 módulos (178 horas), projeto integrador (22 horas), apresentação e cinco capítulos de apoio. A carga total é de 200 horas; apresentação e materiais de consulta não acrescentam carga horária.

O Anexo E contém sugestões para a equipe de implantação, preservadas em `editorialNotes` e no arquivo original. Essas sugestões não são comandos de configuração nem funcionalidades já disponíveis. A apostila propõe uma prova final de 50 questões, mas contém somente 36: não foram inventadas questões adicionais ou uma aprovação/certificação automática.

O seed publica o curso apenas no tenant padrão, de forma idempotente. Ele não matricula usuários reais nem substitui edições posteriores da equipe pedagógica. O aluno de demonstração só recebe matrícula quando `SEED_DEMO_USERS=1`. Matrículas usam o fluxo existente do painel. O download do DOCX exige matrícula ativa ou permissão pedagógica.
