'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const CustomFallback = this.props.fallback

      if (CustomFallback) {
        return <CustomFallback error={this.state.error} retry={this.retry} />
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-white/5 via-white/2 to-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-white mb-3">
              Something went wrong
            </h2>

            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              A rendering error occurred. This usually happens due to infinite re-renders or component state issues.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 rounded-lg border border-red-400/20 text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.retry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Custom fallback components
export function DashboardErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <div className="p-6 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          Dashboard Error
        </h3>

        <p className="text-white/70 mb-4 text-sm">
          Unable to load dashboard components. Please try refreshing.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-3 bg-red-500/10 rounded border border-red-400/20">
            <p className="text-red-300 text-xs font-mono text-left">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={retry}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  )
}