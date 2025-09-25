# Tenant Database Reference

**Last Updated:** 2025-09-22
**Source:** Supabase SQL query results

## Current Tenant Mappings

| ID | Slug | Name | Members | Players | Created |
|---|---|---|---|---|---|
| `cmfu5y1qf0000tb4csmb9a0xj` | `hhhh` | Hhhh | 1 | 0 | 2025-09-21 20:41:57 |
| `cmfu4l82e0000fm8gw7vjs9i4` | `face` | Face | 3 | 3 | 2025-09-21 20:03:59 |
| `cmfu44jd100007irnilrexu9l` | `heidi` | Heidi | 1 | 0 | 2025-09-21 19:51:00 |
| `cmfswwyei0000fm5oldss5aua` | `jakt` | Jakt | 1 | 0 | 2025-09-20 23:41:23 |
| `cmfsiz5ge0003cjc7uhd2nmc1` | `test1` | test1 | 6 | 6 | 2025-09-20 17:11:11 |
| `cmfsiuhqx0000cjc7aztz3oin` | `elite-sports-group` | Elite Sports Group | 12 | 12 | 2025-09-20 17:07:33 |
| `test-tenant-demo` | `scout-hub-demo` | Scout Hub Demo | 1 | 1 | 2025-09-20 16:39:48 |
| `tenant-test-1` | `test-scout-hub` | Test Scout Hub | 10 | 10 | 2025-09-13 16:53:19 |

## Key Findings

✅ **All tenants have valid slugs** - No missing or empty slug values
✅ **Total: 8 tenants active**
✅ **Most active tenants:** elite-sports-group (12 members), test-scout-hub (10 members)

## Problematic Tenant (Current Issue)

**Target Tenant:** `cmfu4l82e0000fm8gw7vjs9i4`
- **Slug:** `face`
- **Members:** 3
- **Players:** 3
- **Issue:** GET `/api/players?tenant=face` returns 500 error
- **Expected:** Should resolve `face` → `cmfu4l82e0000fm8gw7vjs9i4` and return players

## SQL Queries Used

```sql
-- Basic overview
SELECT id, slug, name, "createdAt", "updatedAt"
FROM tenants ORDER BY "createdAt" DESC;

-- With counts
SELECT t.id, t.slug, t.name, t."createdAt",
       COUNT(tm.id) as member_count,
       COUNT(p.id) as player_count
FROM tenants t
LEFT JOIN tenant_memberships tm ON t.id = tm."tenantId"
LEFT JOIN players p ON t.id = p."tenantId"
GROUP BY t.id, t.slug, t.name, t."createdAt"
ORDER BY t."createdAt" DESC;

-- Check slug status
SELECT id, slug, name,
       CASE
         WHEN slug IS NULL THEN 'MISSING SLUG'
         WHEN slug = '' THEN 'EMPTY SLUG'
         ELSE 'HAS SLUG'
       END as slug_status,
       "createdAt"
FROM tenants
ORDER BY slug_status, "createdAt" DESC;
```