'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CotizarRedirect() {
  const { workspaceId } = useParams() as { workspaceId: string }
  const router = useRouter()
  useEffect(() => {
    router.replace(`/workspace/${workspaceId}/iphone/stock?tab=cotizar`)
  }, [workspaceId])
  return null
}
