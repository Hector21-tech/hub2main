import { ReactNode } from 'react'
import { TenantProvider } from '@/lib/tenant-context'
import { ThemeProvider } from '@/lib/theme-provider'
import '../globals.css'

interface TenantLayoutProps {
  children: ReactNode
  params: { tenant: string }
}

export default function TenantLayout({ children, params }: TenantLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TenantProvider tenantId={params.tenant}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </TenantProvider>
    </ThemeProvider>
  )
}