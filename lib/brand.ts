/**
 * Per-brand footer and proof-point content.
 *
 * A dashboard carries one of three brands (see `logoChoice` in the store), and
 * everything below the charts — contact details, footer navigation, the
 * "Why …" strip, the credibility and accolades links — has to follow it. A
 * Worldwide Market Reports dashboard showing Coherent's footer reads as a
 * mistake to whoever receives the link.
 *
 * Link targets are taken from each brand's live site.
 */

export type BrandId = 'coherent' | 'wmr' | 'mi'

export interface BrandLink {
  label: string
  href: string
}

export interface BrandColumn {
  heading: string
  links: BrandLink[]
}

export interface BrandOffice {
  heading: string
  address: string
}

export interface Brand {
  id: BrandId
  /** Full legal-ish name, used in prose. */
  name: string
  /** Heading for the proof-point strip, e.g. "Why Coherent Market Insights?". */
  whyHeading: string
  site: string
  email: string
  /** Shown in the contact strip above the footer. */
  phones: Array<{ country: string; number: string }>
  offices: BrandOffice[]
  columns: BrandColumn[]
  socials: { linkedin?: string; twitter?: string; facebook?: string; pinterest?: string }
  /**
   * Where the credibility and accolades strips link. Null leaves them as plain,
   * unclickable sections — only Coherent Market Insights publishes those pages.
   */
  credibilityUrl: string | null
  accoladesUrl: string | null
  copyright: string
}

const CMI_SITE = 'https://www.coherentmarketinsights.com'
const WMR_SITE = 'https://www.worldwidemarketreports.com'
const MI_SITE = 'https://www.coherentmi.com'

const abs = (site: string, path: string) => `${site}${path}`

const COHERENT: Brand = {
  id: 'coherent',
  name: 'Coherent Market Insights',
  whyHeading: 'Why Coherent Market Insights?',
  site: CMI_SITE,
  email: 'sales@coherentmarketinsights.com',
  phones: [
    { country: 'United States', number: '+1-252-477-1362' },
    { country: 'United Kingdom', number: '+44-203-957-8553 / +44-203-949-5508' },
    { country: 'Australia', number: '+61-8-7924-7805' },
    { country: 'India', number: '+91-848-285-0837' },
  ],
  offices: [
    {
      heading: 'Sales Office (U.S.) :',
      address:
        'Coherent Market Insights Pvt Ltd, 533 Airport Boulevard, Suite 400, Burlingame, CA 94010, United States',
    },
    {
      heading: 'Asia Pacific Intelligence Center (India) :',
      address:
        'Coherent Market Insights Pvt Ltd, 401-402, Bremen Business Center, University Road, Aundh, Pune - 411007, India.',
    },
  ],
  columns: [
    {
      heading: 'Menu',
      links: [
        { label: 'About Us', href: abs(CMI_SITE, '/aboutus') },
        { label: 'Industries', href: abs(CMI_SITE, '/industries') },
        { label: 'Services', href: abs(CMI_SITE, '/services') },
        { label: 'Contact Us', href: abs(CMI_SITE, '/contact-us') },
        { label: 'Careers', href: abs(CMI_SITE, '/careers') },
      ],
    },
    {
      heading: 'Reader Club',
      links: [
        { label: 'Latest Insights', href: abs(CMI_SITE, '/latest-insights') },
        { label: 'Press Release', href: abs(CMI_SITE, '/press-releases') },
        { label: 'Infographics', href: abs(CMI_SITE, '/infographics') },
        { label: 'Blogs', href: abs(CMI_SITE, '/blog') },
        { label: 'News', href: abs(CMI_SITE, '/news') },
      ],
    },
    {
      heading: 'Help',
      links: [
        { label: 'Become Reseller', href: abs(CMI_SITE, '/become-reseller') },
        { label: 'How To Order?', href: abs(CMI_SITE, '/how-to-order') },
        { label: 'Terms and Conditions', href: abs(CMI_SITE, '/terms-and-conditions') },
        { label: 'Privacy Policy', href: abs(CMI_SITE, '/privacy-policy') },
        { label: 'Disclaimer', href: abs(CMI_SITE, '/disclaimer') },
        { label: 'Sitemap', href: abs(CMI_SITE, '/sitemap.html') },
        { label: 'Feeds', href: abs(CMI_SITE, '/feeds') },
      ],
    },
  ],
  socials: {
    linkedin: 'https://www.linkedin.com/company/coherent-market-insights',
    twitter: 'https://twitter.com/CoherentMI',
    facebook: 'https://www.facebook.com/Coherent-Market-Insights-Pvt-Ltd-184735681994311/',
    pinterest: 'https://www.pinterest.com/coherentMI/',
  },
  credibilityUrl: abs(CMI_SITE, '/credibility-certifications'),
  accoladesUrl: abs(CMI_SITE, '/accolades'),
  copyright: '© 2026 Coherent Market Insights Pvt Ltd. All Rights Reserved.',
}

const WMR: Brand = {
  id: 'wmr',
  name: 'Worldwide Market Reports',
  whyHeading: 'Why Worldwide Market Reports?',
  site: WMR_SITE,
  email: 'sales@worldwidemarketreports.com',
  phones: [
    { country: 'United States', number: '+1-415-871-0703' },
    { country: 'United States', number: '+1-252-477-1362' },
    { country: 'United Kingdom', number: '+44-203-949-5508' },
    { country: 'India', number: '+91-848-285-0837' },
  ],
  offices: [
    {
      heading: 'Sales Office (U.S.) :',
      address:
        'Worldwide Market Reports, 533 Airport Boulevard, Suite 400, Burlingame, CA 94010, United States',
    },
    {
      heading: 'Asia Pacific Intelligence Center (India) :',
      address:
        'Var Worldwide Market Reports Pvt Ltd, 402, Bremen Business Center, University Road, Pune - 411007, India.',
    },
  ],
  columns: [
    {
      heading: 'Menu',
      links: [
        { label: 'About Us', href: abs(WMR_SITE, '/aboutus') },
        { label: 'Become a Partner', href: abs(WMR_SITE, '/become-partner') },
        { label: 'Latest Reports', href: abs(WMR_SITE, '/latest-reports') },
        { label: 'Country Analysis', href: abs(WMR_SITE, '/country-analysis') },
        { label: 'Custom Research', href: abs(WMR_SITE, '/custom-research') },
        { label: 'Contact Us', href: abs(WMR_SITE, '/contact-us') },
      ],
    },
    {
      heading: 'Quick Links',
      links: [
        { label: 'Privacy Policy', href: abs(WMR_SITE, '/privacy-policy') },
        { label: 'Disclaimer', href: abs(WMR_SITE, '/disclaimer') },
        { label: 'Terms and Conditions', href: abs(WMR_SITE, '/terms-and-conditions') },
        { label: 'Return Policy', href: abs(WMR_SITE, '/return-policy') },
        { label: 'How to order', href: abs(WMR_SITE, '/how-to-order') },
        { label: 'Format and Delivery', href: abs(WMR_SITE, '/format-and-delivery') },
        { label: 'Publishers', href: abs(WMR_SITE, '/publishers') },
      ],
    },
    {
      heading: 'Reader Club',
      links: [
        { label: 'Blog', href: abs(WMR_SITE, '/blog') },
        { label: 'News', href: abs(WMR_SITE, '/news') },
      ],
    },
  ],
  socials: {
    linkedin: 'https://www.linkedin.com/company/worldwide-market-reports',
    twitter: 'https://twitter.com/WMReports',
    facebook: 'https://www.facebook.com/WorldwideMarketReports/',
    pinterest: 'https://www.pinterest.com/WMReports/',
  },
  credibilityUrl: null,
  accoladesUrl: null,
  copyright: '© 2026 Worldwide Market Reports. All Rights Reserved.',
}

const MI: Brand = {
  id: 'mi',
  name: 'CoherentMI',
  whyHeading: 'Why CoherentMI?',
  site: MI_SITE,
  email: 'sales@coherentmi.com',
  phones: [
    { country: 'United States', number: '+1-252-477-1362' },
    { country: 'United Kingdom', number: '+44-203-957-8553 / +44-203-949-5508' },
    { country: 'Australia', number: '+61-8-7924-7805' },
    { country: 'India', number: '+91-848-285-0837' },
  ],
  offices: [
    {
      heading: 'Sales Office (U.S.) :',
      address:
        'Coherent Market Insights Pvt Ltd, 533 Airport Boulevard, Suite 400, Burlingame, CA 94010, United States.',
    },
    {
      heading: 'Sales Office (U.K.) :',
      address:
        'Coherent Market Insights Pvt Ltd, Office 15811, 182-184 High Street North, East Ham, London E6 2JA, United Kingdom.',
    },
    {
      heading: 'Asia Pacific Intelligence Center (India) :',
      address:
        'Coherent Market Insights Pvt Ltd, Office No 401-402, Bremen Business Center, University Road, Aundh, Pune – 411007, India.',
    },
  ],
  columns: [
    {
      heading: 'Menu',
      links: [
        { label: 'About Us', href: abs(MI_SITE, '/about-us') },
        { label: 'Industries', href: abs(MI_SITE, '/industries') },
        { label: 'Services', href: abs(MI_SITE, '/services') },
        { label: 'Contact Us', href: abs(MI_SITE, '/contact-us') },
      ],
    },
    {
      heading: 'Readers Club',
      links: [
        { label: 'Latest Insights', href: abs(MI_SITE, '/latest-insights') },
        { label: 'Blogs', href: abs(MI_SITE, '/blog') },
        { label: 'Press Release', href: abs(MI_SITE, '/press-releases') },
      ],
    },
    {
      heading: 'Help',
      links: [
        { label: 'Become Reseller', href: abs(MI_SITE, '/become-reseller') },
        { label: 'How to Order?', href: abs(MI_SITE, '/how-to-order') },
        { label: 'Privacy Policy', href: abs(MI_SITE, '/privacy-policy') },
        { label: 'Terms and Conditions', href: abs(MI_SITE, '/terms-and-conditions') },
        { label: 'Disclaimer', href: abs(MI_SITE, '/disclaimer') },
      ],
    },
  ],
  socials: {
    linkedin: 'https://www.linkedin.com/company/coherent-mi/',
    twitter: 'https://twitter.com/Coherent_MI',
    facebook: 'https://www.facebook.com/profile.php?id=61553694036602',
    pinterest: 'https://www.pinterest.com/coherentmiseo/',
  },
  credibilityUrl: null,
  accoladesUrl: null,
  copyright: '© 2026 CoherentMI. All Rights Reserved.',
}

const BRANDS: Record<BrandId, Brand> = { coherent: COHERENT, wmr: WMR, mi: MI }

export function getBrand(id: string | null | undefined): Brand {
  return BRANDS[(id as BrandId) ?? 'coherent'] ?? COHERENT
}
