// /inicio redirige a /hoy — la ruta canónica del hub es /hoy
// Esta página existe para que deep links a /inicio no rompan
'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function InicioRedirect() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceId as string

  useEffect(() => {
    router.replace(`/workspace/${workspaceId}/hoy`)
  }, [workspaceId, router])

  return null
}
