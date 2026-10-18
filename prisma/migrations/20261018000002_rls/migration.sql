-- Isolamento multi-tenant por Row-Level Security (docs/ARQUITETURA.md, seção 4).
--
-- A aplicação conecta com o papel "drap_app" (sem BYPASSRLS e sem ser dono das tabelas).
-- Em cada transação ela executa: SELECT set_config('app.tenant_id', '<uuid>', true).
-- Sem essa configuração, nenhuma linha de tabela de tenant é visível (falha fechada).
-- O papel é criado aqui sem login; a senha é definida fora do repositório:
--   ALTER ROLE drap_app LOGIN PASSWORD '<senha>';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'drap_app') THEN
    CREATE ROLE drap_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO drap_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO drap_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO drap_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO drap_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO drap_app;

-- Função auxiliar: tenant da transação atual (NULL quando não definido).
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Tabelas de tenant: só enxergam e gravam linhas do tenant da transação.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'theme_settings', 'memberships', 'invitations', 'consents', 'levels', 'segments',
    'modules', 'module_staff', 'topics', 'topic_versions', 'slug_redirects',
    'enrollments', 'topic_progress', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO drap_app USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant())',
      t
    );
  END LOOP;
END $$;

-- Tabelas globais (autenticação e tenants): acessíveis só pelo papel da aplicação.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants', 'users', 'sessions', 'accounts', 'verifications', 'two_factors'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY app_access ON %I TO drap_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Auditoria é somente inserção para a aplicação.
REVOKE UPDATE, DELETE ON audit_logs FROM drap_app;

-- Em projetos Supabase, a API de dados expõe o schema public aos papéis anon/authenticated.
-- Esta aplicação não usa essa API: removemos qualquer acesso desses papéis.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
