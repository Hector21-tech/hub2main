// src/lib/server/authz.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { resolveTenantId, validateTenantMembership } from "@/lib/tenant-resolver";

type Ok =
  | { ok: true; user: any; tenantId: string; tenantSlug?: string }
  | { ok: false; status: 401 | 403 | 404 | 500; message: string };

export async function requireTenant(ctx: { request: Request }): Promise<Ok> {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  console.log('🔍 requireTenant: Auth check', {
    hasUser: !!user,
    userId: user?.id,
    authError: authErr?.message
  });

  if (authErr || !user) {
    console.log('❌ requireTenant: Auth failed', authErr);
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const url = new URL(ctx.request.url);
  const tenantSlug = url.searchParams.get("tenant") ?? undefined;

  console.log('🔍 requireTenant: Request info', {
    url: url.href,
    tenantSlug,
    userId: user.id
  });

  // Step 1: Hämta memberships för user (camelCase schema)
  const { data: memberships, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("tenantId, userId")
    .eq("userId", user.id);

  console.log('🔍 requireTenant: Membership query result', {
    memberships,
    error: mErr?.message,
    errorCode: mErr?.code,
    errorDetails: mErr?.details
  });

  if (mErr) {
    console.log('❌ requireTenant: Membership lookup failed', mErr);
    return { ok: false, status: 500, message: `Membership lookup failed: ${mErr.message}` };
  }

  if (!memberships?.length) {
    console.log('❌ requireTenant: No memberships found for user', user.id);
    return { ok: false, status: 403, message: "No tenant memberships" };
  }

  let tenantId: string | undefined;

  // Extract tenantIds från memberships
  const memberTenantIds = memberships.map((m: any) => m.tenantId);
  console.log('🔍 requireTenant: Found memberships', {
    membershipCount: memberships.length,
    memberTenantIds,
    requestedSlug: tenantSlug
  });

  if (tenantSlug) {
    // Step 2: Slå upp tenant by slug och validera membership
    const { data: tenantData, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", tenantSlug)
      .single();

    console.log('🔍 requireTenant: Tenant slug lookup', {
      requestedSlug: tenantSlug,
      foundTenant: tenantData,
      error: tenantErr?.message
    });

    if (tenantErr || !tenantData) {
      console.log('❌ requireTenant: Tenant lookup failed completely', {
        requestedSlug: tenantSlug,
        error: tenantErr?.message,
        errorCode: tenantErr?.code,
        errorDetails: tenantErr?.details,
        foundData: tenantData
      });
      return { ok: false, status: 404, message: `Tenant slug '${tenantSlug}' not found: ${tenantErr?.message || 'No data'}` };
    }

    // Validera att user är medlem i denna tenant
    if (!memberTenantIds.includes(tenantData.id)) {
      console.log('❌ requireTenant: User not member of requested tenant', {
        userId: user.id,
        requestedTenantId: tenantData.id,
        requestedSlug: tenantSlug,
        userTenantIds: memberTenantIds
      });
      return { ok: false, status: 403, message: `Access denied to tenant '${tenantSlug}'` };
    }

    tenantId = tenantData.id;
    console.log('✅ requireTenant: Slug-based lookup success', {
      slug: tenantSlug,
      tenantId,
      tenantName: tenantData.name
    });
  } else {
    // Fallback: första membership (inget tenant specificerat)
    tenantId = memberTenantIds[0];
    console.log('🔍 requireTenant: Using first membership as fallback', {
      selectedTenantId: tenantId,
      availableTenantIds: memberTenantIds
    });
  }

  if (!tenantId) {
    console.log('❌ requireTenant: Could not resolve tenant ID', {
      tenantSlug,
      memberships: memberships.length
    });
    return { ok: false, status: 401, message: "Access denied to tenant" };
  }

  console.log('✅ requireTenant: Success', {
    tenantId,
    tenantSlug,
    userId: user.id
  });

  return { ok: true, user, tenantId, tenantSlug };
}