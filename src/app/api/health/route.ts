import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const healthData = {
      ok: true,
      ts: Date.now(),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(healthData, { status: 200 })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        ok: false,
        ts: Date.now(),
        error: 'Health check failed'
      },
      { status: 503 }
    )
  }
}