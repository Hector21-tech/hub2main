import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Test database connection first
    await prisma.$connect()
    console.log('Database connection established')

    // Create tables manually using raw SQL since we can't run shell commands in Vercel
    console.log('Creating database tables...')

    // Create enums first
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantRole') THEN
          CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'SCOUT', 'VIEWER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Priority') THEN
          CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
          CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrialStatus') THEN
          CREATE TYPE "TrialStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventType') THEN
          CREATE TYPE "EventType" AS ENUM ('TRIAL', 'MEETING', 'MATCH', 'TRAINING', 'SCOUTING', 'OTHER');
        END IF;
      END $$;
    `

    // Create tenants table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "logoUrl" TEXT,
        "settings" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "tenants_slug_key" UNIQUE ("slug")
      );
    `

    // Create users table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "firstName" TEXT,
        "lastName" TEXT,
        "avatarUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_key" UNIQUE ("email")
      );
    `

    // Create tenant_memberships table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "tenant_memberships" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" "TenantRole" NOT NULL DEFAULT 'VIEWER',
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "tenant_memberships_tenantId_userId_key" UNIQUE ("tenantId", "userId"),
        CONSTRAINT "tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "tenant_memberships_tenantId_idx" ON "tenant_memberships"("tenantId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "tenant_memberships_userId_idx" ON "tenant_memberships"("userId");`

    // Create players table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "players" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "dateOfBirth" TIMESTAMP(3),
        "position" TEXT,
        "club" TEXT,
        "nationality" TEXT,
        "height" INTEGER,
        "notes" TEXT,
        "tags" TEXT[],
        "rating" DOUBLE PRECISION,
        "avatarUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "players_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "players_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `

    // Add avatarUrl column if it doesn't exist (for existing tables)
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'players'
          AND column_name = 'avatarUrl'
        ) THEN
          ALTER TABLE "players" ADD COLUMN "avatarUrl" TEXT;
        END IF;
      END $$;
    `

    // Add contractExpiry column if it doesn't exist (for existing tables)
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'players'
          AND column_name = 'contractExpiry'
        ) THEN
          ALTER TABLE "players" ADD COLUMN "contractExpiry" TIMESTAMP(3);
        END IF;
      END $$;
    `

    // Create requests table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "requests" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "club" TEXT NOT NULL,
        "position" TEXT,
        "ageRange" TEXT,
        "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
        "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
        "budget" DOUBLE PRECISION,
        "deadline" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `

    // Create trials table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "trials" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "playerId" TEXT NOT NULL,
        "requestId" TEXT,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "location" TEXT,
        "status" "TrialStatus" NOT NULL DEFAULT 'SCHEDULED',
        "notes" TEXT,
        "rating" DOUBLE PRECISION,
        "feedback" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trials_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "trials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "trials_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "trials_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `

    // Create calendar_events table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "calendar_events" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "location" TEXT,
        "type" "EventType" NOT NULL DEFAULT 'OTHER',
        "isAllDay" BOOLEAN NOT NULL DEFAULT false,
        "recurrence" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "calendar_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `

    // 🗓️ ADD TRIAL INTEGRATION: Add trialId column to calendar_events
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'calendar_events'
          AND column_name = 'trialId'
        ) THEN
          ALTER TABLE "calendar_events" ADD COLUMN "trialId" TEXT;
          ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_trialId_key" UNIQUE ("trialId");
          ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `

    // Create additional indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "players_tenantId_idx" ON "players"("tenantId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "players_tenantId_lastName_idx" ON "players"("tenantId", "lastName");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "requests_tenantId_idx" ON "requests"("tenantId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "requests_tenantId_status_idx" ON "requests"("tenantId", "status");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "trials_tenantId_idx" ON "trials"("tenantId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "trials_tenantId_scheduledAt_idx" ON "trials"("tenantId", "scheduledAt");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "trials_playerId_idx" ON "trials"("playerId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "calendar_events_tenantId_idx" ON "calendar_events"("tenantId");`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "calendar_events_tenantId_startTime_idx" ON "calendar_events"("tenantId", "startTime");`

    // Verify tables were created
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    console.log('Tables created:', tables)

    return Response.json({
      success: true,
      message: 'Database migration completed successfully',
      tables: tables
    })
  } catch (error) {
    console.error('Migration error:', error)

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

    // Check if tables exist by querying system tables
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `

    return Response.json({
      success: true,
      tables,
      message: 'Database connection successful'
    })
  } catch (error) {
    console.error('Database check error:', error)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}