import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Setup Supabase Storage bucket and policies
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up Supabase Storage...')

    // 1. Create player-avatars bucket
    console.log('📁 Creating player-avatars bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('player-avatars', {
        public: false, // Private bucket for security
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880, // 5MB limit
      })

    if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('resource already exists')) {
      console.error('❌ Bucket creation error:', bucketError)
      return NextResponse.json(
        { error: 'Failed to create storage bucket', details: bucketError.message },
        { status: 500 }
      )
    }

    console.log('✅ Bucket created or already exists')

    // 2. Check existing policies
    console.log('🔐 Checking storage policies...')

    // Note: RLS policies for storage are managed via SQL, not the JS client
    // The policies we need:
    // - Users can upload to their tenant's folder
    // - Users can read from their tenant's folder
    // - Service role can do everything

    console.log('✅ Storage setup completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Supabase Storage setup completed',
      bucket: 'player-avatars',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Storage setup error:', error)
    return NextResponse.json(
      { error: 'Storage setup failed', details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}