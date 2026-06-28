'use client'

import { useEffect, useState } from 'react'
import { Users, Building2 } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { CustomerIntelligenceTable } from '@/components/charts/CustomerIntelligenceTable'
import DistributorsIntelligence from '@/components/charts/DistributorsIntelligenceTable'

type IntelligenceSource = 'customer' | 'distributor'

interface IntelligenceDatabaseViewsProps {
  /** When set, switches the customer/distributor tab (e.g. from main chart navigation). */
  preferredSource?: IntelligenceSource
}

export function IntelligenceDatabaseViews({ preferredSource }: IntelligenceDatabaseViewsProps = {}) {
  const {
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    distributorRawIntelligenceData,
    distributorProposition2Data,
    distributorProposition3Data,
    intelligenceType,
  } = useDashboardStore()

  const hasCustomerWorkbook = !!(
    rawIntelligenceData?.rows?.length ||
    proposition2Data?.rows?.length ||
    proposition3Data?.rows?.length
  )
  const hasDistributorWorkbook = !!(
    distributorRawIntelligenceData?.rows?.length ||
    distributorProposition2Data?.rows?.length ||
    distributorProposition3Data?.rows?.length
  )

  const showCustomer =
    (intelligenceType === 'customer' || intelligenceType === 'both') && hasCustomerWorkbook
  const showDistributor =
    (intelligenceType === 'distributor' || intelligenceType === 'both') && hasDistributorWorkbook
  const showSourceTabs = showCustomer && showDistributor

  const [activeSource, setActiveSource] = useState<IntelligenceSource>('customer')

  useEffect(() => {
    if (!preferredSource) return
    if (preferredSource === 'customer' && showCustomer) setActiveSource('customer')
    if (preferredSource === 'distributor' && showDistributor) setActiveSource('distributor')
  }, [preferredSource, showCustomer, showDistributor])

  const effectiveSource: IntelligenceSource = showSourceTabs
    ? activeSource
    : showDistributor
      ? 'distributor'
      : 'customer'

  const tabClass = (source: IntelligenceSource) =>
    [
      'inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
      effectiveSource === source
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
    ].join(' ')

  return (
    <div className="w-full">
      {showSourceTabs && (
        <nav
          className="flex border-b border-slate-200 mb-6 -mt-1"
          aria-label="Customer and distributor intelligence"
        >
          <button
            type="button"
            onClick={() => setActiveSource('customer')}
            className={tabClass('customer')}
          >
            <Users className="h-4 w-4" aria-hidden />
            Customer Intelligence
          </button>
          <button
            type="button"
            onClick={() => setActiveSource('distributor')}
            className={tabClass('distributor')}
          >
            <Building2 className="h-4 w-4" aria-hidden />
            Distributor Intelligence
          </button>
        </nav>
      )}

      {effectiveSource === 'customer' && showCustomer && (
        <CustomerIntelligenceTable title="Customer Intelligence Database" />
      )}

      {effectiveSource === 'distributor' && showDistributor &&
        (hasDistributorWorkbook ? (
          <CustomerIntelligenceTable
            intelligenceSource="distributor"
            title="Distributor Intelligence Database"
          />
        ) : (
          <DistributorsIntelligence title="Distributors Intelligence Database" height={500} />
        ))}
    </div>
  )
}
