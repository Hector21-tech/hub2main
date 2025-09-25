// src/app/api/media/avatar-proxy/route.ts
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/server/authz";
import { createClient } from "@supabase/supabase-js";

// Force Node.js runtime för better error handling
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    console.log('🖼️ Avatar proxy: Starting request processing...');

    // 1. Tenant resolution
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenant');
    const path = url.searchParams.get("path");

    console.log('🔍 Avatar proxy: Request params:', {
      tenantSlug,
      path,
      fullUrl: req.url
    });

    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Avatar proxy: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantSlug
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Avatar proxy: Auth successful:', {
      tenantSlug,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id
    });

    // 2. Validate path parameter
    if (!path) {
      return NextResponse.json(
        { success: false, error: "Missing path parameter", code: 'MISSING_PATH' },
        { status: 400 }
      );
    }

    // 3. Build storage path using tenant ID (not slug)
    const objectPath = `${authz.tenantId}/${path}`;
    console.log('📂 Avatar proxy: Storage path:', objectPath);

    // 4. Get signed URL from Supabase storage
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: signed, error } = await sb.storage
      .from("avatars")
      .createSignedUrl(objectPath, 60);

    if (error) {
      console.log('❌ Avatar proxy: Storage error:', {
        message: error.message,
        objectPath,
        bucket: 'avatars'
      });

      return NextResponse.json(
        { success: false, error: error.message, code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Avatar proxy: Signed URL created, fetching image...');

    // 5. Proxy the image
    const r = await fetch(signed.signedUrl);
    if (!r.ok) {
      console.log('❌ Avatar proxy: Upstream fetch failed:', {
        status: r.status,
        statusText: r.statusText,
        signedUrl: signed.signedUrl.substring(0, 100) + '...'
      });

      return NextResponse.json(
        { success: false, error: `Upstream ${r.status}: ${r.statusText}`, code: 'UPSTREAM_ERROR' },
        { status: 502 }
      );
    }

    console.log('✅ Avatar proxy: Image fetched successfully');

    return new NextResponse(r.body, {
      headers: {
        "Content-Type": r.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=60",
      },
    });

  } catch (error: any) {
    console.error('💥 Avatar proxy: Unexpected error:', {
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