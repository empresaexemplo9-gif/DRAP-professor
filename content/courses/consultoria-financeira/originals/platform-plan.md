PROMPT DE IMPLANTAÇÃO — LMS DE FORMAÇÃO AVANÇADA EM CONSULTORIA FINANCEIRA

PAPEL
Atue como arquiteto de software educacional, designer instrucional, engenheiro de dados, especialista em avaliação e QA. Implemente uma trilha de aprendizagem profissional em uma plataforma LMS existente. Antes de alterar código, inspecione o repositório, a stack, autenticação, banco, padrões visuais, componentes, permissões, testes e deploy. Não presuma tecnologias ou estruturas que não existam.

OBJETIVO
Transformar a apostila “Formação Avançada em Consultoria Financeira” em curso navegável, com 18 módulos, conteúdo de estudo, casos práticos, provas por módulo, feedback, progresso, projeto final e certificado privado verificável. Carga curricular: 400 horas (388 horas nos módulos + 12 horas de supervisão do projeto final). Idioma pt-BR.

PRINCÍPIOS OBRIGATÓRIOS
1. Não sobrescrever funcionalidades existentes sem entender seu uso. Faça mudanças mínimas e compatíveis.
2. Use migrações versionadas e reversíveis para o banco. Não armazene segredos no cliente.
3. Autorização deve ser aplicada no servidor e, se houver Supabase, com RLS; nunca confie somente em ocultar botões.
4. Não invente credenciais, endpoints, dados, permissões, certificações ou integrações.
5. Não declare deploy ou testes concluídos sem evidência real.
6. Não prometa certificação reconhecida por órgãos oficiais. O certificado é privado e precisa informar seus limites.
7. Conteúdo sobre regulação e tributação deve ter data de revisão e link para fonte oficial.
8. Proteger dados pessoais, resultados, identidade e documentos; registrar consentimentos e minimizar dados coletados.
9. Acessibilidade: navegação por teclado, rótulos claros, contraste, foco visível, mensagens de erro acessíveis e layout responsivo.
10. Todas as notas, progresso e certificados devem ser calculados e validados no servidor.

FASE 1 — AUDITORIA E PLANO
- Inspecione o repositório e identifique stack, rotas, design system, autenticação, banco, testes e pipeline de deploy.
- Identifique se já existe LMS, tabelas de cursos, perfis, papéis ou certificados; reutilize o que for apropriado.
- Produza plano com arquivos a criar/alterar, riscos, migrações, testes e estratégia de rollback.
- Não faça mudanças destrutivas nem mexa em produção antes de verificar o fluxo seguro de deploy.

FASE 2 — MODELO DE DADOS
Implemente entidades equivalentes às abaixo, adaptando convenções existentes:
- courses: id, slug, title, description, language, total_hours, status, version, created_at, updated_at.
- modules: id, course_id, module_number, title, objective, hours, sequence, published_at, content_version.
- lessons: id, module_id, title, lesson_type (reading, case, exercise, resource), body, sequence, estimated_minutes, source_links, updated_at.
- questions: id, module_id, question_type (single_choice, multiple_choice, numeric, short_answer, case_rubric), prompt, options_json, correct_answer_json, explanation, points, difficulty, tags, active, version.
- assessments: id, module_id, title, pass_score, attempts_allowed, time_limit_minutes, randomize_questions, question_count, status.
- assessment_questions: assessment_id, question_id, weight, sequence.
- attempts: id, user_id, assessment_id, started_at, submitted_at, score, passed, answer_payload, rubric_feedback, attempt_number, exam_version.
- enrollments: id, user_id, course_id, enrolled_at, status, completion_percent, last_activity_at.
- lesson_progress: id, user_id, lesson_id, status, completed_at, time_spent_seconds.
- project_submissions: id, user_id, course_id, submitted_at, artifact_refs, score, rubric_json, reviewer_id, status, feedback.
- certificates: id, user_id, course_id, certificate_code, issued_at, final_score, status, verification_metadata.
- audit_events: id, actor_id, action, entity_type, entity_id, created_at, safe_metadata.
Criar chaves estrangeiras, índices, restrições de unicidade e timestamps. Uma matrícula por usuário/curso; código de certificado único; notas dentro dos limites válidos. Não armazenar respostas corretas em payloads enviados ao navegador.

FASE 3 — AUTORIZAÇÃO E SEGURANÇA
- Papéis mínimos: aluno, instrutor/avaliador, administrador.
- Aluno só pode ler conteúdos publicados dos cursos em que pode se inscrever; só pode ler suas tentativas, progresso e certificados.
- Aluno nunca pode gravar diretamente nota final, status de aprovação ou emissão de certificado.
- Instrutor pode revisar submissões autorizadas; administrador gerencia publicação e configurações.
- Implementar validação no servidor e políticas de banco. Se usar Supabase, escrever e testar RLS para cada tabela, inclusive storage.
- Limitar tentativas, validar payloads, evitar IDOR, XSS, SQL injection e exposição de dados pessoais.
- Não expor gabarito de prova antes da submissão. Após envio, liberar explicação conforme configuração do curso.

FASE 4 — EXPERIÊNCIA DE APRENDIZAGEM
Criar páginas responsivas:
1. Página de apresentação do curso com objetivos, carga horária, módulos, pré-requisitos e aviso de certificação privada.
2. Dashboard do aluno com progresso geral, próximos passos, notas e pendências.
3. Página de módulo com objetivo, conteúdos, referências, caso prático, exercício e prova.
4. Leitor de apostila com marcação de progresso, fontes e data de revisão.
5. Prova com cronômetro opcional, questões randomizadas, salvamento seguro de rascunho e envio confirmado.
6. Tela de resultado com nota, aprovação, feedback e recomendação de revisão.
7. Entrega do projeto final e rubrica de avaliação.
8. Área de certificados emitidos e página pública de verificação que revele apenas dados mínimos.
9. Painel do instrutor para revisar respostas discursivas e projeto final.
10. Painel administrativo para editar conteúdo, publicar versão e gerenciar banco de questões.

FASE 5 — CONTEÚDO CURRICULAR
Importar a apostila anexa e estruturar os 18 módulos abaixo, preservando objetivo, conteúdo, caso, prova e gabarito:
01 Fundamentos do sistema financeiro e da consultoria — 16 h
02 Matemática financeira e engenharia de fluxos de caixa — 24 h
03 Estatística, econometria e inferência aplicada — 20 h
04 Macroeconomia, inflação, juros e política monetária — 20 h
05 Contabilidade e qualidade dos resultados — 20 h
06 Diagnóstico financeiro e desempenho empresarial — 24 h
07 Finanças corporativas e alocação de capital — 24 h
08 Valuation e avaliação de negócios — 24 h
09 Mercados e instrumentos financeiros — 24 h
10 Portfólios, risco e avaliação de desempenho — 24 h
11 Planejamento financeiro pessoal e patrimonial — 24 h
12 Crédito, endividamento e reestruturação — 24 h
13 Tributação, regulação e conformidade no Brasil — 20 h
14 Governança, controles internos e riscos empresariais — 20 h
15 Psicologia econômica, negociação e relacionamento — 20 h
16 Modelagem financeira avançada e ferramentas — 20 h
17 Método de consultoria, implementação e mensuração — 20 h
18 Capstone: laboratório integrado e projeto final — 20 h
Adicionar 12 horas supervisionadas de revisão/defesa do projeto final para totalizar 400 horas.

Cada módulo precisa ter: objetivos mensuráveis, texto de estudo, glossário, exemplos resolvidos, exercício formativo, caso, prova, gabarito comentado, rubrica, referências e data de revisão. Não usar texto genérico como substituto de conteúdo. Se a apostila não trouxer profundidade suficiente em algum tópico, sinalizar como lacuna editorial e criar tarefa para expansão/revisão por especialista, sem inventar referências.

FASE 6 — PROVAS E BANCO DE QUESTÕES
- Criar prova por módulo com questões randomizadas a partir de banco de questões equivalente em dificuldade.
- Misturar múltipla escolha, cálculo numérico e respostas discursivas/casos.
- Cada questão deve ter explicação e referência, quando aplicável.
- Para questões objetivas, corrigir no servidor. Para discursivas, usar rubrica e revisão humana; IA pode sugerir feedback, nunca atribuir certificação final automaticamente sem política aprovada.
- Configuração inicial sugerida: 5 questões por módulo para versão diagnóstica, banco maior em produção; 80% para aprovação e até 2 tentativas. Após reprovação, indicar conteúdo a revisar e oferecer nova versão.
- Garantir que perguntas numéricas aceitem tolerância de arredondamento documentada e que unidades sejam verificadas.
- Impedir acesso antecipado ao gabarito e limitar repetição idêntica de exames.

FASE 7 — CERTIFICAÇÃO PRIVADA
Critérios:
- Conteúdo obrigatório concluído.
- Média ponderada final mínima 80/100.
- Nota mínima 70/100 nos módulos quantitativos.
- Aprovação em ética/conformidade.
- Projeto final com mínimo de 80/100 e revisão por avaliador autorizado.
- Registro de versão curricular, data, carga horária e responsável emissor.
- Código aleatório único e endpoint de verificação pública com estado válido/revogado e dados mínimos.
- Certificado deve dizer explicitamente: “certificado privado de conclusão; não equivale a diploma acadêmico nem concede autorização profissional regulatória”.
- Revogação deve ser auditável, com motivo e responsável; não expor informações sensíveis na página pública.

Rubrica do projeto final (100 pontos):
Diagnóstico/dados 20; modelo e rastreabilidade 20; cenários e sensibilidade 15; recomendações 15; implementação e indicadores 10; ética/conformidade 10; comunicação/defesa 10. Aprovação: 80 pontos.

FASE 8 — ADMINISTRAÇÃO E ANALYTICS
- Métricas agregadas: matrículas, conclusão, aprovação por módulo, questões com alta taxa de erro, tempo de estudo e abandono.
- Não usar analytics para inferir atributos sensíveis. Limitar acesso a métricas identificáveis.
- Histórico de alterações de conteúdo, provas, rubricas e certificado.
- Exportação controlada de resultados e relatórios.
- Lembretes só se houver consentimento e canal configurado.

FASE 9 — TESTES E CRITÉRIOS DE ACEITAÇÃO
- Testes unitários de cálculo de nota, conclusão e elegibilidade de certificado.
- Testes de integração para matrícula, progresso, envio de prova, revisão manual e emissão/revogação.
- Testes de autorização para cada papel e cada tabela.
- Testes de segurança: usuário não pode alterar nota, ler resposta correta, acessar submissão alheia ou emitir certificado próprio.
- Testes de acessibilidade e responsividade.
- Testes de migração e rollback em ambiente de teste.
- Dados de demonstração fictícios, claramente identificados; nunca usar dados pessoais reais.
- Build, lint, testes e smoke test do fluxo completo. Informar resultados reais e falhas remanescentes.

FASE 10 — DEPLOY
- Verificar variáveis de ambiente e secrets sem exibi-los.
- Aplicar migrações conforme processo aprovado e com backup/rollback.
- Implantar primeiro em staging quando disponível; validar usuário aluno, instrutor e administrador.
- Confirmar URL e versão realmente implantada; não declarar sucesso se algum passo falhar.
- Entregar resumo com arquivos alterados, migrações, testes executados, resultados, URL e pendências.

DEFINIÇÃO DE PRONTO
O trabalho só está concluído quando: os 18 módulos são navegáveis; as provas funcionam e corrigem corretamente; progresso persiste; permissões foram testadas; projeto final pode ser avaliado; certificado só é emitido quando os critérios são satisfeitos; verificação pública não vaza dados; conteúdo e fontes têm versão; e o deploy foi validado com evidência.

COMECE
Primeiro audite o projeto existente e devolva um plano baseado em evidências. Depois implemente em etapas pequenas, testáveis e reversíveis. Não finja ter acessado repositório, banco, plataforma ou deploy se essas conexões não estiverem disponíveis.
