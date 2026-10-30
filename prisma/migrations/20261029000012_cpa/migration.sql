-- CreateEnum
CREATE TYPE "CpaStatus" AS ENUM ('PENDENTE', 'EM_ELABORACAO', 'REVISADO', 'PUBLICADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "CpaOrigin" AS ENUM ('IMPORTADO', 'EDITADO');

-- CreateEnum
CREATE TYPE "CpaQuestionType" AS ENUM ('CONCEITO', 'CALCULO', 'INTERPRETACAO', 'COMPARACAO', 'CASO', 'DECISAO', 'DIALOGO');

-- CreateEnum
CREATE TYPE "CpaQuestionUse" AS ENUM ('FIXACAO', 'SIMULADO', 'DIAGNOSTICO');

-- CreateEnum
CREATE TYPE "CpaExamKind" AS ENUM ('DIAGNOSTICO', 'MODULO', 'INTERMEDIARIO', 'COMPLETO', 'FINAL', 'ATENDIMENTO');

-- CreateEnum
CREATE TYPE "CpaAttemptMode" AS ENUM ('PROVA', 'ESTUDO');

-- CreateEnum
CREATE TYPE "CpaAnnotationKind" AS ENUM ('MARCADOR', 'DESTAQUE', 'NOTA', 'FAVORITO');

-- CreateTable
CREATE TABLE "cpa_syllabus_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "programVersion" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "macro" INTEGER NOT NULL,
    "parentCode" TEXT,
    "leaf" BOOLEAN NOT NULL,
    "weight" INTEGER,
    "reviewer" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_syllabus_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_chapters" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "macro" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "officialRef" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "status" "CpaStatus" NOT NULL DEFAULT 'PUBLICADO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_lessons" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document" JSONB NOT NULL,
    "extras" JSONB NOT NULL DEFAULT '{}',
    "references" JSONB NOT NULL DEFAULT '[]',
    "checkedAt" TIMESTAMP(3),
    "nextLessonCode" TEXT,
    "status" "CpaStatus" NOT NULL DEFAULT 'EM_ELABORACAO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewer" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_lesson_items" (
    "lessonId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "cpa_lesson_items_pkey" PRIMARY KEY ("lessonId","itemId")
);

-- CreateTable
CREATE TABLE "cpa_lesson_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "authorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpa_lesson_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_references" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "url" TEXT,
    "scope" TEXT,
    "validFrom" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "checkStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_questions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CpaQuestionType" NOT NULL,
    "use" "CpaQuestionUse" NOT NULL,
    "macro" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "competence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "nature" TEXT NOT NULL DEFAULT 'AUTORAL',
    "lessonCode" TEXT,
    "check" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "status" "CpaStatus" NOT NULL DEFAULT 'EM_ELABORACAO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_question_items" (
    "questionId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "cpa_question_items_pkey" PRIMARY KEY ("questionId","itemId")
);

-- CreateTable
CREATE TABLE "cpa_exams" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CpaExamKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questionCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "distribution" JSONB NOT NULL DEFAULT '{}',
    "macros" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "fixedCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pool" "CpaQuestionUse" NOT NULL DEFAULT 'SIMULADO',
    "allowStudyMode" BOOLEAN NOT NULL DEFAULT true,
    "allowBackNav" BOOLEAN NOT NULL DEFAULT true,
    "oneQuestionPerScreen" BOOLEAN NOT NULL DEFAULT true,
    "targetPercent" INTEGER NOT NULL DEFAULT 70,
    "order" INTEGER NOT NULL,
    "status" "CpaStatus" NOT NULL DEFAULT 'PUBLICADO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_attempts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" UUID NOT NULL,
    "mode" "CpaAttemptMode" NOT NULL,
    "items" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "flagged" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timings" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "hits" INTEGER,
    "result" JSONB,

    CONSTRAINT "cpa_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_trees" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "itemCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CpaStatus" NOT NULL DEFAULT 'PUBLICADO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_tree_runs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "treeId" UUID NOT NULL,
    "path" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpa_tree_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_cards" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "lessonCode" TEXT,
    "status" "CpaStatus" NOT NULL DEFAULT 'PUBLICADO',
    "origin" "CpaOrigin" NOT NULL DEFAULT 'IMPORTADO',
    "sourceHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_reviews" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "itemCode" TEXT,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastResult" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_lesson_progress" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "lastSection" TEXT,
    "checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exercises" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_annotations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonCode" TEXT NOT NULL,
    "kind" "CpaAnnotationKind" NOT NULL,
    "anchor" TEXT,
    "quote" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpa_study_plans" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "hoursPerWeek" INTEGER NOT NULL DEFAULT 6,
    "pace" TEXT NOT NULL DEFAULT 'REGULAR',
    "reviewDays" INTEGER[] DEFAULT ARRAY[1, 3, 7, 14]::INTEGER[],
    "studyDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastStudyOn" DATE,
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastLessonCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpa_study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cpa_syllabus_items_tenantId_macro_idx" ON "cpa_syllabus_items"("tenantId", "macro");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_syllabus_items_tenantId_programVersion_code_key" ON "cpa_syllabus_items"("tenantId", "programVersion", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_chapters_tenantId_number_key" ON "cpa_chapters"("tenantId", "number");

-- CreateIndex
CREATE INDEX "cpa_lessons_chapterId_order_idx" ON "cpa_lessons"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_lessons_tenantId_code_key" ON "cpa_lessons"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_lessons_tenantId_slug_key" ON "cpa_lessons"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "cpa_lesson_items_itemId_idx" ON "cpa_lesson_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_lesson_versions_lessonId_version_key" ON "cpa_lesson_versions"("lessonId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_references_tenantId_key_key" ON "cpa_references"("tenantId", "key");

-- CreateIndex
CREATE INDEX "cpa_questions_tenantId_use_macro_idx" ON "cpa_questions"("tenantId", "use", "macro");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_questions_tenantId_code_key" ON "cpa_questions"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cpa_question_items_itemId_idx" ON "cpa_question_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_exams_tenantId_code_key" ON "cpa_exams"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cpa_attempts_tenantId_userId_startedAt_idx" ON "cpa_attempts"("tenantId", "userId", "startedAt");

-- CreateIndex
CREATE INDEX "cpa_attempts_examId_idx" ON "cpa_attempts"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_trees_tenantId_code_key" ON "cpa_trees"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cpa_tree_runs_tenantId_userId_idx" ON "cpa_tree_runs"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_cards_tenantId_code_key" ON "cpa_cards"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cpa_reviews_tenantId_userId_dueAt_idx" ON "cpa_reviews"("tenantId", "userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_reviews_tenantId_userId_kind_refCode_key" ON "cpa_reviews"("tenantId", "userId", "kind", "refCode");

-- CreateIndex
CREATE INDEX "cpa_lesson_progress_tenantId_userId_idx" ON "cpa_lesson_progress"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_lesson_progress_userId_lessonId_key" ON "cpa_lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "cpa_annotations_tenantId_userId_lessonCode_idx" ON "cpa_annotations"("tenantId", "userId", "lessonCode");

-- CreateIndex
CREATE UNIQUE INDEX "cpa_study_plans_tenantId_userId_key" ON "cpa_study_plans"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "cpa_lessons" ADD CONSTRAINT "cpa_lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "cpa_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_lesson_items" ADD CONSTRAINT "cpa_lesson_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "cpa_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_lesson_items" ADD CONSTRAINT "cpa_lesson_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cpa_syllabus_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_lesson_versions" ADD CONSTRAINT "cpa_lesson_versions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "cpa_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_question_items" ADD CONSTRAINT "cpa_question_items_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "cpa_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_question_items" ADD CONSTRAINT "cpa_question_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "cpa_syllabus_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_attempts" ADD CONSTRAINT "cpa_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "cpa_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_tree_runs" ADD CONSTRAINT "cpa_tree_runs_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "cpa_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpa_lesson_progress" ADD CONSTRAINT "cpa_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "cpa_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-Level Security das tabelas do CPA (mesmo padrão da migração 0002).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cpa_syllabus_items', 'cpa_chapters', 'cpa_lessons', 'cpa_lesson_items', 'cpa_lesson_versions', 'cpa_references',
    'cpa_questions', 'cpa_question_items', 'cpa_exams', 'cpa_attempts', 'cpa_trees', 'cpa_tree_runs', 'cpa_cards', 'cpa_reviews',
    'cpa_lesson_progress', 'cpa_annotations', 'cpa_study_plans'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO drap_app USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO drap_app', t);
  END LOOP;
END $$;
