-- ⚠️ 本文件仅供记录 schema 变更历史。
-- 开发库与 migrate 体系脱节（01_init.sql 为旧版残留），实际同步方式：
--   prisma db execute --file prisma/migrations/02_cart_addresses.sql && prisma generate

-- CreateTable: cart_items
CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "good_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: addresses
CREATE TABLE IF NOT EXISTS "addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "province" VARCHAR(50) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "district" VARCHAR(50) NOT NULL,
    "detail" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uk_cart_user_good" ON "cart_items"("user_id", "good_id");
CREATE INDEX IF NOT EXISTS "idx_cart_user_id" ON "cart_items"("user_id");
CREATE INDEX IF NOT EXISTS "idx_addresses_user_id" ON "addresses"("user_id");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_good_id_fkey" FOREIGN KEY ("good_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
