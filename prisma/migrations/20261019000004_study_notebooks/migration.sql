-- Rascunhos de estudo pessoais; não representam notas nem tentativas de prova.
CREATE TABLE "study_notebooks" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "topicId" UUID NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "study_notebooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "study_notebooks_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "study_notebooks_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "study_notebooks_answers_object" CHECK (jsonb_typeof("answers") = 'object')
);
CREATE UNIQUE INDEX "study_notebooks_enrollmentId_topicId_key" ON "study_notebooks"("enrollmentId", "topicId");
CREATE INDEX "study_notebooks_tenantId_idx" ON "study_notebooks"("tenantId");
ALTER TABLE "study_notebooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_notebooks" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "study_notebooks" TO drap_app
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant() AND EXISTS (
    SELECT 1 FROM enrollments e JOIN topics t ON t."moduleId" = e."moduleId"
    WHERE e.id = "study_notebooks"."enrollmentId" AND t.id = "study_notebooks"."topicId"
      AND e."tenantId" = app_current_tenant() AND t."tenantId" = app_current_tenant()
  ));
GRANT SELECT, INSERT, UPDATE, DELETE ON "study_notebooks" TO drap_app;
-- A API de dados não participa da autenticação deste LMS.
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "study_notebooks" FROM %I', r);
    END IF;
  END LOOP;
END $$;
