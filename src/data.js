import raw from "./suppliers.json";

export const SUPPLIERS = raw.suppliers;

// ── Display helper ───────────────────────────────────────────────
// Every empty/unknown value renders as «не указано».
export const NA = "не указано";

export function show(value) {
  if (value === null || value === undefined || value === "") return NA;
  if (Array.isArray(value)) return value.length ? value.join(", ") : NA;
  return value;
}

// Boolean tri-state → label. true=Да, false=Нет, null=не указано
export function showBool(value) {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  return NA;
}

// ── Filter option sets (derived from the real data) ──────────────
export const CATEGORIES = Array.from(
  new Set(SUPPLIERS.flatMap((s) => s.categories || []))
).sort((a, b) => a.localeCompare(b, "ru"));

export const CITIES = Array.from(
  new Set(SUPPLIERS.map((s) => s.city).filter(Boolean))
).sort((a, b) => a.localeCompare(b, "ru"));

// Producer vs distributor (own_production flag)
export const PRODUCER_OPTIONS = [
  { value: "any", label: "Неважно" },
  { value: "producer", label: "Производитель" },
  { value: "distributor", label: "Дистрибьютор" },
];

export const DELIVERY_OPTIONS = [
  { value: "any", label: "Любая" },
  { value: "own", label: "Своя доставка" },
  { value: "pickup", label: "Самовывоз" },
  { value: "russia", label: "По России" },
];

export const YESNO_OPTIONS = [
  { value: "any", label: "Неважно" },
  { value: "yes", label: "Да" },
];

// ── Filtering logic ──────────────────────────────────────────────
// Hard filters only on well-populated dimensions. Sparse dimensions
// (halal, etc.) treat null as "не указано" — never hide unknowns when
// the user hasn't opted in. When user opts IN, show only confirmed.
export function applyFilters(suppliers, f) {
  return suppliers.filter((s) => {
    // Category — multi-select; supplier matches if it has ANY selected category
    if (f.categories.length > 0) {
      const cats = s.categories || [];
      if (!f.categories.some((c) => cats.includes(c))) return false;
    }

    // City — single
    if (f.city !== "any" && s.city !== f.city) return false;

    // Producer / distributor
    if (f.producer === "producer" && s.own_production !== true) return false;
    if (f.producer === "distributor" && s.own_production !== false) return false;

    // Delivery type
    if (f.delivery === "own" && s.delivery_own_transport !== true) return false;
    if (f.delivery === "pickup" && s.delivery_pickup !== true) return false;
    if (f.delivery === "russia" && s.delivery_russia !== true) return false;

    // HoReCa — opt-in: show only confirmed true
    if (f.horeca === "yes" && s.horeca !== true) return false;

    // Halal — opt-in: show only confirmed true
    if (f.halal === "yes" && s.halal !== true) return false;

    return true;
  });
}

export const EMPTY_FILTERS = {
  categories: [],
  city: "any",
  producer: "any",
  delivery: "any",
  horeca: "any",
  halal: "any",
};
