import { createRemoteJWKSet, jwtVerify } from 'jose'

// Cache JWKS for performance
let jwksCache: any = null
let jwksCacheTime = 0
const JWKS_CACHE_TTL = 3600000 // 1 hour

/**
 * Get JWKS with caching
 */
function getJWKS() {
  const now = Date.now()

  if (!jwksCache || now - jwksCacheTime > JWKS_CACHE_TTL) {
    jwksCache = createRemoteJWKSet(
      new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/jwks`)
    )
    jwksCacheTime = now
  }

  return jwksCache
}

/**
 * Verify Supabase JWT token using JWKS
 * This replaces direct Management API calls which require service role
 */
export async function verifySupabaseToken(token: string) {
  try {
    const JWKS = getJWKS()

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      audience: 'authenticated'
    })

    return {
      success: true,
      payload,
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    }
  } catch (error) {
    console.warn('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error')

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
      payload: null
    }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7)
}

/**
 * Verify request authorization using JWKS
 * Use this instead of calling Supabase Management API
 */
export async function verifyRequestAuth(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return {
      success: false,
      error: 'No authorization token provided',
      user: null
    }
  }

  const verification = await verifySupabaseToken(token)

  if (!verification.success) {
    return {
      success: false,
      error: verification.error,
      user: null
    }
  }

  return {
    success: true,
    error: null,
    user: {
      id: verification.userId,
      email: verification.email,
      role: verification.role,
      payload: verification.payload
    }
  }
}