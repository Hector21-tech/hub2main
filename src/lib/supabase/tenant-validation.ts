import { createClient } from '@/lib/supabase/server'
import { normalizeTenantSlug, createSafeLogData } from '@/lib/security/input-hygiene'

export interface TenantValidationResult {
  tenantId: string
  tenantSlug: string
  userId: string
  userRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SCOUT' | 'VIEWER'
  success: true
}

export interface TenantValidationError {
  success: false
  reason: 'tenant_missing' | 'tenant_not_found' | 'not_member' | 'insufficient_role' | 'db_error' | 'unauthenticated'
  message: string
  httpStatus: 400 | 401 | 403 | 404 | 500
}

/**
 * Validates that a user has ADMIN or OWNER access to a tenant via Supabase RLS
 *
 * @param tenantSlug - The tenant slug from URL parameter
 * @returns Promise<TenantValidationResult | TenantValidationError>
 */
export async function validateSupabaseTenantAccess(
  tenantSlug: string | null
): Promise<TenantValidationResult | TenantValidationError> {

  // 🛡️ ENTERPRISE SECURITY: Normalize and validate tenant slug
  const normalizedSlug = normalizeTenantSlug(tenantSlug)

  if (!normalizedSlug) {
    return {
      success: false,
      reason: 'tenant_missing',
      message: 'Valid tenant slug parameter is required',
      httpStatus: 400
    }
  }

  try {
    const supabase = createClient()

    // Get current user from Supabase session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        reason: 'unauthenticated',
        message: 'User not authenticated',
        httpStatus: 401
      }
    }

    console.log('🔍 Supabase Tenant Validation: Starting for user:', user.id, 'tenant:', normalizedSlug)

    // Step 1: Look up tenant by normalized slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', normalizedSlug)
      .single()

    if (tenantError || !tenant) {
      console.log('❌ Tenant not found:', normalizedSlug, createSafeLogData(tenantError))
      return {
        success: false,
        reason: 'tenant_not_found',
        message: `Tenant not found`,
        httpStatus: 404
      }
    }

    console.log('✅ Tenant found:', tenant.id, tenant.name)

    // Step 2: Check if user is member with ADMIN or OWNER role
    const { data: membership, error: memberError } = await supabase
      .from('tenant_memberships')
      .select('tenantId, role')
      .eq('tenantId', tenant.id)
      .eq('userId', user.id)
      .single()

    if (memberError || !membership) {
      console.log('❌ User not member of tenant:', user.id, tenant.id, memberError?.message)
      return {
        success: false,
        reason: 'not_member',
        message: `User is not a member of tenant '${tenantSlug}'`,
        httpStatus: 403
      }
    }

    // Step 3: Verify user has sufficient role (ADMIN or OWNER)
    const allowedRoles = ['ADMIN', 'OWNER']
    if (!allowedRoles.includes(membership.role)) {
      console.log('❌ Insufficient role:', membership.role, 'Required:', allowedRoles)
      return {
        success: false,
        reason: 'insufficient_role',
        message: `User role '${membership.role}' insufficient. Required: ADMIN or OWNER`,
        httpStatus: 403
      }
    }

    console.log('✅ Supabase Tenant Validation: Success for', user.id, 'in', tenant.id, 'as', membership.role)

    return {
      success: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      userRole: membership.role as 'OWNER' | 'ADMIN' | 'MANAGER' | 'SCOUT' | 'VIEWER'
    }

  } catch (error) {
    console.error('❌ Supabase Tenant Validation: Database error:', error)
    return {
      success: false,
      reason: 'db_error',
      message: error instanceof Error ? error.message : 'Database connection error',
      httpStatus: 500
    }
  }
}

/**
 * Creates a Supabase client with tenant context for data operations
 * Call this after successful tenant validation
 */
export function createTenantSupabaseClient() {
  return createClient()
}