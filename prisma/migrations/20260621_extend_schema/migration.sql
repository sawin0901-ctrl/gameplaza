-- Add isBlocked and balance to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add isApproved to Review
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT true;

-- Add refundReason to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundReason" TEXT;

-- Add metaTitle and metaDesc to Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "metaDesc" TEXT;

-- Create Banner table
CREATE TABLE IF NOT EXISTS "Banner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- Create FAQItem table
CREATE TABLE IF NOT EXISTS "FAQItem" (
  "id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FAQItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FAQItem_isActive_idx" ON "FAQItem"("isActive");

-- Create ProductKey table
CREATE TABLE IF NOT EXISTS "ProductKey" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "keyValue" TEXT NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "orderId" TEXT,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductKey_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductKey_productId_idx" ON "ProductKey"("productId");
CREATE INDEX IF NOT EXISTS "ProductKey_isUsed_idx" ON "ProductKey"("isUsed");
ALTER TABLE "ProductKey" ADD CONSTRAINT "ProductKey_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create FlashSale table
CREATE TABLE IF NOT EXISTS "FlashSale" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "discountValue" DOUBLE PRECISION NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'percent',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FlashSale_endAt_idx" ON "FlashSale"("endAt");
CREATE INDEX IF NOT EXISTS "FlashSale_isActive_idx" ON "FlashSale"("isActive");
ALTER TABLE "FlashSale" ADD CONSTRAINT "FlashSale_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Bundle table
CREATE TABLE IF NOT EXISTS "Bundle" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Bundle_slug_key" ON "Bundle"("slug");

-- Create BundleItem table
CREATE TABLE IF NOT EXISTS "BundleItem" (
  "id" TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey"
  FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Ticket table
CREATE TABLE IF NOT EXISTS "Ticket" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX IF NOT EXISTS "Ticket_userId_idx" ON "Ticket"("userId");
CREATE INDEX IF NOT EXISTS "Ticket_createdAt_idx" ON "Ticket"("createdAt");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create TicketMessage table
CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ReferralCode table
CREATE TABLE IF NOT EXISTS "ReferralCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "bonusAmount" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX IF NOT EXISTS "ReferralCode_code_idx" ON "ReferralCode"("code");
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AdminLog table
CREATE TABLE IF NOT EXISTS "AdminLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "details" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminLog_adminId_idx" ON "AdminLog"("adminId");
CREATE INDEX IF NOT EXISTS "AdminLog_action_idx" ON "AdminLog"("action");