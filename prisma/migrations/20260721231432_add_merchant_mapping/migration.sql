-- CreateTable
CREATE TABLE "merchant_mappings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "normalized_merchant" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_mappings_user_id_idx" ON "merchant_mappings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_mappings_user_id_normalized_merchant_key" ON "merchant_mappings"("user_id", "normalized_merchant");

-- AddForeignKey
ALTER TABLE "merchant_mappings" ADD CONSTRAINT "merchant_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_mappings" ADD CONSTRAINT "merchant_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
