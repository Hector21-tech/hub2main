import { MainNav } from '@/components/main-nav'
import { UserNav } from '@/components/user-nav'
import { RequestsPage } from '@/modules/requests/components/RequestsPage'

interface RequestsPageProps {
  params: {
    tenant: string
  }
}

export default function Requests({ params }: RequestsPageProps) {
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

      <RequestsPage />
    </div>
  )
}

export const metadata = {
  title: 'Requests | Scout Hub 2',
  description: 'Manage and track scout requests',
}