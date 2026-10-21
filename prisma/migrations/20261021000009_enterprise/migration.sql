-- Versão Enterprise: empresas clientes, gestores, licenças por curso e atribuição de vagas.
ALTER TYPE "EnrollmentOrigin" ADD VALUE IF NOT EXISTS 'LICENCA';

CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "OrgMemberRole" AS ENUM ('GESTOR', 'COLABORADOR');
CREATE TYPE "LicensePoolStatus" AS ENUM ('ACTIVE', 'CANCELED');
CREATE TYPE "LicenseAssignmentStatus" AS ENUM ('CONVIDADO', 'ATIVO', 'REVOGADO');
CREATE TYPE "EnterpriseLeadStatus" AS ENUM ('NOVO', 'EM_CONTATO', 'FECHADO', 'DESCARTADO');

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "cnpj" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organizations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organizations_tenantId_cnpj_key" ON "organizations"("tenantId", "cnpj");

CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'COLABORADOR',
    "team" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE INDEX "organization_members_tenantId_userId_idx" ON "organization_members"("tenantId", "userId");

CREATE TABLE "license_pools" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "seats" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "goalPercent" INTEGER NOT NULL DEFAULT 90,
    "contractCents" INTEGER,
    "status" "LicensePoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_pools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_pools_seats_check" CHECK ("seats" > 0),
    CONSTRAINT "license_pools_goalPercent_check" CHECK ("goalPercent" BETWEEN 0 AND 100),
    CONSTRAINT "license_pools_contractCents_check" CHECK ("contractCents" IS NULL OR "contractCents" >= 0),
    CONSTRAINT "license_pools_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "license_pools_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "license_pools_tenantId_organizationId_idx" ON "license_pools"("tenantId", "organizationId");

CREATE TABLE "license_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "poolId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "team" TEXT,
    "status" "LicenseAssignmentStatus" NOT NULL DEFAULT 'CONVIDADO',
    "assignedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_assignments_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "license_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "license_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "license_assignments_poolId_email_key" ON "license_assignments"("poolId", "email");
CREATE INDEX "license_assignments_tenantId_email_status_idx" ON "license_assignments"("tenantId", "email", "status");

CREATE TABLE "enterprise_leads" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "teamSize" INTEGER,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "message" TEXT,
    "status" "EnterpriseLeadStatus" NOT NULL DEFAULT 'NOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enterprise_leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enterprise_leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "enterprise_leads_tenantId_createdAt_idx" ON "enterprise_leads"("tenantId", "createdAt");

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organizations', 'organization_members', 'license_pools', 'license_assignments', 'enterprise_leads'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO drap_app USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO drap_app', t);
  END LOOP;
END $$;
