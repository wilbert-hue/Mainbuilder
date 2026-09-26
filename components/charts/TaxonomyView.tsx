'use client'

/**
 * Taxonomy — the dashboard's scope as a numbered outline: every segment type
 * with its segments, then the geographies the market is broken down by.
 */

import { useDashboardStore } from '@/lib/store'
import { buildTaxonomy, type TaxonomyNode } from '@/lib/taxonomy'

function NodeRow({ node }: { node: TaxonomyNode }) {
  return (
    <div>
      <div className="flex items-start gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0">
        <span className="w-12 shrink-0 text-sm font-semibold text-[#7cb342]">{node.number}.</span>
        <span className="text-sm text-slate-800">{node.label}</span>
      </div>
      {node.children.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/60 pl-8">
          {node.children.map((child) => (
            <div key={child.number} className="flex items-start gap-3 px-4 py-2">
              <span className="w-14 shrink-0 text-xs font-semibold text-[#7cb342]">
                {child.number}.
              </span>
              <span className="text-sm text-slate-700">{child.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaxonomyView() {
  const { data, dashboardName } = useDashboardStore()
  const taxonomy = data ? buildTaxonomy(data, dashboardName) : null

  if (!taxonomy) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-500">
          Upload a market workbook in the Dashboard Builder to populate the taxonomy.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0b2545]">{taxonomy.marketName} — Taxonomy</h2>
        <p className="mt-1 text-sm text-slate-600">
          Scope of this dashboard · {taxonomy.scope}
        </p>
      </div>

      {taxonomy.sections.map((section) => (
        <section key={section.title}>
          <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#0b2545]">
            <span className="h-6 w-1.5 rounded-sm bg-[#7cb342]" />
            {section.title}
          </h3>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
            <div className="space-y-6">
              {section.groups.map((group) => (
                <div key={group.title}>
                  <h4 className="mb-3 flex items-center gap-3 text-base font-bold text-[#0b2545]">
                    <span className="h-5 w-1 rounded-sm bg-[#7cb342]" />
                    {group.title}
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    {group.nodes.map((node) => (
                      <NodeRow key={node.number} node={node} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
