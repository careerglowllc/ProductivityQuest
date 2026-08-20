import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Link } from "wouter";
import { ArrowLeft, Edit2, X, Plus, Trash2, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

// Use Natural Earth GeoJSON — separates France from its overseas territories,
// and uses ISO_A3 alpha-3 codes directly in properties (no numeric→alpha3 lookup needed).
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// UK constituent nations — separate higher-res layer so we can highlight England/Scotland/Wales/NI individually
const UK_GEO_URL = "https://cdn.jsdelivr.net/gh/martinjc/UK-GeoJSON@master/json/administrative/countries.json";
// US states atlas — all 50 states as separate clickable regions
const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
// Italy regions GeoJSON — used to overlay Sicily (region 19) as a separate clickable region
const ITALY_REGIONS_URL = "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson";
// Canada provinces GeoJSON — all 13 provinces/territories as separate clickable regions
const CANADA_PROVINCES_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson";
// Higher-res world atlas (50m) — used to overlay Hong Kong (id 344) which is invisible at 110m resolution
const WORLD_50M_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// Numeric ISO 3166-1 → alpha-3 lookup for all seeded countries
// IMPORTANT: only countries in this table will ever show as "visited" on the map.
// GBR (826) intentionally NOT listed — UK is rendered via the separate UK nations layer instead.
// HKG (344) intentionally NOT listed here — rendered via the separate 50m overlay instead (too small at 110m).
// USA (840) intentionally NOT listed — rendered via the separate US states layer instead.
// CAN (124) intentionally NOT listed — rendered via the separate Canada provinces layer instead.
// FRA (250): world-atlas includes French Guiana/Martinique etc. in France's polygon — accepted limitation.
const NUMERIC_TO_ALPHA3: Record<string, string> = {
  "484": "MEX", "528": "NLD", "56": "BEL", "372": "IRL", "276": "DEU",
  "392": "JPN", "156": "CHN", "704": "VNM", "764": "THA", "170": "COL",
  "616": "POL", "620": "PRT", "724": "ESP", "250": "FRA",
  "380": "ITA", "203": "CZE", "630": "PRI",
  // HKG (344) omitted — rendered via separate 50m overlay
  "376": "ISR", "158": "TWN",
  // Americas: USA (840) and CAN (124) omitted — rendered via state/province overlays
  // Central/Eastern Europe
  "348": "HUN", "191": "HRV",
};

// UK nation code from feature properties (martinjc dataset uses CTRY*CD codes)
function getUKNationISO(properties: any): string | null {
  const code = properties?.CTRY23CD || properties?.CTRY22CD || properties?.CTRY19CD || properties?.CTRY13CD || "";
  if (code.startsWith("E")) return "ENG";
  if (code.startsWith("S")) return "SCT";
  if (code.startsWith("W")) return "WLS";
  if (code.startsWith("N")) return "NIR";
  return null;
}

// world-atlas's France feature is a single MultiPolygon that bundles overseas territories
// (French Guiana, on the South American coast) in with mainland France/Corsica. Strip out
// any ring whose longitude puts it in the Americas so it doesn't render/highlight as "France".
function stripFrenchOverseas(geo: any) {
  if (geo.geometry?.type !== "MultiPolygon") return geo;
  const coordinates = geo.geometry.coordinates.filter((polygon: number[][][]) => {
    const [lng] = polygon[0][0];
    return lng > -20; // mainland France + Corsica sit between roughly -5 and 9; French Guiana is ~ -53
  });
  return { ...geo, geometry: { ...geo.geometry, coordinates } };
}

// us-atlas FIPS → ISO for all 50 US states (+ DC)
// Alaska and Hawaii keep their legacy keys (ALA/HAW) for backward data compatibility
const US_FIPS_TO_ISO: Record<string, string> = {
  "01": "US-AL", "02": "ALA",  "04": "US-AZ", "05": "US-AR", "06": "US-CA",
  "08": "US-CO", "09": "US-CT", "10": "US-DE", "11": "US-DC", "12": "US-FL",
  "13": "US-GA", "15": "HAW",  "16": "US-ID", "17": "US-IL", "18": "US-IN",
  "19": "US-IA", "20": "US-KS", "21": "US-KY", "22": "US-LA", "23": "US-ME",
  "24": "US-MD", "25": "US-MA", "26": "US-MI", "27": "US-MN", "28": "US-MS",
  "29": "US-MO", "30": "US-MT", "31": "US-NE", "32": "US-NV", "33": "US-NH",
  "34": "US-NJ", "35": "US-NM", "36": "US-NY", "37": "US-NC", "38": "US-ND",
  "39": "US-OH", "40": "US-OK", "41": "US-OR", "42": "US-PA", "44": "US-RI",
  "45": "US-SC", "46": "US-SD", "47": "US-TN", "48": "US-TX", "49": "US-UT",
  "50": "US-VT", "51": "US-VA", "53": "US-WA", "54": "US-WV", "55": "US-WI",
  "56": "US-WY",
};

// Canada province/territory name → ISO
const CANADA_PROVINCE_TO_ISO: Record<string, string> = {
  "Alberta": "CA-AB",
  "British Columbia": "CA-BC",
  "Manitoba": "CA-MB",
  "New Brunswick": "CA-NB",
  "Newfoundland and Labrador": "CA-NL",
  "Northwest Territories": "CA-NT",
  "Nova Scotia": "CA-NS",
  "Nunavut": "CA-NU",
  "Ontario": "CA-ON",
  "Prince Edward Island": "CA-PE",
  "Quebec": "CA-QC",
  "Saskatchewan": "CA-SK",
  "Yukon": "CA-YT",
};

// Italy region istat codes → custom ISOs for regions tracked separately from ITA
// Sicily = region 19
const ITALY_REGION_TO_ISO: Record<string, string> = {
  "19": "SIC",
};

// All tracked ISO codes
const SEED_ISOS = [
  "MEX","NLD","BEL","IRL","DEU","JPN","CHN","VNM","THA","COL",
  "POL","PRT","ESP","FRA","ITA","CZE","HKG","PRI",
  "ISR","TWN",
  // US overall + legacy state keys
  "USA","HAW","ALA",
  // All 50 US states (+ DC)
  "US-AL","US-AZ","US-AR","US-CA","US-CO","US-CT","US-DE","US-DC",
  "US-FL","US-GA","US-ID","US-IL","US-IN","US-IA","US-KS","US-KY",
  "US-LA","US-ME","US-MD","US-MA","US-MI","US-MN","US-MS","US-MO",
  "US-MT","US-NE","US-NV","US-NH","US-NJ","US-NM","US-NY","US-NC",
  "US-ND","US-OH","US-OK","US-OR","US-PA","US-RI","US-SC","US-SD",
  "US-TN","US-TX","US-UT","US-VT","US-VA","US-WA","US-WV","US-WI","US-WY",
  // Canada overall + provinces
  "CAN",
  "CA-AB","CA-BC","CA-MB","CA-NB","CA-NL","CA-NT",
  "CA-NS","CA-NU","CA-ON","CA-PE","CA-QC","CA-SK","CA-YT",
  // Central/Eastern Europe
  "HUN","HRV",
  // UK nations (replacing GBR)
  "ENG","NIR","SCT","WLS",
  // Italian regions
  "SIC",
];

// Display names
const ISO_NAMES: Record<string, string> = {
  MEX: "Mexico", NLD: "Netherlands", BEL: "Belgium", IRL: "Ireland",
  DEU: "Germany", JPN: "Japan", CHN: "China", VNM: "Vietnam",
  THA: "Thailand", COL: "Colombia", POL: "Poland", PRT: "Portugal",
  ESP: "Spain", FRA: "France", ITA: "Italy",
  CZE: "Czechia", HKG: "Hong Kong", PRI: "Puerto Rico",
  ISR: "Israel", TWN: "Taiwan",
  USA: "United States", CAN: "Canada", HAW: "Hawaii 🌺", ALA: "Alaska ❄️",
  HUN: "Hungary", HRV: "Croatia",
  ENG: "England 🏴󠁧󠁢󠁥󠁮󠁧󠁿", SCT: "Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿", WLS: "Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿", NIR: "Northern Ireland",
  SIC: "Sicily 🏝️",
  // US States
  "US-AL": "Alabama", "US-AZ": "Arizona", "US-AR": "Arkansas", "US-CA": "California",
  "US-CO": "Colorado", "US-CT": "Connecticut", "US-DE": "Delaware", "US-DC": "Washington D.C.",
  "US-FL": "Florida", "US-GA": "Georgia", "US-ID": "Idaho", "US-IL": "Illinois",
  "US-IN": "Indiana", "US-IA": "Iowa", "US-KS": "Kansas", "US-KY": "Kentucky",
  "US-LA": "Louisiana", "US-ME": "Maine", "US-MD": "Maryland", "US-MA": "Massachusetts",
  "US-MI": "Michigan", "US-MN": "Minnesota", "US-MS": "Mississippi", "US-MO": "Missouri",
  "US-MT": "Montana", "US-NE": "Nebraska", "US-NV": "Nevada", "US-NH": "New Hampshire",
  "US-NJ": "New Jersey", "US-NM": "New Mexico", "US-NY": "New York", "US-NC": "North Carolina",
  "US-ND": "North Dakota", "US-OH": "Ohio", "US-OK": "Oklahoma", "US-OR": "Oregon",
  "US-PA": "Pennsylvania", "US-RI": "Rhode Island", "US-SC": "South Carolina", "US-SD": "South Dakota",
  "US-TN": "Tennessee", "US-TX": "Texas", "US-UT": "Utah", "US-VT": "Vermont",
  "US-VA": "Virginia", "US-WA": "Washington", "US-WV": "West Virginia",
  "US-WI": "Wisconsin", "US-WY": "Wyoming",
  // Canadian provinces & territories
  "CA-AB": "Alberta", "CA-BC": "British Columbia", "CA-MB": "Manitoba",
  "CA-NB": "New Brunswick", "CA-NL": "Newfoundland & Labrador", "CA-NT": "Northwest Territories",
  "CA-NS": "Nova Scotia", "CA-NU": "Nunavut", "CA-ON": "Ontario",
  "CA-PE": "Prince Edward Island", "CA-QC": "Quebec", "CA-SK": "Saskatchewan", "CA-YT": "Yukon",
};

// Seeded visit dates (v2 migration)
const SEED_DATES: Record<string, string> = {
  MEX: "2024",
  CHN: "2023, 2024, 2025",
  HKG: "2024, 2025",
  ISR: "2024",
  TWN: "2022",
  JPN: "2023",
  VNM: "2022, 2025",
  PRT: "2023",
  CZE: "2023",
  POL: "2023",
  THA: "2022",
  HAW: "2024",
  PRI: "2024",
  COL: "2024, 2025, 2026",
  IRL: "2016",
  ITA: "2016",
  DEU: "2016",
  BEL: "2016",
  NLD: "2016",
  ESP: "2016",
  FRA: "2016",
  HUN: "2016",
  HRV: "2016",
  USA: "multiple",
  CAN: "visited",
  // UK nations
  ENG: "2016",
  NIR: "2016",
};

// Seeded city data (v3 migration)
const SEED_CITIES: Record<string, string[]> = {
  MEX: ["Mexico City", "Tulum"],
  CHN: ["Shanghai", "Beijing", "Shenzhen", "Guangzhou"],
  HKG: ["Hong Kong Island", "Kowloon"],
  ISR: ["Tel Aviv", "Jerusalem"],
  TWN: ["Taipei"],
  JPN: ["Tokyo", "Kyoto", "Osaka"],
  VNM: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  PRT: ["Lisbon", "Porto"],
  CZE: ["Prague"],
  POL: ["Kraków", "Warsaw"],
  THA: ["Bangkok", "Chiang Mai", "Phuket"],
  HAW: ["Honolulu", "Maui"],
  PRI: ["San Juan"],
  COL: ["Medellín", "Cartagena", "Bogotá"],
  IRL: ["Dublin"],
  ITA: ["Rome", "Florence", "Venice", "Milan"],
  DEU: ["Munich", "Berlin"],
  BEL: ["Brussels", "Bruges"],
  NLD: ["Amsterdam"],
  ESP: ["Madrid", "Barcelona"],
  FRA: ["Paris"],
  HUN: ["Budapest"],
  HRV: ["Zagreb", "Dubrovnik", "Split"],
  USA: ["New York", "San Francisco", "Los Angeles", "Chicago", "Seattle", "Sacramento"],
  CAN: ["Vancouver", "Toronto"],
  ENG: ["London"],
  NIR: ["Belfast"],
};

interface CountryEntry {
  visitedAt: string;
  cities: string[];
  highlights: string[];
  lowlights: string[];
  lessons: string[];
}

type EditForm = CountryEntry & { name: string; iso: string };

const EMPTY_ENTRY = (): CountryEntry => ({
  visitedAt: "", cities: [], highlights: [], lowlights: [], lessons: [],
});

const ensure = (arr?: string[]) => (arr && arr.length ? arr : [""]);

function storageKey(iso: string) { return `country-${iso}`; }

export default function CountriesVisitedPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  const { data: kvData = {}, isSuccess } = useQuery<Record<string, string>>({
    queryKey: ["/api/user-data"],
    queryFn: async () => {
      const r = await fetch("/api/user-data", { credentials: "include" });
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { updates?: Record<string, string>; deletes?: string[] }) =>
      apiRequest("PUT", "/api/user-data", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-data"] }),
  });

  // Seeding / migration
  useEffect(() => {
    if (!isSuccess || seededRef.current) return;
    seededRef.current = true;
    const updates: Record<string, string> = {};

    // Always ensure all SEED_ISOS exist as entries
    for (const iso of SEED_ISOS) {
      if (!kvData[storageKey(iso)]) {
        updates[storageKey(iso)] = JSON.stringify(EMPTY_ENTRY());
      }
    }

    // v2 migration: apply known dates if not already applied
    if (!kvData["country-__v2"]) {
      for (const [iso, date] of Object.entries(SEED_DATES)) {
        const existing: CountryEntry = kvData[storageKey(iso)]
          ? JSON.parse(kvData[storageKey(iso)])
          : EMPTY_ENTRY();
        // Only set if visitedAt is blank
        if (!existing.visitedAt) {
          updates[storageKey(iso)] = JSON.stringify({ ...existing, visitedAt: date });
        }
      }
      updates["country-__v2"] = "1";
    }

    // v3 migration: apply known cities if not already applied
    if (!kvData["country-__v3"]) {
      for (const [iso, cities] of Object.entries(SEED_CITIES)) {
        const raw = updates[storageKey(iso)] ?? kvData[storageKey(iso)];
        const existing: CountryEntry = raw ? JSON.parse(raw) : EMPTY_ENTRY();
        // Only set cities if currently empty
        if (!existing.cities || existing.cities.length === 0) {
          const date = existing.visitedAt || SEED_DATES[iso] || "";
          updates[storageKey(iso)] = JSON.stringify({ ...existing, visitedAt: date, cities });
        }
      }
      updates["country-__v3"] = "1";
    }

    // v4 migration: replace GBR with individual UK nations
    if (!kvData["country-__v4"]) {
      // Seed England (visited 2016, London)
      if (!kvData["country-ENG"]) {
        updates["country-ENG"] = JSON.stringify({ visitedAt: "2016", cities: ["London"], highlights: [], lowlights: [], lessons: [] });
      }
      // Seed Northern Ireland (visited 2016, Belfast)
      if (!kvData["country-NIR"]) {
        updates["country-NIR"] = JSON.stringify({ visitedAt: "2016", cities: ["Belfast"], highlights: [], lowlights: [], lessons: [] });
      }
      // Seed Scotland and Wales as empty (not visited)
      if (!kvData["country-SCT"]) {
        updates["country-SCT"] = JSON.stringify(EMPTY_ENTRY());
      }
      if (!kvData["country-WLS"]) {
        updates["country-WLS"] = JSON.stringify(EMPTY_ENTRY());
      }
      updates["country-__v4"] = "1";
    }

    // v5 migration: add Canada, Hungary, Croatia, USA, Alaska
    if (!kvData["country-__v5"]) {
      const v5Seeds: Record<string, CountryEntry> = {
        CAN: { visitedAt: "visited", cities: ["Vancouver", "Toronto"], highlights: [], lowlights: [], lessons: [] },
        HUN: { visitedAt: "2016", cities: ["Budapest"], highlights: [], lowlights: [], lessons: [] },
        HRV: { visitedAt: "2016", cities: ["Zagreb", "Dubrovnik", "Split"], highlights: [], lowlights: [], lessons: [] },
        USA: { visitedAt: "multiple", cities: ["New York", "San Francisco", "Los Angeles", "Chicago", "Seattle", "Sacramento"], highlights: [], lowlights: [], lessons: [] },
        // Alaska — not visited (empty entry so it can be edited later)
        ALA: EMPTY_ENTRY(),
        // Sicily — not visited (separate from Italy)
        SIC: EMPTY_ENTRY(),
      };
      for (const [iso, entry] of Object.entries(v5Seeds)) {
        if (!kvData[storageKey(iso)]) {
          updates[storageKey(iso)] = JSON.stringify(entry);
        }
      }
      updates["country-__v5"] = "1";
    }

    // v6 migration: force-seed Belgium (may have been missed or stored empty in earlier migrations)
    if (!kvData["country-__v6"]) {
      const belRaw = updates[storageKey("BEL")] ?? kvData[storageKey("BEL")];
      const belExisting: CountryEntry = belRaw ? JSON.parse(belRaw) : EMPTY_ENTRY();
      updates[storageKey("BEL")] = JSON.stringify({
        ...belExisting,
        visitedAt: belExisting.visitedAt || "2016",
        cities: belExisting.cities?.length ? belExisting.cities : ["Brussels", "Bruges"],
      });
      updates["country-__v6"] = "1";
    }

    // v7 migration: seed empty entries for all US states and Canadian provinces
    if (!kvData["country-__v7"]) {
      const newISOs = [
        "US-AL","US-AZ","US-AR","US-CA","US-CO","US-CT","US-DE","US-DC",
        "US-FL","US-GA","US-ID","US-IL","US-IN","US-IA","US-KS","US-KY",
        "US-LA","US-ME","US-MD","US-MA","US-MI","US-MN","US-MS","US-MO",
        "US-MT","US-NE","US-NV","US-NH","US-NJ","US-NM","US-NY","US-NC",
        "US-ND","US-OH","US-OK","US-OR","US-PA","US-RI","US-SC","US-SD",
        "US-TN","US-TX","US-UT","US-VT","US-VA","US-WA","US-WV","US-WI","US-WY",
        "CA-AB","CA-BC","CA-MB","CA-NB","CA-NL","CA-NT",
        "CA-NS","CA-NU","CA-ON","CA-PE","CA-QC","CA-SK","CA-YT",
      ];
      for (const iso of newISOs) {
        if (!kvData[storageKey(iso)]) {
          updates[storageKey(iso)] = JSON.stringify(EMPTY_ENTRY());
        }
      }
      updates["country-__v7"] = "1";
    }

    // v8 migration: mark NY, CA, TX, MA, FL, ME, LA as visited
    if (!kvData["country-__v8"]) {
      const v8Isos = ["US-NY", "US-CA", "US-TX", "US-MA", "US-FL", "US-ME", "US-LA", "US-NV"];
      for (const iso of v8Isos) {
        const raw = updates[storageKey(iso)] ?? kvData[storageKey(iso)];
        const existing: CountryEntry = raw ? JSON.parse(raw) : EMPTY_ENTRY();
        if (!existing.visitedAt) {
          updates[storageKey(iso)] = JSON.stringify({ ...existing, visitedAt: "visited" });
        }
      }
      updates["country-__v8"] = "1";
    }

    if (Object.keys(updates).length > 0) {
      saveMutation.mutate({
        updates,
        deletes: !kvData["country-__v4"] ? ["country-GBR"] : undefined,
      });
    }
  }, [isSuccess, kvData]);

  // Parse visited countries (exclude internal migration keys)
  // A country counts as "visited" only if it has a visitedAt date or at least one city
  const visitedMap: Record<string, CountryEntry> = {};
  for (const [k, v] of Object.entries(kvData)) {
    if (k.startsWith("country-") && !k.startsWith("country-__")) {
      try { visitedMap[k.slice(8)] = JSON.parse(v); } catch {}
    }
  }
  // For count display: only entries that have actual visit data
  const visitedIsos = Object.keys(visitedMap).filter(iso => {
    const e = visitedMap[iso];
    return e.visitedAt || (e.cities && e.cities.length > 0);
  });

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Selected country popup
  const [selected, setSelected] = useState<{ iso: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // Zoom/pan
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Name cache (preload with known names)
  const [nameCache, setNameCache] = useState<Record<string, string>>({ ...ISO_NAMES });

  const openCountry = (iso: string, name: string) => {
    setNameCache(c => ({ ...c, [iso]: name }));
    setSelected({ iso, name });
    setEditing(false);
    setTooltip(null);
  };

  const startEdit = () => {
    if (!selected) return;
    const existing = visitedMap[selected.iso] ?? EMPTY_ENTRY();
    setEditForm({
      visitedAt: existing.visitedAt,
      cities: ensure(existing.cities),
      highlights: ensure(existing.highlights),
      lowlights: ensure(existing.lowlights),
      lessons: ensure(existing.lessons),
      name: selected.name,
      iso: selected.iso,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editForm) return;
    const clean = (arr: string[]) => arr.filter(s => s.trim());
    const entry: CountryEntry = {
      visitedAt: editForm.visitedAt,
      cities: clean(editForm.cities),
      highlights: clean(editForm.highlights),
      lowlights: clean(editForm.lowlights),
      lessons: clean(editForm.lessons),
    };
    saveMutation.mutate({ updates: { [storageKey(editForm.iso)]: JSON.stringify(entry) } });
    setEditing(false);
  };

  const removeCountry = (iso: string) => {
    saveMutation.mutate({ deletes: [storageKey(iso)] });
    setSelected(null);
  };

  type BulletField = "cities" | "highlights" | "lowlights" | "lessons";
  const updateList = (field: BulletField, idx: number, val: string) => {
    if (!editForm) return;
    const arr = [...editForm[field]]; arr[idx] = val;
    setEditForm({ ...editForm, [field]: arr });
  };
  const addItem = (field: BulletField) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: [...editForm[field], ""] });
  };
  const removeItem = (field: BulletField, idx: number) => {
    if (!editForm) return;
    const arr = editForm[field].filter((_, i) => i !== idx);
    setEditForm({ ...editForm, [field]: arr.length ? arr : [""] });
  };

  const selectedEntry = selected ? visitedMap[selected.iso] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-sky-950 pb-24">
      {/* Header */}
      <div className={`${isMobile ? "px-4 pt-4" : "px-6 pt-20"} max-w-7xl mx-auto`}>
        <Link href="/explore">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-300 text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Explore
          </a>
        </Link>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-sky-400" />
            <h1 className="text-2xl font-serif font-bold text-white">Countries Visited</h1>
          </div>
          <div className="text-sm text-sky-300 font-semibold">
            {visitedIsos.length} {visitedIsos.length === 1 ? "country" : "countries"}
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Click any country to log your visit. Highlighted = visited. Hover to see names.
        </p>
      </div>

      {/* Map */}
      <div className="relative w-full" style={{ height: isMobile ? "70vw" : "min(85vh, 1100px)" }}>
        <ComposableMap
          projection="geoEqualEarth"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 195 }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={({ zoom, coordinates }: { zoom: number; coordinates: [number, number] }) =>
              setPosition({ zoom, coordinates })
            }
            minZoom={0.8}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  // Resolve ISO: only trust our explicit lookup table for visited status.
                  // Fallback to geo properties for display name / click handling only.
                  const numericId = String(geo.id ?? "");
                  const isoFromTable = NUMERIC_TO_ALPHA3[numericId];
                  const iso = isoFromTable ?? geo.properties?.ISO_A3 ?? numericId;
                  // Skip GBR entirely — rendered by the separate UK nations layer (England/Scotland/Wales/NI)
                  if (numericId === "826" || iso === "GBR") return null;
                  // Skip USA and CAN — rendered by separate state/province layers
                  if (numericId === "840" || numericId === "124") return null;
                  const name = ISO_NAMES[iso] ?? geo.properties?.NAME ?? geo.properties?.name ?? iso;
                  // Only mark visited if the ISO came from our trusted lookup table
                  const visited = isoFromTable !== undefined && Object.prototype.hasOwnProperty.call(visitedMap, isoFromTable);
                  const isSelected = selected?.iso === iso;
                  const displayGeo = numericId === "250" ? stripFrenchOverseas(geo) : geo;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={displayGeo}
                      onClick={() => openCountry(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          // Visited = filled blue; selected-only = dark fill + bright outline
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#334155",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.4,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#1e3a5f",
                          stroke: visited ? "#0c4a6e" : "#38BDF8",
                          strokeWidth: visited ? 0.4 : 1.5,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: {
                          fill: visited ? "#0EA5E9" : "#1e3a5f",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* UK Nations layer — overlays England/Scotland/Wales/NI as separate clickable regions */}
            <Geographies geography={UK_GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const iso = getUKNationISO(geo.properties);
                  if (!iso) return null;
                  const name = ISO_NAMES[iso] ?? iso;
                  const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso)
                    && !!(visitedMap[iso]?.visitedAt || visitedMap[iso]?.cities?.length);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey ?? iso}
                      geography={geo}
                      onClick={() => openCountry(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#4a5568",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.6,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#1e3a5f",
                          stroke: visited ? "#0c4a6e" : "#38BDF8",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: visited ? "#0EA5E9" : "#1e3a5f", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* US states overlay — all 50 states as individual clickable regions */}
            <Geographies geography={US_ATLAS_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  // us-atlas FIPS id is a number like 2 or 15; pad to 2 digits
                  const fips = String(geo.id ?? "").padStart(2, "0");
                  const iso = US_FIPS_TO_ISO[fips];
                  if (!iso) return null; // skip DC (11) or any unmapped territory
                  const name = ISO_NAMES[iso] ?? iso;
                  const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso)
                    && !!(visitedMap[iso]?.visitedAt || visitedMap[iso]?.cities?.length);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey ?? iso}
                      geography={geo}
                      onClick={() => openCountry(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#4a5568",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.6,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#1e3a5f",
                          stroke: visited ? "#0c4a6e" : "#38BDF8",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: visited ? "#0EA5E9" : "#1e3a5f", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Canada provinces overlay — all 13 provinces/territories as individual clickable regions */}
            <Geographies geography={CANADA_PROVINCES_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const provinceName = geo.properties?.name ?? geo.properties?.NAME ?? "";
                  const iso = CANADA_PROVINCE_TO_ISO[provinceName];
                  if (!iso) return null;
                  const name = ISO_NAMES[iso] ?? provinceName;
                  const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso)
                    && !!(visitedMap[iso]?.visitedAt || visitedMap[iso]?.cities?.length);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey ?? iso}
                      geography={geo}
                      onClick={() => openCountry(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#4a5568",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.4,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#1e3a5f",
                          stroke: visited ? "#0c4a6e" : "#38BDF8",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: visited ? "#0EA5E9" : "#1e3a5f", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Sicily overlay — separate clickable region drawn on top of the Italy polygon */}
            <Geographies geography={ITALY_REGIONS_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const regionCode = String(geo.properties?.reg_istat_code_num ?? "");
                  const iso = ITALY_REGION_TO_ISO[regionCode];
                  if (!iso) return null;
                  const name = ISO_NAMES[iso] ?? iso;
                  const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso)
                    && !!(visitedMap[iso]?.visitedAt || visitedMap[iso]?.cities?.length);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey ?? iso}
                      geography={geo}
                      onClick={() => openCountry(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#4a5568",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.6,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#1e3a5f",
                          stroke: visited ? "#0c4a6e" : "#38BDF8",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: visited ? "#0EA5E9" : "#1e3a5f", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Hong Kong overlay — rendered from 50m atlas since HKG (id 344) is invisible at 110m */}
            <Geographies geography={WORLD_50M_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies
                  .filter((geo: any) => String(geo.id) === "344")
                  .map((geo: any) => {
                    const iso = "HKG";
                    const name = ISO_NAMES[iso] ?? iso;
                    const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso)
                      && !!(visitedMap[iso]?.visitedAt || visitedMap[iso]?.cities?.length);
                    const isSelected = selected?.iso === iso;
                    return (
                      <Geography
                        key={geo.rsmKey ?? "HKG"}
                        geography={geo}
                        onClick={() => openCountry(iso, name)}
                        onMouseEnter={(e: any) => {
                          const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                          setTooltip({
                            name,
                            x: svgRect ? e.clientX - svgRect.left : 0,
                            y: svgRect ? e.clientY - svgRect.top : 0,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          default: {
                            fill: visited ? "#38BDF8" : "#1e293b",
                            stroke: isSelected ? "#38BDF8" : visited ? "#0c4a6e" : "#4a5568",
                            strokeWidth: isSelected ? (visited ? 0 : 2) : 0.8,
                            outline: "none",
                            cursor: "pointer",
                            filter: isSelected && !visited ? "drop-shadow(0 0 4px #38BDF8)" : "none",
                          },
                          hover: {
                            fill: visited ? "#7DD3FC" : "#1e3a5f",
                            stroke: visited ? "#0c4a6e" : "#38BDF8",
                            strokeWidth: 1.2,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: { fill: visited ? "#0EA5E9" : "#1e3a5f", outline: "none" },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip */}
        {tooltip && !selected && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600/60 shadow-lg whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: Math.max(0, tooltip.y - 32) }}
          >
            {tooltip.name}
          </div>
        )}

        {/* Map controls — top right: zoom + pan */}
        <div className="absolute top-3 right-3 flex flex-col items-center gap-1 z-10 select-none">
          {/* Zoom in */}
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Zoom in"
          >+</button>
          {/* Zoom out */}
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Zoom out"
          >−</button>
          {/* Divider */}
          <div className="w-9 h-px bg-slate-600 my-0.5" />
          {/* Pan up */}
          <button
            onClick={() => setPosition(p => ({ ...p, coordinates: [p.coordinates[0], Math.min(p.coordinates[1] + 15 / p.zoom, 85)] as [number, number] }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-base hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Pan up"
          >▲</button>
          {/* Pan left / right row */}
          <div className="flex gap-1">
            <button
              onClick={() => setPosition(p => ({ ...p, coordinates: [p.coordinates[0] - 30 / p.zoom, p.coordinates[1]] as [number, number] }))}
              className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-base hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
              title="Pan left"
            >◀</button>
            <button
              onClick={() => setPosition(p => ({ ...p, coordinates: [p.coordinates[0] + 30 / p.zoom, p.coordinates[1]] as [number, number] }))}
              className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-base hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
              title="Pan right"
            >▶</button>
          </div>
          {/* Pan down */}
          <button
            onClick={() => setPosition(p => ({ ...p, coordinates: [p.coordinates[0], Math.max(p.coordinates[1] - 15 / p.zoom, -85)] as [number, number] }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-base hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Pan down"
          >▼</button>
          {/* Reset */}
          <div className="w-9 h-px bg-slate-600 my-0.5" />
          <button
            onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-slate-400 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-slate-700 hover:text-white active:scale-95 shadow-lg transition-colors"
            title="Reset view"
          >⌂</button>
        </div>

        {/* Country popup */}
        {selected && !editing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92vw] max-w-md bg-slate-900/97 border border-sky-500/40 rounded-2xl shadow-2xl p-4 z-10"
            style={{ backdropFilter: "blur(12px)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                {selectedEntry?.visitedAt && <p className="text-sky-300 text-sm">📅 {selectedEntry.visitedAt}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={startEdit} className="p-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/40" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                {selectedEntry && (
                  <button onClick={() => removeCountry(selected.iso)} className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:bg-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedEntry ? (
              <div className="space-y-2.5 text-sm max-h-52 overflow-y-auto pr-1">
                {selectedEntry.cities?.length > 0 && (
                  <div>
                    <p className="text-sky-400 font-semibold text-xs uppercase tracking-wide mb-1">📍 Cities / Towns</p>
                    <p className="text-slate-300">{selectedEntry.cities.join(", ")}</p>
                  </div>
                )}
                {selectedEntry.highlights?.length > 0 && (
                  <div>
                    <p className="text-green-400 font-semibold text-xs uppercase tracking-wide mb-1">✨ Highlights</p>
                    {selectedEntry.highlights.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
                {selectedEntry.lowlights?.length > 0 && (
                  <div>
                    <p className="text-orange-400 font-semibold text-xs uppercase tracking-wide mb-1">😬 Lowlights</p>
                    {selectedEntry.lowlights.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
                {selectedEntry.lessons?.length > 0 && (
                  <div>
                    <p className="text-purple-400 font-semibold text-xs uppercase tracking-wide mb-1">💡 Lessons Learned</p>
                    {selectedEntry.lessons.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
                {!selectedEntry.cities?.length && !selectedEntry.highlights?.length && !selectedEntry.lowlights?.length && !selectedEntry.lessons?.length && (
                  <p className="text-slate-500 text-sm">Tap ✏️ to add details about your visit.</p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Tap ✏️ to log this visit.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit panel */}
      {editing && editForm && (
        <div
          className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center"} justify-center`}
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(false); }}
        >
          <div className={`w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 border border-sky-500/30 ${isMobile ? "rounded-t-3xl" : "rounded-2xl"} p-5 max-h-[88vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">✏️ {editForm.name}</h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-sky-300 uppercase tracking-wide font-semibold mb-1 block">📅 When did you visit?</label>
              <Input value={editForm.visitedAt} onChange={e => setEditForm({ ...editForm, visitedAt: e.target.value })}
                placeholder="e.g. March 2019, Summer 2022" className="bg-slate-800/50 border-sky-500/30 text-white h-9 text-sm" />
            </div>

            {([
              { field: "cities" as const, label: "📍 Cities / Towns Visited", color: "text-sky-400", ph: "Add a city or town..." },
              { field: "highlights" as const, label: "✨ Highlights", color: "text-green-400", ph: "Add a highlight..." },
              { field: "lowlights" as const, label: "😬 Lowlights", color: "text-orange-400", ph: "Add a lowlight..." },
              { field: "lessons" as const, label: "💡 Lessons Learned", color: "text-purple-400", ph: "Add a lesson..." },
            ]).map(({ field, label, color, ph }) => (
              <div key={field} className="mb-4">
                <label className={`text-xs uppercase tracking-wide font-semibold mb-1.5 block ${color}`}>{label}</label>
                {editForm[field].map((item, idx) => (
                  <div key={idx} className="flex gap-1.5 mb-1.5">
                    <Input value={item} onChange={e => updateList(field, idx, e.target.value)}
                      placeholder={ph} className="bg-slate-800/50 border-slate-600/40 text-white h-8 text-sm flex-1" />
                    <button onClick={() => removeItem(field, idx)} className="p-1.5 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => addItem(field)} className={`text-xs flex items-center gap-1 mt-0.5 ${color} hover:opacity-75`}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={saveMutation.isPending} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white">
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Visited chips */}
      {visitedIsos.length > 0 && (
        <div className={`${isMobile ? "px-4" : "px-6"} max-w-7xl mx-auto mt-6`}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Your Visited Countries ({visitedIsos.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {visitedIsos.sort().map(iso => (
              <button key={iso} onClick={() => openCountry(iso, nameCache[iso] ?? iso)}
                className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/30 transition-colors">
                {nameCache[iso] ?? iso}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
