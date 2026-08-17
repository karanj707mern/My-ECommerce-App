ALTER TABLE "Product"
ADD COLUMN "slug" TEXT,
ADD COLUMN "sku" TEXT,
ADD COLUMN "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN "category" TEXT,
ADD COLUMN "brand" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "weightGrams" INTEGER,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Product"
SET
  "slug" = LOWER(REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9]+', '-', 'g')),
  "sku" = CONCAT('MOR-', LPAD("id"::TEXT, 6, '0'))
WHERE "slug" IS NULL OR "sku" IS NULL;

ALTER TABLE "Product"
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "sku" SET NOT NULL;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

ALTER TABLE "StoreSettings"
ADD COLUMN "shippingZones" JSONB,
ADD COLUMN "codEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "maxCodOrderValue" DOUBLE PRECISION,
ADD COLUMN "allowInternationalCod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoCancelPendingMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Order"
ADD COLUMN "paymentMethod" TEXT DEFAULT 'online',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "inventoryReserved" BOOLEAN NOT NULL DEFAULT false;
