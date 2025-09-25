# 🛡️ Security Guide - Scout Hub 2

## Environment Variables Security

### ⚠️ CRITICAL: Production Deployment Checklist

Before deploying to production, ensure all sensitive environment variables are properly secured:

#### 1. Rotate All Development Keys
```bash
# These development keys are COMPROMISED and must be rotated:
OPENAI_API_KEY="sk-proj-E9-kVgWtR4jKT-eGnKCZRT..." # ROTATE IMMEDIATELY
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..." # ROTATE IMMEDIATELY
NEXTAUTH_SECRET="scout-hub-2-development-secret-key-12345" # ROTATE IMMEDIATELY
```

#### 2. Production Environment Variables
Set these in Vercel/deployment platform (NEVER in code):
```bash
# Database
DATABASE_URL="postgresql://prod-user:secure-password@prod-host:5432/prod-db"
DIRECT_URL="postgresql://prod-user:secure-password@prod-host:5432/prod-db"

# Supabase (get new keys from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ_NEW_ANON_KEY_HERE"
SUPABASE_SERVICE_ROLE_KEY="eyJ_NEW_SERVICE_ROLE_KEY_HERE"

# Application
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="secure-production-secret-minimum-32-chars"

# Security
CSRF_SECRET="secure-csrf-secret-minimum-32-chars"

# APIs
OPENAI_API_KEY="sk-_NEW_OPENAI_KEY_HERE"

# Production flags
NODE_ENV="production"
VERCEL_ENV="production"
DEV_AUTH_ENABLED="false"  # CRITICAL: Must be false in production
```

#### 3. Immediate Security Actions Required

1. **Rotate OpenAI API Key**:
   - Go to https://platform.openai.com/api-keys
   - Revoke existing key: `sk-proj-E9-kVgWtR4jKT-eGnKCZRT...`
   - Generate new key
   - Update in production environment

2. **Rotate Supabase Keys**:
   - Go to Supabase dashboard → Settings → API
   - Reset service role key
   - Update SUPABASE_SERVICE_ROLE_KEY in production

3. **Generate Secure Secrets**:
   ```bash
   # Generate 32-byte random strings
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Audit Git History**:
   ```bash
   # Check if secrets were committed
   git log --all --grep="api" --grep="key" --grep="secret" -i

   # Remove .env.local from git if tracked
   git rm --cached .env.local
   echo ".env.local" >> .gitignore
   ```

### 🔒 Environment Variable Classification

#### PUBLIC (Safe to expose in client)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NODE_ENV`
- `VERCEL_ENV`

#### SECRET (Server-side only)
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `CSRF_SECRET`

#### DEVELOPMENT ONLY (Remove in production)
- `DEV_AUTH_ENABLED`
- `DEV_AUTH_EMAIL`
- `DEBUG_*` flags

## Production Security Checklist

### ✅ Authentication & Authorization
- [ ] All RLS policies enabled and tested
- [ ] Development auth bypass disabled (`DEV_AUTH_ENABLED=false`)
- [ ] CSRF protection activated
- [ ] Session security configured
- [ ] Rate limiting enabled on all endpoints

### ✅ API Security
- [ ] All endpoints validate tenant access
- [ ] Error responses don't leak internal information
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] CORS properly configured

### ✅ Database Security
- [ ] RLS enabled on all tenant tables
- [ ] Database credentials rotated
- [ ] Connection limits configured
- [ ] SSL/TLS enforced

### ✅ Infrastructure Security
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Security headers configured
- [ ] Content Security Policy active
- [ ] Environment variables secured
- [ ] Monitoring and alerting configured

## Security Headers Configuration

The application automatically applies these security headers:

```typescript
// Automatically applied via middleware
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
'X-Frame-Options': 'DENY'
'X-Content-Type-Options': 'nosniff'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'X-XSS-Protection': '1; mode=block'
'Content-Security-Policy': '...' // Strict CSP policy
```

## Monitoring Security Events

### Log Patterns to Monitor
```bash
# Failed authentication attempts
grep "SECURITY.*authentication" logs.json

# Tenant isolation violations
grep "SECURITY.*tenant.*denied" logs.json

# Rate limit violations
grep "Rate limit exceeded" logs.json

# Suspicious API access patterns
grep "403\|404" logs.json | jq '.path, .ip, .userAgent'
```

### Security Alerts
Set up alerts for:
- Multiple failed login attempts from same IP
- Cross-tenant access attempts
- Rate limit violations
- Database query errors
- Unusual API access patterns

## Incident Response

### If Credentials Are Compromised
1. Immediately rotate all affected credentials
2. Check logs for unauthorized access
3. Notify users if data may be affected
4. Update security documentation
5. Review access patterns for anomalies

### If Security Vulnerability Found
1. Assess severity and impact
2. Implement immediate mitigation
3. Plan proper fix
4. Test fix thoroughly
5. Deploy fix
6. Monitor for exploitation attempts

## Security Contacts

For security issues:
- Create issue: https://github.com/Hector21-tech/HUB2/issues
- Mark as security issue
- Include: Impact, steps to reproduce, proposed fix

---

**REMEMBER**: Security is not a one-time setup. Regularly review and update security measures.