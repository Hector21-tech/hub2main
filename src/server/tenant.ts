// src/server/tenant.ts
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Logger, createLogContext } from '@/lib/logger'

/**
 * Server-side tenant resolution utility
 * Normalizes tenant slug to tenant ID with caching and validation
 */

interface TenantResolution {
  success: boolean
  tenantId: string | null
  tenantSlug: string | null
  userId: string | null
  error?: string
}

/**
 * Resolve tenant slug to tenant ID on server side
 * Handles both middleware and API route contexts
 */
export async function resolveTenantId(
  request: NextRequest | { params?: { tenant?: string } },
  tenantSlugOverride?: string
): Promise<TenantResolution> {
  const timer = Logger.timer()
  let tenantSlug: string | null = null
  let baseContext: any = {}

  try {
    // Extract tenant slug from different contexts
    if (tenantSlugOverride) {
      tenantSlug = tenantSlugOverride
    } else if ('nextUrl' in request) {
      // NextRequest (middleware context)
      tenantSlug = request.nextUrl.searchParams.get('tenant') ||
                   request.nextUrl.pathname.split('/')[1] || null
      baseContext = createLogContext(request)
    } else if (request.params?.tenant) {
      // API route context
      tenantSlug = request.params.tenant
    }

    if (!tenantSlug) {
      const duration = timer.end()
      Logger.warn('Tenant slug not found in request', {
        ...baseContext,
        duration,
        details: { context: 'server-tenant-resolution' }
      })
      return {
        success: false,
        tenantId: null,
        tenantSlug: null,
        userId: null,
        error: 'Tenant slug not provided'
      }
    }

    // Create Supabase client for server-side operations
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Server-side cookie setting (for auth refresh)
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = timer.end()
      Logger.warn('User not authenticated for tenant resolution', {
        ...baseContext,
        tenant: tenantSlug,
        duration,
        details: { authError: authError?.message }
      })
      return {
        success: false,
        tenantId: null,
        tenantSlug,
        userId: null,
        error: 'User not authenticated'
      }
    }

    // Resolve tenant slug to ID with membership validation
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_memberships')
      .select(`
        tenantId,
        role,
        tenants!inner (
          id,
          slug,
          name
        )
      `)
      .eq('userId', user.id)
      .eq('tenants.slug', tenantSlug)
      .single()

    if (membershipError || !membership) {
      const duration = timer.end()
      Logger.security('Tenant access denied - invalid membership', {
        ...baseContext,
        tenant: tenantSlug,
        userId: user.id,
        duration,
        details: {
          membershipError: membershipError?.message,
          context: 'server-tenant-resolution'
        }
      })
      return {
        success: false,
        tenantId: null,
        tenantSlug,
        userId: user.id,
        error: 'Access denied to tenant'
      }
    }

    const duration = timer.end()
    Logger.info('Tenant resolved successfully', {
      ...baseContext,
      tenant: tenantSlug,
      userId: user.id,
      duration,
      details: {
        tenantId: membership.tenantId,
        role: membership.role,
        context: 'server-tenant-resolution'
      }
    })

    return {
      success: true,
      tenantId: membership.tenantId,
      tenantSlug,
      userId: user.id
    }

  } catch (error) {
    const duration = timer.end()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    Logger.error('Tenant resolution error', {
      ...baseContext,
      tenant: tenantSlug || 'unknown',
      duration,
      error: errorMessage,
      details: { context: 'server-tenant-resolution' }
    })

    return {
      success: false,
      tenantId: null,
      tenantSlug,
      userId: null,
      error: 'Internal server error'
    }
  }
}

/**
 * Lightweight tenant slug validation (no DB lookup)
 * For use in middleware where we just need basic validation
 */
export function validateTenantSlug(slug: string | null): boolean {
  if (!slug) return false

  // Basic slug validation: 3-63 chars, alphanumeric + hyphens
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 63
}

/**
 * Extract tenant slug from various request contexts
 */
export function extractTenantSlug(request: NextRequest): string | null {
  // Try query parameter first
  const queryTenant = request.nextUrl.searchParams.get('tenant')
  if (queryTenant) return queryTenant

  // Try path parameter
  const pathSegments = request.nextUrl.pathname.split('/')
  const pathTenant = pathSegments[1]
  if (pathTenant && pathTenant !== 'api' && pathTenant !== '_next') {
    return pathTenant
  }

  return null
}