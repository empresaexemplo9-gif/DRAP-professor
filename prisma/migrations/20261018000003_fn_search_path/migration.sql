-- Fixa o search_path da função usada pelas políticas de RLS (alerta do linter do Supabase).
ALTER FUNCTION app_current_tenant() SET search_path = pg_catalog;
