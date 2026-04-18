import { NextRequest, NextResponse } from 'next/server'
import { activateSystem } from '@/features/systems/actions'

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, code } = await req.json()
    if (!workspaceId || !code) {
      return NextResponse.json({ error: 'workspaceId y code requeridos' }, { status: 400 })
    }
    const result = await activateSystem({ workspaceId, code })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }
    return NextResponse.json(result.data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
