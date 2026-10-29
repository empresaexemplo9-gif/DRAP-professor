ALTER TABLE "modules" ADD COLUMN "priceCents" INTEGER;

CREATE TYPE "PixCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

CREATE TABLE "pix_checkouts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" UUID NOT NULL,
    "providerPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "PixCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "pixPayload" TEXT,
    "pixImageDataUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pix_checkouts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pix_checkouts_amountCents_check" CHECK ("amountCents" > 0),
    CONSTRAINT "pix_checkouts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pix_checkouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pix_checkouts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "pix_checkouts_providerPaymentId_key" ON "pix_checkouts"("providerPaymentId");
CREATE INDEX "pix_checkouts_tenantId_userId_moduleId_status_idx" ON "pix_checkouts"("tenantId", "userId", "moduleId", "status");

ALTER TABLE "pix_checkouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pix_checkouts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pix_checkouts" TO drap_app
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON "pix_checkouts" TO drap_app;
