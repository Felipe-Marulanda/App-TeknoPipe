-- CreateEnum
CREATE TYPE "quotation_status" AS ENUM ('BORRADOR', 'PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "identification_type" VARCHAR(32) NOT NULL,
    "identification_number" VARCHAR(64) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(160),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "address" VARCHAR(240),
    "city" VARCHAR(120),
    "department" VARCHAR(120),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "reference" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "unit" VARCHAR(40) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "client_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "revision_of_id" UUID,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "status" "quotation_status" NOT NULL DEFAULT 'BORRADOR',
    "issue_date" DATE NOT NULL,
    "expiration_date" DATE NOT NULL,
    "client_identification_type" VARCHAR(32) NOT NULL,
    "client_identification_snapshot" VARCHAR(64) NOT NULL,
    "client_name_snapshot" VARCHAR(200) NOT NULL,
    "client_contact_snapshot" VARCHAR(160),
    "client_email_snapshot" VARCHAR(320),
    "client_phone_snapshot" VARCHAR(40),
    "client_address_snapshot" VARCHAR(240),
    "client_city_snapshot" VARCHAR(120),
    "client_department_snapshot" VARCHAR(120),
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "observations" TEXT,
    "commercial_terms" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_reference_snapshot" VARCHAR(80) NOT NULL,
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "description_snapshot" VARCHAR(1000),
    "unit_snapshot" VARCHAR(40) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxable_base" DECIMAL(14,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_status_history" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "previous_status" "quotation_status",
    "new_status" "quotation_status" NOT NULL,
    "observation" VARCHAR(1000),
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "commercial_name" VARCHAR(200),
    "tax_identification" VARCHAR(64),
    "logo_url" VARCHAR(500),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "address" VARCHAR(240),
    "city" VARCHAR(120),
    "department" VARCHAR(120),
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "default_validity_days" INTEGER,
    "default_terms" TEXT,
    "discounts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quotation_prefix" VARCHAR(12) NOT NULL DEFAULT 'COT',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_counters" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quotation_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_active_idx" ON "users"("role_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "clients_legal_name_idx" ON "clients"("legal_name");

-- CreateIndex
CREATE INDEX "clients_active_idx" ON "clients"("active");

-- CreateIndex
CREATE UNIQUE INDEX "clients_identification_type_identification_number_key" ON "clients"("identification_type", "identification_number");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_reference_key" ON "products"("reference");

-- CreateIndex
CREATE INDEX "products_category_id_active_idx" ON "products"("category_id", "active");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_number_key" ON "quotations"("number");

-- CreateIndex
CREATE INDEX "quotations_status_created_at_idx" ON "quotations"("status", "created_at");

-- CreateIndex
CREATE INDEX "quotations_client_id_created_at_idx" ON "quotations"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "quotations_created_by_id_created_at_idx" ON "quotations"("created_by_id", "created_at");

-- CreateIndex
CREATE INDEX "quotations_expiration_date_status_idx" ON "quotations"("expiration_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_revision_of_id_revision_number_key" ON "quotations"("revision_of_id", "revision_number");

-- CreateIndex
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_items_quotation_id_line_number_key" ON "quotation_items"("quotation_id", "line_number");

-- CreateIndex
CREATE INDEX "quotation_status_history_quotation_id_changed_at_idx" ON "quotation_status_history"("quotation_id", "changed_at");

-- CreateIndex
CREATE INDEX "quotation_status_history_changed_by_id_changed_at_idx" ON "quotation_status_history"("changed_by_id", "changed_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep normalized identifiers and monetary invariants enforced below the API layer.
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_normalized_check"
    CHECK ("email" = lower(btrim("email")));

ALTER TABLE "clients"
    ADD CONSTRAINT "clients_identification_not_blank_check"
    CHECK (length(btrim("identification_type")) > 0 AND length(btrim("identification_number")) > 0),
    ADD CONSTRAINT "clients_legal_name_not_blank_check"
    CHECK (length(btrim("legal_name")) > 0);

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_name_not_blank_check"
    CHECK (length(btrim("name")) > 0);

ALTER TABLE "products"
    ADD CONSTRAINT "products_catalog_values_check"
    CHECK (
        length(btrim("reference")) > 0
        AND length(btrim("name")) > 0
        AND length(btrim("unit")) > 0
        AND "unit_price" >= 0
    );

ALTER TABLE "quotations"
    ADD CONSTRAINT "quotations_dates_check"
    CHECK ("expiration_date" >= "issue_date"),
    ADD CONSTRAINT "quotations_revision_number_check"
    CHECK ("revision_number" > 0),
    ADD CONSTRAINT "quotations_tax_rate_check"
    CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100),
    ADD CONSTRAINT "quotations_amounts_check"
    CHECK (
        "subtotal" >= 0
        AND "discount_total" >= 0
        AND "discount_total" <= "subtotal"
        AND "tax_total" >= 0
        AND "total" = "subtotal" - "discount_total" + "tax_total"
    ),
    ADD CONSTRAINT "quotations_snapshot_name_not_blank_check"
    CHECK (length(btrim("client_name_snapshot")) > 0);

ALTER TABLE "quotation_items"
    ADD CONSTRAINT "quotation_items_line_values_check"
    CHECK (
        "line_number" > 0
        AND "quantity" > 0
        AND "unit_price" >= 0
        AND "subtotal" >= 0
        AND "discount_amount" >= 0
        AND "discount_amount" <= "subtotal"
        AND "taxable_base" = "subtotal" - "discount_amount"
        AND "tax_rate" >= 0
        AND "tax_rate" <= 100
        AND "tax_amount" >= 0
        AND "total" = "taxable_base" + "tax_amount"
    );

ALTER TABLE "company_settings"
    ADD CONSTRAINT "company_settings_singleton_check"
    CHECK ("id" = 1),
    ADD CONSTRAINT "company_settings_currency_check"
    CHECK (length(btrim("currency")) = 3),
    ADD CONSTRAINT "company_settings_tax_rate_check"
    CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100),
    ADD CONSTRAINT "company_settings_validity_check"
    CHECK ("default_validity_days" IS NULL OR "default_validity_days" > 0),
    ADD CONSTRAINT "company_settings_prefix_not_blank_check"
    CHECK (length(btrim("quotation_prefix")) > 0);

ALTER TABLE "quotation_counters"
    ADD CONSTRAINT "quotation_counters_values_check"
    CHECK ("year" BETWEEN 2000 AND 9999 AND "last_number" >= 0);
