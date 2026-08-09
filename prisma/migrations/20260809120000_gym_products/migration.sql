-- CreateEnum
CREATE TYPE "GymProductCategory" AS ENUM ('equipment', 'apparel', 'protective_gear', 'goods', 'other');

-- CreateTable
CREATE TABLE "GymProduct" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GymProductCategory" NOT NULL DEFAULT 'goods',
    "defaultPrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymProduct_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GymManualSale" ADD COLUMN "productId" TEXT;

-- AlterTable
ALTER TABLE "GymReceivable" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE INDEX "GymProduct_gymId_deletedAt_idx" ON "GymProduct"("gymId", "deletedAt");
CREATE INDEX "GymProduct_gymId_isActive_sortOrder_idx" ON "GymProduct"("gymId", "isActive", "sortOrder");
CREATE INDEX "GymProduct_gymId_name_idx" ON "GymProduct"("gymId", "name");
CREATE INDEX "GymManualSale_productId_idx" ON "GymManualSale"("productId");
CREATE INDEX "GymReceivable_productId_idx" ON "GymReceivable"("productId");

-- AddForeignKey
ALTER TABLE "GymProduct" ADD CONSTRAINT "GymProduct_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymManualSale" ADD CONSTRAINT "GymManualSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "GymProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymReceivable" ADD CONSTRAINT "GymReceivable_productId_fkey" FOREIGN KEY ("productId") REFERENCES "GymProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
