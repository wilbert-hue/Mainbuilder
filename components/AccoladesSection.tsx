'use client'

/**
 * Awards & Accolades — companion strip to [[CredibilitySection]].
 *
 * Artwork is mirrored from coherentmarketinsights.com/accolades into
 * /public/accolades so the dashboard stays self-contained.
 */

import { useDashboardStore } from '@/lib/store'
import { getBrand } from '@/lib/brand'

const AWARDS = [
  { src: '/accolades/best-msme-award01.webp', alt: 'India 5000 Best MSME Awards' },
  { src: '/accolades/wealth-and-finance.webp', alt: 'Wealth & Finance Management Consulting Awards 2026' },
  { src: '/accolades/siliconreviewUpdated.webp', alt: 'The Silicon Review' },
  { src: '/accolades/ceotodayUpdated.webp', alt: 'CEO Today' },
  { src: '/accolades/BEST-STARTUPUpdated.webp', alt: 'Best Startup' },
  { src: '/accolades/best500Updated.webp', alt: 'Best 5000 MSME in India 2024' },
]

/** Linked only when the brand publishes the page; otherwise a plain section. */
function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  const className = "block container mx-auto px-6 py-10"
  if (!href) return <div className={className}>{children}</div>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} transition-opacity hover:opacity-90`}
    >
      {children}
    </a>
  )
}

export function AccoladesSection() {
  const { logoChoice } = useDashboardStore()
  const brand = getBrand(logoChoice)

  return (
    <section className="bg-white border-t border-gray-200">
      <MaybeLink href={brand.accoladesUrl}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eef7d6] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0f3d5c]">
              ★ Recognized &amp; Awarded
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#0b2545]">
              <span className="italic underline decoration-[#d8f36b] decoration-8 underline-offset-[-2px]">
                Awards
              </span>{' '}
              and Accolades
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Recognized Excellence! Coherent Market Insights&apos; accolades reflect our
              innovation, growth, and impact across the market research and consulting industry.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {AWARDS.map((a) => (
              <div
                key={a.src}
                className="flex h-28 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt={a.alt} className="max-h-16 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </MaybeLink>
    </section>
  )
}
