/**
 * Major cities and towns in Nepal for operation route pickers.
 * Adapted from NavigatorVMS (Suvash) reference project.
 */
const RAW: string[] = [
  "Amargadhi", "Attariya", "Baglung", "Baitadi", "Banepa", "Bardaghat", "Bardiya", "Barhabise",
  "Besisahar", "Bhadrapur", "Bhairahawa", "Bhaktapur", "Beni", "Bharatpur", "Bhimdatta", "Bhojpur",
  "Biratnagar", "Birendranagar", "Birgunj", "Birtamod", "Budhanilkantha", "Butwal", "Chainpur",
  "Chandannath", "Chandragiri", "Charikot", "Damak", "Dadeldhura", "Dailekh", "Damauli", "Dang",
  "Darchula", "Dhangadhi", "Dhankuta", "Dhulikhel", "Diktel", "Dipayal", "Duhabi", "Gaighat", "Gaur",
  "Ghorahi", "Godawari", "Gokarneshwar", "Gulariya", "Gurbhakot", "Hetauda", "Ilam", "Inaruwa",
  "Itahari", "Jaleshwor", "Janakpur", "Jiri", "Jomsom", "Jumla", "Kageshwari-Manohara", "Kalaiya",
  "Kamalbazar", "Kanchanpur", "Kapilvastu", "Khandbari", "Khotang", "Kathmandu", "Kirtipur", "Kohalpur",
  "Kushma", "Lahan", "Lalitpur", "Lamjung", "Letang", "Lubhu", "Madhyapur Thimi", "Malangawa", "Manang",
  "Mechinagar", "Nagarkot", "Narayan", "Nepalgunj", "Palpa", "Panauti", "Panchkhal", "Parasi", "Phidim",
  "Pokhara", "Putalibazar", "Pyuthan", "Rajbiraj", "Ramechhap", "Resunga", "Rukum", "Sandhikharka",
  "Shankharapur", "Siddharthanagar", "Sindhuli", "Surkhet", "Syangja", "Tansen", "Tarakeshwar", "Tikapur",
  "Tokha", "Triyuga", "Tulsipur", "Urlabari", "Waling",
];

function uniqueSorted(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  out.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  return out;
}

export const NEPAL_PLACE_NAMES: readonly string[] = uniqueSorted(RAW);

export function filterNepalPlacesByPrefix(query: string, limit = 18): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: string[] = [];
  for (const p of NEPAL_PLACE_NAMES) {
    if (p.toLowerCase().startsWith(q)) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}
