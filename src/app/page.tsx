import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Scout Hub 2
          </h1>
          <p className="text-slate-300">
            Enterprise-grade multi-tenant scouting platform
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-4">
              Getting Started
            </h2>
            <p className="text-slate-300 mb-4">
              Access your tenant dashboard or sign in to get started
            </p>
            <Link
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign In
            </Link>
          </div>
          
          <div className="text-center text-sm text-slate-400">
            Multi-tenant architecture with path-based routing: <code>/[tenant]/...</code>
          </div>
        </div>
      </div>
    </div>
  )
}