'use client'

// Re-exportamos desde el provider para que los componentes
// solo necesiten importar desde @/hooks/ sin saber dónde vive el contexto.
export { useSystemConfig, useSystem } from '@/providers/SystemConfigProvider'
