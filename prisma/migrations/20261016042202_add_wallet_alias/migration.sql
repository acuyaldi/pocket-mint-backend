-- CreateTable
CREATE TABLE "wallet_aliases" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alias_display" TEXT NOT NULL,
    "alias_normalized" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_aliases_wallet_id_idx" ON "wallet_aliases"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_aliases_user_id_alias_normalized_key" ON "wallet_aliases"("user_id", "alias_normalized");

-- AddForeignKey
ALTER TABLE "wallet_aliases" ADD CONSTRAINT "wallet_aliases_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_aliases" ADD CONSTRAINT "wallet_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
