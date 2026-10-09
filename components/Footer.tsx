'use client'

import { Phone, Mail, MapPin, Linkedin, Facebook, Twitter } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { getBrand } from '@/lib/brand'

/**
 * Site footer, rendered in the brand the dashboard was built under.
 *
 * Contact details, navigation and social links all come from `lib/brand`, so a
 * Worldwide Market Reports dashboard never shows Coherent's footer.
 */
export function Footer({ variant = 'default' }: { variant?: 'default' | 'magma' }) {
  const { logoChoice } = useDashboardStore()
  const brand = getBrand(logoChoice)

  const magma = variant === 'magma'
  // Theme-dependent classes — magma reuses the electric-blue palette.
  const stripBg = magma ? 'bg-[#0726a0] border-b border-white/10' : 'bg-gray-200 border-b border-gray-300'
  const stripText = magma ? 'text-white/90' : 'text-black'
  const footerBg = magma ? 'bg-[#0a3cce] text-white/80' : 'bg-gray-800 text-gray-300'
  const bodyText = magma ? 'text-white/75' : 'text-gray-300'
  const linkText = magma ? 'text-white/75 hover:text-white' : 'text-gray-300 hover:text-white'
  const divider = magma ? 'border-white/10' : 'border-gray-700'
  const copyText = magma ? 'text-white/60' : 'text-gray-400'

  const socialLink = (href: string | undefined, className: string, label: string, icon: React.ReactNode) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
      >
        {icon}
      </a>
    ) : null

  return (
    <>
      {/* Contact Us Strip */}
      <div className={stripBg}>
        <div className="container mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span className={`font-semibold ${stripText}`}>Contact Us</span>
            <div className="flex flex-wrap items-center gap-4">
              {brand.phones.map((p, i) => (
                <div key={`${p.country}-${i}`} className="flex items-center gap-2">
                  <Phone className={`h-4 w-4 ${stripText}`} />
                  <span className={stripText}>
                    {p.country}: <strong>{p.number}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <footer className={footerBg}>
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Contact and office information */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <p className="text-white font-semibold mb-2">For Business Enquiry :</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${brand.email}`} className="text-gray-300 hover:text-white">
                    {brand.email}
                  </a>
                </div>
              </div>

              {brand.offices.map((office) => (
                <div key={office.heading}>
                  <p className="text-white font-semibold mb-2">{office.heading}</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <p className={`${bodyText} text-sm`}>{office.address}</p>
                  </div>
                </div>
              ))}
            </div>

            {brand.columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-white font-semibold mb-4">{column.heading}</h3>
                <ul className="space-y-2 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${linkText} transition-colors`}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social media and payment */}
          <div className={`mt-8 pt-8 border-t ${divider}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-white font-semibold mb-3">Connect With Us :</p>
                <div className="flex gap-3">
                  {socialLink(
                    brand.socials.linkedin,
                    'w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white hover:bg-blue-700 transition-colors',
                    'LinkedIn',
                    <Linkedin className="h-5 w-5" />
                  )}
                  {socialLink(
                    brand.socials.twitter,
                    'w-10 h-10 bg-black rounded flex items-center justify-center text-white hover:bg-gray-800 transition-colors',
                    'Twitter',
                    <Twitter className="h-5 w-5" />
                  )}
                  {socialLink(
                    brand.socials.facebook,
                    'w-10 h-10 bg-blue-700 rounded flex items-center justify-center text-white hover:bg-blue-800 transition-colors',
                    'Facebook',
                    <Facebook className="h-5 w-5" />
                  )}
                  {socialLink(
                    brand.socials.pinterest,
                    'w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white hover:bg-red-700 transition-colors font-bold',
                    'Pinterest',
                    <span className="text-sm">P</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-white font-semibold mb-3">Secure Payment By :</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="px-3 py-2 bg-white rounded text-blue-600 font-bold text-xs">VISA</div>
                  <div className="px-3 py-2 bg-white rounded text-orange-600 font-bold text-xs">DISCOVER</div>
                  <div className="px-3 py-2 bg-white rounded text-red-600 font-bold text-xs">MasterCard</div>
                  <div className="px-3 py-2 bg-white rounded text-blue-600 font-bold text-xs">AMERICAN EXPRESS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className={`mt-8 pt-6 border-t ${divider} text-center`}>
            <p className={`${copyText} text-sm`}>{brand.copyright}</p>
          </div>
        </div>
      </footer>
    </>
  )
}
