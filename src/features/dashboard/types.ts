// Métricas del dashboard HOY — alimentadas por el aggregate/summary del workspace

export interface DashboardMetrics {
  // Ventas
  salesCountThisMonth: number
  salesTotalARSThisMonth: number
  salesTotalUSDThisMonth: number
  // Pipeline
  pipelineOpenCount: number
  pipelineWonThisMonth: number
  // Clientes
  customersTotal: number
  // Alertas
  pipelineInactiveCount: number  // items con inactiveDays >= 7
  tasksDueToday: number
  // Período
  month: string  // 'YYYY-MM'
  updatedAt: Date
}

// Item de próxima acción para HOY
export interface UpcomingAction {
  pipelineItemId: string
  customerName: string
  nextAction: string
  nextActionAt: Date
  daysUntil: number  // negativo = vencida
}
