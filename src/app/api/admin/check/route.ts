import { NextRequest, NextResponse } from 'next/server'

// Esta ruta verifica si el UID enviado es el admin
// La variable ADMIN_UID NO tiene NEXT_PUBLIC_ — solo existe en el servidor
export async function POST(req: NextRequest) {
  const { uid } = await req.json()
  const adminUid = process.env.ADMIN_UID

  if (!adminUid) {
    return NextResponse.json({ ok: false, error: 'Admin no configurado' }, { status: 500 })
  }

  if (uid !== adminUid) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
