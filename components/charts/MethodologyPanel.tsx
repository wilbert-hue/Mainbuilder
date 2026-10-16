'use client'

/**
 * The METHODOLOGY block that sits above a customer intelligence directory.
 *
 * The source workbook renders it as Excel outline groups the reader expands,
 * so it is shown here as collapsible panels — one per numbered section —
 * keeping the directory itself the first thing in view.
 */

import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { DEMO_SUBSCRIBE_NOTE } from '@/components/DemoDataNote'
import type { MethodologySection } from '@/lib/intelligence-sheet-types'

/** Section tints, in the order the workbook uses them. */
const TONES = [
  { header: 'bg-sky-50 hover:bg-sky-100 border-sky-200', marker: 'text-sky-700' },
  { header: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', marker: 'text-emerald-700' },
  { header: 'bg-orange-50 hover:bg-orange-100 border-orange-200', marker: 'text-orange-700' },
]

export default function MethodologyPanel({
  sections,
  locked = false,
}: {
  sections: MethodologySection[]
  /**
   * Withhold the section bodies. A generated methodology lists organisations,
   * job titles and trigger signals that were written from the market name, not
   * researched, so a demo dashboard shows the shape and locks the content.
   */
  locked?: boolean
}) {
  // Collapsed by default: the table is what the reader came for.
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!sections.length) return null

  return (
    <div className="border-b border-slate-200 bg-white">
      <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Methodology
      </p>
      <div className="px-5 pb-4 space-y-2">
        {sections.map((section, i) => {
          const tone = TONES[i % TONES.length]
          const isOpen = openIndex === i
          return (
            <div key={i} className="rounded-md border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors border-b ${tone.header} ${
                  isOpen ? '' : 'border-transparent'
                }`}
              >
                <span className={`text-sm font-bold ${tone.marker}`}>{i + 1}.</span>
                <span className="flex-1 text-sm font-semibold text-slate-900">{section.title}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (locked && section.groups.length > 0 ? (
                <div className="flex items-center gap-2 bg-white px-4 py-4 text-xs font-semibold text-slate-400">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  {DEMO_SUBSCRIBE_NOTE}
                </div>
              ) : (
                <div className="px-4 py-3 space-y-3 bg-white">
                  {section.groups.map((group, g) => (
                    <div key={g} className="space-y-1.5">
                      {group.title && (
                        <p className="text-xs font-semibold text-slate-700">{group.title}</p>
                      )}
                      <ul className="space-y-1">
                        {group.items.map((item, k) => (
                          <li
                            key={k}
                            className="flex gap-2 text-xs leading-relaxed text-slate-600"
                          >
                            <span className="text-slate-400 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {section.paragraphs.map((text, p) => (
                    <p key={p} className="text-xs leading-relaxed text-slate-600 italic">
                      {text}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
