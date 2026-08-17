-- CreateTable
CREATE TABLE "new_arrival" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "new_arrival_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "new_arrival_sortOrder_idx" ON "new_arrival"("sortOrder");
