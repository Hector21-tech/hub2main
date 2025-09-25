// src/app/api/media/avatar-upload/route.ts
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/server/authz";
import { createClient } from "@supabase/supabase-js";

// Force Node.js runtime (not Edge) för större body limits och better error handling
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    console.log('🖼️ Avatar upload: Starting request processing...');

    // 1. Tenant resolution först (slug → ID)
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenant');
    console.log('🔍 Avatar upload: Incoming tenant slug:', tenantSlug);

    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Avatar upload: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantSlug
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Avatar upload: Auth successful:', {
      tenantSlug,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id
    });

    // 2. Form data validation
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const playerId = form.get("playerId") as string | null;

    console.log('🔍 Avatar upload: Form data received:', {
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
      fileName: file?.name,
      playerId
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided", code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: "No playerId provided", code: 'MISSING_PLAYER_ID' },
        { status: 400 }
      );
    }

    // 3. File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB (höjd från 5MB)

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only JPEG, PNG, WebP allowed.", code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 10MB allowed.", code: 'FILE_TOO_LARGE' },
        { status: 413 }
      );
    }

    // 4. Supabase storage upload med service role
    console.log('📂 Avatar upload: Initializing Supabase client...');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Använd tenant ID (inte slug) för storage path
    const timestamp = Date.now();
    const path = `${authz.tenantId}/players/${playerId}-${timestamp}.jpg`;
    console.log('📂 Avatar upload: Upload path:', path);

    const { error: uploadError } = await sb.storage
      .from("avatars")
      .upload(path, await file.arrayBuffer(), {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.log('❌ Avatar upload: Storage error:', {
        message: uploadError.message,
        error: uploadError,
        path,
        bucket: 'avatars'
      });

      return NextResponse.json(
        { success: false, error: uploadError.message, code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    // 5. Generate signed URL for immediate access
    const { data: signedData, error: signedError } = await sb.storage
      .from("avatars")
      .createSignedUrl(path, 3600); // 1 hour

    if (signedError) {
      console.log('⚠️ Avatar upload: Could not create signed URL:', signedError.message);
    }

    const result = {
      success: true,
      path: `players/${playerId}-${timestamp}.jpg`,
      signedUrl: signedData?.signedUrl || null,
      tenantId: authz.tenantId
    };

    // 6. Update player record with new avatar path (only for existing players)
    const isTemporaryPlayer = playerId.startsWith('temp-');

    if (isTemporaryPlayer) {
      console.log('🆕 Avatar upload: Temporary player ID detected, skipping player record update');
      console.log('📋 Avatar upload: File uploaded successfully for new player creation');
    } else {
      console.log('🗄️ Avatar upload: Updating existing player record...');
      const { error: updateError } = await sb
        .from("players")
        .update({
          avatarPath: `players/${playerId}-${timestamp}.jpg`,
          avatarUrl: signedData?.signedUrl || null  // Legacy fallback
        })
        .eq("id", playerId)
        .eq("tenantId", authz.tenantId);

      if (updateError) {
        console.log('❌ Avatar upload: Failed to update player record:', {
          message: updateError.message,
          error: updateError,
          playerId,
          tenantId: authz.tenantId
        });

        // Avatar uploaded but player record update failed
        return NextResponse.json(
          {
            success: false,
            error: `Avatar uploaded but failed to update player record: ${updateError.message}`,
            code: 'UPDATE_PLAYER_FAILED',
            details: { uploadedPath: path }
          },
          { status: 500 }
        );
      }

      console.log('✅ Avatar upload: Player record updated successfully');
    }

    console.log('✅ Avatar upload: Success:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 Avatar upload: Unexpected error:', {
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