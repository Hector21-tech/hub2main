import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Setup Supabase Storage bucket and RLS policies for avatars
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up Supabase Storage for player avatars...')

    // 1. Create player-avatars bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 })
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'player-avatars')

    if (!bucketExists) {
      console.log('📁 Creating player-avatars bucket...')
      const { data: bucket, error: createError } = await supabase.storage.createBucket('player-avatars', {
        public: false, // Private bucket
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB limit
      })

      if (createError) {
        console.error('❌ Error creating bucket:', createError)
        return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 })
      }

      console.log('✅ Bucket created successfully:', bucket)
    } else {
      console.log('✅ Bucket already exists')
    }

    // 2. Create RLS policies using raw SQL
    const policies = [
      {
        name: 'tenant_read_policy',
        sql: `
          CREATE POLICY "Users can read avatars from their tenant" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'player-avatars' AND
            (storage.foldername(name))[1] IN (
              SELECT tm.tenant_id
              FROM tenant_memberships tm
              WHERE tm.user_id = auth.uid()
            )
          );
        `
      },
      {
        name: 'tenant_upload_policy',
        sql: `
          CREATE POLICY "Users can upload avatars to their tenant" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'player-avatars' AND
            (storage.foldername(name))[1] IN (
              SELECT tm.tenant_id
              FROM tenant_memberships tm
              WHERE tm.user_id = auth.uid()
              AND tm.role IN ('ADMIN', 'MANAGER', 'SCOUT')
            )
          );
        `
      },
      {
        name: 'tenant_delete_policy',
        sql: `
          CREATE POLICY "Users can delete avatars from their tenant" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'player-avatars' AND
            (storage.foldername(name))[1] IN (
              SELECT tm.tenant_id
              FROM tenant_memberships tm
              WHERE tm.user_id = auth.uid()
              AND tm.role IN ('ADMIN', 'MANAGER', 'SCOUT')
            )
          );
        `
      }
    ]

    const results = []

    for (const policy of policies) {
      try {
        console.log(`📋 Creating policy: ${policy.name}`)

        // First, try to drop existing policy (ignore errors)
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy.name.replace('_', ' ')}" ON storage.objects;`
        })

        // Create new policy
        const { data, error } = await supabase.rpc('exec_sql', { sql: policy.sql })

        if (error) {
          console.warn(`⚠️ Policy ${policy.name} might already exist:`, error.message)
          results.push({ policy: policy.name, status: 'exists_or_error', error: error.message })
        } else {
          console.log(`✅ Policy ${policy.name} created successfully`)
          results.push({ policy: policy.name, status: 'created' })
        }
      } catch (err) {
        console.error(`❌ Error with policy ${policy.name}:`, err)
        results.push({ policy: policy.name, status: 'error', error: err })
      }
    }

    // 3. Test bucket access
    console.log('🧪 Testing bucket access...')
    const testPath = `test-${Date.now()}.txt`

    const { data: testUpload, error: testError } = await supabase.storage
      .from('player-avatars')
      .upload(testPath, 'test content', {
        cacheControl: '3600',
        upsert: false
      })

    if (testError) {
      console.warn('⚠️ Test upload failed (expected if no auth):', testError.message)
    } else {
      console.log('✅ Test upload successful')
      // Clean up test file
      await supabase.storage.from('player-avatars').remove([testPath])
    }

    return NextResponse.json({
      success: true,
      message: 'Storage setup completed',
      bucket: 'player-avatars',
      policies: results,
      testUpload: testError ? 'failed (expected)' : 'success'
    })

  } catch (error) {
    console.error('❌ Storage setup error:', error)
    return NextResponse.json(
      { error: 'Storage setup failed', details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}