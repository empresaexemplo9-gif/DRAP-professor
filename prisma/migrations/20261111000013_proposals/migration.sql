-- Propostas comerciais geradas a partir dos pedidos de /empresas e preço por pessoa para empresas.
ALTER TABLE "modules" ADD COLUMN "enterprisePriceCents" INTEGER;
ALTER TABLE "modules" ADD CONSTRAINT "modules_enterprisePriceCents_check" CHECK ("enterprisePriceCents" IS NULL OR "enterprisePriceCents" >= 100);

CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "teamSize" INTEGER,
    "items" JSONB NOT NULL,
    "totalCents" INTEGER,
    "message" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByName" TEXT,
    "acceptedIp" TEXT,
    "acceptedSeats" INTEGER,
    "organizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proposals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "enterprise_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "proposals_leadId_key" ON "proposals"("leadId");
CREATE UNIQUE INDEX "proposals_token_key" ON "proposals"("token");
CREATE UNIQUE INDEX "proposals_tenantId_number_key" ON "proposals"("tenantId", "number");

ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposals" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "proposals" TO drap_app USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());
GRANT SELECT, INSERT, UPDATE, DELETE ON "proposals" TO drap_app;

-- Pagamento do contrato: libera provas e certificado. Contratos existentes seguem liberados.
ALTER TABLE "license_pools" ADD COLUMN "paidAt" TIMESTAMP(3);
UPDATE "license_pools" SET "paidAt" = "createdAt";
ALTER TABLE "enrollments" ADD COLUMN "paymentPending" BOOLEAN NOT NULL DEFAULT false;
