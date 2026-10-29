-- Gestão administrativa de matrículas e cobranças Pix.
ALTER TYPE "PixCheckoutStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

ALTER TABLE "pix_checkouts"
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "manualConfirmedById" TEXT;

ALTER TABLE "enrollments" ADD COLUMN "note" TEXT;
