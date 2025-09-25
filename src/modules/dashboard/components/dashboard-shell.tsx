import { ReactNode } from 'react'

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 bg-gradient-to-br from-[#020617] via-[#0c1532] via-[#1e3a8a] via-[#0f1b3e] to-[#020510] relative">
      {/* Ultra-deep ocean effect with radial gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/50 to-transparent pointer-events-none"></div>
      <div className="relative space-y-4 p-8 pt-6">
        {children}
      </div>
    </div>
  )
}