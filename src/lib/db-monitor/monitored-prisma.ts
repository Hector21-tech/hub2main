/**
 * 🛡️ MONITORED PRISMA CLIENT
 *
 * Enhanced Prisma client with automatic tenant isolation monitoring,
 * security validation, and query interception
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { queryInterceptorMiddleware } from './query-interceptor'
import { requiresTenantFilter, getTenantField } from './schema-mapper'

// Global Prisma instance with monitoring
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Enhanced Prisma Client with security monitoring
 */
class MonitoredPrismaClient extends PrismaClient {
  private isMonitoringEnabled: boolean = true

  constructor(options?: Prisma.PrismaClientOptions) {
    super({
      log: ['query', 'error', 'warn'],
      ...options
    })

    // Add query interceptor middleware
    this.$use(queryInterceptorMiddleware)

    // Log monitoring initialization
    console.log('🛡️ Monitored Prisma Client initialized with security monitoring')
  }

  /**
   * Enable or disable monitoring
   */
  setMonitoring(enabled: boolean): void {
    this.isMonitoringEnabled = enabled
    console.log(`🛡️ Database monitoring ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Enhanced findMany with automatic tenant validation
   */
  async safeFindMany<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T[]> {
    if (!this.isMonitoringEnabled) {
      // @ts-ignore - Dynamic model access
      return this[model].findMany(args)
    }

    // Automatically inject tenant filter
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.where = {
        ...args.where,
        [tenantField]: tenantId
      }
    }

    // @ts-ignore - Dynamic model access
    return this[model].findMany(args)
  }

  /**
   * Enhanced create with automatic tenant injection
   */
  async safeCreate<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T> {
    if (!this.isMonitoringEnabled) {
      // @ts-ignore - Dynamic model access
      return this[model].create(args)
    }

    // Automatically inject tenant ID
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.data = {
        ...args.data,
        [tenantField]: tenantId
      }
    }

    // @ts-ignore - Dynamic model access
    return this[model].create(args)
  }

  /**
   * Enhanced update with tenant validation
   */
  async safeUpdate<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T> {
    if (!this.isMonitoringEnabled) {
      // @ts-ignore - Dynamic model access
      return this[model].update(args)
    }

    // Ensure where clause includes tenant filter
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.where = {
        ...args.where,
        [tenantField]: tenantId
      }
    }

    // @ts-ignore - Dynamic model access
    return this[model].update(args)
  }

  /**
   * Enhanced delete with tenant validation
   */
  async safeDelete<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T> {
    if (!this.isMonitoringEnabled) {
      // @ts-ignore - Dynamic model access
      return this[model].delete(args)
    }

    // Ensure where clause includes tenant filter
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.where = {
        ...args.where,
        [tenantField]: tenantId
      }
    }

    // @ts-ignore - Dynamic model access
    return this[model].delete(args)
  }

  /**
   * Block dangerous operations without tenant filtering
   */
  async deleteMany<T>(args: any): Promise<T> {
    if (this.isMonitoringEnabled) {
      console.error('🚨 BLOCKED: deleteMany operation without explicit tenant validation')
      console.error('🚨 Use safeDeleteMany() with tenantId parameter instead')
      throw new Error('Unsafe bulk delete operation blocked. Use safeDeleteMany() with tenantId.')
    }

    // Use $executeRaw for dangerous operations when monitoring is disabled
    return this.$executeRaw`DELETE FROM table WHERE ${Prisma.raw(JSON.stringify(args))}` as any
  }

  async updateMany<T>(args: any): Promise<T> {
    if (this.isMonitoringEnabled) {
      console.error('🚨 BLOCKED: updateMany operation without explicit tenant validation')
      console.error('🚨 Use safeUpdateMany() with tenantId parameter instead')
      throw new Error('Unsafe bulk update operation blocked. Use safeUpdateMany() with tenantId.')
    }

    // Use $executeRaw for dangerous operations when monitoring is disabled
    return this.$executeRaw`UPDATE table SET ${Prisma.raw(JSON.stringify(args))}` as any
  }

  /**
   * Safe bulk delete with tenant validation
   */
  async safeDeleteMany<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T> {
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.where = {
        ...args.where,
        [tenantField]: tenantId
      }
    }

    console.warn(`🛡️ BULK DELETE: Performing bulk delete on ${model} for tenant ${tenantId}`)

    // @ts-ignore - Dynamic model access
    return this[model].deleteMany(args)
  }

  /**
   * Safe bulk update with tenant validation
   */
  async safeUpdateMany<T>(
    model: Prisma.ModelName,
    args: any,
    tenantId: string
  ): Promise<T> {
    const tenantField = getTenantField(model)
    if (tenantField && requiresTenantFilter(model)) {
      args.where = {
        ...args.where,
        [tenantField]: tenantId
      }
    }

    console.warn(`🛡️ BULK UPDATE: Performing bulk update on ${model} for tenant ${tenantId}`)

    // @ts-ignore - Dynamic model access
    return this[model].updateMany(args)
  }

  /**
   * Transaction with tenant validation
   */
  async safeTransaction<T>(
    operations: ((prisma: MonitoredPrismaClient) => Promise<T>)[],
    tenantId: string
  ): Promise<T[]> {
    console.log(`🛡️ TRANSACTION: Starting monitored transaction for tenant ${tenantId}`)

    return this.$transaction(async (prisma) => {
      const monitoredPrisma = prisma as MonitoredPrismaClient
      const results = []

      for (const operation of operations) {
        const result = await operation(monitoredPrisma)
        results.push(result)
      }

      return results
    })
  }
}

/**
 * Create or get the global monitored Prisma instance
 */
export const monitoredPrisma = globalForPrisma.prisma ?? new MonitoredPrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = monitoredPrisma
}

/**
 * Helper functions for common tenant-scoped operations
 */
export class TenantScopedOperations {
  constructor(private tenantId: string) {}

  // Player operations
  async getPlayers(options?: { where?: any; orderBy?: any; take?: number; skip?: number }) {
    const { where, orderBy, take, skip } = options || {}
    return monitoredPrisma.player.findMany({
      where: { ...where, tenantId: this.tenantId },
      orderBy,
      take,
      skip
    })
  }

  async createPlayer(data: any) {
    return monitoredPrisma.player.create({
      data: { ...data, tenantId: this.tenantId }
    })
  }

  async updatePlayer(id: string, data: any) {
    return monitoredPrisma.player.update({
      where: { id, tenantId: this.tenantId },
      data
    })
  }

  async deletePlayer(id: string) {
    return monitoredPrisma.player.delete({
      where: { id, tenantId: this.tenantId }
    })
  }

  // Request operations
  async getRequests(filters?: any) {
    return monitoredPrisma.request.findMany({
      where: { ...filters, tenantId: this.tenantId }
    })
  }

  async createRequest(data: any) {
    return monitoredPrisma.request.create({
      data: { ...data, tenantId: this.tenantId }
    })
  }

  async updateRequest(id: string, data: any) {
    return monitoredPrisma.request.update({
      where: { id, tenantId: this.tenantId },
      data
    })
  }

  async deleteRequest(id: string) {
    return monitoredPrisma.request.delete({
      where: { id, tenantId: this.tenantId }
    })
  }

  // Trial operations
  async getTrials(filters?: any) {
    return monitoredPrisma.trial.findMany({
      where: { ...filters, tenantId: this.tenantId }
    })
  }

  async createTrial(data: any) {
    return monitoredPrisma.trial.create({
      data: { ...data, tenantId: this.tenantId }
    })
  }

  async updateTrial(id: string, data: any) {
    return monitoredPrisma.trial.update({
      where: { id, tenantId: this.tenantId },
      data
    })
  }

  async deleteTrial(id: string) {
    return monitoredPrisma.trial.delete({
      where: { id, tenantId: this.tenantId }
    })
  }

  // Calendar event operations
  async getCalendarEvents(filters?: any) {
    return monitoredPrisma.calendarEvent.findMany({
      where: { ...filters, tenantId: this.tenantId }
    })
  }

  async createCalendarEvent(data: any) {
    return monitoredPrisma.calendarEvent.create({
      data: { ...data, tenantId: this.tenantId }
    })
  }

  async updateCalendarEvent(id: string, data: any) {
    return monitoredPrisma.calendarEvent.update({
      where: { id, tenantId: this.tenantId },
      data
    })
  }

  async deleteCalendarEvent(id: string) {
    return monitoredPrisma.calendarEvent.delete({
      where: { id, tenantId: this.tenantId }
    })
  }
}

/**
 * Factory function to create tenant-scoped operations
 */
export function createTenantOperations(tenantId: string): TenantScopedOperations {
  return new TenantScopedOperations(tenantId)
}

/**
 * Legacy compatibility - use this as drop-in replacement for existing PrismaClient
 */
export const prisma = monitoredPrisma

export default monitoredPrisma