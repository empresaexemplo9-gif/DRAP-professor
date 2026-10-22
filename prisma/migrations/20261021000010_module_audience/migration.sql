-- Público-alvo do módulo: capacitação individual (venda avulsa) ou treinamento para empresas (venda por contrato).
CREATE TYPE "ModuleAudience" AS ENUM ('INDIVIDUAL', 'EMPRESA');
ALTER TABLE "modules" ADD COLUMN "audience" "ModuleAudience" NOT NULL DEFAULT 'INDIVIDUAL';
CREATE INDEX "modules_tenantId_audience_status_idx" ON "modules"("tenantId", "audience", "status");
