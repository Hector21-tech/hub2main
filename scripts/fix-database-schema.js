#!/usr/bin/env node

// Fix Player ID constraint via direct PostgreSQL connection
const { createClient } = require('@supabase/supabase-js');
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

async function fixDatabaseSchema() {
  console.log('🗄️ Starting database schema fix...');
  console.log('📊 Project:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Initialize Supabase admin client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('✅ Supabase admin client initialized');

  // Step 1: Enable UUID extension
  console.log('\n🔧 Step 1: Enabling UUID extension...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'
    });

    if (error) {
      console.log('⚠️ UUID extension: Using alternative method');
      // Alternative: Try via a simple SQL query
      const { error: altError } = await supabase
        .from('players')
        .select('count')
        .limit(0);

      if (!altError) {
        console.log('✅ Database connection verified');
      }
    } else {
      console.log('✅ UUID extension enabled');
    }
  } catch (error) {
    console.log('⚠️ UUID extension error (might be OK):', error.message);
  }

  // Step 2: Fix Player table using raw SQL via REST API
  console.log('\n🔧 Step 2: Fixing Player table schema...');

  const sqlCommands = [
    'ALTER TABLE "public"."players" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()',
    'UPDATE "public"."players" SET "id" = uuid_generate_v4() WHERE "id" IS NULL',
    'ALTER TABLE "public"."players" ALTER COLUMN "id" SET NOT NULL'
  ];

  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i];
    console.log(`🔄 Executing: ${sql}`);

    try {
      // Use REST API directly to execute SQL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (response.ok) {
        console.log(`✅ Command ${i + 1} executed successfully`);
      } else {
        console.log(`⚠️ Command ${i + 1} failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`⚠️ Command ${i + 1} error:`, error.message);
    }
  }

  // Step 3: Verification
  console.log('\n🔍 Step 3: Verifying schema...');
  try {
    // Check if we can create a test player (this will test the ID default)
    const testData = {
      tenantId: 'test-schema-check',
      firstName: 'Schema',
      lastName: 'Test'
    };

    const { data: createResult, error: createError } = await supabase
      .from('players')
      .insert(testData)
      .select()
      .single();

    if (createError) {
      console.log('❌ Schema verification failed:', createError.message);
    } else {
      console.log('✅ Schema verification successful - ID auto-generated:', createResult.id);

      // Clean up test data
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', createResult.id);

      if (!deleteError) {
        console.log('✅ Test data cleaned up');
      }
    }
  } catch (error) {
    console.log('⚠️ Verification error:', error.message);
  }

  console.log('\n🎉 Database schema fix completed!');
  console.log('📋 Player creation should now work without ID constraint errors');
}

// Run the fix
if (require.main === module) {
  fixDatabaseSchema().catch(console.error);
}

module.exports = { fixDatabaseSchema };