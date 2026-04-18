'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type {
  SalesSystemDefinition,
  SystemLabels,
  NavItem,
  PipelineStage,
  MetricDefinition,
  SystemFeatureFlags,
  ToolDefinition,
} from '@/features/systems/types'
import {
  DEFAULT_LABELS,
  DEFAULT_NAV,
  DEFAULT_STAGES,
  DEFAULT_METRICS,
  DEFAULT_FEATURE_FLAGS,
} from '@/features/systems/defaults'

// ── Context value ─────────────────────────────────────────────────────────────

interface SystemConfigContextValue {
  definition:         SalesSystemDefinition | null
  hasSystem:          boolean
  // Helpers con fallback automático a defaults
  getLabel:           <K extends keyof SystemLabels>(key: K) => SystemLabels[K]
  getNavItems:        () => NavItem[]
  getPipelineStages:  () => PipelineStage[]
  getDashboardMetrics:() => MetricDefinition[]
  isFeatureEnabled:   (flag: keyof SystemFeatureFlags) => boolean
  getToolConfig:      (toolId: string) => ToolDefinition | undefined
  // Acceso directo para casos que necesitan todo el objeto
  labels:             SystemLabels
}

const SystemConfigContext = createContext<SystemConfigContextValue>({
  definition:          null,
  hasSystem:           false,
  getLabel:            key => DEFAULT_LABELS[key],
  getNavItems:         () => DEFAULT_NAV,
  getPipelineStages:   () => DEFAULT_STAGES,
  getDashboardMetrics: () => DEFAULT_METRICS,
  isFeatureEnabled:    () => false,
  getToolConfig:       () => undefined,
  labels:              DEFAULT_LABELS,
})

// ── Provider ──────────────────────────────────────────────────────────────────

interface SystemConfigProviderProps {
  definition: SalesSystemDefinition | null
  children:   ReactNode
}

export function SystemConfigProvider({
  definition,
  children,
}: SystemConfigProviderProps) {
  const labels = definition?.labels ?? DEFAULT_LABELS

  const value: SystemConfigContextValue = {
    definition,
    hasSystem: definition !== null,
    labels,

    getLabel: (key) => labels[key] ?? DEFAULT_LABELS[key],

    getNavItems: () => definition?.nav.items ?? DEFAULT_NAV,

    getPipelineStages: () => definition?.pipeline.stages ?? DEFAULT_STAGES,

    getDashboardMetrics: () =>
      definition?.dashboard.metrics ?? DEFAULT_METRICS,

    isFeatureEnabled: (flag) =>
      definition?.features[flag] ?? DEFAULT_FEATURE_FLAGS[flag],

    getToolConfig: (toolId) =>
      definition?.tools.find(t => t.toolId === toolId),
  }

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  )
}

// ── Hook de consumo ───────────────────────────────────────────────────────────

export function useSystemConfig(): SystemConfigContextValue {
  return useContext(SystemConfigContext)
}

// Alias conveniente
export { useSystemConfig as useSystem }
