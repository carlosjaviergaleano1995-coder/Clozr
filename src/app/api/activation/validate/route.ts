import { NextRequest, NextResponse } from 'next/server'
import { validateActivationCode } from '@/features/systems/actions'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
    }
    const result = await validateActivationCode(code)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }
    return NextResponse.json(result.data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
