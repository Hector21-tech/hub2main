/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  // Disable production sourcemaps to reduce bundle size
  productionBrowserSourceMaps: false,
  // Force cache busting for production builds
  generateBuildId: async () => {
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`
  },
  // Ensure proper caching headers and CSP
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? "default-src 'self' https://api.supabase.com http://localhost:8000 https://auth.supabase.io ws://localhost:8000 wss://localhost:8000 https://*.supabase.co wss://*.supabase.co https://*.hcaptcha.com https://cdn-global.configcat.com https://configcat.supabase.com https://*.stripe.com https://*.stripe.network https://www.cloudflare.com https://*.vercel-insights.com https://api.github.com https://raw.githubusercontent.com https://frontend-assets.supabase.com https://*.usercentrics.eu https://ss.supabase.com https://maps.googleapis.com https://ph.supabase.com wss://*.pusher.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://cdnjs.cloudflare.com; connect-src 'self' https://cdnjs.cloudflare.com https://api.supabase.com https://*.supabase.co wss://*.supabase.co https://cdn-global.configcat.com https://*.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io;"
              : "" // No CSP in development
          }
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push('puppeteer-core', '@sparticuz/chromium');
    }
    return config;
  },
}

module.exports = nextConfig