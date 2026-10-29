ALTER TABLE "modules" ADD CONSTRAINT "modules_priceCents_check" CHECK ("priceCents" IS NULL OR "priceCents" > 0);
CREATE UNIQUE INDEX "pix_checkouts_one_pending_per_user_module_key"
  ON "pix_checkouts"("tenantId", "userId", "moduleId")
  WHERE "status" = 'PENDING';
