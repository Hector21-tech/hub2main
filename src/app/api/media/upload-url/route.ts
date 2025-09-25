// DEPRECATED: This endpoint is replaced by /api/media/avatar-upload
// Redirecting to new avatar system with direct file handling
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/server/authz'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DEPRECATED: Redirect to new avatar upload system
export async function POST(request: NextRequest) {
  console.log('🚫 DEPRECATED: /api/media/upload-url called - redirecting to new system');

  return NextResponse.json({
    success: false,
    error: "This endpoint is deprecated. Use /api/media/avatar-upload for direct file uploads.",
    redirect: "/api/media/avatar-upload",
    migration: "The new endpoint accepts multipart/form-data with 'file' and 'playerId' fields."
  }, { status: 410 }); // 410 = Gone
}