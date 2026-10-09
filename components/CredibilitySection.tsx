'use client'

/**
 * Credibility & Certifications — the trust strip that closes every dashboard.
 *
 * Badge artwork is mirrored from coherentmarketinsights.com into
 * /public/certifications so the dashboard never depends on the marketing site
 * being reachable from wherever it is embedded.
 */

import { useDashboardStore } from '@/lib/store'
import { getBrand } from '@/lib/brand'

const BADGES = [
  { src: '/certifications/duns-registerednewupdsma.webp', alt: 'D-U-N-S Registered' },
  { src: '/certifications/esomar2026.avif', alt: 'ESOMAR Individual 2026' },
  { src: '/certifications/iso-9001--NewUpda.webp', alt: 'ISO 9001:2015 Certified Company' },
  { src: '/certifications/iso-27001--NewUpda.webp', alt: 'ISO 27001:2022 Certified Company' },
  { src: '/certifications/clutupdatednewupdsma.webp', alt: 'Clutch 4.5 stars' },
  { src: '/certifications/Trustpilot-27.webp', alt: 'Trustpilot rating 4.5' },
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

export function CredibilitySection() {
  const { logoChoice } = useDashboardStore()
  const brand = getBrand(logoChoice)

  return (
    <section className="bg-[#f7f9fc] border-t border-gray-200">
      <MaybeLink href={brand.credibilityUrl}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eef7d6] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0f3d5c]">
              ★ Trusted &amp; Certified
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#0b2545]">
              <span className="italic underline decoration-[#d8f36b] decoration-8 underline-offset-[-2px]">
                Credibility
              </span>{' '}
              and Certifications
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Trusted Insights, Certified Excellence! Coherent Market Insights is a certified data
              advisory and business consulting firm recognized by global institutes.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map((b) => (
              <div
                key={b.src}
                className="flex h-28 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 shadow-sm"
              >
                {/* Plain <img>: the badges are small static assets and skipping the
                    optimizer keeps them working on static/offline exports. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} className="max-h-20 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </MaybeLink>
    </section>
  )
}
