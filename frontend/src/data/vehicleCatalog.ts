/** Vehicle registration options — aligned with NavigatorVMS (Suvash) reference project. */

export const VEHICLE_CATEGORIES = [
  "Car",
  "Van",
  "Bus",
  "Truck",
  "Pickup",
  "Trailer",
  "Dozer",
  "Bike",
  "Other",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

/** Common fleet brands in Nepal + construction; models per make. */
export const VEHICLE_MAKE_MODELS: Record<string, string[]> = {
  Tata: ["Prima", "Starbus Ultra", "Ace", "LPT", "Signa", "Xenon"],
  Mahindra: ["Bolero", "Scorpio", "XUV700", "Blazo", "Jeeto"],
  "Ashok Leyland": ["Viking", "Boss", "Dost", "Partner"],
  Eicher: ["Skyline", "Pro 6048", "Pro 3015"],
  Suzuki: ["Dzire", "Ertiga", "Carry", "Swift"],
  Toyota: ["Hilux", "Land Cruiser", "Hiace"],
  Hyundai: ["Creta", "Accent", "H-1"],
  Ford: ["Ranger", "Transit"],
  Isuzu: ["NPR", "FVR", "D-Max"],
  JCB: ["3DX", "4DX", "JS205"],
  Caterpillar: ["320D", "950H", "424B"],
  Volvo: ["FH", "FM", "EC210"],
  Komatsu: ["PC200", "WA380"],
  Daihatsu: ["Terios", "Mira", "Hijet"],
  Datsun: ["Go", "Redi-Go"],
  Dodge: ["Ram", "Journey"],
  Daewoo: ["Lanos", "Matiz"],
  Bosch: [],
  Makita: [],
};

export const VEHICLE_MAKES = Object.keys(VEHICLE_MAKE_MODELS).sort();

export const MAKE_OTHER = "__other__";
export const MODEL_OTHER = "__other__";

export function modelsForMake(make: string): string[] {
  if (!make || make === MAKE_OTHER) return [];
  return VEHICLE_MAKE_MODELS[make] ?? [];
}
