import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireTenant } from "@/lib/server/authz";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Get signed download URL for player avatar
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Avatar URL: Starting request processing...');

    // 1. Tenant resolution först (slug → ID)
    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant');
    const path = url.searchParams.get('path');

    console.log('🔍 Avatar URL: Request params:', {
      tenantSlug,
      path,
      fullUrl: request.url
    });

    const authz = await requireTenant({ request });
    if (!authz.ok) {
      console.log('❌ Avatar URL: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantSlug
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Avatar URL: Auth successful:', {
      tenantSlug,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id
    });

    // 2. Validate path parameter
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Missing path parameter', code: 'MISSING_PATH' },
        { status: 400 }
      );
    }

    // 3. Build storage path using tenant ID (not slug)
    const objectPath = `${authz.tenantId}/${path}`;
    console.log('📂 Avatar URL: Storage path:', objectPath);

    // 4. Generate signed URL from correct bucket "avatars"
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from('avatars') // FIXED: Use correct bucket name
      .createSignedUrl(objectPath, 3600); // 60 minutes

    if (error) {
      console.log('❌ Avatar URL: Storage error:', {
        message: error.message,
        objectPath,
        bucket: 'avatars'
      });

      // If file doesn't exist (404), return null for graceful fallback
      if (error.message?.includes('Object not found') ||
          (error as any).statusCode === '404' ||
          (error as any).status === 404) {
        console.log(`📄 Avatar URL: File not found, returning null for path: ${objectPath}`);
        return NextResponse.json({
          success: true,
          url: null,
          error: 'File not found'
        });
      }

      return NextResponse.json(
        { success: false, error: error.message, code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Avatar URL: Signed URL created successfully');

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

  } catch (error: any) {
    console.error('💥 Avatar URL: Unexpected error:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      stack: error?.stack?.substring(0, 500)
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Internal server error',
        code: error?.code ?? 'INTERNAL_ERROR'
      },
      { status: error?.status ?? 500 }
    );
  }
}

// Delete avatar file from storage
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Avatar DELETE: Starting request processing...');

    // 1. Tenant resolution
    const authz = await requireTenant({ request });
    if (!authz.ok) {
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    const url = new URL(request.url);
    const path = url.searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Missing path parameter', code: 'MISSING_PATH' },
        { status: 400 }
      );
    }

    // 2. Build storage path using tenant ID
    const objectPath = `${authz.tenantId}/${path}`;
    console.log('📂 Avatar DELETE: Storage path:', objectPath);

    // 3. Delete file from storage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from('avatars')
      .remove([objectPath]);

    if (error) {
      console.log('❌ Avatar DELETE: Storage error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Avatar DELETE: File deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('💥 Avatar DELETE: Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}