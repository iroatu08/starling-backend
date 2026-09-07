-- Required for uuid_generate_v4() defaults, pre-existing on the real DB (dropped by the shadow DB used for `migrate dev` diffing).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "bookings_status_enum" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "packages_package_type_enum" AS ENUM ('visa_processing', 'hotel_reservation', 'free_taxi', 'airport_transfer', 'custom');

-- CreateEnum
CREATE TYPE "payments_channel_enum" AS ENUM ('card', 'bank_transfer', 'ussd', 'mobile_money');

-- CreateEnum
CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'refund_pending', 'refunded', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "refund_requests_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR NOT NULL,
    "password_hash" VARCHAR NOT NULL,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "address" VARCHAR,
    "preferences" TEXT,
    "role" "users_role_enum" NOT NULL DEFAULT 'user',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "verification_token" VARCHAR,
    "reset_password_token" VARCHAR,
    "reset_password_expires" TIMESTAMP(6),
    "refresh_token_hash" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR NOT NULL,
    "country" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "hero_image_url" VARCHAR,
    "price_from_ngn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price_from_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "destination_id" UUID NOT NULL,
    "title" VARCHAR NOT NULL,
    "package_type" "packages_package_type_enum" NOT NULL DEFAULT 'custom',
    "description" TEXT,
    "is_removable" BOOLEAN NOT NULL DEFAULT true,
    "includes_visa" BOOLEAN NOT NULL DEFAULT false,
    "includes_flight" BOOLEAN NOT NULL DEFAULT false,
    "includes_hotel" BOOLEAN NOT NULL DEFAULT false,
    "includes_activities" BOOLEAN NOT NULL DEFAULT false,
    "price_ngn" DECIMAL(12,2) NOT NULL,
    "price_usd" DECIMAL(10,2) NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 1,
    "max_capacity" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cart_id" UUID NOT NULL,
    "package_id" UUID,
    "destination_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_ngn" DECIMAL(12,2) NOT NULL,
    "bundle_snapshot" JSONB,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reference_number" VARCHAR NOT NULL,
    "user_id" UUID NOT NULL,
    "image_url" VARCHAR,
    "status" "bookings_status_enum" NOT NULL DEFAULT 'pending',
    "total_amount_ngn" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "package_id" UUID,
    "destination_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_ngn" DECIMAL(12,2) NOT NULL,
    "bundle_snapshot" JSONB,
    "original_total_ngn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customized_total_ngn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "savings_ngn" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_travelers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR NOT NULL,
    "email" VARCHAR,
    "phone" VARCHAR,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_travelers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID,
    "paystack_reference" VARCHAR NOT NULL,
    "paystack_access_code" VARCHAR,
    "amount_ngn" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR NOT NULL DEFAULT 'NGN',
    "channel" "payments_channel_enum",
    "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
    "paystack_response" JSONB,
    "paid_at" TIMESTAMP(6),
    "user_id" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "refund_requests_status_enum" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "requested_amount_ngn" DECIMAL(12,2) NOT NULL,
    "admin_id" VARCHAR,
    "resolved_at" TIMESTAMP(6),
    "paystack_refund_reference" VARCHAR,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "destination_id" UUID,
    "cloudinary_public_id" VARCHAR NOT NULL,
    "url" VARCHAR NOT NULL,
    "alt_text" VARCHAR,
    "width" INTEGER,
    "height" INTEGER,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "destination_id" UUID NOT NULL,
    "user_id" UUID,
    "author_name" VARCHAR NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_number_key" ON "bookings"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_booking_travelers_booking_email" ON "booking_travelers"("booking_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paystack_reference_key" ON "payments"("paystack_reference");

-- CreateIndex
CREATE INDEX "IDX_630b89e731f40f526fbc24b1f7" ON "destination_reviews"("destination_id");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "FK_4680b59442cfb27af4f96d0db57" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_89be31cc7ba4670bb5f16059c6c" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "FK_72680bb1e0604158d2fa93bf2e0" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "FK_ef31cb9266b7deb19ad60847479" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "FK_077a9f00795d186208ccf607eb4" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "FK_8ad8b7ffdd84d6527507f1fbfc6" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_travelers" ADD CONSTRAINT "FK_f862a7a07bf4700ed72e9b31c0d" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_066a7fa3eb766591653f587d396" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_228d14156b20be394872d6c3aaa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery" ADD CONSTRAINT "FK_78da08ef8bcd4824f0f4ea35ed1" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_reviews" ADD CONSTRAINT "FK_630b89e731f40f526fbc24b1f7e" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_reviews" ADD CONSTRAINT "FK_f71632cef7eeaef7b2ebc7e64c6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

