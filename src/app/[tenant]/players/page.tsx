import { MainNav } from '@/components/main-nav'
import { UserNav } from '@/components/user-nav'
import { PlayersPage } from '@/modules/players/components/PlayersPage'

interface PlayersPageProps {
  params: {
    tenant: string
  }
}

export default function Players({ params }: PlayersPageProps) {
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

      <PlayersPage />
    </div>
  )
}

export const metadata = {
  title: 'Players | Scout Hub 2',
  description: 'Manage and view your scouted players',
}