# 🚨 Production Fixes Needed

## Status: Ready to Fix 2 Remaining Issues

Både avatar upload och player creation är nästan lösta! Vi får nu strukturerade felmeddelanden istället för generiska 500-fel. Endast 2 enkla fixes kvar:

## ✅ Fixed Already:
- ✅ FormData Content-Type problem (avatar upload når nu Supabase)
- ✅ Tenant slug → ID resolution (auth fungerar)
- ✅ Structured error messages (kan se exakt vad som är fel)

## 🔧 Fix 1: Supabase Storage Bucket

**Problem**: `{"success":false,"error":"Bucket not found","code":"STORAGE_ERROR"}`

**Solution**: Skapa bucket i Supabase Dashboard
1. Gå till https://supabase.com/dashboard/project/latgzpdzxsrkiihfxfvn/storage/buckets
2. Klicka "New bucket"
3. Namn: `avatars`
4. Public: `true` (för avatar visning)
5. File size limit: `10MB`

## 🔧 Fix 2: Player ID Column Default

**Problem**: `{"success":false,"error":"null value in column \"id\" of relation \"players\" violates not-null constraint"}`

**Solution**: Kör SQL i Supabase SQL Editor
1. Gå till https://supabase.com/dashboard/project/latgzpdzxsrkiihfxfvn/sql/new
2. Klistra in innehållet från `sql-fixes/fix-player-id-and-storage.sql`
3. Klicka "Run"

## 🧪 Test After Fixes:

1. **Avatar Upload**: Ladda upp en bild → ska fungera
2. **Player Creation**: Skapa ny spelare → ska fungera
3. **Dry-run test**: `/api/players?tenant=elite-sports-group&dryRun=1` → ska visa tenant resolution

## ⏱️ ETA: 5 minuter totalt
- Bucket creation: 2 min
- SQL fix: 1 min
- Testing: 2 min

Efter dessa fixes kommer både avatar upload och player creation att fungera perfekt! 🎯