// src/app/api/players/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireTenant } from "@/lib/server/authz";
import { transformToDatabase, transformDatabasePlayer } from "@/lib/player-utils";

// Force Node.js runtime för better error handling
export const runtime = 'nodejs';

function sbServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );
}

export async function GET(req: Request) {
  try {
    console.log('👤 Players GET: Starting request processing...');

    // 1. Tenant resolution först (slug → ID)
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenant');
    const dryRun = url.searchParams.get('dryRun') === '1';

    console.log('🔍 Players GET: Request params:', {
      tenantSlug,
      dryRun,
      fullUrl: req.url
    });

    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Players GET: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantSlug
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Players GET: Auth successful:', {
      tenantSlug,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id
    });

    // Dry-run mode för testing
    if (dryRun) {
      const dryRunResult = {
        success: true,
        dryRun: true,
        incomingTenant: tenantSlug,
        resolvedTenantId: authz.tenantId,
        userId: authz.user?.id,
        where: { tenantId: authz.tenantId },
        message: 'Dry run successful - no DB query executed'
      };
      console.log('🧪 Players GET: Dry run result:', dryRunResult);
      return NextResponse.json(dryRunResult);
    }

    // 2. Database query med proper error handling
    console.log('🗄️ Players GET: Executing database query...');
    const supabase = sbServer();

    // Query with proper column naming (camelCase for Supabase)

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("tenantId", authz.tenantId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.log('❌ Players GET: Database error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        tenantId: authz.tenantId
      });

      return NextResponse.json(
        { success: false, error: error.message, code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Players GET: Query successful:', {
      playerCount: data?.length || 0,
      tenantId: authz.tenantId
    });

    // 3. Transform database data to frontend format

    let transformedData = [];
    try {
      transformedData = data?.map((player, index) => {
        try {
          return transformDatabasePlayer(player);
        } catch (transformError: any) {
          console.log(`❌ Players GET: Transform error for player ${index}:`, {
            playerId: player?.id,
            error: transformError?.message || 'Unknown error',
            playerData: JSON.stringify(player, null, 2)
          });
          throw transformError;
        }
      }) || [];

      console.log('✅ Players GET: Data transformation successful:', {
        transformedCount: transformedData.length
      });
    } catch (transformError: any) {
      console.log('❌ Players GET: Data transformation failed:', {
        error: transformError?.message || 'Unknown error',
        rawDataSample: data?.[0]
      });

      return NextResponse.json(
        { success: false, error: `Data transformation failed: ${transformError?.message || 'Unknown error'}`, code: 'TRANSFORM_ERROR' },
        { status: 500 }
      );
    }

    const result = {
      success: true,
      data: transformedData,
      meta: {
        count: transformedData.length,
        tenantId: authz.tenantId
      }
    };

    console.log('🎉 Players GET: Success, returning data');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 Players GET: Unexpected error:', {
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

export async function POST(req: Request) {
  try {
    console.log('👤 Players POST: Starting request processing...');

    // 1. Tenant resolution först (slug → ID)
    const url = new URL(req.url);
    const tenantSlug = url.searchParams.get('tenant');
    const dryRun = url.searchParams.get('dryRun') === '1';

    console.log('🔍 Players POST: Request params:', {
      tenantSlug,
      dryRun,
      fullUrl: req.url
    });

    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Players POST: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantSlug
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Players POST: Auth successful:', {
      tenantSlug,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id
    });

    // 2. Parse and validate request body
    const body = await req.json();
    console.log('🔍 Players POST: Raw body received:', {
      keys: Object.keys(body),
      hasFirstName: !!body.firstName,
      hasLastName: !!body.lastName,
      bodySize: JSON.stringify(body).length
    });

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { success: false, error: 'firstName and lastName are required', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    // 3. Transform frontend data to database format
    const cleanData = transformToDatabase(body);
    console.log('🔍 Players POST: Data after transform:', {
      keys: Object.keys(cleanData),
      position: cleanData.position,
      tags: cleanData.tags
    });

    // 4. Explicit payload whitelist - Only allow specific fields
    const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'position', 'club', 'height', 'notes', 'tags', 'rating', 'avatarUrl'];
    const whitelistedData: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (field in cleanData) {
        whitelistedData[field] = (cleanData as any)[field];
      }
    });

    // 5. Final payload with server-side tenant injection
    const payload = { ...whitelistedData, tenantId: authz.tenantId };

    console.log('🔍 Players POST: Final payload:', {
      keys: Object.keys(payload),
      tenantId: payload.tenantId,
      hasId: 'id' in payload,
      hasCreatedAt: 'createdAt' in payload,
      hasUpdatedAt: 'updatedAt' in payload
    });

    // Dry-run mode för testing
    if (dryRun) {
      const dryRunResult = {
        success: true,
        dryRun: true,
        incomingTenant: tenantSlug,
        resolvedTenantId: authz.tenantId,
        userId: authz.user?.id,
        payload,
        message: 'Dry run successful - no DB insert executed'
      };
      console.log('🧪 Players POST: Dry run result:', dryRunResult);
      return NextResponse.json(dryRunResult);
    }

    // 6. Database insert med proper error handling
    console.log('🗄️ Players POST: Executing database insert...');
    const supabase = sbServer();
    const { data, error } = await supabase
      .from("players")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.log('❌ Players POST: Database error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: JSON.stringify(payload, null, 2)
      });

      return NextResponse.json(
        { success: false, error: error.message, code: 'DATABASE_ERROR', details: error.details },
        { status: 500 }
      );
    }

    console.log('✅ Players POST: Insert successful:', {
      playerId: data?.id,
      tenantId: authz.tenantId
    });

    // 7. Transform back to frontend format
    const transformedResult = data ? transformDatabasePlayer(data) : null;

    const result = {
      success: true,
      data: transformedResult,
      meta: {
        tenantId: authz.tenantId,
        playerId: data?.id
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 Players POST: Unexpected error:', {
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

export async function PUT(req: Request) {
  try {
    console.log('✏️ Players PUT: Starting request processing...');

    // 1. Parse query parameters and body
    const url = new URL(req.url);
    const playerId = url.searchParams.get('id');
    const tenantParam = url.searchParams.get('tenantId') || url.searchParams.get('tenant');
    const dryRun = url.searchParams.get('dryRun') === '1';

    console.log('🔍 Players PUT: Request params:', {
      playerId,
      tenantParam,
      dryRun,
      fullUrl: req.url
    });

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required', code: 'MISSING_PLAYER_ID' },
        { status: 400 }
      );
    }

    if (!tenantParam) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter is required', code: 'MISSING_TENANT' },
        { status: 400 }
      );
    }

    // 2. Tenant resolution and authorization
    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Players PUT: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantParam
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Players PUT: Auth successful:', {
      tenantParam,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id,
      playerId
    });

    // 3. Parse and validate request body
    const body = await req.json();
    console.log('🔍 Players PUT: Raw body received:', {
      keys: Object.keys(body),
      hasFirstName: !!body.firstName,
      hasLastName: !!body.lastName,
      bodySize: JSON.stringify(body).length
    });

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { success: false, error: 'firstName and lastName are required', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    // 4. Transform frontend data to database format
    const cleanData = transformToDatabase(body);
    console.log('🔍 Players PUT: Data after transform:', {
      keys: Object.keys(cleanData),
      position: cleanData.position,
      tags: cleanData.tags
    });

    // 5. Explicit payload whitelist - Only allow specific fields (no ID changes)
    const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'position', 'club', 'height', 'notes', 'tags', 'rating', 'avatarUrl', 'avatarPath'];
    const whitelistedData: Record<string, any> = {};
    allowedFields.forEach(field => {
      if (field in cleanData) {
        whitelistedData[field] = (cleanData as any)[field];
      }
    });

    console.log('🔍 Players PUT: Final payload:', {
      keys: Object.keys(whitelistedData),
      hasId: 'id' in whitelistedData,
      hasCreatedAt: 'createdAt' in whitelistedData,
      hasUpdatedAt: 'updatedAt' in whitelistedData
    });

    // Dry-run mode for testing
    if (dryRun) {
      const dryRunResult = {
        success: true,
        dryRun: true,
        playerId,
        tenantParam,
        resolvedTenantId: authz.tenantId,
        userId: authz.user?.id,
        payload: whitelistedData,
        message: 'Dry run successful - no DB update executed'
      };
      console.log('🧪 Players PUT: Dry run result:', dryRunResult);
      return NextResponse.json(dryRunResult);
    }

    // 6. Database update with proper error handling
    console.log('🗄️ Players PUT: Executing database update...');
    const supabase = sbServer();

    // First verify the player exists and belongs to the tenant
    const { data: existingPlayer, error: fetchError } = await supabase
      .from("players")
      .select("id, firstName, lastName, tenantId")
      .eq("id", playerId)
      .eq("tenantId", authz.tenantId)
      .single();

    if (fetchError || !existingPlayer) {
      console.log('❌ Players PUT: Player not found:', {
        playerId,
        tenantId: authz.tenantId,
        fetchError: fetchError?.message
      });

      return NextResponse.json(
        { success: false, error: 'Player not found or access denied', code: 'PLAYER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update the player
    const { data, error: updateError } = await supabase
      .from("players")
      .update(whitelistedData)
      .eq("id", playerId)
      .eq("tenantId", authz.tenantId)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Players PUT: Database error:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        playerId,
        tenantId: authz.tenantId
      });

      return NextResponse.json(
        { success: false, error: updateError.message, code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Players PUT: Update successful:', {
      playerId,
      playerName: `${data.firstName} ${data.lastName}`,
      tenantId: authz.tenantId
    });

    // 7. Transform back to frontend format
    const transformedResult = data ? transformDatabasePlayer(data) : null;

    const result = {
      success: true,
      data: transformedResult,
      meta: {
        tenantId: authz.tenantId,
        playerId: data?.id,
        updatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 Players PUT: Unexpected error:', {
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

export async function DELETE(req: Request) {
  try {
    console.log('🗑️ Players DELETE: Starting request processing...');

    // 1. Parse query parameters
    const url = new URL(req.url);
    const playerId = url.searchParams.get('id');
    const tenantParam = url.searchParams.get('tenantId') || url.searchParams.get('tenant');
    const dryRun = url.searchParams.get('dryRun') === '1';

    console.log('🔍 Players DELETE: Request params:', {
      playerId,
      tenantParam,
      dryRun,
      fullUrl: req.url
    });

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required', code: 'MISSING_PLAYER_ID' },
        { status: 400 }
      );
    }

    if (!tenantParam) {
      return NextResponse.json(
        { success: false, error: 'Tenant parameter is required', code: 'MISSING_TENANT' },
        { status: 400 }
      );
    }

    // 2. Tenant resolution and authorization
    const authz = await requireTenant({ request: req });
    if (!authz.ok) {
      console.log('❌ Players DELETE: Auth failed:', {
        status: authz.status,
        message: authz.message,
        tenantParam
      });
      return NextResponse.json(
        { success: false, error: authz.message, code: 'AUTH_FAILED' },
        { status: authz.status }
      );
    }

    console.log('✅ Players DELETE: Auth successful:', {
      tenantParam,
      resolvedTenantId: authz.tenantId,
      userId: authz.user?.id,
      playerId
    });

    // Dry-run mode for testing
    if (dryRun) {
      const dryRunResult = {
        success: true,
        dryRun: true,
        playerId,
        tenantParam,
        resolvedTenantId: authz.tenantId,
        userId: authz.user?.id,
        message: 'Dry run successful - no DB delete executed'
      };
      console.log('🧪 Players DELETE: Dry run result:', dryRunResult);
      return NextResponse.json(dryRunResult);
    }

    // 3. Database delete with proper error handling
    console.log('🗄️ Players DELETE: Executing database delete...');
    const supabase = sbServer();

    // First verify the player exists and belongs to the tenant
    const { data: existingPlayer, error: fetchError } = await supabase
      .from("players")
      .select("id, firstName, lastName, tenantId")
      .eq("id", playerId)
      .eq("tenantId", authz.tenantId)
      .single();

    if (fetchError || !existingPlayer) {
      console.log('❌ Players DELETE: Player not found:', {
        playerId,
        tenantId: authz.tenantId,
        fetchError: fetchError?.message
      });

      return NextResponse.json(
        { success: false, error: 'Player not found or access denied', code: 'PLAYER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the player
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId)
      .eq("tenantId", authz.tenantId);

    if (deleteError) {
      console.log('❌ Players DELETE: Database error:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
        playerId,
        tenantId: authz.tenantId
      });

      return NextResponse.json(
        { success: false, error: deleteError.message, code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    console.log('✅ Players DELETE: Delete successful:', {
      playerId,
      playerName: `${existingPlayer.firstName} ${existingPlayer.lastName}`,
      tenantId: authz.tenantId
    });

    const result = {
      success: true,
      data: {
        id: playerId,
        name: `${existingPlayer.firstName} ${existingPlayer.lastName}`
      },
      meta: {
        tenantId: authz.tenantId,
        deletedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 Players DELETE: Unexpected error:', {
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