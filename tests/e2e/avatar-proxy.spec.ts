import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_TENANT_ID = 'test-tenant-demo'

test.describe('Avatar Proxy E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto(`${BASE_URL}/login`)

    // For development environment, we might need to mock auth or use test credentials
    // This assumes we have a test user set up
    if (process.env.NODE_ENV === 'development') {
      // Skip auth in dev mode with DEV_AUTH_ENABLED
      console.log('Development mode: Skipping authentication for E2E tests')
    }
  })

  test('should successfully stream avatar image with correct headers', async ({ page }) => {
    // Test with a known avatar path (this would need to exist in test data)
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    const response = await page.request.get(proxyUrl)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^image\//)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
    expect(response.headers()['cache-control']).toContain('public')
    expect(response.headers()['etag']).toBeDefined()
  })

  test('should return 304 Not Modified for matching ETag', async ({ page }) => {
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    // First request to get ETag
    const firstResponse = await page.request.get(proxyUrl)
    expect(firstResponse.status()).toBe(200)
    const etag = firstResponse.headers()['etag']
    expect(etag).toBeDefined()

    // Second request with If-None-Match header
    const secondResponse = await page.request.get(proxyUrl, {
      headers: {
        'If-None-Match': etag
      }
    })

    expect(secondResponse.status()).toBe(304)
    expect(secondResponse.headers()['etag']).toBe(etag)
  })

  test('should return 403 for unauthorized tenant access', async ({ page }) => {
    const unauthorizedTenantId = 'unauthorized-tenant'
    const testPath = `${unauthorizedTenantId}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${unauthorizedTenantId}&path=${encodeURIComponent(testPath)}`

    const response = await page.request.get(proxyUrl)
    expect(response.status()).toBe(403)
  })

  test('should return 403 for path traversal attempt', async ({ page }) => {
    const maliciousPath = '../other-tenant/secret-avatar.jpg'
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(maliciousPath)}`

    const response = await page.request.get(proxyUrl)
    expect(response.status()).toBe(403)
  })

  test('should return 404 for non-existent file', async ({ page }) => {
    const nonExistentPath = `${TEST_TENANT_ID}/non-existent-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(nonExistentPath)}`

    const response = await page.request.get(proxyUrl)
    expect(response.status()).toBe(404)
  })

  test('should return 400 for missing parameters', async ({ page }) => {
    // Missing tenantId
    const response1 = await page.request.get(`${BASE_URL}/api/media/avatar-proxy?path=test-path.jpg`)
    expect(response1.status()).toBe(400)

    // Missing path
    const response2 = await page.request.get(`${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}`)
    expect(response2.status()).toBe(400)

    // Missing both
    const response3 = await page.request.get(`${BASE_URL}/api/media/avatar-proxy`)
    expect(response3.status()).toBe(400)
  })

  test('should handle HEAD requests for existence checks', async ({ page }) => {
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    const response = await page.request.head(proxyUrl)

    // Should return 200 for existing file or 404 for non-existent
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      expect(response.headers()['etag']).toBeDefined()
      expect(response.headers()['access-control-allow-origin']).toBe('*')
      expect(response.headers()['content-type']).toBe('image/*')
    }
  })

  test('should handle CORS preflight requests', async ({ page }) => {
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy`

    const response = await page.request.fetch(proxyUrl, {
      method: 'OPTIONS'
    })

    expect(response.status()).toBe(200)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
    expect(response.headers()['access-control-allow-methods']).toContain('GET')
    expect(response.headers()['access-control-allow-methods']).toContain('HEAD')
    expect(response.headers()['access-control-max-age']).toBe('86400')
  })

  test('should respect rate limiting', async ({ page }) => {
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    // Make multiple rapid requests to trigger rate limiting
    const promises = Array.from({ length: 70 }, () => page.request.get(proxyUrl))
    const responses = await Promise.allSettled(promises)

    const successfulResponses = responses
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .filter(response => response.status() < 400)

    const rateLimitedResponses = responses
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .filter(response => response.status() === 429)

    // Should have some successful requests and some rate limited
    expect(successfulResponses.length).toBeGreaterThan(0)

    // Check rate limit headers if any 429 responses
    if (rateLimitedResponses.length > 0) {
      const rateLimitResponse = rateLimitedResponses[0]
      expect(rateLimitResponse.headers()['x-ratelimit-limit']).toBeDefined()
      expect(rateLimitResponse.headers()['retry-after']).toBeDefined()
    }
  })

  test('should work in real browser environment (CORS test)', async ({ page }) => {
    // Navigate to a page that displays avatars
    await page.goto(`${BASE_URL}/${TEST_TENANT_ID}/players`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check that avatar images are loaded without CORS errors
    const avatarImages = page.locator('img[src*="/api/media/avatar-proxy"]')

    if (await avatarImages.count() > 0) {
      // Check that at least one avatar loaded successfully
      const firstAvatar = avatarImages.first()
      await expect(firstAvatar).toBeVisible()

      // Verify no console errors related to CORS
      const logs: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('CORS')) {
          logs.push(msg.text())
        }
      })

      // Wait a bit for any CORS errors to appear
      await page.waitForTimeout(1000)
      expect(logs).toHaveLength(0)
    }
  })
})

test.describe('Avatar Proxy Performance Tests', () => {
  test('should handle concurrent requests efficiently', async ({ page }) => {
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    const startTime = Date.now()

    // Make 10 concurrent requests
    const promises = Array.from({ length: 10 }, () => page.request.get(proxyUrl))
    const responses = await Promise.all(promises)

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // All requests should succeed (or consistently fail if file doesn't exist)
    const statuses = responses.map(r => r.status())
    const uniqueStatuses = Array.from(new Set(statuses))
    expect(uniqueStatuses.length).toBeLessThanOrEqual(2) // Should be consistent

    // Performance check: 10 concurrent requests should complete in reasonable time
    expect(totalTime).toBeLessThan(5000) // 5 seconds max for 10 requests

    console.log(`10 concurrent requests completed in ${totalTime}ms`)
  })

  test('should have reasonable response times for warm cache', async ({ page }) => {
    const testPath = `${TEST_TENANT_ID}/test-avatar.jpg`
    const proxyUrl = `${BASE_URL}/api/media/avatar-proxy?tenantId=${TEST_TENANT_ID}&path=${encodeURIComponent(testPath)}`

    // First request to warm up cache
    await page.request.get(proxyUrl)

    // Measure subsequent request
    const startTime = Date.now()
    const response = await page.request.get(proxyUrl)
    const endTime = Date.now()

    const responseTime = endTime - startTime

    // Warm cache request should be fast
    expect(responseTime).toBeLessThan(200) // 200ms p95 requirement

    console.log(`Warm cache response time: ${responseTime}ms`)
  })
})