-- Add new fields to Product for Plati.Market support
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDesc" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT[] DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "importSource" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "platiUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;

-- Create PlatiImportLog table for import history
CREATE TABLE IF NOT EXISTS "PlatiImportLog" (
  "id"          TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "productId"   INTEGER,
  "productName" TEXT,
  "status"      TEXT NOT NULL,
  "error"       TEXT,
  "duration"    INTEGER,
  "source"      TEXT NOT NULL DEFAULT 'manual',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatiImportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlatiImportLog_createdAt_idx" ON "PlatiImportLog"("createdAt");
CREATE INDEX IF NOT EXISTS "PlatiImportLog_status_idx"    ON "PlatiImportLog"("status");
CREATE INDEX IF NOT EXISTS "PlatiImportLog_source_idx"    ON "PlatiImportLog"("source");