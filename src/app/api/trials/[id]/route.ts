import { NextRequest, NextResponse } from 'next/server'
import { trialService } from '@/modules/trials/services/trialService'
import { UpdateTrialInput } from '@/modules/trials/types/trial'
import { validateTenantAccess } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch a specific trial
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // 🛡️ SECURITY: Validate user has access to this tenant
    try {
      await validateTenantAccess(tenantId)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unauthorized' },
        { status: 401 }
      )
    }

    const trial = await trialService.getTrialById(params.id, tenantId)

    if (!trial) {
      return NextResponse.json(
        { success: false, error: 'Trial not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: trial
    })

  } catch (error) {
    console.error('Error fetching trial:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trial' },
      { status: 500 }
    )
  }
}

// PUT - Update a trial
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // 🛡️ SECURITY: Validate user has access to this tenant
    try {
      await validateTenantAccess(tenantId)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const updateData: UpdateTrialInput = {}

    // Only include fields that are provided
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(body.scheduledAt)
    }
    if (body.location !== undefined) {
      updateData.location = body.location
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }
    if (body.rating !== undefined) {
      updateData.rating = body.rating
    }
    if (body.feedback !== undefined) {
      updateData.feedback = body.feedback
    }

    const trial = await trialService.updateTrial(params.id, tenantId, updateData)

    return NextResponse.json({
      success: true,
      data: trial
    })

  } catch (error) {
    console.error('Error updating trial:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update trial' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a trial
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // 🛡️ SECURITY: Validate user has access to this tenant
    try {
      await validateTenantAccess(tenantId)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unauthorized' },
        { status: 401 }
      )
    }

    await trialService.deleteTrial(params.id, tenantId)

    return NextResponse.json({
      success: true,
      message: 'Trial deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting trial:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete trial' },
      { status: 500 }
    )
  }
}