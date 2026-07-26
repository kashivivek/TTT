export interface CountryMeta {
  name: string;
  continent: string;
}

export const COUNTRY_META: Record<string, CountryMeta> = {
  US: { name: "United States", continent: "North America" },
  CA: { name: "Canada", continent: "North America" },
  MX: { name: "Mexico", continent: "North America" },
  GB: { name: "United Kingdom", continent: "Europe" },
  DE: { name: "Germany", continent: "Europe" },
  FR: { name: "France", continent: "Europe" },
  ES: { name: "Spain", continent: "Europe" },
  IT: { name: "Italy", continent: "Europe" },
  NL: { name: "Netherlands", continent: "Europe" },
  SE: { name: "Sweden", continent: "Europe" },
  NO: { name: "Norway", continent: "Europe" },
  DK: { name: "Denmark", continent: "Europe" },
  FI: { name: "Finland", continent: "Europe" },
  IE: { name: "Ireland", continent: "Europe" },
  BE: { name: "Belgium", continent: "Europe" },
  AU: { name: "Australia", continent: "Oceania" },
  NZ: { name: "New Zealand", continent: "Oceania" },
  BR: { name: "Brazil", continent: "South America" },
  AR: { name: "Argentina", continent: "South America" },
  CL: { name: "Chile", continent: "South America" },
  CO: { name: "Colombia", continent: "South America" },
  PE: { name: "Peru", continent: "South America" },
  ZA: { name: "South Africa", continent: "Africa" },
  EG: { name: "Egypt", continent: "Africa" },
  NG: { name: "Nigeria", continent: "Africa" },
  IN: { name: "India", continent: "Asia" },
  JP: { name: "Japan", continent: "Asia" },
  KR: { name: "South Korea", continent: "Asia" },
  CN: { name: "China", continent: "Asia" },
  HK: { name: "Hong Kong", continent: "Asia" },
  SG: { name: "Singapore", continent: "Asia" },
  TW: { name: "Taiwan", continent: "Asia" },
  TH: { name: "Thailand", continent: "Asia" },
  VN: { name: "Vietnam", continent: "Asia" },
  PH: { name: "Philippines", continent: "Asia" },
  ID: { name: "Indonesia", continent: "Asia" },
  RU: { name: "Russia", continent: "Europe" },
  TR: { name: "Turkey", continent: "Europe" },
  UA: { name: "Ukraine", continent: "Europe" },
};

const CONTINENT_ORDER = [
  "North America",
  "Europe",
  "Asia",
  "Oceania",
  "South America",
  "Africa",
  "Other",
];

export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return code;
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

export function getCountryName(code: string): string {
  return COUNTRY_META[code]?.name || code;
}

export function getCountryContinent(code: string): string {
  return COUNTRY_META[code]?.continent || "Other";
}

export function groupRegionsByContinent(regionCodes: string[]) {
  const unique = Array.from(new Set(regionCodes)).sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)));
  const groups: Record<string, string[]> = {};

  unique.forEach((code) => {
    const continent = getCountryContinent(code);
    if (!groups[continent]) groups[continent] = [];
    groups[continent].push(code);
  });

  return CONTINENT_ORDER.map((continent) => ({
    continent,
    codes: groups[continent] ?? [],
  })).filter((group) => group.codes.length > 0);
}
