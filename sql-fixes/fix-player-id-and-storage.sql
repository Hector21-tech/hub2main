-- SQL fixes för Player ID constraint och Storage bucket
-- Kör detta i Supabase SQL Editor
-- Fixed version som hanterar foreign key constraints

-- 1. Säkerställ att uuid-ossp extension är aktiverad
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Fix Player table ID column default (enklare approach - hoppa över primary key recreation)
ALTER TABLE "public"."players" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- 3. Lägg till default för befintliga rader utan ID (om några finns)
UPDATE "public"."players" SET "id" = uuid_generate_v4() WHERE "id" IS NULL;

-- 4. Säkerställ att ID kolumn har NOT NULL constraint
ALTER TABLE "public"."players" ALTER COLUMN "id" SET NOT NULL;

-- 5. Primary key finns redan och fungerar - hoppa över recreation
-- (Detta undviker foreign key constraint problem från trials table)

-- 6. Verification query - kör för att kontrollera att allt fungerar
SELECT
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'players' AND column_name = 'id';

-- 7. Test att defaults fungerar genom att skapa en test rad (ändra firstName)
-- INSERT INTO "public"."players" (tenantId, firstName, lastName)
-- VALUES ('test-tenant', 'Test', 'User');

-- 8. Ta bort test-raden (uncomment för att rensa)
-- DELETE FROM "public"."players" WHERE firstName = 'Test' AND lastName = 'User';