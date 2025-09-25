import { MainNav } from '@/components/main-nav'
import { UserNav } from '@/components/user-nav'
import { TrialsPage } from '@/modules/trials/components/TrialsPage'

interface TrialsPageProps {
  params: {
    tenant: string
  }
}

export default function Trials({ params }: TrialsPageProps) {
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

      <TrialsPage />
    </div>
  )
}

export const metadata = {
  title: 'Trials | Scout Hub 2',
  description: 'Manage player trials and evaluations',
}