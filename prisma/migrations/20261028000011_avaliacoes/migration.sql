-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MULTIPLA', 'VF', 'ASSOCIACAO');

-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('LEMBRAR', 'COMPREENDER', 'APLICAR', 'ANALISAR');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('EM_ANDAMENTO', 'ENTREGUE', 'EXPIRADA');

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "courseSheet" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "topic_progress" ADD COLUMN     "bestScore" DOUBLE PRECISION,
ADD COLUMN     "completedSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "firstScore" DOUBLE PRECISION,
ADD COLUMN     "quizCycle" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "quizPassed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "bloom" "BloomLevel" NOT NULL,
    "kind" "QuestionKind" NOT NULL DEFAULT 'MULTIPLA',
    "isCase" BOOLEAN NOT NULL DEFAULT false,
    "stem" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" TEXT NOT NULL,
    "commentary" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "cycle" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "status" "AttemptStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "ip" TEXT,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_feedback" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "clarity" INTEGER NOT NULL,
    "applicability" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_tenantId_code_key" ON "questions"("tenantId", "code");

-- CreateIndex
CREATE INDEX "quiz_attempts_enrollmentId_topicId_idx" ON "quiz_attempts"("enrollmentId", "topicId");

-- CreateIndex
CREATE INDEX "quiz_attempts_topicId_status_idx" ON "quiz_attempts"("topicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "topic_feedback_enrollmentId_topicId_key" ON "topic_feedback"("enrollmentId", "topicId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_feedback" ADD CONSTRAINT "topic_feedback_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_feedback" ADD CONSTRAINT "topic_feedback_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security das novas tabelas (mesmo padrão da migração 0002).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['questions', 'quiz_attempts', 'topic_feedback'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO drap_app USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO drap_app', t);
  END LOOP;
END $$;
