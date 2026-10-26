/** Country → region, for grouping a geography list that names countries but not their regions. */
export const COUNTRY_TO_REGION: Record<string, string> = {
  // North America
  'U.S.': 'North America', 'USA': 'North America', 'United States': 'North America',
  'Canada': 'North America', 'Mexico': 'North America',
  // Europe
  'Germany': 'Europe', 'UK': 'Europe', 'U.K.': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe',
  'Italy': 'Europe', 'Spain': 'Europe', 'Russia': 'Europe', 'Netherlands': 'Europe',
  'Sweden': 'Europe', 'Switzerland': 'Europe', 'Belgium': 'Europe', 'Austria': 'Europe',
  'Poland': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe',
  'Ireland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe', 'Czech Republic': 'Europe',
  'Romania': 'Europe', 'Hungary': 'Europe', 'Rest of Europe': 'Europe',
  // Asia Pacific
  'China': 'Asia Pacific', 'India': 'Asia Pacific', 'Japan': 'Asia Pacific',
  'South Korea': 'Asia Pacific', 'Australia': 'Asia Pacific', 'ASEAN': 'Asia Pacific',
  'Singapore': 'Asia Pacific', 'Malaysia': 'Asia Pacific', 'Thailand': 'Asia Pacific',
  'Indonesia': 'Asia Pacific', 'Philippines': 'Asia Pacific', 'Vietnam': 'Asia Pacific',
  'Taiwan': 'Asia Pacific', 'Hong Kong': 'Asia Pacific', 'New Zealand': 'Asia Pacific',
  'Rest of Asia Pacific': 'Asia Pacific', 'Rest of Asia': 'Asia Pacific',
  // Latin America
  'Brazil': 'Latin America', 'Argentina': 'Latin America', 'Chile': 'Latin America',
  'Colombia': 'Latin America', 'Peru': 'Latin America', 'Venezuela': 'Latin America',
  'Rest of Latin America': 'Latin America', 'Rest of South America': 'Latin America',
  // Middle East & Africa (also handles files that use "Middle East" without Africa)
  'Saudi Arabia': 'Middle East & Africa', 'UAE': 'Middle East & Africa',
  'United Arab Emirates': 'Middle East & Africa',
  'Israel': 'Middle East & Africa', 'South Africa': 'Middle East & Africa',
  'Egypt': 'Middle East & Africa', 'Turkey': 'Middle East & Africa',
  'Iran': 'Middle East & Africa', 'Iraq': 'Middle East & Africa',
  'Rest of Middle East': 'Middle East & Africa', 'Rest of Africa': 'Middle East & Africa',
  'North Africa': 'Middle East & Africa', 'Central Africa': 'Middle East & Africa',
  'Rest of Middle East & Africa': 'Middle East & Africa',
  // GCC
  'GCC': 'Middle East & Africa', 'Qatar': 'Middle East & Africa', 'Kuwait': 'Middle East & Africa',
  'Oman': 'Middle East & Africa', 'Bahrain': 'Middle East & Africa',
}
