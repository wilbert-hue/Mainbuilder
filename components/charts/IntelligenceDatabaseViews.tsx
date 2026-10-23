'use client'

import { useEffect, useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { distributorDatabaseTitle } from '@/lib/module-labels'
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
    dashboardName,
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
  // Seeded from the caller so a distributor panel opens on the distributor
  // table, rather than rendering the customer one for a frame first.
  const [activeSource, setActiveSource] = useState<IntelligenceSource>(
    preferredSource ?? 'customer'
  )

  useEffect(() => {
    if (!preferredSource) return
    if (preferredSource === 'customer' && showCustomer) setActiveSource('customer')
    if (preferredSource === 'distributor' && showDistributor) setActiveSource('distributor')
  }, [preferredSource, showCustomer, showDistributor])

  /**
    * The dashboard's own navigation already switches between the two
    * directories, so this view renders whichever one it was asked for and
    * carries no tab strip of its own.
    */
  const effectiveSource: IntelligenceSource =
    showCustomer && showDistributor
      ? activeSource
      : showDistributor
        ? 'distributor'
        : 'customer'

  return (
    <div className="w-full">
      {effectiveSource === 'customer' && showCustomer && (
        <CustomerIntelligenceTable title="B2B - Customer Intelligence Database - Existing customers and Potential customers" />
      )}

      {effectiveSource === 'distributor' && showDistributor &&
        (hasDistributorWorkbook ? (
          <CustomerIntelligenceTable
            intelligenceSource="distributor"
            title={distributorDatabaseTitle(dashboardName)}
          />
        ) : (
          <DistributorsIntelligence title="Distributors Intelligence Database" height={500} />
        ))}
    </div>
  )
}
