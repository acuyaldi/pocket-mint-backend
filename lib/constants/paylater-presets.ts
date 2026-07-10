/**
 * Preset data bunga PayLater untuk provider umum di Indonesia.
 * Digunakan sebagai helper UX di form wallet dan kalkulator cicilan.
 * Rate = bunga flat per bulan dalam persen (contoh: 2.60 = 2.60%/bulan).
 */
export const PAYLATER_PRESETS = [
  { label: "Kredivo",           value: "kredivo",     rate: 2.60 },
  { label: "Indodana",          value: "indodana",    rate: 3.00 },
  { label: "Home Credit",       value: "homecredit",  rate: 2.95 },
  { label: "SPayLater",         value: "spaylater",   rate: 2.95 },
  { label: "Traveloka PayLater", value: "traveloka",  rate: 2.14 },
  { label: "Akulaku",           value: "akulaku",     rate: 2.50 },
  { label: "BRI Ceria",         value: "briceria",    rate: 1.42 },
  { label: "Atome",             value: "atome",       rate: 0.00 },
  { label: "GoPayLater",        value: "gopaylater",  rate: 2.00 },
  { label: "Custom",            value: "custom",      rate: 0.00 },
] as const;

export type PaylaterPresetValue = (typeof PAYLATER_PRESETS)[number]["value"];
