/**
 * 🗄️ DATABASE SCHEMA MAPPER
 *
 * Analyzes and maps all database tables for tenant isolation monitoring
 * Based on Scout Hub 2 Prisma schema analysis
 */

export interface TableInfo {
  name: string
  hasTenantId: boolean
  primaryKey: string
  tenantField?: string
  description: string
  relationshipType: 'tenant-scoped' | 'tenant-agnostic' | 'junction'
}

export interface SchemaMap {
  tables: TableInfo[]
  tenantAwareTables: string[]
  tenantAgnosticTables: string[]
  junctionTables: string[]
  summary: {
    totalTables: number
    tenantAwareCount: number
    tenantAgnosticCount: number
    junctionCount: number
  }
}

/**
 * Complete mapping of Scout Hub 2 database schema
 * Based on actual Prisma schema analysis
 */
export const SCOUT_HUB_SCHEMA: TableInfo[] = [
  {
    name: 'tenants',
    hasTenantId: false,
    primaryKey: 'id',
    description: 'Organization/tenant definitions - root entity',
    relationshipType: 'tenant-agnostic'
  },
  {
    name: 'users',
    hasTenantId: false,
    primaryKey: 'id',
    description: 'Global user accounts - can belong to multiple tenants',
    relationshipType: 'tenant-agnostic'
  },
  {
    name: 'tenant_memberships',
    hasTenantId: true,
    primaryKey: 'id',
    tenantField: 'tenantId',
    description: 'User-tenant relationships with roles',
    relationshipType: 'junction'
  },
  {
    name: 'players',
    hasTenantId: true,
    primaryKey: 'id',
    tenantField: 'tenantId',
    description: 'Player database - fully tenant-scoped',
    relationshipType: 'tenant-scoped'
  },
  {
    name: 'requests',
    hasTenantId: true,
    primaryKey: 'id',
    tenantField: 'tenantId',
    description: 'Scout requests from clubs - tenant-scoped',
    relationshipType: 'tenant-scoped'
  },
  {
    name: 'trials',
    hasTenantId: true,
    primaryKey: 'id',
    tenantField: 'tenantId',
    description: 'Trial sessions and evaluations - tenant-scoped',
    relationshipType: 'tenant-scoped'
  },
  {
    name: 'calendar_events',
    hasTenantId: true,
    primaryKey: 'id',
    tenantField: 'tenantId',
    description: 'Calendar events and scheduling - tenant-scoped',
    relationshipType: 'tenant-scoped'
  }
]

/**
 * Generate complete schema mapping with categorization
 */
export function generateSchemaMap(): SchemaMap {
  const tenantAwareTables = SCOUT_HUB_SCHEMA
    .filter(table => table.hasTenantId)
    .map(table => table.name)

  const tenantAgnosticTables = SCOUT_HUB_SCHEMA
    .filter(table => !table.hasTenantId)
    .map(table => table.name)

  const junctionTables = SCOUT_HUB_SCHEMA
    .filter(table => table.relationshipType === 'junction')
    .map(table => table.name)

  return {
    tables: SCOUT_HUB_SCHEMA,
    tenantAwareTables,
    tenantAgnosticTables,
    junctionTables,
    summary: {
      totalTables: SCOUT_HUB_SCHEMA.length,
      tenantAwareCount: tenantAwareTables.length,
      tenantAgnosticCount: tenantAgnosticTables.length,
      junctionCount: junctionTables.length
    }
  }
}

/**
 * Check if a table requires tenant filtering
 */
export function requiresTenantFilter(tableName: string): boolean {
  const table = SCOUT_HUB_SCHEMA.find(t => t.name === tableName)
  return table?.hasTenantId ?? false
}

/**
 * Get tenant field name for a table
 */
export function getTenantField(tableName: string): string | null {
  const table = SCOUT_HUB_SCHEMA.find(t => t.name === tableName)
  return table?.tenantField ?? null
}

/**
 * Get table relationship type
 */
export function getTableRelationshipType(tableName: string): string {
  const table = SCOUT_HUB_SCHEMA.find(t => t.name === tableName)
  return table?.relationshipType ?? 'unknown'
}

/**
 * Validate schema consistency
 */
export function validateSchemaConsistency(): {
  valid: boolean
  issues: string[]
  warnings: string[]
} {
  const issues: string[] = []
  const warnings: string[] = []

  // Check for tables with tenantId but no proper categorization
  SCOUT_HUB_SCHEMA.forEach(table => {
    if (table.hasTenantId && !table.tenantField) {
      issues.push(`Table ${table.name} has tenantId but no tenantField specified`)
    }

    if (table.hasTenantId && table.relationshipType === 'tenant-agnostic') {
      issues.push(`Table ${table.name} has tenantId but marked as tenant-agnostic`)
    }

    if (!table.hasTenantId && table.relationshipType === 'tenant-scoped') {
      issues.push(`Table ${table.name} marked as tenant-scoped but has no tenantId`)
    }
  })

  // Verify expected tenant-scoped tables exist
  const expectedTenantTables = ['players', 'requests', 'trials', 'calendar_events']
  expectedTenantTables.forEach(tableName => {
    const table = SCOUT_HUB_SCHEMA.find(t => t.name === tableName)
    if (!table) {
      issues.push(`Expected tenant-scoped table ${tableName} not found in schema`)
    } else if (!table.hasTenantId) {
      issues.push(`Expected tenant-scoped table ${tableName} missing tenantId`)
    }
  })

  return {
    valid: issues.length === 0,
    issues,
    warnings
  }
}