-- CreateTable
CREATE TABLE "hero_image" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_image_sortOrder_idx" ON "hero_image"("sortOrder");