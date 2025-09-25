# Changelog

All notable changes to Scout Hub 2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-09-22

### 🔧 Fixed
- **Player Creation ID Constraint**: Fixed "null value in column 'id'" error by implementing proper payload sanitization
- **Membership Lookup**: Resolved "Membership lookup failed" by fixing camelCase schema compatibility in `requireTenant()` resolver
- **Schema Mismatch**: Fixed "Could not find the 'positions' column" by implementing stable data transformation between frontend/backend
- **Tenant Resolution**: Fixed slug vs ID mismatch in tenant parameter handling with two-step lookup system
- **Avatar Upload**: Resolved 403 errors in avatar upload flow with new secure endpoint architecture

### 🚀 Added
- **Avatar Upload System**: New `/api/media/avatar-upload` endpoint with direct file upload and validation
- **Avatar Proxy**: New `/api/media/avatar-proxy` endpoint for CORS-free image serving with tenant isolation
- **Payload Sanitization**: Automatic removal of auto-generated fields (`id`, `createdAt`, `updatedAt`) in API requests
- **Debug Logging**: Comprehensive logging in tenant resolver for better troubleshooting
- **File Validation**: MIME-type validation and file size limits (5MB) for avatar uploads

### 🛡️ Security
- **Tenant Isolation**: Enhanced avatar storage with `avatars/{tenantId}/players/{playerId}.jpg` structure
- **Service Role Auth**: Secure file operations using Supabase service role with membership validation
- **Schema Consistency**: All database operations now use camelCase naming (`userId`, `tenantId`) consistently
- **RLS Policy Updates**: Updated `is_member()` helper and policies to use correct column naming

### 📊 Technical
- **Database Schema**: Updated `players.id` to use `@default(uuid())` for reliable auto-generation
- **Transform Utils**: Enhanced `transformToDatabase()` and `transformDatabasePlayer()` for stable data conversion
- **Two-Step Lookup**: Implemented memberships → tenant slug mapping in resolver for better performance
- **Error Handling**: Improved HTTP status codes (401/403/404/500) with descriptive error messages

### 🗑️ Deprecated
- **Old Upload URL**: `/api/media/upload-url` now returns 410 Gone with migration instructions
- **Legacy Avatar Flow**: Replaced signed URL pattern with direct upload + proxy architecture

### 🚀 Deployment
- **Production URL**: https://hub2-4i0nkntu8-hector-bataks-projects.vercel.app
- **Framework**: Next.js 14.0.4 with App Router
- **Database**: PostgreSQL via Supabase with Row Level Security
- **Authentication**: Multi-tenant with enhanced slug→ID resolution

---

## [1.0.0] - 2025-09-21

### 🎉 Initial Release
- **Complete Scout Hub**: Multi-tenant scout management platform
- **Player Management**: Full CRUD operations with advanced filtering and search
- **Scout Requests**: CRM-style request management with workflow states
- **Trials System**: Trial scheduling and evaluation with player/request linking
- **Calendar Integration**: Event management with multiple view modes
- **Authentication**: Supabase Auth with organization management
- **Multi-tenant Architecture**: Row Level Security with tenant isolation
- **Responsive Design**: Glassmorphism UI with mobile and desktop support

### 📋 Core Modules
- **Players Module**: Player database with positions, ratings, and scout information
- **Requests Module**: Scout request management with priority and status tracking
- **Trials Module**: Trial scheduling and evaluation system
- **Calendar Module**: Event planning and schedule management
- **Authentication**: Secure multi-tenant user management

### 🛠️ Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth with RLS policies
- **Deployment**: Vercel with automatic deployments