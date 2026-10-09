'use client'

/**
 * "Why Coherent Market Insights?" — the proof-point strip that precedes the
 * credibility and accolades sections at the foot of every dashboard.
 */

import { FileCheck2, Users, Clock, Target } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { getBrand } from '@/lib/brand'

const PROOF_POINTS = [
  {
    Icon: FileCheck2,
    stat: '85–92%',
    label: 'Forecast Accuracy',
    detail: 'Validated against actual market outcomes across sectors and geographies',
  },
  {
    Icon: Users,
    stat: '73%',
    label: 'Annual Client Renewal',
    detail: 'Three out of four enterprise clients renew their subscription each year',
  },
  {
    Icon: Clock,
    stat: '24 Hours',
    label: 'Average Response Time',
    detail: 'From research request to expert consultation, 24 hours or less',
  },
  {
    Icon: Target,
    stat: '1,200+',
    label: 'Niche Market Segments',
    detail: 'The go-to research partner for complex, hard-to-find market insights',
  },
]

export function WhyCoherentSection() {
  const { logoChoice } = useDashboardStore()
  const brand = getBrand(logoChoice)

  return (
    <section className="bg-[#f7f9fc] border-t border-gray-200">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-10 flex items-center justify-center gap-4">
          <span className="hidden h-px w-16 bg-slate-300 sm:block" />
          <h2 className="text-center text-xl font-bold uppercase tracking-[0.08em] text-[#0b2545]">
            {brand.whyHeading}
          </h2>
          <span className="hidden h-px w-16 bg-slate-300 sm:block" />
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PROOF_POINTS.map(({ Icon, stat, label, detail }) => (
            <div key={label} className="text-center">
              <Icon className="mx-auto mb-4 h-10 w-10 text-[#7cb342]" strokeWidth={1.5} />
              <p className="text-3xl font-bold text-[#0b2545]">{stat}</p>
              <p className="mt-1 text-sm font-bold text-[#0b2545]">{label}</p>
              <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-relaxed text-slate-600">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
