ALTER TABLE "company_settings"
RENAME COLUMN "logo_url" TO "logo_data";

ALTER TABLE "company_settings"
ALTER COLUMN "logo_data" TYPE TEXT;
