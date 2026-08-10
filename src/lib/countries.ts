export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "SY", name: "سوريا", dial: "+963", flag: "🇸🇾" },
  { code: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪" },
  { code: "EG", name: "مصر", dial: "+20", flag: "🇪🇬" },
  { code: "JO", name: "الأردن", dial: "+962", flag: "🇯🇴" },
  { code: "PS", name: "فلسطين", dial: "+970", flag: "🇵🇸" },
  { code: "LB", name: "لبنان", dial: "+961", flag: "🇱🇧" },
  { code: "IQ", name: "العراق", dial: "+964", flag: "🇮🇶" },
  { code: "KW", name: "الكويت", dial: "+965", flag: "🇰🇼" },
  { code: "QA", name: "قطر", dial: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "عُمان", dial: "+968", flag: "🇴🇲" },
  { code: "YE", name: "اليمن", dial: "+967", flag: "🇾🇪" },
  { code: "SD", name: "السودان", dial: "+249", flag: "🇸🇩" },
  { code: "LY", name: "ليبيا", dial: "+218", flag: "🇱🇾" },
  { code: "TN", name: "تونس", dial: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "الجزائر", dial: "+213", flag: "🇩🇿" },
  { code: "MA", name: "المغرب", dial: "+212", flag: "🇲🇦" },
  { code: "MR", name: "موريتانيا", dial: "+222", flag: "🇲🇷" },
  { code: "SO", name: "الصومال", dial: "+252", flag: "🇸🇴" },
  { code: "DJ", name: "جيبوتي", dial: "+253", flag: "🇩🇯" },
  { code: "KM", name: "جزر القمر", dial: "+269", flag: "🇰🇲" },
  { code: "TR", name: "تركيا", dial: "+90", flag: "🇹🇷" },
  { code: "DE", name: "ألمانيا", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "فرنسا", dial: "+33", flag: "🇫🇷" },
  { code: "NL", name: "هولندا", dial: "+31", flag: "🇳🇱" },
  { code: "SE", name: "السويد", dial: "+46", flag: "🇸🇪" },
  { code: "GB", name: "بريطانيا", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "أمريكا", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "كندا", dial: "+1", flag: "🇨🇦" },
  { code: "MY", name: "ماليزيا", dial: "+60", flag: "🇲🇾" },
  { code: "ID", name: "إندونيسيا", dial: "+62", flag: "🇮🇩" },
  { code: "PK", name: "باكستان", dial: "+92", flag: "🇵🇰" },
];

export const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);

export function flagOf(name?: string | null) {
  return COUNTRIES.find((c) => c.name === name)?.flag ?? "";
}
