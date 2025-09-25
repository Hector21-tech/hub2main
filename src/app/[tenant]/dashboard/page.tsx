import { MainNav } from '@/components/main-nav'
import { UserNav } from '@/components/user-nav'
import { DashboardShell } from '@/modules/dashboard/components/dashboard-shell'
import { DashboardHeader } from '@/modules/dashboard/components/dashboard-header'
import { DashboardContent } from '@/modules/dashboard/components/dashboard-content'
import { TestDataManager } from '@/modules/dashboard/components/TestDataManager'
import ErrorBoundary, { DashboardErrorFallback } from '@/components/ErrorBoundary'

interface DashboardPageProps {
  params: { tenant: string }
}

export default function DashboardPage({ params }: DashboardPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex h-16 items-center px-4">
          <MainNav tenant={params.tenant} />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>

      <DashboardShell>
        <ErrorBoundary fallback={DashboardErrorFallback}>
          <DashboardHeader
            heading="Dashboard"
            text="Overview of your scouting activities and key metrics"
          >
            <ErrorBoundary>
              <TestDataManager />
            </ErrorBoundary>
          </DashboardHeader>
          <DashboardContent tenant={params.tenant} />
        </ErrorBoundary>
      </DashboardShell>
    </div>
  )
}