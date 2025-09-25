import { redirect } from 'next/navigation'

interface TenantRootPageProps {
  params: { tenant: string }
}

export default function TenantRootPage({ params }: TenantRootPageProps) {
  // Redirect tenant root to dashboard
  redirect(`/${params.tenant}/dashboard`)
}