# Scout Hub 2 – Multi-Tenant SaaS Platform

## 🚀 Vision
Scout Hub 2 är en enterprise-skalig, multi-tenant scoutingplattform byggd för att hantera spelardata, scout requests, provträningar och kalenderfunktioner i en säker och modern miljö.

## 🏗️ Tech Stack
- **Next.js 14 (App Router)** – server-side rendering, middleware för auth
- **TypeScript** – typ-säker utveckling
- **Supabase (Postgres + Auth + Realtime)** – databas med Row Level Security
- **Prisma** – migrations och datamodellering
- **Tailwind CSS + shadcn/ui** – UI-komponenter och styling
- **TanStack Query + Zustand** – state management
- **Vercel** – hosting och CI/CD

## 🔐 Multi-Tenant Arkitektur
- Path-baserad routing: `/[tenant]/dashboard`
- Tenant-isolation via Supabase RLS (alla tabeller har `tenant_id`)
- Roller: `owner`, `admin`, `manager`, `scout`, `viewer`
- Server guards för affärsregler, RLS för dataskydd

## 📦 Moduler
- **Dashboard** – översikt per tenant
- **Players** – spelardatabas och profiler
- **Requests** – klubbarnas scoutingbehov
- **Trials** – provträningar och utvärderingar
- **Calendar** – full kalender med alla funktioner

## 🛡️ Coding Standards
- Always use **descriptive variable names**
- Ingen hårdkodad `tenant_id` eller `user_id` → alltid från server context
- Alla queries måste skopas med `tenant_id`
- Funktioner ska vara små och fokuserade (<50 rader)
- Ingen kod får merge:as utan test för tenant isolation

## 📡 API Kontrakt (En Enda Sanning för Tenant)

### 🎯 Grundprincip
**ALL API-kommunikation använder `?tenant=<slug>` query parameter.**
- ✅ Konsistent för GET, POST, PUT, DELETE
- ✅ Server säkerhetsvalidering via `validateSupabaseTenantAccess()`
- ✅ Ingen tenant-data i request bodies
- ✅ Automatisk tenant-scoping i alla responses

### 🔗 Endpoint Struktur
```typescript
// ✅ RÄTT: Query parameter för tenant
GET    /api/players?tenant=elite-sports
POST   /api/players?tenant=elite-sports
PUT    /api/players?tenant=elite-sports
DELETE /api/players?tenant=elite-sports&id=player123

// ❌ FEL: Tenant i body eller URL path
POST   /api/elite-sports/players  // Nej
POST   /api/players { "tenantId": "..." }  // Nej
```

### 🛡️ Säkerhetsvalidering
Alla endpoints följer detta mönster:
```typescript
export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenant')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant parameter is required' }, { status: 400 })
  }

  const validation = await validateSupabaseTenantAccess(tenantSlug)
  if (!validation.success) {
    return NextResponse.json({
      error: validation.message,
      meta: { reason: validation.reason }
    }, { status: 401 })
  }

  // Use validation.tenantId for database queries
}
```

### 📋 Tillgängliga Endpoints

#### Players API
- `GET /api/players?tenant=<slug>` - Hämta alla spelare för tenant
- `POST /api/players?tenant=<slug>` - Skapa ny spelare
- `PUT /api/players?tenant=<slug>` - Uppdatera spelare
- `DELETE /api/players?tenant=<slug>&id=<id>` - Ta bort spelare

#### Requests API
- `GET /api/requests?tenant=<slug>` - Hämta scout requests
- `POST /api/requests?tenant=<slug>` - Skapa ny request
- `PUT /api/requests/[id]?tenant=<slug>` - Uppdatera request
- `DELETE /api/requests/[id]?tenant=<slug>` - Ta bort request

#### Trials API
- `GET /api/trials?tenant=<slug>` - Hämta trials med filters
- `POST /api/trials?tenant=<slug>` - Skapa ny trial
- `PUT /api/trials/[id]?tenant=<slug>` - Uppdatera trial
- `DELETE /api/trials/[id]?tenant=<slug>` - Ta bort trial
- `POST /api/trials/[id]/evaluate?tenant=<slug>` - Utvärdera trial

#### Calendar API
- `GET /api/calendar/events?tenant=<slug>` - Hämta kalenderhändelser
- `POST /api/calendar/events?tenant=<slug>` - Skapa händelse
- `PUT /api/calendar/events/[id]?tenant=<slug>` - Uppdatera händelse
- `DELETE /api/calendar/events/[id]?tenant=<slug>` - Ta bort händelse

### 🔒 Error Responses
```typescript
// 400 - Missing tenant parameter
{ "error": "tenant parameter is required" }

// 401 - Invalid/unauthorized tenant
{
  "error": "User not authenticated",
  "meta": { "reason": "not_member" }
}

// 400 - Validation errors
{
  "success": false,
  "error": "Tenant parameter, first name, and last name are required"
}
```

### 🎯 Frontend Integration
```typescript
// React Query keys include tenant for cache isolation
queryKey: ['players', tenantSlug]
queryKey: ['trials', tenantSlug, filters]
queryKey: ['calendar-events', tenantSlug, params]

// All API calls use tenant query parameter
const response = await fetch(`/api/players?tenant=${tenantSlug}`, {
  method: 'POST',
  body: JSON.stringify(playerData) // NO tenant in body
})
```

### ✅ Robusthetskontroller
- **UI Guards:** Alla formulär kontrollerar `tenantSlug` innan submit
- **Cache Isolation:** Alla React Query keys inkluderar tenant
- **Server Validation:** Alla endpoints validerar tenant före databas-access
- **Error Handling:** Strukturerade fel med debug-information

## 📄 Dokumentation
Detaljerade arkitektur- och kodregler finns i `CLAUDE.md`.

---

🔧 **Status:** Repository initierat, färdigställ Vercel + Supabase konfiguration innan kodstart.
# Trigger Vercel deployment
# Force new Vercel deployment Sat, Sep 13, 2025  1:58:15 AM
