#!/usr/bin/env node

// Fix Player ID constraint via Prisma raw SQL
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^"(.*)"$/, '$1');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Could not load .env.local:', error.message);
  }
}

loadEnvLocal();

async function fixDatabaseViaPrisma() {
  console.log('🗄️ Starting database fix via Prisma...');
  console.log('📊 Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  const prisma = new PrismaClient();

  try {
    // Step 1: Enable UUID extension
    console.log('\n🔧 Step 1: Enabling UUID extension...');
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      console.log('✅ UUID extension enabled');
    } catch (error) {
      console.log('⚠️ UUID extension error (might already exist):', error.message);
    }

    // Step 2: Set default for Player ID column
    console.log('\n🔧 Step 2: Setting ID column default...');
    try {
      await prisma.$executeRaw`ALTER TABLE "public"."players" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`;
      console.log('✅ ID column default set to uuid_generate_v4()');
    } catch (error) {
      console.log('⚠️ Set default error:', error.message);
    }

    // Step 3: Fix existing NULL IDs
    console.log('\n🔧 Step 3: Fixing existing NULL IDs...');
    try {
      const result = await prisma.$executeRaw`UPDATE "public"."players" SET "id" = uuid_generate_v4() WHERE "id" IS NULL`;
      console.log('✅ Updated rows with NULL IDs:', result);
    } catch (error) {
      console.log('⚠️ Update NULL IDs error:', error.message);
    }

    // Step 4: Ensure NOT NULL constraint
    console.log('\n🔧 Step 4: Setting NOT NULL constraint...');
    try {
      await prisma.$executeRaw`ALTER TABLE "public"."players" ALTER COLUMN "id" SET NOT NULL`;
      console.log('✅ ID column set to NOT NULL');
    } catch (error) {
      console.log('⚠️ NOT NULL constraint error:', error.message);
    }

    // Step 5: Verification - check schema
    console.log('\n🔍 Step 5: Verifying schema...');
    try {
      const schemaInfo = await prisma.$queryRaw`
        SELECT column_name, column_default, is_nullable, data_type
        FROM information_schema.columns
        WHERE table_name = 'players' AND column_name = 'id'
      `;
      console.log('✅ Schema verification:', schemaInfo);
    } catch (error) {
      console.log('⚠️ Schema verification error:', error.message);
    }

    // Step 6: Test creating a player
    console.log('\n🧪 Step 6: Testing player creation...');
    try {
      const testPlayer = await prisma.player.create({
        data: {
          tenantId: 'test-schema-check',
          firstName: 'Schema',
          lastName: 'Test',
          tags: []
        }
      });

      console.log('✅ Test player created successfully with ID:', testPlayer.id);

      // Clean up
      await prisma.player.delete({
        where: { id: testPlayer.id }
      });
      console.log('✅ Test player cleaned up');

    } catch (error) {
      console.log('❌ Test player creation failed:', error.message);
    }

  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🎉 Database fix via Prisma completed!');
}

// Run the fix
if (require.main === module) {
  fixDatabaseViaPrisma().catch(console.error);
}

module.exports = { fixDatabaseViaPrisma };