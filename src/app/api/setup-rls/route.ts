import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    await prisma.$connect()
    console.log('Setting up Row Level Security policies...')

    // Enable RLS on all tables (one at a time)
    await prisma.$executeRaw`ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "users" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "players" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "requests" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "trials" ENABLE ROW LEVEL SECURITY`
    await prisma.$executeRaw`ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY`

    // Create secure tenant-based policies

    // Tenants policies - users can only access tenants they're members of
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Tenant access via membership" ON "tenants"`
    await prisma.$executeRaw`CREATE POLICY "Tenant access via membership" ON "tenants" FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_memberships
          WHERE tenant_memberships."tenantId" = tenants.id
          AND tenant_memberships."userId" = auth.uid()
        )
      )`

    // Users policies - users can access their own record and users in their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "User access policy" ON "users"`
    await prisma.$executeRaw`CREATE POLICY "User access policy" ON "users" FOR ALL
      USING (
        id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM tenant_memberships tm1, tenant_memberships tm2
          WHERE tm1."userId" = auth.uid()
          AND tm2."userId" = users.id
          AND tm1."tenantId" = tm2."tenantId"
        )
      )`

    // Tenant memberships policies - users can see memberships for their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Membership access policy" ON "tenant_memberships"`
    await prisma.$executeRaw`CREATE POLICY "Membership access policy" ON "tenant_memberships" FOR ALL
      USING (
        "userId" = auth.uid() OR
        EXISTS (
          SELECT 1 FROM tenant_memberships tm
          WHERE tm."userId" = auth.uid()
          AND tm."tenantId" = tenant_memberships."tenantId"
        )
      )`

    // Players policies - users can only access players in their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Player tenant isolation" ON "players"`
    await prisma.$executeRaw`CREATE POLICY "Player tenant isolation" ON "players" FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_memberships
          WHERE tenant_memberships."tenantId" = players."tenantId"
          AND tenant_memberships."userId" = auth.uid()
        )
      )`

    // Requests policies - users can only access requests in their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Request tenant isolation" ON "requests"`
    await prisma.$executeRaw`CREATE POLICY "Request tenant isolation" ON "requests" FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_memberships
          WHERE tenant_memberships."tenantId" = requests."tenantId"
          AND tenant_memberships."userId" = auth.uid()
        )
      )`

    // Trials policies - users can only access trials in their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Trial tenant isolation" ON "trials"`
    await prisma.$executeRaw`CREATE POLICY "Trial tenant isolation" ON "trials" FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_memberships
          WHERE tenant_memberships."tenantId" = trials."tenantId"
          AND tenant_memberships."userId" = auth.uid()
        )
      )`

    // Calendar events policies - users can only access events in their tenants
    await prisma.$executeRaw`DROP POLICY IF EXISTS "Event tenant isolation" ON "calendar_events"`
    await prisma.$executeRaw`CREATE POLICY "Event tenant isolation" ON "calendar_events" FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_memberships
          WHERE tenant_memberships."tenantId" = calendar_events."tenantId"
          AND tenant_memberships."userId" = auth.uid()
        )
      )`

    console.log('RLS policies created successfully')

    return Response.json({
      success: true,
      message: 'Row Level Security enabled with secure tenant isolation policies.',
      note: 'Production-ready RLS policies implemented using Supabase Auth context for proper multi-tenant security'
    })
  } catch (error) {
    console.error('RLS setup error:', error)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  try {
    await prisma.$connect()

    // Check if RLS is enabled on tables
    const rlsStatus = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'users', 'tenant_memberships', 'players', 'requests', 'trials', 'calendar_events')
      ORDER BY tablename;
    `

    // Get policy information
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `

    return Response.json({
      success: true,
      rlsStatus,
      policies,
      message: 'RLS status retrieved successfully'
    })
  } catch (error) {
    console.error('RLS check error:', error)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}