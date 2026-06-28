/**
 * Chart Groups Configuration
 * Defines the grouping of charts for different analytical perspectives
 */

export type ChartGroupId =
  | 'market-analysis'
  | 'coherent-opportunity'
  | 'competitive-intelligence'
  | 'customer-intelligence'
  | 'distributor-intelligence'
  | 'pricing-analysis'

export interface ChartGroup {
  id: ChartGroupId
  label: string
  description: string
  charts: string[] // Chart identifiers that belong to this group
  icon?: string
}

export const CHART_GROUPS: ChartGroup[] = [
  {
    id: 'market-analysis',
    label: 'Market Analysis',
    description: 'Core market metrics and trends',
    charts: ['grouped-bar', 'multi-line', 'heatmap', 'comparison-table', 'waterfall'],
    icon: '📊'
  },
  {
    id: 'coherent-opportunity',
    label: 'Coherent Opportunity Matrix',
    description: 'Opportunity identification and analysis',
    charts: ['bubble'],
    icon: '🎯'
  },
  {
    id: 'competitive-intelligence',
    label: 'Competitive Intelligence 2025',
    description: 'Competitor analysis and market share',
    charts: ['competitive-intelligence'], // This includes both Market Share and Competitive Dashboard
    icon: '🏆'
  },
  {
    id: 'customer-intelligence',
    label: 'Customer Intelligence',
    description: 'Verified customer database by proposition tier',
    charts: ['customer-intelligence'],
    icon: '👥'
  },
  {
    id: 'distributor-intelligence',
    label: 'Distributor Intelligence',
    description: 'Verified distributor database by proposition tier',
    charts: ['distributor-intelligence'],
    icon: '🏢'
  },
  {
    id: 'pricing-analysis',
    label: 'Pricing Analysis',
    description: 'Average selling price trends and analysis',
    charts: ['pricing-grouped-bar', 'pricing-multi-line', 'pricing-heatmap', 'pricing-comparison-table'],
    icon: '💰'
  }
]

export const DEFAULT_CHART_GROUP: ChartGroupId = 'market-analysis'

/**
 * Get chart group by ID
 */
export function getChartGroup(id: ChartGroupId): ChartGroup | undefined {
  return CHART_GROUPS.find(group => group.id === id)
}

/**
 * Check if a chart belongs to a group
 */
export function isChartInGroup(chartId: string, groupId: ChartGroupId): boolean {
  const group = getChartGroup(groupId)
  return group ? group.charts.includes(chartId) : false
}

/**
 * Get all charts for a group
 */
export function getChartsForGroup(groupId: ChartGroupId): string[] {
  const group = getChartGroup(groupId)
  return group ? group.charts : []
}
