# CLAUDE.md – Scout Hub 2 Coding Standards & Rules

## 🎯 General Principles
- Always use **descriptive variable names** (no abbreviations like `plr`, always `player` or `playerList`).
- Code must be **type-safe** (TypeScript everywhere, no `any` unless unavoidable).
- Keep **functions under 50 lines** – split into helpers if bigger.
- Never hardcode tenant, user, or auth values – always resolve from context/env.

## 🏗️ Project Structure Rules
- All code lives in `/src` with clear module boundaries:
  - `/modules/{feature}/components` → UI
  - `/modules/{feature}/services` → server/data logic
  - `/modules/{feature}/types` → shared TS types
- Shared utilities go in `/lib`.
  - `countries.ts` → Complete world countries database (195+ countries) for nationality selection, scout locations, etc.
  - Includes search functions and ISO country codes for reusability across features
- Global UI components (buttons, modals, etc.) go in `/components/ui`.
  - `SearchableSelect.tsx` → Reusable dropdown with real-time search, keyboard navigation, and glassmorphism styling

## 🔐 Multi-Tenant Rules
- Tenant resolution is **path-based**: `/[tenant]/...`
- No tenant resolution in middleware → only **auth validation** in middleware.
- Every DB table must include a `tenant_id`.
- All Supabase RLS policies must check both `tenant_id` and `auth.uid()` membership.
- Do not trust client input for `tenant_id` → always derive from server context.

## 🗄️ Database & ORM
- Use **Prisma** for migrations and server-side queries.
- Use **Supabase client** for auth, realtime, and lightweight client queries.
- Always scope queries with `tenant_id`.
- Add indexes on `tenant_id` + frequently queried columns.

## 📊 Database Schema & Models

### Core Tables (7 total):
- **`tenants`** - Multi-tenant organization management
  - Fields: id, slug (unique), name, description, logoUrl, settings (JSON), timestamps
  - Relations: memberships, players, requests, trials, events

- **`users`** - User management across tenants
  - Fields: id, email (unique), firstName, lastName, avatarUrl, timestamps
  - Relations: memberships (many-to-many with tenants)

- **`tenant_memberships`** - User roles within tenants
  - Fields: id, tenantId, userId, role (enum), joinedAt
  - Roles: OWNER, ADMIN, MANAGER, SCOUT, VIEWER

- **`players`** - Player database with full scout info
  - Fields: id, tenantId, firstName, lastName, dateOfBirth, position, club, nationality
  - Physical: height (cm), weight (kg)
  - Scout data: notes, tags (array), rating (1-10 float)
  - Relations: tenant, trials

- **`requests`** - Scout requests from clubs
  - Fields: id, tenantId, title, description, club, position, ageRange
  - Management: priority (enum), status (enum), budget, deadline
  - Relations: tenant, trials

- **`trials`** - Trial sessions and evaluations
  - Fields: id, tenantId, playerId, requestId, scheduledAt, location
  - Evaluation: status (enum), notes, rating, feedback
  - Relations: tenant, player, request

- **`calendar_events`** - Event scheduling
  - Fields: id, tenantId, title, description, startTime, endTime, location
  - Settings: type (enum), isAllDay, recurrence (RRULE)
  - Relations: tenant

### Enums:
- **TenantRole**: OWNER, ADMIN, MANAGER, SCOUT, VIEWER
- **Priority**: LOW, MEDIUM, HIGH, URGENT
- **RequestStatus**: OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- **TrialStatus**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- **EventType**: TRIAL, MEETING, MATCH, TRAINING, SCOUTING, OTHER

## 👥 Roles & Permissions
- Allowed roles: `owner`, `admin`, `manager`, `scout`, `viewer`.
- RLS = tenant isolation.  
- Server guards = business logic (who can create/update/delete).
- No feature may bypass server guards or RLS.

## 🎨 UI/UX
- Tailwind + shadcn/ui only.
- Design tokens for colors, spacing, typography – no ad-hoc hex values.
- Portal-based modals only via `/components/modals`.
- Dark/light mode must be supported in all new components.

## 🔍 Testing & Validation
- Every feature must include at least one E2E test.
- Test data isolation with at least 2 tenants in seed.
- Never merge code without verifying tenant isolation.

## 🚀 Deployment
- ENV variables must be defined in `.env.local` and Vercel dashboard.
- No hardcoded secrets in code.
- Robots.txt must block indexing in Preview/Dev environments.


## Coding Standards
- Always use descriptive variable names
- No `window` globals – only ES6 imports/exports
- All DB queries must be scoped by tenant_id
- Use Node runtime for Prisma (never Edge)
- Lös aldrig problem genom att ta bort funktionalitet.
- Föreslå aldrig quickfix utan att förklara varför det bryter mot våra regler.
- Alltid Tenant-isolation via RLS, aldrig “temporär bypass”.

## 🚫 No Shortcuts
- Do not disable TypeScript checks
- Do not remove RLS to make queries work
- Do not bypass role checks
- Do not hardcode tenant_id or user_id

---

## 📋 Development Progress Status

### ✅ Completed - Steg 1: Initial Project Setup
- **Project Foundation:** ✅ Complete Next.js 14 setup med TypeScript, Tailwind CSS, Prisma
- **Folder Structure:** ✅ Modulär arkitektur enligt CLAUDE.md standarder
- **Multi-Tenant Architecture:** ✅ [tenant] dynamic routing, middleware för auth validation
- **Database Schema:** ✅ Komplett Prisma schema med multi-tenant struktur och RLS support
- **Core Components:** ✅ Navigation, dashboard komponenter, shadcn/ui setup
- **Git Repository:** ✅ Initial commit och push till GitHub (Hector21-tech/HUB2)

### ✅ Completed - Steg 2: Supabase Configuration  
- **Environment Setup:** ✅ Kompletta Supabase credentials konfigurerade
- **URL Corrections:** ✅ Fixad typo i project reference (latgzpdzxsrkiihfxfvn)
- **Database URLs:** ✅ Korrekta PostgreSQL connection strings

### ✅ Completed - Steg 3: Supabase Integration & Database Setup
- **Database Connection:** ✅ Successful connection via Vercel pooler (port 6543)
- **Schema Migration:** ✅ All 7 tables created (tenants, users, tenant_memberships, players, requests, trials, calendar_events)
- **Row Level Security:** ✅ RLS enabled on all tables with basic policies
- **CRUD Testing:** ✅ Full Prisma integration verified with test API endpoints
- **Seed Data:** ✅ Complete test data created (Test Scout Hub, sample players, trials)

### ✅ Completed - Steg 4: Players Module Implementation
- **Player Management UI:** ✅ Complete player listing with grid/list view modes
- **Add Player Functionality:** ✅ Comprehensive player creation modal with validation
- **Multi-Position System:** ✅ Max 2 positions selection with 10 football positions (GK, LB, LCB, etc.)
- **Player Details:** ✅ Full player detail drawer with scout information
- **Search & Filtering:** ✅ Real-time search and filters (position, nationality, age, rating)
- **Avatar System:** ✅ Player avatar URLs with fallback to initials
- **Data Transformation:** ✅ Utilities for database/UI format conversion

### ✅ Completed - Steg 5: Enhanced User Experience
- **Searchable Country Dropdown:** ✅ 195+ world countries with real-time search
- **Glassmorphism Design:** ✅ Consistent SAAS theme throughout application
- **Form Validation:** ✅ Comprehensive validation for all player data
- **Error Handling:** ✅ Detailed error logging and user feedback
- **Responsive Design:** ✅ Mobile and desktop optimized layouts
- **Keyboard Navigation:** ✅ Full accessibility support for dropdowns

### ✅ Completed - Steg 6: Scout Requests Module Implementation
- **Request Management UI:** ✅ Complete CRM-style board view with swimlanes
- **Request Creation:** ✅ Smart club selector with auto-populated country/league data
- **Multiple Views:** ✅ Board, List, Calendar (planned), Archive, Inbox views
- **Advanced Filtering:** ✅ Search, filter chips, view-based filtering
- **Bulk Operations:** ✅ Multi-select, bulk status updates, bulk delete
- **Export Functionality:** ✅ CSV, JSON, and summary report exports
- **Status Management:** ✅ Workflow for OPEN → IN_PROGRESS → COMPLETED/CANCELLED
- **Window Management:** ✅ Transfer window tracking with dates and grace periods
- **Responsive Design:** ✅ Three-panel layout with collapsible sidebar

### ✅ Completed - Steg 7: Authentication System
- **Supabase Auth Integration:** ✅ Complete authentication flow with email confirmation
- **Multi-tenant Context:** ✅ AuthContext with tenant loading and management
- **Route Protection:** ✅ Middleware for protected routes and tenant validation
- **Organization Management:** ✅ Create and select organizations
- **Cross-platform Consistency:** ✅ Fixed mobile vs desktop loading issues

### ✅ Completed - Steg 8: Trials Management System
- **Trial Scheduling:** ✅ Complete trial creation with player and request linking
- **Evaluation System:** ✅ Rating and feedback system for completed trials
- **Status Workflow:** ✅ SCHEDULED → IN_PROGRESS → COMPLETED/CANCELLED/NO_SHOW
- **Multiple Views:** ✅ Grid and list views with active/completed grouping
- **Trial Details:** ✅ Comprehensive trial detail drawer with all information
- **Integration:** ✅ Seamless integration with players and requests modules
- **Responsive Design:** ✅ Mobile and desktop optimized layouts

### ✅ Completed - Steg 9: Calendar Integration
- **Calendar Views:** ✅ Month, week, day, and list views for events
- **Event Management:** ✅ Create, edit, delete calendar events
- **Event Types:** ✅ Trials, meetings, matches, training, scouting events
- **Recurring Events:** ✅ Support for recurring event patterns
- **Integration:** ✅ Seamless integration with trials and requests
- **Real-time Updates:** ✅ Live calendar updates with tenant isolation

### 🎯 Project Status: FEATURE COMPLETE ✅
**All Core Modules Implemented:**
1. ✅ **Foundation & Setup** - Next.js 14, TypeScript, Tailwind, Prisma
2. ✅ **Multi-tenant Architecture** - Dynamic routing, RLS policies, tenant isolation
3. ✅ **Authentication System** - Supabase Auth with organization management
4. ✅ **Players Module** - Complete player management with advanced features
5. ✅ **Scout Requests Module** - CRM-style request management with workflows
6. ✅ **Trials Management** - Scheduling and evaluation system
7. ✅ **Calendar Integration** - Full calendar functionality with event management

### 🚀 Ready for Production Deployment
- **Database:** ✅ PostgreSQL with RLS policies and proper indexing
- **Authentication:** ✅ Secure multi-tenant authentication flow
- **UI/UX:** ✅ Professional glassmorphism design with responsive layouts
- **Performance:** ✅ Optimized queries and efficient data loading
- **Security:** ✅ Row Level Security and tenant isolation
- **Scalability:** ✅ Modular architecture ready for future enhancements

### 🔧 Project Credentials & APIs
- **Supabase Project:** latgzpdzxsrkiihfxfvn (correct project ID)
- **GitHub Repo:** Hector21-tech/HUB2
- **Database:** PostgreSQL via Supabase with RLS policies
- **Framework:** Next.js 14 with App Router and TypeScript
- **Production URL:** https://hub2-fqi83azof-hector-bataks-projects.vercel.app

### 📡 Available API Endpoints:
- **`/api/players`** - Full CRUD for players (GET, POST, PUT, DELETE) with tenant isolation
- **`/api/test-crud`** - Testing endpoint for database operations
- **`/api/migrate`** - Database migration utility
- **`/api/setup-rls`** - Row Level Security setup

### 🔧 Shared Utilities:
- **`src/lib/countries.ts`** - Complete world countries database (195+ countries) with search functions
- **`src/lib/football-clubs.ts`** - Global football clubs database with 1600+ clubs from major leagues
  - Coverage: Europe (Tier 1 & 2), Scandinavia (Tier 1 & 2), Africa (Tier 1), Middle East (Tier 1)
  - Includes Premier League, La Liga, Bundesliga, Serie A, Saudi Pro League, Allsvenskan, Superligaen, Eliteserien, Veikkausliiga, etc.
- **`src/lib/player-utils.ts`** - Data transformation between database and UI formats
- **`src/components/ui/SearchableSelect.tsx`** - Reusable search dropdown component with keyboard navigation



