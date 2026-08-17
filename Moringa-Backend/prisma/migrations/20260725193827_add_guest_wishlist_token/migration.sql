-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "userId" DROP NOT NULL,
ADD COLUMN "guestWishlistToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_guestWishlistToken_productId_key" ON "Wishlist"("guestWishlistToken", "productId");

-- CreateIndex
CREATE INDEX "Wishlist_guestWishlistToken_idx" ON "Wishlist"("guestWishlistToken");
