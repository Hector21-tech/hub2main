import { NextRequest, NextResponse } from 'next/server'
import { trialService } from '@/modules/trials/services/trialService'
import { TrialEvaluationInput } from '@/modules/trials/types/trial'
import { validateTenantAccess } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Evaluate a trial
export async function POST(
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
    const evaluation: TrialEvaluationInput = {
      rating: body.rating,
      feedback: body.feedback,
      notes: body.notes || null
    }

    // Validate required fields
    if (!evaluation.rating || !evaluation.feedback) {
      return NextResponse.json(
        { success: false, error: 'Rating and feedback are required for evaluation' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (evaluation.rating < 1 || evaluation.rating > 10) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 10' },
        { status: 400 }
      )
    }

    const trial = await trialService.evaluateTrial(params.id, tenantId, evaluation)

    return NextResponse.json({
      success: true,
      data: trial,
      message: 'Trial evaluated successfully'
    })

  } catch (error) {
    console.error('Error evaluating trial:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate trial' },
      { status: 500 }
    )
  }
}