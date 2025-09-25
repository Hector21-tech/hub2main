/**
 * Environment Configuration
 * Handles production vs development differences
 */

export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // ConfigCat configuration
  configCat: {
    userEmail: process.env.CONFIGCAT_USER_EMAIL || null,
    // Create user context for ConfigCat when available
    getUserContext: () => {
      return ENV_CONFIG.configCat.userEmail
        ? { email: ENV_CONFIG.configCat.userEmail }
        : undefined
    }
  },

  // External services configuration
  externalServices: {
    // Only load Usercentrics in production
    shouldLoadUsercentrics: process.env.NODE_ENV === 'production',

    // Graceful handling of blocked external services
    handleExternalServiceError: (serviceName: string, error: any) => {
      if (ENV_CONFIG.isDevelopment) {
        console.warn(`[DEV] External service ${serviceName} failed:`, error.message)
      }
      // In production, fail silently for blocked services (ad-blockers etc.)
    }
  },

  // Security configuration
  security: {
    // Strict CSP only in production
    strictCSP: process.env.NODE_ENV === 'production',

    // Allow additional debugging in development
    allowDebugHeaders: process.env.NODE_ENV === 'development'
  }
}

/**
 * Conditional import wrapper for production-only features
 */
export async function loadProductionFeature<T>(
  featureName: string,
  importFn: () => Promise<T>
): Promise<T | null> {
  if (!ENV_CONFIG.isProduction) {
    return null
  }

  try {
    return await importFn()
  } catch (error) {
    ENV_CONFIG.externalServices.handleExternalServiceError(featureName, error)
    return null
  }
}

/**
 * Safe wrapper for external service initialization
 */
export function initExternalService(
  serviceName: string,
  initFn: () => void,
  productionOnly: boolean = true
) {
  if (productionOnly && !ENV_CONFIG.isProduction) {
    return
  }

  try {
    initFn()
  } catch (error) {
    ENV_CONFIG.externalServices.handleExternalServiceError(serviceName, error)
  }
}