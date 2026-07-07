import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import {
  Trash2, Plus, PieChart, List, AlertCircle, CheckCircle, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Wallet, PiggyBank,
  BarChart3, Filter, Download, Bitcoin, RefreshCw, Edit3, GripVertical, CreditCard, Building2, Scale, Briefcase
} from "lucide-react";
import {
  Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ReferenceLine, Area, AreaChart
} from "recharts";
import type { FinancialItem, NwSnapshot } from "@shared/schema";

const CATEGORIES = [
  "General", "Business", "Entertainment", "Food", "Housing", "Transportation",
  "Phone", "Internet", "Insurance", "Credit Card", "Health (Non Insurance)",
  "Toiletries", "Charity", "Income", "Retirement", "Investment"
];

const RECUR_TYPES = [
  "Monthly", "Yearly (Amortized)", "Biweekly (Summed Monthly)", "2x a Year"
];

const INCOME_CATEGORIES = ["Income", "Investment"];
const RETIREMENT_CATEGORIES = ["Retirement"];

function classifyItem(category: string, tags?: string[] | null): "income" | "retirement" | "expense" {
  if (INCOME_CATEGORIES.includes(category)) return "income";
  if (tags && INCOME_CATEGORIES.some(c => tags.includes(c))) return "income";
  if (RETIREMENT_CATEGORIES.includes(category)) return "retirement";
  if (tags && RETIREMENT_CATEGORIES.some(c => tags.includes(c))) return "retirement";
  return "expense";
}

// ── FIRE COL Methodology Essays (file-level to avoid TSX parser issues) ──
const FIRE_METHODOLOGY: Record<"thailand" | "vietnam" | "colombia" | "puertoRico" | "austin" | "auburn", string> = {  thailand: [
    "These figures deliberately sit above the \"Chiang Mai for $1,200/mo\" blog posts you'll find everywhere. Those numbers assume you're eating street food every meal, living in a shared house on the outskirts, and speaking Thai well enough to negotiate. None of that is realistic for a Western expat retiring early.",
    "Here's how each line was built:",
    "Housing ($750/mo): A clean, modern 1-bedroom in Nimman Road or Santitham — Chiang Mai's expat-friendly zones with walkability, coworking access, and English-speaking neighbors. Budget places exist for $300–$400 but they tend to be older buildings with inconsistent water pressure, poor insulation from heat, and less secure access. Going slightly premium here is the right call — you're living in it every day.",
    "Food ($500/mo): Street food is incredible and cheap (~$1–2/meal) but a balanced, sustainable diet means mixing in western breakfasts, imported goods from Rimping or Tops supermarket, and the occasional sit-down restaurant. $500 is realistic for someone who eats well, not extravagantly.",
    "Transportation ($120/mo): A $1,500 scooter owned outright + gas + maintenance amortized, plus Grab/taxi for rainy days and airport runs. Chiang Mai is not walkable without a bike.",
    "Health insurance ($150/mo): Non-negotiable. Local Thai public hospitals are functional but you'll want international coverage for evacuations, surgeries, or anything serious. BUPA Thailand or Cigna Global at a decent deductible runs $100–$200/mo for someone in their 30s.",
    "Entertainment ($250/mo): Gym membership ($30–50), a few nights out, cafés (you'll spend many hours in them), weekend trips to Pai or Chiang Rai, and the occasional flight to Bangkok. Thailand makes this easy to spend without trying.",
    "Utilities + internet ($100/mo): AC is expensive — running it 8+ hours/day in hot season will cost you. Fiber internet is excellent ($15–25/mo) but electricity can run $60–80/mo with AC use.",
    "Visa + buffer ($230/mo): Thailand's Long Term Resident Visa ($10K/5yr = ~$167/mo amortized) or the Thailand Elite card removes the visa-run headache. Budget for 2–3 flights back to the US or neighboring countries per year, plus unexpected costs (medical copays, gear replacements, etc.).",
    "The real FIRE life here: Chiang Mai is the undisputed king of digital nomad / early retiree living in Southeast Asia. Cost is low enough that your portfolio does the work effortlessly. Culture is rich, food is world-class, expat community is enormous, and northern Thailand has cooler temperatures than Bangkok. The tradeoff: it's landlocked, air quality deteriorates March–April (burning season), and you will feel the cultural distance from the West after a year or two. Plan for 1–2 annual US trips ($1,500–$3,000 each) built into this budget.",
  ].join("\n\n"),
  vietnam: [
    "Da Nang is the most underrated FIRE destination on this list. It's a mid-sized coastal city with a beach you can literally walk to from your apartment, a lower cost of living than Hanoi or Ho Chi Minh City, decent expat infrastructure, and surprisingly good connectivity. These numbers are calibrated for comfortable expat living — not backpacker survival.",
    "Housing ($700/mo): My Khe Beach area or An Thuong \"foreigner zone\" gives you modern apartments, walkability, and an English-speaking services bubble. Prices have risen 20–30% since COVID as remote workers discovered the city, so $500–$600/mo buys dated units. $700 gets you something genuinely nice with a potential beach view.",
    "Food ($450/mo): Vietnamese food is extraordinary value — a full pho or banh mi meal runs $1.50–$3. But you won't eat local-only every day. Imported coffee, western grocery runs at Lotte Mart, and the growing restaurant scene in An Thuong will push costs up. $450 is honest.",
    "Transportation ($100/mo): A scooter is essential — Da Nang is not a walking city outside the beach strip. Budget for gas, occasional maintenance, and Grab for nights out when you've had a few drinks.",
    "Health insurance ($150/mo): Same logic as Thailand. Da Nang's hospitals have improved but you want evacuation coverage to Singapore or Bangkok for anything serious.",
    "Entertainment ($220/mo): Beach days are free. But gym memberships, surfing lessons, weekend trips to Hoi An (30min away) or Hue (1.5hrs), and the consistent café culture will eat $150–$250/mo without feeling extravagant.",
    "Utilities ($90/mo): Vietnam has some of the best fiber internet in Asia — fast and cheap. Electricity with AC runs similar to Thailand.",
    "Visa + buffer ($190/mo): This is the weak point of Vietnam. The e-visa is 90 days max with extension uncertainty — Vietnam has not yet created a proper long-stay retirement visa. Budget for visa runs to Thailand or Laos ($100–$200/trip, 2–3x/year). Many expats use a visa agent service ($50–$100/round) to smooth this out. This budget accounts for that reality.",
    "The real FIRE life here: Da Nang hits a rare sweet spot — cheap, beautiful, coastal, and not yet overrun. Hoi An is 30 minutes away and one of the most stunning towns in Asia. The food culture rivals anywhere in the world. The downside is the visa situation (manageable but annoying), a smaller expat scene than Chiang Mai, and occasional typhoon season disruption (October–December). Vietnam is also rapidly industrializing, which means costs will inflate faster than Thailand over your retirement horizon — hence the 4%/yr inflation buffer in these projections.",
  ].join("\n\n"),
  colombia: [
    "Medellín is the most expensive destination on this list — and also the most culturally rich and geographically desirable for someone coming from the United States. The city's \"eternal spring\" climate (~72°F year-round at 5,000ft elevation), Latin culture, salsa scene, and world-class food make it feel genuinely alive in a way that SEA cities sometimes don't. These numbers account for the El Poblado / Laureles expat premium — living in those zones is meaningfully more expensive than Colombian averages, and that's deliberate.",
    "Housing ($1,000/mo): El Poblado is Medellín's upscale expat neighborhood. Modern 1BR with doorman, gym, and rooftop pool runs $800–$1,200/mo. Laureles is slightly cheaper and more authentic. You could find cheaper in Envigado or Sabaneta ($600–$700) but as a solo expat, location safety is worth the premium. The $1,000 target is calibrated to get something genuinely nice without going full luxury.",
    "Food ($550/mo): Colombia has excellent local food (bandeja paisa, arepas, empanadas) at $3–6/meal. But the expat restaurant scene in El Poblado is serious — dozens of world-class spots that you'll use regularly. Imported goods from Éxito or specialty stores cost more than US equivalents due to import taxes. $550 is honest for someone who cooks some meals, eats out regularly, and doesn't deprive themselves.",
    "Transportation ($120/mo): Medellín has a surprisingly good metro + cable car system. Uber works perfectly (often cheaper than taxis). Budget $80–$120/mo for daily movement — you won't need a car.",
    "Health insurance ($150/mo): Colombia actually has a strong domestic healthcare system — private clinics in El Poblado are genuinely good. But as a foreign national without Colombian residency-level coverage, international insurance is the right call for anything complex.",
    "Entertainment ($300/mo): This is where Medellín stands out. The nightlife is world-class, the bar/club scene in El Poblado is intense, and the social environment (both expat and local) is extremely active. Weekend trips to Cartagena, the coffee region (Salento), or Santa Marta are easy and relatively cheap by US standards. $300/mo is moderate — many expats spend more.",
    "Visa + buffer ($180/mo): Colombia's Digital Nomad Visa allows 2-year stays and is straightforward. The Pensionado visa requires $750+/mo passive income (achievable at FIRE). Budget for visa processing fees ($300–$500), occasional US flights, and miscellaneous buffer.",
    "The real FIRE life here: Medellín is the highest-cost, highest-lifestyle option. You're much closer to the US culturally and geographically (5-hour direct flight to Miami). Spanish proficiency helps enormously — without it, you pay the gringo premium on everything and miss 80% of the social fabric. The security situation has improved dramatically since the cartel era — El Poblado is as safe as any US city — but petty theft awareness is still required. The payoff is a rich, Latin, social city where your dollar goes far relative to US equivalents and where the quality of life is genuinely exceptional. This is the destination for someone who wants to feel like they're living retirement, not just optimizing a spreadsheet.",
  ].join("\n\n"),
  puertoRico: [
    "San Juan is the wildcard on this list — technically US soil, USD everywhere, no passport required, and yet meaningfully cheaper than the US mainland. For someone who wants the Latin Caribbean lifestyle without surrendering US banking, brokerage accounts, or the ability to fly home in 3 hours, Puerto Rico is a serious contender. Act 60 (formerly Act 22) is also the most aggressive tax incentive available to US citizens abroad: 0% federal capital gains tax on gains accrued after becoming a bona fide resident. For someone retiring on a large investment portfolio, this alone can be worth six figures annually.",
    "Housing ($1,200/mo): Condado, Miramar, or Old San Juan give you modern apartments, walkability, ocean proximity, and expat-friendly amenities. The higher-end buildings in Condado rival Miami Beach condos and can cost $2,000+/mo. $1,200 targets something clean, modern, and well-located — not rock-bottom, but not luxury either. Mid-range 1BR in a good building with AC and security.",
    "Food ($600/mo): Puerto Rico is more expensive than SEA and Colombia. Imported goods from the mainland cost 20–30% more due to the Jones Act shipping premium. Local food (mofongo, lechón, tostones) is delicious and reasonably priced at $8–15/meal. A realistic mix of local restaurants, supermarket runs at Costco or Ralph's, and the occasional nice dinner runs $500–$700/mo.",
    "Transportation ($150/mo): San Juan is very car-dependent outside Old San Juan / Condado. Uber works well but the city's public transit is limited. Budget for Uber usage, gas if you have a car, and occasional inter-island trips. No car is possible in Condado but inconvenient for much of the island.",
    "Health insurance ($200/mo): Puerto Rico residents use the US healthcare system — this is a major advantage over all other destinations on this list. ACA marketplace plans are available, and as a US citizen you have full access to Medicare at 65. $200/mo assumes an ACA silver plan with a reasonable deductible for someone in their 30s.",
    "Entertainment ($350/mo): San Juan has legitimate nightlife — La Placita on weekends is electric, Old San Juan has world-class restaurants and bars, and the beach culture is excellent. Weekend trips to Rincon (surf capital), El Yunque rainforest, or Vieques/Culebra (stunning outer islands) add up. $350/mo is moderate for an active lifestyle.",
    "Utilities ($130/mo): Puerto Rico's electricity grid (LUMA) is notoriously unreliable and expensive — many residents invest in solar + battery backup (amortizable cost). AC is essential year-round. Budget $100–$150/mo for electricity; internet is decent at $50–$80/mo.",
    "Visa / buffer ($0/mo — US territory): No visa required. No visa runs. No immigration bureaucracy. This is zero because you're a US citizen on US soil. Budget is reallocated to the higher cost of living.",
    "Act 60 Tax Note: To qualify for 0% capital gains on Puerto Rico-sourced gains, you must be a bona fide resident (183+ days/yr), file PR taxes, make a $10,000 charitable contribution, and buy PR real estate within 2 years. The setup cost is real (~$5K–$15K in legal/accounting fees) but the annual tax savings on a $2M+ portfolio can be enormous. Consult a CPA specializing in Act 60 before relying on this.",
    "The real FIRE life here: Puerto Rico is the highest-cost destination on this list but offers something the others can't — US soil. Your bank account stays the same, your healthcare system stays the same, Amazon Prime still delivers, and your family can visit without international flights. The island has genuine beauty (El Yunque, bioluminescent bays, beaches rivaling the Caribbean's best) and a rich Afro-Caribbean culture. The tradeoffs: higher cost of living, the Jones Act tax on goods, unreliable power grid, and ongoing economic/governance challenges. If you've built a large enough portfolio that Act 60 tax savings are meaningful and you value proximity to the US, San Juan belongs at the top of your list.",
  ].join("\n\n"),
  austin: [
    "Austin is the domestic FIRE option — no passport, no language barrier, no visa headaches, and a city that genuinely doesn't feel like you've retired to the middle of nowhere. It's expensive by FIRE standards (you will not be escaping the US cost of living here) but the tradeoff is full cultural immersion, a thriving tech/creative scene, and the ability to maintain US life without any of the logistics of living abroad. This is the scenario for someone who wants to FIRE domestically and stay connected.",
    "Housing ($1,800/mo): Central Austin neighborhoods like South Congress, East Austin, Travis Heights, or Mueller get you a modern 1BR apartment in a walkable, vibrant area. The housing market cooled from its 2021–2022 peak but quality central apartments still run $1,600–$2,200/mo. Going to the suburbs (Cedar Park, Pflugerville, Round Rock) drops this to $1,200–$1,400 but adds car dependency and disconnects you from the Austin social fabric.",
    "Food ($700/mo): Austin has world-class food — from the legendary BBQ (Franklin's, Terry Black's) to the booming restaurant scene on South Congress and East 6th. Groceries at HEB are reasonably priced by US standards. $700/mo reflects a realistic mix of home cooking and eating out 3–4x/week, not grinding on rice and beans.",
    "Transportation ($250/mo): Austin is extremely car-dependent. You need a car. Budget $150–$200/mo for gas, insurance, and maintenance on a paid-off vehicle, plus Uber/Lyft for nights out. Public transit is limited and largely impractical for daily life outside Downtown.",
    "Health insurance ($350/mo): This is the biggest cost difference from international retirement. ACA marketplace plans for a 30-something in Texas run $250–$500/mo depending on income, deductible choice, and subsidy eligibility. At FIRE, your taxable income may be low enough to qualify for significant ACA subsidies — Roth conversions and capital gains management matter a lot here. $350/mo assumes moderate subsidy eligibility.",
    "Entertainment ($400/mo): Austin's entertainment ecosystem is exceptional — live music on 6th Street and Red River is everywhere, Formula 1 (Circuit of the Americas) runs every October, South by Southwest, ACL Festival, world-class hiking in Barton Creek Greenbelt and McKinney Falls. $400/mo is moderate for someone who actually engages with the city.",
    "Utilities ($180/mo): Texas summers are brutal and ERCOT's deregulated grid creates electricity bill volatility. AC running June–September will push electricity to $150–$250/mo alone. Fiber internet is excellent and cheap ($60–$80/mo). Budget $180/mo as an average — expect higher in summer.",
    "Visa / buffer ($0/mo — domestic): No visa. No immigration costs. This line goes to zero; the cost of living difference more than accounts for it.",
    "Texas Tax Note: No state income tax is a genuine advantage. Long-term capital gains are taxed federally but not at the state level, which saves 5–13% compared to California, New York, or other high-tax states. Property taxes in Texas are notoriously high (1.8–2.5% annually) which matters if you buy real estate here — but as a renter at FIRE this doesn't apply directly.",
    "The real FIRE life here: Austin is the most expensive option on this list but it's also the most 'normal' — you're retiring in the United States, in a major city, with all the infrastructure, culture, and social connectivity that entails. The cost is real: your FIRE number needs to be substantially higher than for international destinations. But if the thought of building a life abroad feels like a constraint rather than an adventure, Austin (or Texas generally) is the domestic answer. The city is growing fast — which means more amenities but also more traffic, higher prices, and a changing character. Lock in your lifestyle before the city prices you out further.",
  ].join("\n\n"),
  auburn: [
    "Auburn, California is the sleeper pick — a small Gold Rush-era foothills town 35 miles northeast of Sacramento, sitting at 1,200ft elevation in the Sierra Nevada foothills. It's the kind of place that doesn't appear on any FIRE destination list, which is precisely what makes it interesting. Relatively affordable by California standards, surrounded by some of the best outdoor recreation in the continental US (Lake Tahoe 1hr, Yosemite 2.5hrs, Tahoe National Forest out your backdoor), and with a quaint historic downtown that punches above its weight. This is the option for someone who wants California lifestyle at a fraction of Bay Area or LA prices.",
    "Housing ($1,600/mo): Auburn's rental market is thin but meaningfully cheaper than Sacramento ($1,400–$1,800 for a 1BR) and dramatically cheaper than the Bay Area. A 1BR apartment or small house in Auburn proper runs $1,400–$1,900/mo. The quality is generally older construction — Auburn doesn't have the luxury apartment stock of a major city. If you're open to a small house or a 2BR, your dollar goes further here than almost anywhere in California.",
    "Food ($600/mo): Auburn has a handful of good local restaurants (Awful Annie's for breakfast is a local institution) but the grocery situation is Raley's/Safeway pricing — i.e., California supermarket prices, not cheap. Costco in Roseville (20min away) helps considerably. $600/mo reflects realistic California grocery costs plus occasional dining out. Sacramento's restaurant scene (35min away) expands your options dramatically.",
    "Transportation ($300/mo): Auburn is not walkable for daily life — you need a car for groceries, errands, and most activities. I-80 puts you on Sacramento in 35 minutes or Tahoe in 60 minutes. Budget $200–$300/mo for gas, insurance, and maintenance. The scenic drive along Highway 49 through the Gold Rush towns (Nevada City, Grass Valley, Placerville) is free.",
    "Health insurance ($350/mo): California ACA marketplace plans are competitive — Covered California has broad carrier participation. $350/mo is a reasonable estimate for a silver plan with modest subsidies; aggressive income management through Roth conversions can reduce this significantly. California also has Medi-Cal (Medicaid) with a relatively high income threshold if your taxable income is low enough.",
    "Entertainment ($300/mo): This is where Auburn genuinely wins. Mountain biking and hiking in the American River Canyon (world-class trails literally in town), kayaking on the American River, skiing at Tahoe in winter, and proximity to everything California has to offer. $300/mo covers gear maintenance, ski day passes, and the inevitable spontaneous Tahoe weekend. The outdoor lifestyle here is exceptional and most of it costs nothing beyond gear.",
    "Utilities ($160/mo): PG&E electricity rates in California are among the highest in the nation — $100–$180/mo depending on season. Winters in the foothills get cold enough to need heat; summers are hot enough to need AC (though milder than Sacramento's 105°F valley floor). Internet options are improving but fiber isn't universal in Auburn yet.",
    "Visa / buffer ($0/mo — domestic): No visa. No immigration costs.",
    "California Tax Note: This is the major headwind. California taxes all income (including capital gains) as ordinary income at rates up to 13.3%. For a FIRE portfolio generating significant realized gains, this is a meaningful hit compared to Texas (0%), Nevada (0%), or Puerto Rico (Act 60). At a $2M portfolio generating $80K/year in realized gains, California takes $8,000–$10,000/yr in state taxes that Texas would not. If you're on the edge of FIRE math, the CA state tax burden is worth modeling explicitly.",
    "The real FIRE life here: Auburn is the answer for someone who wants California — the mountains, the climate, the proximity to world-class recreation — without the Bay Area or LA price tag. It's a small town (13,000 people) so the social scene is limited; you'll likely need to drive to Sacramento for concerts, events, and urban amenities. But if your FIRE life involves outdoor adventure more than nightlife, and you want to stay in the US within driving distance of some of the most beautiful terrain in the country, Auburn is a genuinely compelling option. The California tax burden is real but manageable with smart income planning.",
  ].join("\n\n"),
};

// ── FIRE Tier Cost Data (per location, per lifestyle tier) ──
// Categories: rent, food, transport, health, entertainment, utilities, visa
const FIRE_TIER_DATA: Record<
  "thailand" | "vietnam" | "colombia" | "puertoRico" | "austin" | "auburn",
  Record<"lean" | "comfortable" | "cushy", { rent: number; food: number; transport: number; health: number; entertainment: number; utilities: number; visa: number }>
> = {
  thailand: {
    lean:        { rent: 400, food: 280, transport: 75, health: 110, entertainment: 100, utilities: 65, visa: 100 },
    comfortable: { rent: 750, food: 500, transport: 120, health: 150, entertainment: 250, utilities: 100, visa: 230 },
    cushy:       { rent: 1500, food: 900, transport: 200, health: 300, entertainment: 450, utilities: 150, visa: 300 },
  },
  vietnam: {
    lean:        { rent: 350, food: 260, transport: 70, health: 110, entertainment: 90, utilities: 60, visa: 100 },
    comfortable: { rent: 700, food: 450, transport: 100, health: 150, entertainment: 220, utilities: 90, visa: 190 },
    cushy:       { rent: 1200, food: 850, transport: 160, health: 280, entertainment: 400, utilities: 130, visa: 280 },
  },
  colombia: {
    lean:        { rent: 550, food: 330, transport: 75, health: 110, entertainment: 130, utilities: 65, visa: 100 },
    comfortable: { rent: 1000, food: 550, transport: 120, health: 150, entertainment: 300, utilities: 100, visa: 180 },
    cushy:       { rent: 1800, food: 1000, transport: 200, health: 300, entertainment: 600, utilities: 150, visa: 300 },
  },
  puertoRico: {
    lean:        { rent: 900,  food: 450, transport: 100, health: 150, entertainment: 150, utilities: 100, visa: 0 },
    comfortable: { rent: 1200, food: 600, transport: 150, health: 200, entertainment: 350, utilities: 130, visa: 0 },
    cushy:       { rent: 2200, food: 1000, transport: 250, health: 350, entertainment: 700, utilities: 200, visa: 0 },
  },
  austin: {
    lean:        { rent: 1400, food: 500, transport: 180, health: 250, entertainment: 200, utilities: 140, visa: 0 },
    comfortable: { rent: 1800, food: 700, transport: 250, health: 350, entertainment: 400, utilities: 180, visa: 0 },
    cushy:       { rent: 3000, food: 1200, transport: 400, health: 500, entertainment: 800, utilities: 250, visa: 0 },
  },
  auburn: {
    lean:        { rent: 1200, food: 450, transport: 200, health: 250, entertainment: 150, utilities: 130, visa: 0 },
    comfortable: { rent: 1600, food: 600, transport: 300, health: 350, entertainment: 300, utilities: 160, visa: 0 },
    cushy:       { rent: 2500, food: 1000, transport: 500, health: 500, entertainment: 600, utilities: 220, visa: 0 },
  },
};

function isBusinessItem(item: { category: string; tags?: string[] | null }): boolean {
  return item.category === "Business" || (Array.isArray(item.tags) && item.tags.includes("Business"));
}

const CATEGORY_COLORS: Record<string, string> = {
  "Income":                "#22C55E",
  "Investment":            "#4ADE80",
  "Retirement":            "#FBBF24",
  "Housing":               "#EF4444",
  "Food":                  "#F59E0B",
  "Transportation":        "#10B981",
  "Business":              "#3B82F6",
  "Insurance":             "#F97316",
  "Health (Non Insurance)":"#06B6D4",
  "General":               "#8B5CF6",
  "Entertainment":         "#EC4899",
  "Phone":                 "#6366F1",
  "Internet":              "#14B8A6",
  "Credit Card":           "#84CC16",
  "Toiletries":            "#A855F7",
  "Charity":               "#F43F5E",
};

const formatCurrency = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-slate-800 border border-purple-500/40 rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-semibold">{entry.name}</p>
        <p className="text-green-300">{formatCurrency(entry.value)}</p>
        <p className="text-slate-400">{entry.payload.pct?.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

export default function Finances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "income-vs-expense" | "business" | "expense-breakdown" | "retirement" | "cashflow" | "table" | "networth" | "credit-cards" | "accounts" | "nw-trend" | "fire">("overview");
  const [fireLocationKey, setFireLocationKey] = useState<"thailand" | "vietnam" | "colombia" | "puertoRico" | "austin" | "auburn">("thailand");
  const [fireColExpanded, setFireColExpanded] = useState<"thailand" | "vietnam" | "colombia" | "puertoRico" | "austin" | "auburn" | null>(null);
  const [fireTier, setFireTier] = useState<"lean" | "comfortable" | "cushy">("comfortable");
  const [fireSwr, setFireSwr] = useState<number>(0.04);
  const [fireColInflation, setFireColInflation] = useState<number>(0.05);
  const [fireCurrencyBuffer, setFireCurrencyBuffer] = useState<number>(0.05);
  const [fireHealthcareBuffer, setFireHealthcareBuffer] = useState<number>(0.10);
  const [fireLifestyleBuffer, setFireLifestyleBuffer] = useState<number>(0.05);
  const [fireInheritanceMode, setFireInheritanceMode] = useState<boolean>(false);
  const [fireInheritanceAmount, setFireInheritanceAmount] = useState<number>(3_000_000);
  const [fireInheritanceAge, setFireInheritanceAge] = useState<number>(48);
  const [fgWidgetInheritance, setFgWidgetInheritance] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [expenseBreakdownSearch, setExpenseBreakdownSearch] = useState<string>("");
  const [expenseBreakdownCat, setExpenseBreakdownCat] = useState<string>("All");
  const [iveView, setIveView] = useState<"summary" | "granular">("summary");
  // Overview widget visibility toggles
  const [overviewWidgets, setOverviewWidgets] = useState({
    incomeSources: true,
    topExpenses: true,
    netWorth: true,
    incomeVsExpense: true,
    monthlyAllocation: true,
    portfolioAllocation: true,
    fireGoal: true,
  });
  const toggleWidget = (key: keyof typeof overviewWidgets) => {
    setOverviewWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveWidgetPrefs({ overviewVisible: next });
      return next;
    });
  };
  // Widget order for drag-and-drop (persisted)
  type WidgetKey = "incomeSources" | "topExpenses" | "netWorth" | "incomeVsExpense" | "monthlyAllocation" | "portfolioAllocation" | "fireGoal";
  const [widgetOrder, setWidgetOrder] = useState<WidgetKey[]>(() => {
    try {
      const saved = localStorage.getItem("overview-widget-order");
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetKey[];
        // ensure new key is included if upgrading from old saved order
        if (!parsed.includes("portfolioAllocation")) parsed.push("portfolioAllocation");
        if (!parsed.includes("fireGoal")) parsed.push("fireGoal");
        return parsed;
      }
    } catch {}
    return ["incomeSources", "topExpenses", "netWorth", "incomeVsExpense", "monthlyAllocation", "portfolioAllocation", "fireGoal"];
  });
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // NW tab widget visibility + order (persisted to server)
  type NWWidgetKey = "assets" | "holdings" | "portfolioPie" | "nwSummary";
  const DEFAULT_NW_ORDER: NWWidgetKey[] = ["assets", "holdings", "portfolioPie", "nwSummary"];
  const [nwWidgetOrder, setNwWidgetOrder] = useState<NWWidgetKey[]>(() => {
    try {
      const saved = localStorage.getItem("nw-widget-order");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Migrate old "allocation" key → insert "portfolioPie" + "nwSummary"
        const migrated = parsed.flatMap(k => k === "allocation" ? ["portfolioPie", "nwSummary"] : [k]) as NWWidgetKey[];
        // Ensure all DEFAULT keys are present (handles saved orders missing new keys)
        const missingKeys = DEFAULT_NW_ORDER.filter(k => !migrated.includes(k));
        return [...migrated, ...missingKeys];
      }
    } catch {}
    return DEFAULT_NW_ORDER;
  });
  const [nwWidgetVisible, setNwWidgetVisible] = useState<Record<NWWidgetKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem("nw-widget-visible");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old "allocation" → both new keys
        const alloc = parsed.allocation ?? true;
        return { assets: parsed.assets ?? true, holdings: parsed.holdings ?? true, portfolioPie: parsed.portfolioPie ?? alloc, nwSummary: parsed.nwSummary ?? alloc };
      }
    } catch {}
    return { assets: true, holdings: true, portfolioPie: true, nwSummary: true };
  });
  const nwDragSrcIdx = useRef<number | null>(null);
  const [nwDragOverIdx, setNwDragOverIdx] = useState<number | null>(null);

  // Server-persisted widget preferences
  const widgetPrefsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: widgetPrefs } = useQuery<{
    overviewOrder?: string[];
    overviewVisible?: Record<string, boolean>;
    nwOrder?: string[];
    nwVisible?: Record<string, boolean>;
  }>({
    queryKey: ["/api/widget-preferences"],
    staleTime: Infinity,
    retry: false,
  });

  // Apply server prefs once loaded (server wins over localStorage)
  useEffect(() => {
    if (!widgetPrefs) return;
    if (widgetPrefs.overviewOrder?.length) {
      const order = widgetPrefs.overviewOrder as WidgetKey[];
      // ensure portfolioAllocation is present if stored order predates this widget
      if (!order.includes("portfolioAllocation")) order.push("portfolioAllocation");
      if (!order.includes("fireGoal")) order.push("fireGoal");
      setWidgetOrder(order);
      try { localStorage.setItem("overview-widget-order", JSON.stringify(order)); } catch {}
    }
    if (widgetPrefs.overviewVisible) {
      setOverviewWidgets(prev => ({ ...prev, ...widgetPrefs.overviewVisible }));
    }
    let migratedOrder: NWWidgetKey[] | null = null;
    let migratedVisible: Record<NWWidgetKey, boolean> | null = null;
    if (widgetPrefs.nwOrder?.length) {
      // Migrate old "allocation" key → ["portfolioPie", "nwSummary"] (same logic as localStorage init)
      const rawOrder = widgetPrefs.nwOrder as string[];
      const needsMigration = rawOrder.includes("allocation");
      const migrated = rawOrder.flatMap(k => k === "allocation" ? ["portfolioPie", "nwSummary"] : [k]) as NWWidgetKey[];
      const missingKeys = DEFAULT_NW_ORDER.filter(k => !migrated.includes(k));
      const finalOrder = [...migrated, ...missingKeys];
      setNwWidgetOrder(finalOrder);
      try { localStorage.setItem("nw-widget-order", JSON.stringify(finalOrder)); } catch {}
      if (needsMigration) migratedOrder = finalOrder;
    }
    if (widgetPrefs.nwVisible) {
      // Migrate old "allocation" key → spread its value to portfolioPie + nwSummary if missing
      const rawVisible = widgetPrefs.nwVisible as Record<string, boolean>;
      const needsMigration = "allocation" in rawVisible || !("portfolioPie" in rawVisible);
      const allocValue = rawVisible.allocation ?? true;
      const mv: Record<NWWidgetKey, boolean> = {
        assets: rawVisible.assets ?? true,
        holdings: rawVisible.holdings ?? true,
        portfolioPie: rawVisible.portfolioPie ?? allocValue,
        nwSummary: rawVisible.nwSummary ?? allocValue,
      };
      setNwWidgetVisible(prev => ({ ...prev, ...mv }));
      try { localStorage.setItem("nw-widget-visible", JSON.stringify(mv)); } catch {}
      if (needsMigration) migratedVisible = mv;
    }
    // Re-save to server if we migrated old "allocation" format → new split keys
    if (migratedOrder || migratedVisible) {
      const patch: Record<string, unknown> = {};
      if (migratedOrder) patch.nwOrder = migratedOrder;
      if (migratedVisible) patch.nwVisible = migratedVisible;
      fetch("/api/widget-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      }).catch(() => {/* silent */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetPrefs]);

  const saveWidgetPrefs = useCallback((patch: object) => {
    if (widgetPrefsDebounce.current) clearTimeout(widgetPrefsDebounce.current);
    widgetPrefsDebounce.current = setTimeout(() => {
      fetch("/api/widget-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      }).catch(() => {/* silent */});
    }, 800);
  }, []);

  // One-time migration: force correct values as of May 27 2026
  // ETrade RSU sold/cleared → $0; BMO checking received +$65,622 → $100,622
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260527";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-etrade-rsu", "0");
        localStorage.setItem("nw-checking", "100622");
        localStorage.setItem(MIGRATION_KEY, "1");
        setETradeRsuValue(0);
        setCheckingBalance(100622);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: force correct values as of June 2 2026
  // BMO checking −$5,000 → $95,622; Coinbase BTC +0.07239373 → 0.14192946
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260602";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-checking", "95622");
        localStorage.setItem("nw-coinbase-btc", "0.14192946");
        localStorage.setItem(MIGRATION_KEY, "1");
        setCheckingBalance(95622);
        setCoinbaseBtcHoldings(0.14192946);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: June 10 2026
  // BMO checking −$5,000 → $90,622; Coinbase BTC +0.07852256 → 0.22045202
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260610";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-checking", "90622");
        localStorage.setItem("nw-coinbase-btc", "0.22045202");
        localStorage.setItem(MIGRATION_KEY, "1");
        setCheckingBalance(90622);
        setCoinbaseBtcHoldings(0.22045202);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: June 23 2026
  // BMO checking −$7,000 → $76,622; Coinbase BTC +0.109339 → 0.32979102
  // Forces values on all devices (supersedes the June 15 default-only checking update).
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260623";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-checking", "76622");
        localStorage.setItem("nw-coinbase-btc", "0.32979102");
        localStorage.setItem(MIGRATION_KEY, "1");
        setCheckingBalance(76622);
        setCoinbaseBtcHoldings(0.32979102);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: July 7 2026
  // BMO checking → $80,756. Forces the value on all devices.
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260707";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-checking", "80756");
        localStorage.setItem(MIGRATION_KEY, "1");
        setCheckingBalance(80756);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time migration: Roth IRA shares updated May 29 2026
  // VTSAX 146.857 → 145.188; IBIT stays 697
  useEffect(() => {
    try {
      const MIGRATION_KEY = "nw-migration-20260529-roth";
      if (!localStorage.getItem(MIGRATION_KEY)) {
        localStorage.setItem("nw-roth-vtsax", "145.188");
        localStorage.setItem("nw-roth-ibit", "697");
        localStorage.setItem(MIGRATION_KEY, "1");
        setRothIraVtsaxHoldings(145.188);
        setRothIraIbitHoldings(697);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resizable table columns: [Item, Category, Monthly, Annual, Recur, Actions]
  const [colWidths, setColWidths] = useState<number[]>([320, 160, 110, 110, 150, 48]);
  const resizingCol = useRef<{ idx: number; startX: number; startW: number } | null>(null);

  // Net Worth holdings (persisted in localStorage, defaults set for alexbaer321@gmail.com)
  const [btcHoldings, setBtcHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-btc") || "1"); } catch { return 1; }
  });
  const [coinbaseBtcHoldings, setCoinbaseBtcHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-coinbase-btc") || "0.32979102"); } catch { return 0.32979102; }
  });
  const [vtsaxHoldings, setVtsaxHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-vtsax") || "146.857"); } catch { return 146.857; }
  });
  const [vooHoldings, setVooHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-voo") || "240.676"); } catch { return 240.676; }
  });
  const [rothIraIbitHoldings, setRothIraIbitHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-roth-ibit") || "697"); } catch { return 697; }
  });
  const [rothIraVtsaxHoldings, setRothIraVtsaxHoldings] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-roth-vtsax") || "145.188"); } catch { return 145.188; }
  });
  // 401k — ProShares Ultra S&P500 (SSO) via employer plan
  const [k401Shares, setK401Shares] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-401k-sso") || "1734.032"); } catch { return 1734.032; }
  });
  // Real Estate — 2605 Plumbago Court (all defaults set for alexbaer321@gmail.com, May 2026)
  const [homeAddress, setHomeAddress] = useState<string>(() => {
    try { return localStorage.getItem("nw-home-address") || "2605 Plumbago Court, Rocklin, CA 95677"; } catch { return "2605 Plumbago Court, Rocklin, CA 95677"; }
  });
  const [homeEstValue, setHomeEstValue] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-value") || "636000"); } catch { return 636000; }
  });
  const [homeLoanBalance, setHomeLoanBalance] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-loan") || "614000"); } catch { return 614000; }
  });
  const [homePurchasePrice, setHomePurchasePrice] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-purchase") || "636000"); } catch { return 636000; }
  });
  const [homeSellerFee, setHomeSellerFee] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-fee") || "6"); } catch { return 6; }
  });
  const [homeOtherCosts, setHomeOtherCosts] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-other-costs") || "0"); } catch { return 0; }
  });
  const [homeCapImprovements, setHomeCapImprovements] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-cap-imp") || "0"); } catch { return 0; }
  });
  const [homeDepreciation, setHomeDepreciation] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-depreciation") || "0"); } catch { return 0; }
  });
  const [homePrimaryExclusion, setHomePrimaryExclusion] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-exclusion") || "250000"); } catch { return 250000; }
  });
  const [homeFedCapGainsRate, setHomeFedCapGainsRate] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-fed-cg") || "15"); } catch { return 15; }
  });
  const [homeCaCapGainsRate, setHomeCaCapGainsRate] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-home-ca-cg") || "9.3"); } catch { return 9.3; }
  });
  // Cash — BMO checking account ending in 1711 (manual, updated July 7, 2026: → $80,756)
  const [checkingBalance, setCheckingBalance] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-checking") || "80756"); } catch { return 80756; }
  });
  // CareerGlow LLC — Mercury business account (manual, May 2026)
  const [careerglowBalance] = useState<number>(13348);
  // HSA — Optum Financial (manual, June 2026)
  const [hsaBalance] = useState<number>(1.62);
  const [velunaDomainValue, setVelunaDomainValue] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-veluna-domain") || "4050"); } catch { return 4050; }
  });
  const [velunaDomainPurchasePrice, setVelunaDomainPurchasePrice] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-veluna-domain-purchase") || "4001.17"); } catch { return 4001.17; }
  });
  const [eTradeRsuValue, setETradeRsuValue] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-etrade-rsu") || "0"); } catch { return 0; }
  });
  const [fordExplorerValue, setFordExplorerValue] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-ford-explorer") || "17000"); } catch { return 17000; }
  });
  const [kawasakiNinjaValue, setKawasakiNinjaValue] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("nw-kawasaki-ninja") || "1200"); } catch { return 1200; }
  });
  const [editingHoldings, setEditingHoldings] = useState(false);
  const [holdingsView, setHoldingsView] = useState<"type" | "account">("type");

  const [sortField, setSortField] = useState<"item" | "category" | "monthlyCost" | "recurType" | null>(() => {
    try {
      const saved = localStorage.getItem("finance-sort-field");
      if (saved === "item" || saved === "category" || saved === "monthlyCost" || saved === "recurType") return saved as any;
    } catch {}
    return null;
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    try {
      const saved = localStorage.getItem("finance-sort-direction");
      if (saved === "asc" || saved === "desc") return saved as any;
    } catch {}
    return "asc";
  });

  const [newItem, setNewItem] = useState({ item: "", category: "", tags: [] as string[], monthlyCost: "", recurType: "" });

  const { data: financialItems = [] } = useQuery<FinancialItem[]>({
    queryKey: ["/api/finances"],
  });

  // Auto-seed MailWisp Paid User Income if it doesn't exist yet
  useEffect(() => {
    if (financialItems.length > 0 && !financialItems.find(i => i.item === "MailWisp Paid User Income")) {
      fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item: "MailWisp Paid User Income",
          category: "Income",
          tags: ["Business", "Income"],
          monthlyCost: 100, // $1.00 in cents
          recurType: "Monthly",
        }),
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  // Auto-seed Sperm Freeze Reprotech annual fee (amortized monthly) if it doesn't exist yet
  useEffect(() => {
    if (financialItems.length > 0 && !financialItems.find(i => i.item === "Sperm Freeze Reprotech")) {
      fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item: "Sperm Freeze Reprotech",
          category: "Health",
          tags: ["Health", "Annual"],
          monthlyCost: 3333, // $33.33/mo in cents — annual fee amortized monthly
          recurType: "Annual",
          notes: "Annual storage fee amortized monthly ($399.96/yr)",
        }),
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  // Auto-seed Brilliant Pest Solutions monthly fee if it doesn't exist yet
  useEffect(() => {
    if (financialItems.length > 0 && !financialItems.find(i => i.item === "Brilliant Pest Solutions")) {
      fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item: "Brilliant Pest Solutions",
          category: "Housing",
          tags: ["Housing", "Rental"],
          monthlyCost: 5900, // $59.00/mo in cents
          recurType: "Monthly",
          notes: "Comprehensive pest control for Rocklin Rental House",
        }),
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  // Auto-seed CASA Annual Audit fee if it doesn't exist yet
  useEffect(() => {
    if (financialItems.length > 0 && !financialItems.find(i => i.item === "CASA Annual Audit (TAC)")) {
      fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item: "CASA Annual Audit (TAC)",
          category: "Business",
          tags: ["Business", "Annual"],
          monthlyCost: 6000, // $60.00/mo in cents — $720/yr amortized monthly
          recurType: "Annual",
          notes: "Annual CASA audit via TAC — $720/yr amortized monthly",
        }),
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  // Remove Hushed (alt phone line) if it exists (cancelled June 2026)
  useEffect(() => {
    const hushed = financialItems.find(i => i.item.toLowerCase().includes("hushed"));
    if (hushed) {
      fetch(`/api/finances/${hushed.id}`, {
        method: "DELETE",
        credentials: "include",
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  // Auto-seed Simply Sing monthly subscription if it doesn't exist yet
  useEffect(() => {
    if (financialItems.length > 0 && !financialItems.find(i => i.item === "Simply Sing")) {
      fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item: "Simply Sing",
          category: "Phone",
          tags: ["Subscription", "Entertainment"],
          monthlyCost: 1499, // $14.99/mo in cents
          recurType: "Monthly",
          notes: "Simply Sing singing app — monthly subscription",
        }),
      }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/finances"] })).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialItems.length]);

  const { data: btcData, isLoading: btcLoading, isError: btcError, refetch: refetchBtc } = useQuery<{ price: number; change24h: number | null; source: string }>({
    queryKey: ["/api/market/bitcoin"],
    staleTime: 60_000,
    retry: 2,
  });

  const { data: vtsaxData, isLoading: vtsaxLoading, isError: vtsaxError, refetch: refetchVtsax } = useQuery<{ symbol: string; price: number; change24h: number | null; source: string }>({
    queryKey: ["/api/market/vtsax"],
    staleTime: 60_000,
    retry: 2,
  });

  const { data: vooData, isLoading: vooLoading, isError: vooError, refetch: refetchVoo } = useQuery<{ symbol: string; price: number; change24h: number | null; source: string }>({
    queryKey: ["/api/market/voo"],
    staleTime: 60_000,
    retry: 2,
  });

  const { data: ibitData, isLoading: ibitLoading, isError: ibitError, refetch: refetchIbit } = useQuery<{ symbol: string; price: number; change24h: number | null; source: string }>({
    queryKey: ["/api/market/ibit"],
    staleTime: 60_000,
    retry: 2,
  });

  // SSO (ProShares Ultra S&P500) — used for 401k valuation
  const { data: viiixData, isLoading: viiixLoading, isError: viiixError } = useQuery<{ symbol: string; price: number; change24h: number | null; source: string }>({
    queryKey: ["/api/market/sso"],
    staleTime: 60_000,
    retry: 2,
  });

  // Cache last known prices in localStorage so we can fall back if live fetch fails
  useEffect(() => { if (btcData?.price) localStorage.setItem("cache_btc_price", String(btcData.price)); }, [btcData]);
  useEffect(() => { if (vtsaxData?.price) localStorage.setItem("cache_vtsax_price", String(vtsaxData.price)); }, [vtsaxData]);
  useEffect(() => { if (vooData?.price) localStorage.setItem("cache_voo_price", String(vooData.price)); }, [vooData]);
  useEffect(() => { if (ibitData?.price) localStorage.setItem("cache_ibit_price", String(ibitData.price)); }, [ibitData]);
  useEffect(() => { if (viiixData?.price) localStorage.setItem("cache_viiix_price", String(viiixData.price)); }, [viiixData]);

  const cachedBtcPrice = parseFloat(localStorage.getItem("cache_btc_price") ?? "0") || 0;
  const cachedVtsaxPrice = parseFloat(localStorage.getItem("cache_vtsax_price") ?? "0") || 0;
  const cachedVooPrice = parseFloat(localStorage.getItem("cache_voo_price") ?? "0") || 0;
  const cachedIbitPrice = parseFloat(localStorage.getItem("cache_ibit_price") ?? "0") || 0;
  const cachedViiixPrice = parseFloat(localStorage.getItem("cache_viiix_price") ?? "0") || 0;

  const pricesUsingCache = (btcError && cachedBtcPrice > 0) || (vtsaxError && cachedVtsaxPrice > 0) || (vooError && cachedVooPrice > 0) || (ibitError && cachedIbitPrice > 0) || (viiixError && cachedViiixPrice > 0);

  // Live property valuation via Redfin — re-fetches every 6 hours; falls back to manual value on error
  const { data: propertyData } = useQuery<{ address: string; price: number; source: string; cached: boolean }>({
    queryKey: ["/api/market/property", homeAddress],
    queryFn: async () => {
      const res = await fetch(`/api/market/property?address=${encodeURIComponent(homeAddress)}`);
      if (!res.ok) throw new Error("Property fetch failed");
      return res.json();
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours — property values change slowly
    retry: 1,
    enabled: !!homeAddress,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { item: string; category: string; tags: string[]; monthlyCost: number; recurType: string }) => {
      const response = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      setNewItem({ item: "", category: "", tags: [], monthlyCost: "", recurType: "" });
      toast({ title: "Item added successfully" });
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/finances/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
  });

  const totalIncome = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "income")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const totalRetirement = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "retirement")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const totalExpenses = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "expense")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  let statusBorder = "border-yellow-500/50";
  let statusIcon = <AlertTriangle className="h-7 w-7 text-yellow-500" />;
  let statusColor = "text-yellow-400";
  let statusMessage = "💡 You're saving, but there's room for improvement.";
  if (netCashFlow < 0) {
    statusBorder = "border-red-500/50"; statusIcon = <AlertCircle className="h-7 w-7 text-red-500" />;
    statusColor = "text-red-400"; statusMessage = "⚠️ Warning: Your expenses exceed your income!";
  } else if (savingsRate > 60) {
    statusBorder = "border-green-500/50"; statusIcon = <CheckCircle className="h-7 w-7 text-green-400" />;
    statusColor = "text-green-400"; statusMessage = "🎉 Excellent! You're saving over 60% of your income!";
  } else if (savingsRate >= 51) {
    statusBorder = "border-green-400/50"; statusIcon = <CheckCircle className="h-7 w-7 text-green-400" />;
    statusColor = "text-green-400"; statusMessage = "✅ Good job! You're saving a healthy amount.";
  }

  const incomeVsExpensePie = [
    { name: "Income & Investment", value: totalIncome, color: "#22C55E" },
    { name: "Retirement Contributions", value: totalRetirement, color: "#FBBF24" },
    { name: "Expenses", value: totalExpenses, color: "#EF4444" },
  ].filter(d => d.value > 0).map(d => ({
    ...d,
    pct: ((d.value / (totalIncome + totalRetirement + totalExpenses)) * 100),
  }));

  // ── Net Worth (component-level, shared between Overview & Net Worth tab) ──
  const _btcPrice = btcData?.price ?? cachedBtcPrice;
  const _vtsaxPrice = vtsaxData?.price ?? cachedVtsaxPrice;
  const _vooPrice = vooData?.price ?? cachedVooPrice;
  const _ibitPrice = ibitData?.price ?? cachedIbitPrice;
  const _viiixPrice = viiixData?.price ?? cachedViiixPrice;
  const _btcValue = btcHoldings * _btcPrice;
  const _coinbaseValue = coinbaseBtcHoldings * _btcPrice;
  const _totalBtcValue = _btcValue + _coinbaseValue;
  const _vtsaxValue = vtsaxHoldings * _vtsaxPrice;
  const _vooValue = vooHoldings * _vooPrice;
  const _rothIraValue = (rothIraIbitHoldings * _ibitPrice) + (rothIraVtsaxHoldings * _vtsaxPrice);
  const _k401Value = k401Shares * _viiixPrice;
  // Early withdrawal haircuts (retiring before 55)
  const _rothIraAfterPenalty = _rothIraValue * 0.75;
  const _k401AfterPenalty = _k401Value * 0.68;
  const _vanguardTotal = _vtsaxValue + _vooValue;
  const _homeLivePrice = propertyData?.price ?? null;
  const _homeSalePrice = (_homeLivePrice !== null && _homeLivePrice > 0) ? _homeLivePrice : homeEstValue;
  const _HOME_TRANSFER_TAX_RATE = 0.0022;
  const _homeAgentCommission = _homeSalePrice * (homeSellerFee / 100);
  const _homeTransferTax = _homeSalePrice * _HOME_TRANSFER_TAX_RATE;
  const _homeTotalSellingCosts = _homeAgentCommission + _homeTransferTax + homeOtherCosts;
  const _homeNetCashAfterSale = _homeSalePrice - homeLoanBalance - _homeTotalSellingCosts;
  const _homeAdjustedBasis = homePurchasePrice + homeCapImprovements - homeDepreciation;
  const _homeRawGain = _homeSalePrice - _homeTotalSellingCosts - _homeAdjustedBasis;
  const _homeTaxableGain = Math.max(0, _homeRawGain - homePrimaryExclusion);
  const _homeCapGainsTax = _homeTaxableGain * ((homeFedCapGainsRate + homeCaCapGainsRate) / 100);
  const _homeAfterTaxNetCash = _homeNetCashAfterSale - _homeCapGainsTax;
  // BTC wallets and Vanguard brokerage: apply 15% LTCG haircut in all net worth totals
  const _btcAfterTax = _totalBtcValue * 0.85;
  const _vanguardAfterTax = _vanguardTotal * 0.85;
  // Domain: only taxable gains above purchase price; currently at a loss so $0 tax
  const _domainCapGain = Math.max(0, velunaDomainValue - velunaDomainPurchasePrice);
  const _domainAfterTax = velunaDomainValue - _domainCapGain * 0.15;
  // HSA: 20% early-withdrawal penalty + ~22% income tax = 42% haircut for non-medical use before 65
  const _hsaAfterPenalty = hsaBalance * 0.58;
  const overviewNetWorth = _btcAfterTax + _vanguardAfterTax + _rothIraAfterPenalty + _k401AfterPenalty + _homeAfterTaxNetCash + checkingBalance + careerglowBalance + _hsaAfterPenalty + _domainAfterTax + eTradeRsuValue + fordExplorerValue + kawasakiNinjaValue;
  const nwIsLoading = btcLoading || vtsaxLoading || vooLoading || ibitLoading || viiixLoading;

  // NW Snapshots — load history + auto-save current month once prices are ready
  const { data: nwSnapshots = [], refetch: refetchSnapshots } = useQuery<NwSnapshot[]>({
    queryKey: ["/api/nw-snapshots"],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (nwIsLoading || overviewNetWorth === 0) return;
    const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const breakdown: Record<string, number> = {
      btc: Math.round(_btcAfterTax),
      vanguard: Math.round(_vanguardAfterTax),
      rothIra: Math.round(_rothIraAfterPenalty),
      k401: Math.round(_k401AfterPenalty),
      realEstate: Math.round(_homeAfterTaxNetCash),
      cash: Math.round(checkingBalance + careerglowBalance + _hsaAfterPenalty),
      domain: Math.round(_domainAfterTax),
      etrade: Math.round(eTradeRsuValue),
      vehicles: Math.round(fordExplorerValue + kawasakiNinjaValue),
    };
    fetch("/api/nw-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ month, totalValue: Math.round(overviewNetWorth), breakdown }),
    }).then(() => refetchSnapshots()).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nwIsLoading]);

  // Cashflow: only W2 salary as income (no RSUs, ESPP, HSA, etc.)
  const W2_ITEM_NAME = "Post-Tax W2 Salary Income";
  const w2Income = financialItems.find(i => i.item === W2_ITEM_NAME)?.monthlyCost ?? 0;
  const cashflowNetRaw = w2Income - totalExpenses;
  const nonW2Income = totalIncome - w2Income; // RSUs, ESPP, etc.

  const cashflowPie = [
    { name: "W2 Salary", value: w2Income, color: "#22C55E" },
    { name: "Expenses", value: totalExpenses, color: "#EF4444" },
    { name: "Retirement (out of W2)", value: totalRetirement, color: "#FBBF24" },
  ].filter(d => d.value > 0).map(d => {
    const total = w2Income + totalExpenses + totalRetirement;
    return { ...d, pct: total > 0 ? (d.value / total) * 100 : 0 };
  });

  // Expense items sorted for cashflow detail
  const topExpenses = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "expense")
    .sort((a, b) => b.monthlyCost - a.monthlyCost);

  const expenseByCategory = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "expense")
    .reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.monthlyCost; return acc; }, {} as Record<string, number>);

  const totalExpForPct = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
  const expensePie = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => ({
      name: cat, value: val,
      color: CATEGORY_COLORS[cat] || "#94A3B8",
      pct: totalExpForPct > 0 ? (val / totalExpForPct) * 100 : 0,
    }));

  const incomeByCategory = financialItems
    .filter(i => classifyItem(i.category, i.tags) === "income")
    .reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.monthlyCost; return acc; }, {} as Record<string, number>);

  const retirementItems = financialItems.filter(i => classifyItem(i.category, i.tags) === "retirement");

  const handleSort = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    const newDir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field); setSortDirection(newDir);
    try { localStorage.setItem("finance-sort-field", field); localStorage.setItem("finance-sort-direction", newDir); } catch {}
  };
  const getSortIcon = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const filteredItems = categoryFilter === "All"
    ? financialItems
    : financialItems.filter(i => i.category === categoryFilter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;
    let cmp = 0;
    if (sortField === "monthlyCost") cmp = a.monthlyCost - b.monthlyCost;
    else if (sortField === "item") cmp = a.item.localeCompare(b.item);
    else if (sortField === "category") cmp = a.category.localeCompare(b.category);
    else if (sortField === "recurType") cmp = a.recurType.localeCompare(b.recurType);
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const handleAddItem = () => {
    if (!newItem.item || !newItem.category || !newItem.monthlyCost || !newItem.recurType) {
      toast({ title: "Please fill all fields", variant: "destructive" }); return;
    }
    createMutation.mutate({
      item: newItem.item, category: newItem.category,
      tags: newItem.tags,
      monthlyCost: Math.round(parseFloat(newItem.monthlyCost) * 100),
      recurType: newItem.recurType,
    });
  };

  const classifyBadge = (category: string) => {
    const type = classifyItem(category);
    if (type === "income") return "bg-green-500/20 text-green-300 border-green-500/30";
    if (type === "retirement") return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    return "bg-red-500/15 text-red-300 border-red-500/20";
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const $ = (cents: number) => parseFloat((cents / 100).toFixed(2));
    const $v = (val: number) => parseFloat(val.toFixed(2));
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // ── Sheet 1: Overview Summary ──────────────────────────────────────────
    const overviewRows: (string | number)[][] = [
      ["Financial Dashboard — Overview Summary"],
      [`Exported: ${today}`],
      [],
      ["METRIC", "MONTHLY ($)", "ANNUAL ($)", "NOTES"],
      ["Total Income & Investment", $(totalIncome), $(totalIncome * 12), "W2 salary + RSUs + ESPP + HSA"],
      ["Retirement Contributions", $(totalRetirement), $(totalRetirement * 12), "401k + Roth IRA contributions"],
      ["Total Expenses", $(totalExpenses), $(totalExpenses * 12), "All tracked expense categories"],
      ["Net Cash Flow (Income − Expenses)", $(netCashFlow), $(netCashFlow * 12), "After expenses, before retirement"],
      ["W2 Salary Only", $(w2Income), $(w2Income * 12), "Post-tax W2 salary"],
      ["Non-W2 Income (RSUs, ESPP, etc.)", $(nonW2Income), $(nonW2Income * 12), ""],
      ["Savings Rate", `${savingsRate.toFixed(1)}%`, "", "Net Cash Flow / Total Income"],
      [],
      ["NET WORTH SNAPSHOT (after-tax estimates)", "", "", ""],
      ["BTC Wallet + Coinbase (after 15% LTCG)", $v(_btcAfterTax), "", `${btcHoldings + coinbaseBtcHoldings} BTC @ $${_btcPrice.toFixed(0)}/BTC`],
      ["Vanguard Brokerage (after 15% LTCG)", $v(_vanguardAfterTax), "", `VTSAX ${vtsaxHoldings} sh + VOO ${vooHoldings} sh`],
      ["Roth IRA — VTSAX", $v(rothIraVtsaxHoldings * _vtsaxPrice), "", `${rothIraVtsaxHoldings} VTSAX shares`],
      ["Roth IRA — IBIT", $v(rothIraIbitHoldings * _ibitPrice), "", `${rothIraIbitHoldings} IBIT shares`],
      ["401k — SSO (ProShares Ultra S&P500)", $v(_k401Value), "", `${k401Shares} SSO shares`],
      ["BMO Checking", $v(checkingBalance), "", "Cash"],
      ["CareerGlow LLC (Mercury)", $v(careerglowBalance), "", "Business cash reserves"],
      ["HSA (Optum Financial)", $v(hsaBalance), "", "Health Savings Account"],
      ["Apple RSUs (E*Trade)", $v(eTradeRsuValue), "", "Vested shares"],
      ["Real Estate (after costs & taxes)", $v(_homeAfterTaxNetCash), "", "2605 Plumbago Ct, Rocklin CA"],
      ["Domain — veluna.com (after 15% LTCG)", $v(_domainAfterTax), "", `Sale $${velunaDomainValue} · Purchase $${velunaDomainPurchasePrice}`],
      ["Ford Explorer", $v(fordExplorerValue), "", "Vehicle"],
      ["Kawasaki Ninja 400", $v(kawasakiNinjaValue), "", "Vehicle"],
      [],
      ["TOTAL NET WORTH (after-tax)", $v(overviewNetWorth), "", ""],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewRows);
    ws1["!cols"] = [{ wch: 44 }, { wch: 16 }, { wch: 16 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Overview");

    // ── Sheet 2: Income vs Expense (all items) ─────────────────────────────
    const typeLabels: Record<string, string> = { income: "Income / Investment", retirement: "Retirement", expense: "Expense" };
    const iveRows: (string | number)[][] = [
      ["Income vs Expense — All Items"],
      [`Exported: ${today}`],
      [],
      ["ITEM NAME", "CATEGORY", "TYPE", "FREQUENCY", "MONTHLY ($)", "ANNUAL ($)"],
    ];
    for (const type of ["income", "retirement", "expense"] as const) {
      const group = financialItems
        .filter(i => classifyItem(i.category, i.tags) === type)
        .sort((a, b) => b.monthlyCost - a.monthlyCost);
      if (!group.length) continue;
      iveRows.push([]);
      iveRows.push([`── ${typeLabels[type].toUpperCase()} ──`, "", "", "", "", ""]);
      for (const it of group) {
        iveRows.push([it.item, it.category, typeLabels[type], it.recurType, $(it.monthlyCost), $(it.monthlyCost * 12)]);
      }
      const sub = group.reduce((s, i) => s + i.monthlyCost, 0);
      iveRows.push([`${typeLabels[type]} Subtotal`, "", "", "", $(sub), $(sub * 12)]);
    }
    iveRows.push([]);
    iveRows.push(["GRAND TOTAL INCOME + INVESTMENT", "", "", "", $(totalIncome), $(totalIncome * 12)]);
    iveRows.push(["GRAND TOTAL EXPENSES", "", "", "", $(totalExpenses), $(totalExpenses * 12)]);
    iveRows.push(["NET CASH FLOW", "", "", "", $(netCashFlow), $(netCashFlow * 12)]);
    const ws2 = XLSX.utils.aoa_to_sheet(iveRows);
    ws2["!cols"] = [{ wch: 44 }, { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Income vs Expense");

    // ── Sheet 3: Expense Breakdown by Category ─────────────────────────────
    const expRows: (string | number)[][] = [
      ["Expense Breakdown by Category"],
      [`Exported: ${today}`],
      [],
      ["CATEGORY", "MONTHLY ($)", "ANNUAL ($)", "% OF TOTAL EXPENSES", "ITEMS IN CATEGORY"],
    ];
    for (const { name, value, pct } of expensePie) {
      const count = financialItems.filter(i => i.category === name && classifyItem(i.category, i.tags) === "expense").length;
      expRows.push([name, $(value), $(value * 12), `${pct.toFixed(1)}%`, count]);
    }
    expRows.push([]);
    expRows.push(["TOTAL EXPENSES", $(totalExpenses), $(totalExpenses * 12), "100%", financialItems.filter(i => classifyItem(i.category, i.tags) === "expense").length]);
    expRows.push([]);
    expRows.push(["── Item Detail ──", "", "", "", ""]);
    expRows.push(["ITEM NAME", "CATEGORY", "FREQUENCY", "MONTHLY ($)", "ANNUAL ($)"]);
    for (const it of topExpenses) {
      expRows.push([it.item, it.category, it.recurType, $(it.monthlyCost), $(it.monthlyCost * 12)]);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(expRows);
    ws3["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Expense Breakdown");

    // ── Sheet 4: Net Worth — Full Detail ──────────────────────────────────
    const nwRows: (string | number)[][] = [
      ["Net Worth — Investment Holdings Detail"],
      [`Exported: ${today}`],
      [`Live prices from CoinGecko & Yahoo Finance`],
      [],
      ["── CRYPTO ──", "", "", "", "", "", ""],
      ["ASSET", "TICKER", "SHARES / UNITS", "PRICE ($)", "GROSS VALUE ($)", "TAX RATE", "AFTER-TAX VALUE ($)"],
      ["BTC Ledger Wallet", "BTC", btcHoldings, $v(_btcPrice), $v(_btcValue), "15% LTCG", $v(_btcValue * 0.85)],
      ["BTC Coinbase", "BTC", coinbaseBtcHoldings, $v(_btcPrice), $v(_coinbaseValue), "15% LTCG", $v(_coinbaseValue * 0.85)],
      ["BTC Total", "", btcHoldings + coinbaseBtcHoldings, $v(_btcPrice), $v(_totalBtcValue), "15% LTCG", $v(_btcAfterTax)],
      [],
      ["── VANGUARD BROKERAGE ──", "", "", "", "", "", ""],
      ["ASSET", "TICKER", "SHARES", "PRICE ($)", "GROSS VALUE ($)", "TAX RATE", "AFTER-TAX VALUE ($)"],
      ["Vanguard Total Stock Market", "VTSAX", vtsaxHoldings, $v(_vtsaxPrice), $v(_vtsaxValue), "15% LTCG", $v(_vtsaxValue * 0.85)],
      ["Vanguard S&P 500 ETF", "VOO", vooHoldings, $v(_vooPrice), $v(_vooValue), "15% LTCG", $v(_vooValue * 0.85)],
      ["Vanguard Brokerage Total", "", "", "", $v(_vanguardTotal), "15% LTCG", $v(_vanguardAfterTax)],
      [],
      ["── RETIREMENT ACCOUNTS ──", "", "", "", "", "", ""],
      ["ASSET", "ACCOUNT", "SHARES", "PRICE ($)", "VALUE ($)", "TAX TREATMENT", ""],
      ["Vanguard Total Stock Market Index", "Roth IRA (Vanguard)", rothIraVtsaxHoldings, $v(_vtsaxPrice), $v(rothIraVtsaxHoldings * _vtsaxPrice), "Tax-free (Roth)", ""],
      ["iShares Bitcoin ETF", "Roth IRA (Vanguard)", rothIraIbitHoldings, $v(_ibitPrice), $v(rothIraIbitHoldings * _ibitPrice), "Tax-free (Roth)", ""],
      ["ProShares Ultra S&P500", "401k", k401Shares, $v(_viiixPrice), $v(_k401Value), "Tax-deferred", ""],
      [],
      ["── DOMAIN NAMES ──", "", "", "", "", "", ""],
      ["DOMAIN", "PURCHASE PRICE ($)", "EST. SALE PRICE ($)", "CAP GAIN ($)", "15% LTCG TAX ($)", "AFTER-TAX VALUE ($)", ""],
      ["veluna.com", $v(velunaDomainPurchasePrice), $v(velunaDomainValue), $v(_domainCapGain), $v(_domainCapGain * 0.15), $v(_domainAfterTax), ""],
      [],
      ["── REAL ESTATE ──", "", "", "", "", "", ""],
      ["PROPERTY", "EST. SALE PRICE ($)", "LOAN BALANCE ($)", "SELLING COSTS ($)", "NET BEFORE TAX ($)", "CAP GAINS TAX ($)", "AFTER-TAX NET ($)"],
      ["2605 Plumbago Ct, Rocklin CA", $v(_homeSalePrice), $v(homeLoanBalance), $v(_homeTotalSellingCosts), $v(_homeNetCashAfterSale), $v(_homeCapGainsTax), $v(_homeAfterTaxNetCash)],
      [],
      ["── OTHER ASSETS ──", "", "", "", "", "", ""],
      ["ASSET", "CATEGORY", "VALUE ($)", "", "", "", ""],
      ["BMO Checking Account", "Cash", $v(checkingBalance), "", "", "", ""],
      ["CareerGlow LLC (Mercury)", "Business Cash", $v(careerglowBalance), "", "", "", ""],
      ["HSA (Optum Financial)", "Health Savings", $v(hsaBalance), "", "", "", ""],
      ["Apple RSUs (E*Trade)", "Equity Compensation", $v(eTradeRsuValue), "", "", "", ""],
      ["Ford Explorer", "Vehicle", $v(fordExplorerValue), "", "", "", ""],
      ["Kawasaki Ninja 400", "Vehicle", $v(kawasakiNinjaValue), "", "", "", ""],
      [],
      ["── TOTAL NET WORTH (AFTER-TAX) ──", "", "", "", "", "", $v(overviewNetWorth)],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(nwRows);
    ws4["!cols"] = [{ wch: 36 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Net Worth");

    // ── Sheet 5: Retirement ────────────────────────────────────────────────
    const retRows: (string | number)[][] = [
      ["Retirement Contributions & Accounts"],
      [`Exported: ${today}`],
      [],
      ["── MONTHLY CONTRIBUTIONS ──"],
      ["ITEM", "CATEGORY", "FREQUENCY", "MONTHLY ($)", "ANNUAL ($)"],
    ];
    for (const it of retirementItems) {
      retRows.push([it.item, it.category, it.recurType, $(it.monthlyCost), $(it.monthlyCost * 12)]);
    }
    const retTotal = retirementItems.reduce((s, i) => s + i.monthlyCost, 0);
    retRows.push(["Total Retirement Contributions", "", "", $(retTotal), $(retTotal * 12)]);
    retRows.push([]);
    retRows.push(["── ACCOUNT BALANCES ──"]);
    retRows.push(["ACCOUNT", "INSTITUTION", "HOLDINGS", "CURRENT VALUE ($)", "TAX TYPE"]);
    retRows.push(["Roth IRA", "Vanguard", `${rothIraVtsaxHoldings} VTSAX + ${rothIraIbitHoldings} IBIT`, $v(_rothIraValue), "Tax-free (Roth)"]);
    retRows.push(["401k", "Employer Plan", `${k401Shares} SSO shares`, $v(_k401Value), "Tax-deferred"]);
    retRows.push(["Total Retirement Balance", "", "", $v(_rothIraValue + _k401Value), ""]);
    const ws5 = XLSX.utils.aoa_to_sheet(retRows);
    ws5["!cols"] = [{ wch: 40 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws5, "Retirement");

    // ── Sheet 6: Cashflow ──────────────────────────────────────────────────
    const cfRows: (string | number)[][] = [
      ["Monthly Cashflow Analysis"],
      [`Exported: ${today}`],
      [],
      ["METRIC", "MONTHLY ($)", "ANNUAL ($)"],
      ["W2 Salary (Post-Tax)", $(w2Income), $(w2Income * 12)],
      ["Total Expenses", $(totalExpenses), $(totalExpenses * 12)],
      ["Retirement Contributions", $(totalRetirement), $(totalRetirement * 12)],
      ["Net Cashflow (W2 − Expenses)", $(cashflowNetRaw), $(cashflowNetRaw * 12)],
      ["Non-W2 Income (RSUs, ESPP, etc.)", $(nonW2Income), $(nonW2Income * 12)],
      [],
      ["── EXPENSE DETAIL ──"],
      ["ITEM", "CATEGORY", "FREQUENCY", "MONTHLY ($)", "ANNUAL ($)"],
    ];
    for (const it of topExpenses) {
      cfRows.push([it.item, it.category, it.recurType, $(it.monthlyCost), $(it.monthlyCost * 12)]);
    }
    const ws6 = XLSX.utils.aoa_to_sheet(cfRows);
    ws6["!cols"] = [{ wch: 44 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws6, "Cashflow");

    // ── Sheet 7: Credit Cards ──────────────────────────────────────────────
    const ccData = [
      { name: "Citi Double Cash Card", issuer: "Citi", type: "2% Cash Back", status: "active", notes: "" },
      { name: "Chase Sapphire Preferred®", issuer: "Chase", type: "Travel Rewards · Points", status: "active", notes: "" },
      { name: "United Gateway℠ Card (MileagePlus)", issuer: "Chase", type: "Travel Miles · United", status: "active", notes: "" },
      { name: "BMO Cash Back World Elite Mastercard", issuer: "BMO", type: "Cash Back", status: "active", notes: "" },
      { name: "Chase Freedom Flex℠", issuer: "Chase", type: "5% Rotating + Cash Back", status: "active", notes: "" },
      { name: "Citi Custom Cash℠ Card", issuer: "Citi", type: "5% Top Spend Category", status: "active", notes: "" },
      { name: "Discover it® Cash Back", issuer: "Discover", type: "5% Rotating Categories", status: "active", notes: "" },
      { name: "Wells Fargo Active Cash Visa Card", issuer: "Wells Fargo", type: "2% Cash Back", status: "active", notes: "" },
      { name: "Barclays View Mastercard ...3373", issuer: "Barclays", type: "Cash Back", status: "active", notes: "" },
      { name: "Bank of America Card", issuer: "Bank of America", type: "Product unspecified", status: "verify", notes: "Verify card product and current status" },
      { name: "Optum HSA Debit Card **3290", issuer: "Optum Bank", type: "HSA Debit", status: "active", notes: "" },
    ];
    const ccRows: (string | number)[][] = [
      ["Credit Cards on File"],
      [`Exported: ${today} · Last reviewed May 2026`],
      [],
      ["CARD NAME", "ISSUER", "REWARD TYPE", "STATUS", "NOTES / ACTION NEEDED"],
      ...ccData.map(c => [c.name, c.issuer, c.type, c.status.toUpperCase(), c.notes]),
    ];
    const ws7 = XLSX.utils.aoa_to_sheet(ccRows);
    ws7["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws7, "Credit Cards");

    // ── Sheet 8: Accounts ─────────────────────────────────────────────────
    const accData = [
      { name: "Ledger Hardware Wallet", institution: "Ledger", detail: "Self-custody cold storage · BTC", category: "Crypto", status: "active", note: "" },
      { name: "Coinbase", institution: "Coinbase", detail: "Exchange · BTC", category: "Crypto", status: "active", note: "" },
      { name: "Vanguard Brokerage", institution: "Vanguard", detail: "Taxable · VTSAX, VOO", category: "Brokerage", status: "active", note: "" },
      { name: "Vanguard Roth IRA", institution: "Vanguard", detail: "Roth IRA · VTSAX + IBIT", category: "Retirement", status: "active", note: "" },
      { name: "E*Trade (Apple RSUs)", institution: "E*Trade / Morgan Stanley", detail: "Equity comp · Apple RSU vested shares", category: "Equity", status: "active", note: "" },
      { name: "Fidelity 401k (Apple)", institution: "Fidelity", detail: "Employer 401k · VIIIX · via Apple", category: "Retirement", status: "active", note: "" },
      { name: "BMO Checking Account", institution: "BMO", detail: "Primary checking · ···1711", category: "Banking", status: "active", note: "" },
      { name: "Mercury (CareerGlow LLC)", institution: "Mercury", detail: "Business checking · CareerGlow LLC", category: "Banking", status: "active", note: "" },
      { name: "Charles Schwab Checking", institution: "Charles Schwab", detail: "Checking · $0 balance", category: "Banking", status: "empty", note: "Kept open for travel ATM reimbursements" },
      { name: "Chase", institution: "Chase", detail: "Sapphire Preferred · Freedom Flex · United Gateway", category: "Credit", status: "active", note: "" },
      { name: "Citi", institution: "Citi", detail: "Custom Cash · Double Cash", category: "Credit", status: "active", note: "" },
      { name: "Discover", institution: "Discover", detail: "Discover it® Cash Back", category: "Credit", status: "active", note: "" },
      { name: "Wells Fargo Active Cash Visa Card", institution: "Wells Fargo", detail: "Active Cash · 2% Cash Back", category: "Credit", status: "active", note: "" },
      { name: "Barclays View Mastercard ...3373", institution: "Barclays", detail: "Barclays View Mastercard", category: "Credit", status: "active", note: "" },
      { name: "BMO", institution: "BMO", detail: "BMO Cash Back World Elite Mastercard", category: "Credit", status: "active", note: "" },
    ];
    const accRows: (string | number)[][] = [
      ["All Financial Accounts"],
      [`Exported: ${today}`],
      [],
      ["ACCOUNT NAME", "INSTITUTION", "DETAILS", "CATEGORY", "STATUS", "NOTES"],
      ...accData.map(a => [a.name, a.institution, a.detail, a.category, a.status.toUpperCase(), a.note]),
    ];
    const ws8 = XLSX.utils.aoa_to_sheet(accRows);
    ws8["!cols"] = [{ wch: 36 }, { wch: 24 }, { wch: 44 }, { wch: 14 }, { wch: 10 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, ws8, "Accounts");

    // ── Write & download ──────────────────────────────────────────────────
    const filename = `financial-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({ title: "Export downloaded!", description: `8-sheet workbook saved as ${filename}` });
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : ""} pb-24`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-1">
              💰 Financial Dashboard
            </h1>
            <p className="text-slate-400 text-sm">Monthly snapshot · {financialItems.length} items tracked</p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="shrink-0 mt-1 border-green-500/40 text-green-300 hover:bg-green-500/10 hover:text-green-200 hover:border-green-400/60 gap-2"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-slate-800/60 border-orange-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="h-4 w-4 text-orange-400" />
                <p className="text-xs text-slate-400">Net Worth</p>
              </div>
              <p className="text-2xl font-bold text-orange-300">
                {nwIsLoading ? <span className="text-base text-slate-400">Loading…</span> : `$${overviewNetWorth.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">after-tax estimate</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-green-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <p className="text-xs text-slate-400">Income + Investment</p>
              </div>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(totalIncome)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-red-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <p className="text-xs text-slate-400">Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
            </CardContent>
          </Card>
          <Card className={`bg-slate-800/60 ${netCashFlow >= 0 ? "border-green-500/30" : "border-red-500/30"}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-slate-400">Net Cash Flow</p>
              </div>
              <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-300" : "text-red-300"}`}>
                {formatCurrency(netCashFlow)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{savingsRate.toFixed(1)}% savings rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-purple-500/30 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/40 text-xs px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="income-vs-expense" className="data-[state=active]:bg-green-600/40 text-xs px-3 py-1.5">
              <PieChart className="h-3.5 w-3.5 mr-1.5" />Income vs Expenses
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-blue-600/40 text-xs px-3 py-1.5">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" />Business
            </TabsTrigger>
            <TabsTrigger value="networth" className="data-[state=active]:bg-orange-600/40 text-xs px-3 py-1.5">
              <Scale className="h-3.5 w-3.5 mr-1.5" />Net Worth
            </TabsTrigger>
            <TabsTrigger value="expense-breakdown" className="data-[state=active]:bg-red-600/40 text-xs px-3 py-1.5">
              <PieChart className="h-3.5 w-3.5 mr-1.5" />Expense Breakdown
            </TabsTrigger>
            <TabsTrigger value="retirement" className="data-[state=active]:bg-yellow-600/40 text-xs px-3 py-1.5">
              <PiggyBank className="h-3.5 w-3.5 mr-1.5" />Retirement
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="data-[state=active]:bg-blue-600/40 text-xs px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />Cash Flow (W2 Only)
            </TabsTrigger>
            <TabsTrigger value="credit-cards" className="data-[state=active]:bg-red-600/40 text-xs px-3 py-1.5">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />Credit Cards
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-slate-600/60 text-xs px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />Accounts
            </TabsTrigger>
            <TabsTrigger value="nw-trend" className="data-[state=active]:bg-emerald-600/40 text-xs px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />NW Over Time
            </TabsTrigger>
            <TabsTrigger value="fire" className="data-[state=active]:bg-orange-600/40 text-xs px-3 py-1.5">
              🔥 FIRE Goal
            </TabsTrigger>
            <TabsTrigger value="table" className="data-[state=active]:bg-purple-600/40 text-xs px-3 py-1.5">
              <List className="h-3.5 w-3.5 mr-1.5" />All Items
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            {/* Widget toggle legend */}
            <div className="flex justify-end">
              <div className="bg-slate-800/80 border border-purple-500/30 rounded-xl px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-2 items-center">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Widgets</span>
                {([
                  { key: "incomeSources",      label: "Income Sources",         dot: "bg-green-400" },
                  { key: "topExpenses",        label: "Top Expense Categories", dot: "bg-red-400" },
                  { key: "netWorth",           label: "Total Net Worth",        dot: "bg-orange-400" },
                  { key: "incomeVsExpense",    label: "Income vs Expense",      dot: "bg-purple-400" },
                  { key: "monthlyAllocation",  label: "Monthly Allocation",     dot: "bg-blue-400" },
                  { key: "portfolioAllocation",label: "Portfolio Allocation",   dot: "bg-yellow-400" },
                  { key: "fireGoal",           label: "FIRE Goal",              dot: "bg-orange-400" },
                ] as { key: keyof typeof overviewWidgets; label: string; dot: string }[]).map(({ key, label, dot }) => (
                  <button
                    key={key}
                    onClick={() => toggleWidget(key)}
                    className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-all border ${
                      overviewWidgets[key]
                        ? "border-purple-500/50 text-slate-200 bg-slate-700/60"
                        : "border-slate-700/40 text-slate-500 bg-transparent line-through"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${overviewWidgets[key] ? "opacity-100" : "opacity-30"}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Single auto-filling grid — visible widgets reflow to fill rows */}
            {(() => {
              const WIDGET_META: Record<WidgetKey, { label: string; fullWidth?: boolean }> = {
                incomeSources:       { label: "Income Sources" },
                topExpenses:         { label: "Top Expense Categories" },
                netWorth:            { label: "Total Net Worth" },
                incomeVsExpense:     { label: "Income vs Expense" },
                monthlyAllocation:   { label: "Monthly Allocation", fullWidth: true },
                portfolioAllocation: { label: "Portfolio Allocation" },
                fireGoal:            { label: "FIRE Goal" },
              };

              const visibleKeys = widgetOrder.filter(k => overviewWidgets[k]);
              if (visibleKeys.length === 0) return (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                  No widgets visible — enable some above
                </div>
              );

              const handleDragStart = (e: React.DragEvent, orderIdx: number) => {
                dragSrcIdx.current = orderIdx;
                e.dataTransfer.effectAllowed = "move";
              };
              const handleDragOver = (e: React.DragEvent, orderIdx: number) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverIdx(orderIdx);
              };
              const handleDrop = (e: React.DragEvent, orderIdx: number) => {
                e.preventDefault();
                if (dragSrcIdx.current === null || dragSrcIdx.current === orderIdx) {
                  setDragOverIdx(null); return;
                }
                // Reorder widgetOrder (full order array, not just visible)
                const srcKey = visibleKeys[dragSrcIdx.current];
                const dstKey = visibleKeys[orderIdx];
                const srcFullIdx = widgetOrder.indexOf(srcKey);
                const dstFullIdx = widgetOrder.indexOf(dstKey);
                const next = [...widgetOrder];
                next.splice(srcFullIdx, 1);
                next.splice(dstFullIdx, 0, srcKey);
                setWidgetOrder(next);
                try { localStorage.setItem("overview-widget-order", JSON.stringify(next)); } catch {}
                saveWidgetPrefs({ overviewOrder: next });
                dragSrcIdx.current = null;
                setDragOverIdx(null);
              };
              const handleDragEnd = () => { dragSrcIdx.current = null; setDragOverIdx(null); };

              const renderWidget = (key: WidgetKey) => {
                switch (key) {
                  case "incomeSources": return (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-300 text-base">Income Sources</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={90} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #6366f1" }} />
                            <Bar dataKey="value" radius={[0,4,4,0]}>
                              {Object.entries(incomeByCategory).map(([cat]) => (
                                <Cell key={cat} fill={CATEGORY_COLORS[cat] || "#22C55E"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </>
                  );
                  case "topExpenses": return (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-red-300 text-base">Top Expense Categories</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">monthly spend</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={expensePie.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #6366f1" }} />
                            <Bar dataKey="value" radius={[0,4,4,0]}>
                              {expensePie.slice(0, 8).map((d) => (
                                <Cell key={d.name} fill={d.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </>
                  );
                  case "netWorth": return (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-orange-300 text-base flex items-center gap-2">
                          <Scale className="h-4 w-4" /> Total Net Worth
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                          Investments · Real Estate · Cash · live prices
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {nwIsLoading ? (
                          <div className="flex items-center justify-center h-28 text-slate-400 text-sm">Loading prices…</div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-orange-300">
                                ${overviewNetWorth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">estimated total</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              {[
                                { label: "Crypto (BTC, after tax)", value: _btcAfterTax, color: "text-yellow-300" },
                                { label: "Index Funds (after tax)", value: _vanguardAfterTax, color: "text-indigo-300" },
                                { label: "Roth IRA (after penalty)", value: _rothIraAfterPenalty, color: "text-purple-300" },
                                { label: "401k (after penalty)", value: _k401AfterPenalty, color: "text-teal-300" },
                                { label: "Real Estate (after-tax)", value: _homeAfterTaxNetCash, color: "text-pink-300" },
                                { label: "Checking", value: checkingBalance, color: "text-cyan-300" },
                                { label: "CareerGlow LLC (Mercury)", value: careerglowBalance, color: "text-cyan-200" },
                                { label: "HSA (Optum Financial)", value: hsaBalance, color: "text-teal-200" },
                                { label: "veluna.com Domain", value: _domainAfterTax, color: "text-violet-300" },
                                { label: "E*Trade (Apple RSU)", value: eTradeRsuValue, color: "text-green-300" },
                                { label: "Ford Explorer XLT", value: fordExplorerValue, color: "text-orange-300" },
                                { label: "Kawasaki Ninja 300", value: kawasakiNinjaValue, color: "text-red-300" },
                              ].map(({ label, value, color }) => (
                                <div key={label} className="bg-slate-700/40 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-slate-400">{label}</p>
                                  <p className={`text-sm font-semibold ${color}`}>
                                    ${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </>
                  );
                  case "incomeVsExpense": return (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-purple-300 text-base">Income vs Expense</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                          🟢 Income &amp; Investment · 🟡 Retirement · 🔴 Expenses
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <RechartsPieChart>
                            <Pie data={incomeVsExpensePie} cx="50%" cy="50%" outerRadius={85} innerRadius={42}
                              dataKey="value" labelLine={false} label={false}>
                              {incomeVsExpensePie.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend formatter={(value) => <span className="text-slate-200 text-xs">{value}</span>} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
                          {incomeVsExpensePie.map(d => (
                            <div key={d.name} className="text-center">
                              <p className="text-[10px] text-slate-400 truncate">{d.name}</p>
                              <p className="text-xs font-semibold" style={{ color: d.color }}>{formatCurrency(d.value)}</p>
                              <p className="text-[10px] text-slate-500">{d.pct.toFixed(1)}%</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </>
                  );
                  case "monthlyAllocation": return (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-purple-300 text-base">Monthly Allocation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { label: "Income & Investment", value: totalIncome, color: "bg-green-500" },
                          { label: "Expenses", value: totalExpenses, color: "bg-red-500" },
                          { label: "Retirement Contributions", value: totalRetirement, color: "bg-yellow-400" },
                        ].map(({ label, value, color }) => {
                          const total = totalIncome + totalExpenses + totalRetirement;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs text-slate-300 mb-1">
                                <span>{label}</span>
                                <span>{formatCurrency(value)} ({total > 0 ? ((value/total)*100).toFixed(1) : "0"}%)</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-700">
                                <div className={`h-2 rounded-full ${color}`} style={{ width: `${total > 0 ? (value/total)*100 : 0}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </>
                  );
                  case "portfolioAllocation": {
                    const _rothIraIbitValue = rothIraIbitHoldings * _ibitPrice;
                    const _rothIraVtsaxValue = rothIraVtsaxHoldings * _vtsaxPrice;
                    const _cryptoTotal = _btcAfterTax + _rothIraIbitValue * 0.75;
                    const _indexTotal = _vanguardAfterTax + _k401AfterPenalty + eTradeRsuValue + _rothIraVtsaxValue * 0.75;
                    const _domainTotal = _domainAfterTax;
                    const _vehicleTotal = fordExplorerValue + kawasakiNinjaValue;
                    const _nwTotal = _cryptoTotal + _indexTotal + checkingBalance + careerglowBalance + hsaBalance + _domainTotal + _vehicleTotal + (_homeAfterTaxNetCash > 0 ? _homeAfterTaxNetCash : 0);
                    const _overviewPieData = [
                      { name: "Crypto",                value: Math.round(_cryptoTotal),                        color: "#F59E0B" },
                      { name: "Index Funds & Equity",  value: Math.round(_indexTotal),                         color: "#6366F1" },
                      { name: "Cash",                  value: Math.round(checkingBalance + careerglowBalance + hsaBalance),  color: "#22D3EE" },
                      { name: "Domain Names",          value: Math.round(_domainTotal),         color: "#8B5CF6" },
                      { name: "Vehicle",               value: Math.round(_vehicleTotal),        color: "#F97316" },
                      ...(_homeAfterTaxNetCash > 0 ? [{ name: "Real Estate", value: Math.round(_homeAfterTaxNetCash), color: "#EC4899" }] : []),
                    ].filter(d => d.value > 0).map(d => ({
                      ...d,
                      pct: _nwTotal > 0 ? (d.value / _nwTotal) * 100 : 0,
                    }));
                    const fmtShort = (n: number) => `$${n >= 1000 ? `${(n/1000).toFixed(0)}k` : n.toLocaleString()}`;
                    return (
                      <>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-yellow-300 text-base flex items-center gap-2">
                            <PieChart className="h-4 w-4" /> Portfolio Allocation
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-xs">
                            Investment portfolio breakdown · live prices
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {nwIsLoading ? (
                            <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm animate-pulse">Loading prices…</div>
                          ) : _overviewPieData.length === 0 ? (
                            <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">No data</div>
                          ) : (
                            <>
                              <ResponsiveContainer width="100%" height={200}>
                                <RechartsPieChart>
                                  <Pie data={_overviewPieData} cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                                    dataKey="value" labelLine={false} label={false}>
                                    {_overviewPieData.map((d, i) => <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />)}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null;
                                      const d = payload[0].payload;
                                      return (
                                        <div className="bg-slate-800 border border-yellow-500/50 rounded-lg px-3 py-2 shadow-xl text-sm">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                            <span className="text-white font-semibold">{d.name}</span>
                                          </div>
                                          <p className="text-slate-200">${d.value.toLocaleString()}</p>
                                          <p className="font-bold" style={{ color: d.color }}>{d.pct.toFixed(1)}%</p>
                                        </div>
                                      );
                                    }}
                                  />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-1">
                                {_overviewPieData.map(d => (
                                  <div key={d.name} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                                    <span className="text-[11px] text-slate-300">{d.name}</span>
                                    <span className="text-[11px] font-semibold" style={{ color: d.color }}>{d.pct.toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </>
                    );
                  }
                  case "fireGoal": {
                    // Inline FIRE computation (mirrors FIRE tab logic)
                    const _fgRoth = _rothIraValue * 0.75;
                    const _fg401k = _k401Value * 0.68;
                    const _fgHsa = hsaBalance * 0.58;
                    const _fgLiquid =
                      _btcAfterTax + _vanguardAfterTax + _fgRoth + _fg401k +
                      (_homeAfterTaxNetCash > 0 ? _homeAfterTaxNetCash : 0) +
                      checkingBalance + careerglowBalance + _fgHsa +
                      _domainAfterTax + eTradeRsuValue + fordExplorerValue + kawasakiNinjaValue;
                    const _fgBuf = fireCurrencyBuffer + fireHealthcareBuffer + fireLifestyleBuffer;
                    const _fgTierData = FIRE_TIER_DATA[fireLocationKey][fireTier];
                    const _fgMonthlyBase = Object.values(_fgTierData).reduce((s, v) => s + v, 0);
                    const _fgMonthlyToday = Math.round(_fgMonthlyBase * (1 + _fgBuf));
                    const _fgAnnualToday = _fgMonthlyToday * 12;
                    const _fgBaseGoal = _fgAnnualToday / fireSwr;
                    // Pass-1 years
                    const _fgInvestable = _btcAfterTax + _vanguardAfterTax + _fgRoth + _fg401k + eTradeRsuValue;
                    const _fgHomeBase = Math.max(0, _homeAfterTaxNetCash);
                    const _fgCashFixed = checkingBalance + careerglowBalance + _fgHsa + _domainAfterTax + fordExplorerValue + kawasakiNinjaValue;
                    const _fgAnnualSavings = Math.max(0, cashflowNetRaw) * 12 + Math.min(totalRetirement * 12, 23_500) * 0.68;
                    const fgFV = (n: number) =>
                      _fgInvestable * Math.pow(1.08, n) +
                      (_fgAnnualSavings > 0 ? _fgAnnualSavings * (Math.pow(1.08, n) - 1) / 0.08 : 0) +
                      _fgHomeBase * Math.pow(1.04, n) + _fgCashFixed;
                    let _fgYrs1 = 15;
                    for (let n = 1; n <= 80; n++) { if (fgFV(n) >= _fgBaseGoal) { _fgYrs1 = n; break; } }
                    const _fgInflatedAnnual = _fgAnnualToday * Math.pow(1 + fireColInflation, _fgYrs1);
                    const _fgDrawdownYrs = Math.max(1, fireInheritanceAge - (28 + _fgYrs1));
                    const FIRE_GOAL_W = fgWidgetInheritance
                      ? Math.round(_fgInflatedAnnual * (1 - Math.pow(1.07, -_fgDrawdownYrs)) / 0.07)
                      : Math.round(_fgInflatedAnnual / fireSwr);
                    // Final years using real goal
                    let _fgYrs = 15;
                    if (_fgLiquid >= FIRE_GOAL_W) { _fgYrs = 0; }
                    else { for (let n = 1; n <= 80; n++) { if (fgFV(n) >= FIRE_GOAL_W) { _fgYrs = n; break; } } }
                    const _fgPct = Math.min((_fgLiquid / FIRE_GOAL_W) * 100, 100);
                    const _fgAge = 28 + _fgYrs;
                    const fmtG = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
                    const locFlags: Record<string, string> = { thailand: "🇹🇭", vietnam: "🇻🇳", colombia: "🇨🇴", puertoRico: "🇵🇷", austin: "🤠", auburn: "🏔️" };
                    return (
                      <>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-orange-300 text-base flex items-center gap-2">
                            🔥 FIRE Goal
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-xs">
                            {fgWidgetInheritance ? `Drawdown to age ${fireInheritanceAge}` : `${(fireSwr * 100).toFixed(2)}% SWR`} · {fireTier} · {locFlags[fireLocationKey] ?? "🇹🇭"} {fireLocationKey}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Inheritance toggle */}
                          <div className="flex gap-1.5 mb-3">
                            <button
                              onClick={() => setFgWidgetInheritance(false)}
                              className={`flex-1 text-[10px] py-1 rounded-md border transition-colors ${
                                !fgWidgetInheritance
                                  ? "bg-orange-500/20 border-orange-500/50 text-orange-300 font-semibold"
                                  : "bg-transparent border-slate-700/50 text-slate-500 hover:border-slate-600"
                              }`}
                            >
                              📈 Standard SWR
                            </button>
                            <button
                              onClick={() => setFgWidgetInheritance(true)}
                              className={`flex-1 text-[10px] py-1 rounded-md border transition-colors ${
                                fgWidgetInheritance
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold"
                                  : "bg-transparent border-slate-700/50 text-slate-500 hover:border-slate-600"
                              }`}
                            >
                              💎 w/ Inheritance
                            </button>
                          </div>
                          <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-black text-orange-400">{_fgPct.toFixed(1)}%</span>
                            <span className="text-slate-400 text-sm mb-1">of {fmtG(FIRE_GOAL_W)} goal</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
                            <div className={`h-3 rounded-full transition-all duration-700 ${fgWidgetInheritance ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-orange-500 to-yellow-400"}`}
                              style={{ width: `${_fgPct}%` }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-700/40 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">Liquid NW Today</p>
                              <p className="text-sm font-bold text-orange-300">{fmtG(_fgLiquid)}</p>
                            </div>
                            <div className="bg-slate-700/40 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">FIRE Age</p>
                              <p className="text-sm font-bold text-green-400">Age {_fgAge} ({2026 + _fgYrs})</p>
                            </div>
                            <div className="bg-slate-700/40 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">Monthly @ Retirement</p>
                              <p className="text-sm font-bold text-yellow-300">{fmtG(Math.round(_fgInflatedAnnual / 12))}/mo</p>
                            </div>
                            <div className="bg-slate-700/40 rounded-lg p-2">
                              <p className="text-[10px] text-slate-400">Remaining</p>
                              <p className="text-sm font-bold text-slate-200">{fmtG(Math.max(0, FIRE_GOAL_W - _fgLiquid))}</p>
                            </div>
                          </div>
                          <button onClick={() => setActiveTab("fire")}
                            className="mt-3 w-full text-xs text-orange-300 border border-orange-500/30 rounded-lg py-1.5 hover:bg-orange-500/10 transition-colors">
                            Open full FIRE analysis →
                          </button>
                        </CardContent>
                      </>
                    );
                  }
                }
              };

              const BORDER: Record<WidgetKey, string> = {
                incomeSources:       "border-green-500/20 hover:border-green-500/50",
                topExpenses:         "border-red-500/20 hover:border-red-500/50",
                netWorth:            "border-orange-500/20 hover:border-orange-500/50",
                incomeVsExpense:     "border-purple-500/20 hover:border-purple-500/50",
                monthlyAllocation:   "border-purple-500/20 hover:border-purple-500/50",
                portfolioAllocation: "border-yellow-500/20 hover:border-yellow-500/50",
                fireGoal:            "border-orange-500/20 hover:border-orange-500/50",
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleKeys.map((key, vIdx) => {
                    const meta = WIDGET_META[key];
                    const isDraggingOver = dragOverIdx === vIdx;
                    return (
                      <div
                        key={key}
                        className={`${meta.fullWidth ? "md:col-span-2" : ""}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, vIdx)}
                        onDragOver={(e) => handleDragOver(e, vIdx)}
                        onDrop={(e) => handleDrop(e, vIdx)}
                        onDragEnd={handleDragEnd}
                      >
                        <Card className={`bg-slate-800/60 transition-all duration-150 ${BORDER[key]} ${isDraggingOver ? "ring-2 ring-purple-500/60 scale-[1.01]" : ""}`}>
                          {/* Drag handle strip */}
                          <div className="flex items-center justify-end px-3 pt-2 pb-0 cursor-grab active:cursor-grabbing select-none">
                            <div className="flex items-center gap-1 text-slate-600 hover:text-slate-400 transition-colors">
                              <GripVertical className="h-4 w-4" />
                              <GripVertical className="h-4 w-4 -ml-2.5" />
                            </div>
                          </div>
                          {renderWidget(key)}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* ── Income vs Expense Pie ─────────────────── */}
          <TabsContent value="income-vs-expense" className="space-y-4">
            <Card className="bg-slate-800/60 border-green-500/20">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-green-300">Income + Investment vs Expenses</CardTitle>
                    <CardDescription className="text-slate-400 text-xs mt-1">
                      {iveView === "summary"
                        ? "🟢 Income & Investment · 🟡 Retirement · 🔴 Expenses"
                        : "All individual items broken down by category"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 rounded-lg overflow-hidden border border-slate-600/60 text-xs">
                    <button
                      onClick={() => setIveView("summary")}
                      className={`px-3 py-1.5 transition-colors ${iveView === "summary" ? "bg-green-600/50 text-green-200" : "bg-slate-700/40 text-slate-400 hover:text-slate-200"}`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setIveView("granular")}
                      className={`px-3 py-1.5 transition-colors border-l border-slate-600/60 ${iveView === "granular" ? "bg-green-600/50 text-green-200" : "bg-slate-700/40 text-slate-400 hover:text-slate-200"}`}
                    >
                      Granular
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {iveView === "summary" ? (
                  <>
                    <ResponsiveContainer width="100%" height={360}>
                      <RechartsPieChart>
                        <Pie data={incomeVsExpensePie} cx="50%" cy="50%" outerRadius={130} innerRadius={60}
                          dataKey="value" labelLine={false} label={false}>
                          {incomeVsExpensePie.map((entry, i) => (
                            <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(value) => <span className="text-slate-200 text-sm">{value}</span>} />
                      </RechartsPieChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50">
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                        <p className="text-xs text-green-400 font-semibold mb-2 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" /> Income + Investment
                        </p>
                        {financialItems.filter(i => classifyItem(i.category, i.tags) === "income")
                          .sort((a, b) => b.monthlyCost - a.monthlyCost)
                          .map(i => (
                            <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-green-500/10 last:border-0">
                              <span className="text-slate-300 truncate mr-2">{i.item}</span>
                              <span className="text-green-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                            </div>
                          ))}
                        <div className="flex justify-between text-xs pt-1.5 font-bold">
                          <span className="text-green-300">Total</span>
                          <span className="text-green-300">{formatCurrency(totalIncome)}</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                        <p className="text-xs text-yellow-400 font-semibold mb-2 flex items-center gap-1.5">
                          <PiggyBank className="h-3.5 w-3.5" /> Retirement
                        </p>
                        {retirementItems.sort((a, b) => b.monthlyCost - a.monthlyCost).map(i => (
                          <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-yellow-500/10 last:border-0">
                            <span className="text-slate-300 truncate mr-2">{i.item}</span>
                            <span className="text-yellow-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs pt-1.5 font-bold">
                          <span className="text-yellow-300">Total</span>
                          <span className="text-yellow-300">{formatCurrency(totalRetirement)}</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <p className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1.5">
                          <TrendingDown className="h-3.5 w-3.5" /> Top Expenses
                        </p>
                        {financialItems.filter(i => classifyItem(i.category, i.tags) === "expense")
                          .sort((a, b) => b.monthlyCost - a.monthlyCost)
                          .slice(0, 10)
                          .map(i => (
                            <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-red-500/10 last:border-0">
                              <span className="text-slate-300 truncate mr-2">{i.item}</span>
                              <span className="text-red-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                            </div>
                          ))}
                        <div className="flex justify-between text-xs pt-1.5 font-bold">
                          <span className="text-red-300">Total</span>
                          <span className="text-red-300">{formatCurrency(totalExpenses)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (() => {
                  // Granular: every individual item as its own slice, colored by type
                  const granularData = [
                    ...financialItems.filter(i => classifyItem(i.category, i.tags) === "income")
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map(i => ({ name: i.item, value: i.monthlyCost, color: CATEGORY_COLORS[i.category] || "#22C55E", type: "income" as const })),
                    ...financialItems.filter(i => classifyItem(i.category, i.tags) === "retirement")
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map(i => ({ name: i.item, value: i.monthlyCost, color: CATEGORY_COLORS[i.category] || "#FBBF24", type: "retirement" as const })),
                    ...financialItems.filter(i => classifyItem(i.category, i.tags) === "expense")
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map(i => ({ name: i.item, value: i.monthlyCost, color: CATEGORY_COLORS[i.category] || "#94A3B8", type: "expense" as const })),
                  ].filter(d => d.value > 0);
                  const grandTotal = granularData.reduce((s, d) => s + d.value, 0);
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={380}>
                        <RechartsPieChart>
                          <Pie data={granularData} cx="50%" cy="50%" outerRadius={140} innerRadius={55}
                            dataKey="value" labelLine={false} label={false}>
                            {granularData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>

                      <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(["income", "retirement", "expense"] as const).map(type => {
                          const items = granularData.filter(d => d.type === type);
                          const typeTotal = items.reduce((s, d) => s + d.value, 0);
                          const typeColor = type === "income" ? "green" : type === "retirement" ? "yellow" : "red";
                          const typeLabel = type === "income" ? "Income & Investment" : type === "retirement" ? "Retirement" : "Expenses";
                          return (
                            <div key={type} className={`rounded-lg bg-${typeColor}-500/10 border border-${typeColor}-500/20 p-3`}>
                              <p className={`text-xs text-${typeColor}-400 font-semibold mb-2`}>{typeLabel}</p>
                              {items.map(item => (
                                <div key={item.name} className="flex items-center gap-1.5 py-0.5 border-b border-slate-700/30 last:border-0">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="text-slate-300 text-xs truncate flex-1 mr-1">{item.name}</span>
                                  <span className={`text-${typeColor}-300 text-xs shrink-0`}>{formatCurrency(item.value)}</span>
                                  <span className="text-slate-500 text-[10px] shrink-0">({grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : 0}%)</span>
                                </div>
                              ))}
                              <div className={`flex justify-between text-xs pt-1.5 font-bold text-${typeColor}-300`}>
                                <span>Total</span>
                                <span>{formatCurrency(typeTotal)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Business Tab ─────────────────────────── */}
          <TabsContent value="business" className="space-y-4">
            {(() => {
              const bizItems = financialItems.filter(isBusinessItem);
              const bizItemsSorted = [...bizItems].sort((a, b) => b.monthlyCost - a.monthlyCost);
              const bizIncome = bizItems.filter(i => classifyItem(i.category, i.tags) === "income").reduce((s, i) => s + i.monthlyCost, 0);
              const bizExpenses = bizItems.filter(i => classifyItem(i.category, i.tags) === "expense").reduce((s, i) => s + i.monthlyCost, 0);
              const bizNet = bizIncome - bizExpenses;
              const bizExpByCategory = bizItems
                .filter(i => classifyItem(i.category, i.tags) === "expense")
                .reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.monthlyCost; return acc; }, {} as Record<string, number>);
              const bizExpPie = Object.entries(bizExpByCategory).map(([cat, val]) => ({
                name: cat, value: val, color: CATEGORY_COLORS[cat] || "#94A3B8",
              }));
              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-slate-800/60 border-green-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />Business Income
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(bizIncome)}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatCurrency(bizIncome * 12)} / year</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/60 border-red-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-red-300 text-sm flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />Business Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-red-400">{formatCurrency(bizExpenses)}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatCurrency(bizExpenses * 12)} / year</p>
                      </CardContent>
                    </Card>
                    <Card className={`bg-slate-800/60 border-${bizNet >= 0 ? "blue" : "red"}-500/20`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-${bizNet >= 0 ? "blue" : "red"}-300 text-sm flex items-center gap-2`}>
                          <Briefcase className="h-4 w-4" />Net Business Cash
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-2xl font-bold text-${bizNet >= 0 ? "blue" : "red"}-400`}>{formatCurrency(bizNet)}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatCurrency(bizNet * 12)} / year</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Income vs Expense bar */}
                    <Card className="bg-slate-800/60 border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="text-blue-300 text-sm">Business Income vs Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={[
                            { name: "Income", value: bizIncome, fill: "#22C55E" },
                            { name: "Expenses", value: bizExpenses, fill: "#EF4444" },
                            { name: "Net", value: Math.abs(bizNet), fill: bizNet >= 0 ? "#3B82F6" : "#F97316" },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                            <YAxis tickFormatter={v => `$${(v/100).toFixed(0)}`} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                            <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #7C3AED" }} />
                            <Bar dataKey="value">
                              {[{ fill: "#22C55E" }, { fill: "#EF4444" }, { fill: bizNet >= 0 ? "#3B82F6" : "#F97316" }].map((e, i) => (
                                <Cell key={i} fill={e.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Expense breakdown pie */}
                    {bizExpPie.length > 0 && (
                      <Card className="bg-slate-800/60 border-blue-500/20">
                        <CardHeader>
                          <CardTitle className="text-blue-300 text-sm">Business Expense Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={220}>
                            <RechartsPieChart>
                              <Pie data={bizExpPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                {bizExpPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                              </Pie>
                              <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #7C3AED" }} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Expense items stacked bar chart */}
                  {(() => {
                    const expenseItems = bizItemsSorted.filter(i => classifyItem(i.category, i.tags) === "expense");
                    if (expenseItems.length === 0) return null;
                    const BAR_COLORS = ["#EF4444","#F97316","#F59E0B","#EAB308","#84CC16","#22C55E","#14B8A6","#06B6D4","#3B82F6","#8B5CF6","#EC4899","#F43F5E","#A855F7","#6366F1","#10B981","#F87171","#FB923C","#FBBF24","#A3E635","#34D399"];
                    const chartData = [{ name: "Monthly Expenses" as string }] as Record<string, string | number>[];
                    expenseItems.forEach((item, i) => {
                      chartData[0][item.item] = item.monthlyCost / 100;
                    });
                    return (
                      <Card className="bg-slate-800/60 border-blue-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-blue-300 text-sm">Business Expenses Breakdown</CardTitle>
                          <CardDescription className="text-slate-400 text-xs">Monthly cost per item — largest to smallest</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" hide />
                              <Tooltip
                                formatter={(value: any, name: string) => [`$${Number(value).toFixed(2)}/mo`, name]}
                                contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #3B82F6", borderRadius: 8, fontSize: 12 }}
                              />
                              {expenseItems.map((item, i) => (
                                <Bar key={item.item} dataKey={item.item} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} radius={i === 0 ? [4,0,0,4] : i === expenseItems.length - 1 ? [0,4,4,0] : undefined} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                          {/* Legend */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-slate-700/40">
                            {expenseItems.map((item, i) => (
                              <div key={item.item} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                                <span className="text-xs text-slate-300">{item.item}</span>
                                <span className="text-xs font-semibold" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>${(item.monthlyCost / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Item list */}
                  <Card className="bg-slate-800/60 border-blue-500/20">
                    <CardHeader>
                      <CardTitle className="text-blue-300 text-sm">Business Items ({bizItems.length})</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Items tagged or categorized as Business · sorted by cost</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {bizItemsSorted.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-6">No business items found. Add items with the "Business" category or tag.</p>
                      ) : (
                        <div className="space-y-2">
                          {bizItemsSorted.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{item.item}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className="text-xs px-1.5 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30">{item.category}</Badge>
                                  {Array.isArray(item.tags) && item.tags.filter(t => t !== item.category).map(tag => (
                                    <Badge key={tag} className="text-xs px-1.5 py-0 bg-slate-600/60 text-slate-300 border-slate-500/30">{tag}</Badge>
                                  ))}
                                  <span className="text-slate-400 text-xs">{item.recurType}</span>
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <p className={`text-sm font-bold ${classifyItem(item.category, item.tags) === "income" ? "text-green-400" : "text-red-400"}`}>
                                  {formatCurrency(item.monthlyCost)}/mo
                                </p>
                                <p className="text-xs text-slate-500">{formatCurrency(item.monthlyCost * 12)}/yr</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* ── Expense Breakdown Pie ─────────────────── */}
          <TabsContent value="expense-breakdown" className="space-y-4">
            <Card className="bg-slate-800/60 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-300">Expense Breakdown by Category</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Income, Investment, and Retirement excluded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <RechartsPieChart>
                    <Pie data={expensePie} cx="50%" cy="50%" outerRadius={120} innerRadius={50}
                      dataKey="value" labelLine={false} label={false}>
                      {expensePie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-200 text-xs">{value}</span>} />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-1.5">
                  {expensePie.map(cat => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-300">{cat.name}</span>
                          <span className="text-slate-300 font-medium">{formatCurrency(cat.value)} ({cat.pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700">
                          <div className="h-1.5 rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Master List: All Expense Items (full breakdown) ── */}
            <Card className="bg-slate-800/60 border-red-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-red-300 text-base">All Expense Items</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      Full breakdown grouped by category · largest first
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Search expenses…"
                      value={expenseBreakdownSearch}
                      onChange={(e) => setExpenseBreakdownSearch(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white h-8 text-xs w-44 placeholder:text-slate-500"
                    />
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <Select value={expenseBreakdownCat} onValueChange={setExpenseBreakdownCat}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="All">All Categories</SelectItem>
                        {expensePie.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {(() => {
                  const q = expenseBreakdownSearch.trim().toLowerCase();
                  const matches = topExpenses.filter(i =>
                    (expenseBreakdownCat === "All" || i.category === expenseBreakdownCat) &&
                    (q === "" || i.item.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
                  );

                  // Group by category, sorted by category total desc
                  const byCat = matches.reduce((acc, i) => {
                    if (!acc[i.category]) acc[i.category] = [];
                    acc[i.category].push(i);
                    return acc;
                  }, {} as Record<string, typeof matches>);

                  const catGroups = Object.entries(byCat)
                    .map(([cat, items]) => ({
                      cat,
                      items: [...items].sort((a, b) => b.monthlyCost - a.monthlyCost),
                      total: items.reduce((s, i) => s + i.monthlyCost, 0),
                      color: CATEGORY_COLORS[cat] || "#94A3B8",
                    }))
                    .sort((a, b) => b.total - a.total);

                  const shownTotal = matches.reduce((s, i) => s + i.monthlyCost, 0);

                  if (catGroups.length === 0) {
                    return (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        No expense items match your filters.
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-slate-700/30">
                      {catGroups.map(g => {
                        const pct = totalExpenses > 0 ? (g.total / totalExpenses) * 100 : 0;
                        return (
                          <div key={g.cat} className="mb-0">
                            {/* Category header */}
                            <div className="flex items-center justify-between gap-2 px-4 py-2 border-y border-slate-700/60 bg-slate-900/30">
                              <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-200 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                                <span className="truncate">{g.cat}</span>
                                <span className="text-slate-500 font-normal shrink-0">({pct.toFixed(1)}%)</span>
                              </span>
                              <span className="text-xs font-semibold text-red-300 text-right shrink-0">
                                {g.items.length} {g.items.length === 1 ? "item" : "items"} · {formatCurrency(g.total)}/mo · {formatCurrency(g.total * 12)}/yr
                              </span>
                            </div>
                            {/* Items */}
                            <div className="divide-y divide-slate-700/20">
                              {g.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-700/20">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white text-xs font-medium">{item.item}</p>
                                    {item.notes && <p className="text-[10px] text-slate-400 mt-0.5">{item.notes}</p>}
                                    <p className="text-[10px] text-slate-500 mt-0.5">{item.recurType}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-red-300 text-xs font-semibold tabular-nums">{formatCurrency(item.monthlyCost)}/mo</p>
                                    <p className="text-red-200/60 text-[10px] tabular-nums">{formatCurrency(item.monthlyCost * 12)}/yr</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {/* Footer total */}
                      <div className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 bg-slate-900/40 text-xs">
                        <span className="text-slate-400">{matches.length} {matches.length === 1 ? "item" : "items"} shown</span>
                        <span className="text-red-300 font-bold">Total: {formatCurrency(shownTotal)}/mo · {formatCurrency(shownTotal * 12)}/yr</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Retirement Tab ────────────────────────── */}
          <TabsContent value="retirement" className="space-y-4">
            <Card className="bg-slate-800/60 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-300 flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" /> Retirement Overview
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  401k contributions, employer match, and other retirement-tagged items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-5 flex-1 text-center">
                    <p className="text-xs text-yellow-400 mb-1">Total Monthly Retirement Savings</p>
                    <p className="text-4xl font-bold text-yellow-300">{formatCurrency(totalRetirement)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(totalRetirement * 12)}/yr · {totalIncome > 0 ? ((totalRetirement / totalIncome) * 100).toFixed(1) : "0"}% of income
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-700/40 border border-slate-600/30 p-5 flex-1 text-center">
                    <p className="text-xs text-slate-400 mb-1">Projected 10-Year Accumulation</p>
                    <p className="text-4xl font-bold text-slate-200">
                      {formatCurrency(Math.round(totalRetirement * 12 * 10 * 1.5))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">rough estimate at ~7% avg annual growth</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Item</TableHead>
                      <TableHead className="text-slate-300">Monthly</TableHead>
                      <TableHead className="text-slate-300">Annual</TableHead>
                      <TableHead className="text-slate-300">Recur Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retirementItems.sort((a, b) => b.monthlyCost - a.monthlyCost).map((item) => (
                      <TableRow key={item.id} className="border-slate-700">
                        <TableCell className="text-white text-sm">{item.item}</TableCell>
                        <TableCell className="text-yellow-300 font-semibold">{formatCurrency(item.monthlyCost)}</TableCell>
                        <TableCell className="text-yellow-200/70">{formatCurrency(item.monthlyCost * 12)}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{item.recurType}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-yellow-500/30 bg-yellow-500/5">
                      <TableCell className="text-yellow-300 font-bold">Total</TableCell>
                      <TableCell className="text-yellow-300 font-bold">{formatCurrency(totalRetirement)}</TableCell>
                      <TableCell className="text-yellow-200 font-semibold">{formatCurrency(totalRetirement * 12)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Net Worth Over Time ───────────────────── */}
          <TabsContent value="nw-trend" className="space-y-4">
            {(() => {
              const chartData = nwSnapshots.map(s => ({
                month: s.month,
                label: new Date(s.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                value: s.totalValue,
                btc: (s.breakdown as any)?.btc ?? 0,
                vanguard: (s.breakdown as any)?.vanguard ?? 0,
                rothIra: (s.breakdown as any)?.rothIra ?? 0,
                k401: (s.breakdown as any)?.k401 ?? 0,
                realEstate: (s.breakdown as any)?.realEstate ?? 0,
                cash: (s.breakdown as any)?.cash ?? 0,
                etrade: (s.breakdown as any)?.etrade ?? 0,
                domain: (s.breakdown as any)?.domain ?? 0,
                vehicles: (s.breakdown as any)?.vehicles ?? 0,
              }));

              const latest = chartData[chartData.length - 1];
              const prev = chartData[chartData.length - 2];
              const monthChange = latest && prev ? latest.value - prev.value : null;
              const allTimeHigh = chartData.reduce((m, d) => Math.max(m, d.value), 0);

              const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

              const BREAKDOWN_COLORS: Record<string, string> = {
                btc: "#F59E0B", vanguard: "#6366F1", rothIra: "#10B981",
                k401: "#14B8A6", realEstate: "#EC4899", cash: "#22D3EE",
                etrade: "#22C55E", domain: "#8B5CF6", vehicles: "#F97316",
              };
              const BREAKDOWN_LABELS: Record<string, string> = {
                btc: "BTC (after tax)", vanguard: "Vanguard (after tax)", rothIra: "Roth IRA",
                k401: "401k (SSO)", realEstate: "Real Estate", cash: "Cash",
                etrade: "E*Trade RSU", domain: "Domain", vehicles: "Vehicles",
              };

              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-slate-800/60 border-emerald-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-emerald-300 text-sm">Current Net Worth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-white">{fmt(overviewNetWorth)}</p>
                        <p className="text-xs text-slate-400 mt-1">as of {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                      </CardContent>
                    </Card>
                    <Card className={`bg-slate-800/60 border-${monthChange === null ? "slate" : monthChange >= 0 ? "green" : "red"}-500/20`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-${monthChange === null ? "slate" : monthChange >= 0 ? "green" : "red"}-300 text-sm`}>Month-over-Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {monthChange === null
                          ? <p className="text-slate-400 text-sm">Not enough data yet</p>
                          : <>
                              <p className={`text-2xl font-bold ${monthChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {monthChange >= 0 ? "+" : ""}{fmt(monthChange)}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">vs {prev?.label}</p>
                            </>
                        }
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/60 border-yellow-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-yellow-300 text-sm">All-Time High</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-yellow-400">{fmt(allTimeHigh)}</p>
                        <p className="text-xs text-slate-400 mt-1">{chartData.find(d => d.value === allTimeHigh)?.label ?? "—"}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main line chart */}
                  <Card className="bg-slate-800/60 border-emerald-500/20">
                    <CardHeader>
                      <CardTitle className="text-emerald-300 text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />Net Worth Over Time
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs">After-tax estimated net worth — recorded once per month on page load</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.length === 0
                        ? <p className="text-slate-400 text-sm text-center py-10">No data yet — your first snapshot will be saved automatically.</p>
                        : chartData.length === 1
                        ? (
                          <div className="text-center py-10">
                            <p className="text-white font-bold text-2xl">{fmt(chartData[0].value)}</p>
                            <p className="text-slate-400 text-sm mt-1">First snapshot recorded — {chartData[0].label}</p>
                            <p className="text-slate-500 text-xs mt-2">Chart will appear once you have 2+ months of data.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                              <YAxis
                                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                                tick={{ fill: "#94A3B8", fontSize: 10 }}
                                width={60}
                              />
                              <Tooltip
                                formatter={(v: any) => [`$${Number(v).toLocaleString("en-US")}`, "Net Worth"]}
                                contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #059669", borderRadius: "8px" }}
                                labelStyle={{ color: "#A7F3D0" }}
                              />
                              <ReferenceLine
                                x="Mar 2026"
                                stroke="#EAB308"
                                strokeDasharray="5 4"
                                strokeWidth={2}
                                label={(props: any) => {
                                  const { viewBox } = props;
                                  const [hovered, setHovered] = useState(false);
                                  return (
                                    <g>
                                      {/* Hover hit area + icon */}
                                      <g
                                        onMouseEnter={() => setHovered(true)}
                                        onMouseLeave={() => setHovered(false)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <circle cx={viewBox.x} cy={18} r={10} fill="#854D0E" stroke="#EAB308" strokeWidth={1.5} />
                                        <text x={viewBox.x} y={23} textAnchor="middle" fontSize={11} fill="#FDE68A" fontWeight="bold">!</text>
                                      </g>
                                      {/* Tooltip popover */}
                                      {hovered && (
                                        <foreignObject
                                          x={viewBox.x - 160}
                                          y={32}
                                          width={320}
                                          height={130}
                                          style={{ overflow: "visible" }}
                                        >
                                          <div
                                            style={{
                                              background: "#1E293B",
                                              border: "1px solid #EAB308",
                                              borderRadius: "8px",
                                              padding: "10px 12px",
                                              fontSize: "11px",
                                              color: "#FDE68A",
                                              lineHeight: "1.5",
                                              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                                            }}
                                          >
                                            <strong style={{ color: "#FCD34D", display: "block", marginBottom: "4px" }}>
                                              ⚠ Historical data cutoff — Mar 2026
                                            </strong>
                                            <span style={{ color: "#CBD5E1" }}>
                                              Everything <em>before</em> this line was manually entered from <strong style={{ color: "#FDE68A" }}>Credit Karma</strong> — coarser granularity, no asset-class breakdown, and <strong style={{ color: "#FCA5A5" }}>capital gains taxes not deducted</strong> (~15–20% on realized stock/crypto gains). Live auto-snapshots with full breakdown begin here.
                                            </span>
                                          </div>
                                        </foreignObject>
                                      )}
                                    </g>
                                  );
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10B981"
                                strokeWidth={2.5}
                                fill="url(#nwGradient)"
                                dot={{ fill: "#10B981", r: 4 }}
                                activeDot={{ r: 6, fill: "#34D399" }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )
                      }
                    </CardContent>
                  </Card>

                  {/* Stacked breakdown over time */}
                  {chartData.length >= 2 && (
                    <Card className="bg-slate-800/60 border-indigo-500/20">
                      <CardHeader>
                        <CardTitle className="text-indigo-300 text-sm">Breakdown Over Time</CardTitle>
                        <CardDescription className="text-slate-400 text-xs">Composition of net worth by asset class each month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                            <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#94A3B8", fontSize: 10 }} width={60} />
                            <Tooltip
                              formatter={(v: any, name: string) => [`$${Number(v).toLocaleString("en-US")}`, BREAKDOWN_LABELS[name] ?? name]}
                              contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #6366F1", borderRadius: "8px" }}
                            />
                            <Legend formatter={(name: string) => <span className="text-slate-300 text-xs">{BREAKDOWN_LABELS[name] ?? name}</span>} />
                            {Object.keys(BREAKDOWN_COLORS).map(key => (
                              <Bar key={key} dataKey={key} stackId="nw" fill={BREAKDOWN_COLORS[key]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Raw data table */}
                  {chartData.length > 0 && (
                    <Card className="bg-slate-800/60 border-slate-500/20">
                      <CardHeader>
                        <CardTitle className="text-slate-300 text-sm">Monthly History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {[...chartData].reverse().map((d, i, arr) => {
                            const prevVal = arr[i + 1]?.value ?? null;
                            const delta = prevVal !== null ? d.value - prevVal : null;
                            return (
                              <div key={d.month} className="flex items-center justify-between bg-slate-700/40 rounded px-3 py-2 text-sm">
                                <span className="text-slate-300 w-28">{d.label}</span>
                                <span className="text-white font-semibold">{fmt(d.value)}</span>
                                {delta !== null
                                  ? <span className={`text-xs font-medium w-24 text-right ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                                      {delta >= 0 ? "▲" : "▼"} {fmt(Math.abs(delta))}
                                    </span>
                                  : <span className="w-24 text-right text-slate-500 text-xs">—</span>
                                }
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {/* ── FIRE Goal ────────────────────────────── */}
          <TabsContent value="fire" className="space-y-4">
            {(() => {
              // ── Liquid Net Worth (true "money in pocket" if you sold everything at 28) ──
              // Roth IRA: ~25% haircut (10% penalty + income tax on gains; contributions already after-tax)
              const _fireRothValue = _rothIraValue * 0.75;
              // 401k: 32% haircut (10% early withdrawal penalty + ~22% federal income tax)
              const _fire401kValue = _k401Value * 0.68;
              // HSA used for non-medical before 65: 20% penalty + ~22% income tax = 42% haircut
              const _fireHsaValue = hsaBalance * 0.58; // same as _hsaAfterPenalty at component level
              // Everything else is already after-tax.
              // Home equity can be negative if underwater — that's real liability, not $0.
              const _fireLiquidNW =
                _btcAfterTax + _vanguardAfterTax + _fireRothValue + _fire401kValue +
                _homeAfterTaxNetCash +
                checkingBalance + careerglowBalance + _fireHsaValue +
                _domainAfterTax + eTradeRsuValue + fordExplorerValue + kawasakiNinjaValue;

                const FIRE_LOC_INFLATION = fireColInflation;
                const totalBuffer = fireCurrencyBuffer + fireHealthcareBuffer + fireLifestyleBuffer;

                const FIRE_LOCATIONS = (
                  [
                    {
                      key: "thailand" as const,
                      flag: "🇹🇭", name: "Chiang Mai, Thailand",
                      color: "bg-slate-900 border-orange-500/50", border: "border-orange-500/50", accent: "text-orange-300",
                      btnActive: "bg-orange-600/50 border-orange-400/60 text-orange-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-orange-500/40",
                      methodology: FIRE_METHODOLOGY.thailand,
                    },
                    {
                      key: "vietnam" as const,
                      flag: "🇻🇳", name: "Da Nang, Vietnam",
                      color: "bg-slate-900 border-red-500/50", border: "border-red-500/50", accent: "text-red-300",
                      btnActive: "bg-red-600/50 border-red-400/60 text-red-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-red-500/40",
                      methodology: FIRE_METHODOLOGY.vietnam,
                    },
                    {
                      key: "colombia" as const,
                      flag: "🇨🇴", name: "Medellín, Colombia",
                      color: "bg-slate-900 border-yellow-500/50", border: "border-yellow-500/50", accent: "text-yellow-300",
                      btnActive: "bg-yellow-600/50 border-yellow-400/60 text-yellow-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-yellow-500/40",
                      methodology: FIRE_METHODOLOGY.colombia,
                    },
                    {
                      key: "puertoRico" as const,
                      flag: "🇵🇷", name: "San Juan, Puerto Rico",
                      color: "bg-slate-900 border-cyan-500/50", border: "border-cyan-500/50", accent: "text-cyan-300",
                      btnActive: "bg-cyan-600/50 border-cyan-400/60 text-cyan-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-cyan-500/40",
                      methodology: FIRE_METHODOLOGY.puertoRico,
                    },
                    {
                      key: "austin" as const,
                      flag: "🤠", name: "Austin, Texas",
                      color: "bg-slate-900 border-orange-500/50", border: "border-orange-500/50", accent: "text-orange-300",
                      btnActive: "bg-orange-600/50 border-orange-400/60 text-orange-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-orange-500/40",
                      methodology: FIRE_METHODOLOGY.austin,
                    },
                    {
                      key: "auburn" as const,
                      flag: "🏔️", name: "Auburn, California",
                      color: "bg-slate-900 border-emerald-500/50", border: "border-emerald-500/50", accent: "text-emerald-300",
                      btnActive: "bg-emerald-600/50 border-emerald-400/60 text-emerald-200",
                      btnInactive: "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-emerald-500/40",
                      methodology: FIRE_METHODOLOGY.auburn,
                    },
                  ] as const
                ).map(loc => {
                  const tc = FIRE_TIER_DATA[loc.key][fireTier];
                  const items = [
                    { label: "Housing / Rent", mo: tc.rent },
                    { label: "Food & groceries", mo: tc.food },
                    { label: "Transportation", mo: tc.transport },
                    { label: "Health insurance", mo: tc.health },
                    { label: "Entertainment & social", mo: tc.entertainment },
                    { label: "Utilities, internet, phone", mo: tc.utilities },
                    { label: "Visa, travel buffer", mo: tc.visa },
                  ];
                  const monthlyBase = items.reduce((s, i) => s + i.mo, 0);
                  const monthlyToday = Math.round(monthlyBase * (1 + totalBuffer));
                  const annualToday = monthlyToday * 12;
                  const fireNeededBase = annualToday / fireSwr;
                  return { ...loc, items, monthlyToday, annualToday, fireNeededBase };
                });
                const selectedLocBase = FIRE_LOCATIONS.find(l => l.key === fireLocationKey) ?? FIRE_LOCATIONS[0];

              // ── Age calc ──
              // Born Oct 1, 1997. Today = June 1, 2026 → age 28 (turns 29 in Oct 2026)
              const BIRTH_YEAR = 1997;
              const BIRTH_MONTH = 9; // 0-indexed Oct
              const today = new Date(2026, 5, 1);
              const ageYears = today.getFullYear() - BIRTH_YEAR - (today.getMonth() < BIRTH_MONTH ? 1 : 0);

              // ── Inflation-adjusted FIRE goal (4%/yr local cost growth) ──
              // Step 1: first-pass years to FIRE using today's cost base
              const R_INVEST = 0.08;
              const R_HOME   = 0.04;
              const _fireActual401kContrib = Math.min(totalRetirement * 12, 23_500);
              const _fireAnnualDirectSavings = Math.max(0, cashflowNetRaw) * 12;
              const _fireAnnualRetirementNet = _fireActual401kContrib * 0.68;
              const _fireAnnualSavings = _fireAnnualDirectSavings + _fireAnnualRetirementNet;
              const _fireInvestable = _btcAfterTax + _vanguardAfterTax + _fireRothValue + _fire401kValue + eTradeRsuValue;
              const _fireHomeBase = Math.max(0, _homeAfterTaxNetCash);
              const _fireCashFixed = checkingBalance + careerglowBalance + _fireHsaValue + _domainAfterTax + fordExplorerValue + kawasakiNinjaValue;

              const fireFV = (n: number) => {
                const investFV = _fireInvestable * Math.pow(1 + R_INVEST, n) +
                  (_fireAnnualSavings > 0 ? _fireAnnualSavings * (Math.pow(1 + R_INVEST, n) - 1) / R_INVEST : 0);
                const homeFV = _fireHomeBase * Math.pow(1 + R_HOME, n);
                return investFV + homeFV + _fireCashFixed;
              };

              // Step 2: estimate years using base goal, then inflate costs to that year
              let _fireYrsPass1 = 15; // fallback
              for (let n = 1; n <= 80; n++) {
                if (fireFV(n) >= selectedLocBase.fireNeededBase) { _fireYrsPass1 = n; break; }
              }
              // Step 3: inflate selected location's annual spend to the projected retirement year
              const _selectedInflatedAnnual = selectedLocBase.annualToday * Math.pow(1 + FIRE_LOC_INFLATION, _fireYrsPass1);

              // Step 4: Compute FIRE goal
              // ── Standard mode: portfolio must sustain forever (÷ SWR)
              // ── Inheritance mode: portfolio only needs to last until inheritanceAge,
              //    at which point a $X inheritance (in today's dollars) takes over.
              //    Goal = PV of spending annuity from FIRE date to inheritanceAge.
              //    PV annuity = PMT × [1 − (1+r)^(−n)] / r
              //    where PMT = inflated annual spend, r = R_INVEST, n = years FIRE→inheritance
              const R_RETIRE = 0.07; // slightly conservative return assumption during drawdown phase
              const _inheritanceDrawdownYrs = Math.max(1, fireInheritanceAge - (ageYears + _fireYrsPass1));
              const _inheritancePvAnnuity = _inheritanceDrawdownYrs > 0
                ? _selectedInflatedAnnual * (1 - Math.pow(1 + R_RETIRE, -_inheritanceDrawdownYrs)) / R_RETIRE
                : _selectedInflatedAnnual;
              // Inflate the inheritance to nominal dollars at inheritance age (3% general inflation)
              const _inheritanceNominal = fireInheritanceAmount * Math.pow(1.03, fireInheritanceAge - ageYears);

              const FIRE_GOAL = fireInheritanceMode
                ? Math.round(_inheritancePvAnnuity)
                : Math.round(_selectedInflatedAnnual / fireSwr);

              // Step 4: final yearsToFire using inflation-adjusted goal
              let yearsToFire: number | null = null;
              if (_fireLiquidNW >= FIRE_GOAL) {
                yearsToFire = 0;
              } else {
                for (let n = 1; n <= 80; n++) {
                  if (fireFV(n) >= FIRE_GOAL) { yearsToFire = n; break; }
                }
              }
              const fireAge = yearsToFire !== null ? ageYears + yearsToFire : null;
              const fireYear = yearsToFire !== null ? 2026 + yearsToFire : null;

              // Augment each location with inflation-adjusted figures (using their own pass-1 years)
              const FIRE_LOCATIONS_COMPUTED = FIRE_LOCATIONS.map(loc => {
                let locYrs = 15;
                for (let n = 1; n <= 80; n++) {
                  if (fireFV(n) >= loc.fireNeededBase) { locYrs = n; break; }
                }
                const inflatedAnnual = loc.annualToday * Math.pow(1 + FIRE_LOC_INFLATION, locYrs);
                const inflatedMonthly = inflatedAnnual / 12;
                const fireNeeded = Math.round(inflatedAnnual / fireSwr);
                const locInheritanceDrawdownYrs = Math.max(1, fireInheritanceAge - (ageYears + locYrs));
                const fireNeededInheritance = Math.round(
                  inflatedAnnual * (1 - Math.pow(1 + R_RETIRE, -locInheritanceDrawdownYrs)) / R_RETIRE
                );
                const effectiveFireNeeded = fireInheritanceMode ? fireNeededInheritance : fireNeeded;
                return { ...loc, monthlyTotal: loc.monthlyToday, annualTotal: loc.annualToday, fireNeeded, fireNeededInheritance, effectiveFireNeeded, inflatedMonthly, inflatedAnnual, locYrs, locInheritanceDrawdownYrs };
              });
              const selectedLoc = FIRE_LOCATIONS_COMPUTED.find(l => l.key === fireLocationKey) ?? FIRE_LOCATIONS_COMPUTED[0];

              const pct = Math.min((_fireLiquidNW / FIRE_GOAL) * 100, 100);

              // ── Projection chart data ──
              const projectionData: { year: number; age: number; value: number; goal: number }[] = [];
              for (let n = 0; n <= 30; n++) {
                projectionData.push({
                  year: 2026 + n,
                  age: ageYears + n,
                  value: Math.round(fireFV(n)),
                  goal: FIRE_GOAL,
                });
              }

              const fmt = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

              return (
                <>
                  {/* ── Header + Location + Tier Selector ── */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">🔥 FIRE Goal</h2>
                      <p className="text-slate-400 text-sm mt-0.5">Financial Independence, Retire Early — goal adjusts to your chosen retirement destination and lifestyle tier</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {FIRE_LOCATIONS.map(loc => (
                          <button
                            key={loc.key}
                            onClick={() => setFireLocationKey(loc.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${fireLocationKey === loc.key ? loc.btnActive : loc.btnInactive}`}
                          >
                            <span>{loc.flag}</span>
                            <span>{loc.name.split(",")[0]}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {(["lean", "comfortable", "cushy"] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setFireTier(t)}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize ${fireTier === t
                              ? t === "lean" ? "bg-blue-600/50 border-blue-400/60 text-blue-200"
                                : t === "comfortable" ? "bg-orange-600/50 border-orange-400/60 text-orange-200"
                                : "bg-purple-600/50 border-purple-400/60 text-purple-200"
                              : "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-slate-500/40"}`}
                          >
                            {t === "lean" ? "🎒 Lean" : t === "comfortable" ? "🏠 Comfortable" : "✨ Cushy"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Selected location goal banner ── */}
                  <div className={`flex items-center justify-between bg-slate-900 border ${fireInheritanceMode ? "border-emerald-500/50" : selectedLoc.border} rounded-xl px-4 py-3`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${fireInheritanceMode ? "text-emerald-300" : selectedLoc.accent}`}>
                        {selectedLoc.flag} {selectedLoc.name} — {fireTier === "lean" ? "🎒 Lean" : fireTier === "comfortable" ? "🏠 Comfortable" : "✨ Cushy"} FIRE Target
                        {fireInheritanceMode && <span className="ml-2 text-emerald-400">💎 Inheritance Mode</span>}
                      </p>
                      <p className="text-white text-xl font-bold mt-0.5">{fmt(FIRE_GOAL)}</p>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        {fireInheritanceMode
                          ? <>Portfolio drawdown only until age {fireInheritanceAge} · <span className="text-emerald-300 font-semibold">{_inheritanceDrawdownYrs}-yr spending runway</span> · then {fmt(_inheritanceNominal)} inheritance takes over · <span className="text-slate-400">vs {fmt(Math.round(_selectedInflatedAnnual / fireSwr))} standard goal</span></>
                          : <>Today: {fmt(selectedLoc.monthlyToday)}/mo → projected at retirement: <span className="text-yellow-300 font-semibold">{fmt(Math.round(selectedLoc.inflatedMonthly))}/mo</span> after {selectedLoc.locYrs}yrs of {(fireColInflation * 100).toFixed(0)}%/yr local inflation · <span className="text-orange-300">{(fireSwr * 100).toFixed(2)}% SWR</span> · buffers: {(totalBuffer * 100).toFixed(0)}%</>
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-slate-400 text-[10px] uppercase tracking-wide">{fireInheritanceMode ? "At Age " + fireInheritanceAge : "SWR at FIRE"}</p>
                      <p className={`text-lg font-bold ${fireInheritanceMode ? "text-emerald-300" : selectedLoc.accent}`}>
                        {fireInheritanceMode ? fmt(_inheritanceNominal) : fmt(FIRE_GOAL * fireSwr) + "/yr"}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {fireInheritanceMode ? "inheritance kicks in" : fmt(Math.round(FIRE_GOAL * fireSwr / 12)) + "/mo passive"}
                      </p>
                    </div>
                  </div>

                  {/* ── Liquid NW vs FIRE Goal ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-slate-800/60 border-orange-500/30 sm:col-span-1">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-orange-300 text-sm">True Liquid Net Worth</CardTitle>
                        <CardDescription className="text-slate-400 text-[11px]">If you cashed out everything today at age {ageYears} (after penalties & taxes)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{fmt(_fireLiquidNW)}</p>
                        <div className="mt-3 space-y-1 text-[10px] text-slate-400">
                          <div className="flex justify-between"><span>BTC (15% LTCG)</span><span>{fmt(_btcAfterTax)}</span></div>
                          <div className="flex justify-between"><span>Vanguard (15% LTCG)</span><span>{fmt(_vanguardAfterTax)}</span></div>
                          <div className="flex justify-between"><span>Roth IRA (25% early haircut)</span><span>{fmt(_fireRothValue)}</span></div>
                          <div className="flex justify-between"><span>401k (32% early haircut)</span><span>{fmt(_fire401kValue)}</span></div>
                          {_homeAfterTaxNetCash !== 0 && <div className="flex justify-between"><span>Home equity (after sale costs){_homeAfterTaxNetCash < 0 ? " ⚠️" : ""}</span><span className={_homeAfterTaxNetCash < 0 ? "text-red-400" : ""}>{fmt(_homeAfterTaxNetCash)}</span></div>}
                          <div className="flex justify-between"><span>Cash (checking + biz + HSA)</span><span>{fmt(checkingBalance + careerglowBalance + _fireHsaValue)}</span></div>
                          <div className="flex justify-between"><span>E*Trade RSU</span><span>{fmt(eTradeRsuValue)}</span></div>
                          <div className="flex justify-between"><span>Vehicles</span><span>{fmt(fordExplorerValue + kawasakiNinjaValue)}</span></div>
                          <div className="flex justify-between"><span>veluna.com domain</span><span>{fmt(_domainAfterTax)}</span></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800/60 border-orange-500/30 sm:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-orange-300 text-sm">Progress to FIRE</CardTitle>
                        <CardDescription className="text-slate-400 text-[11px]">{fmt(FIRE_GOAL)} target · {(fireSwr * 100).toFixed(2)}% SWR · {fmt(FIRE_GOAL * fireSwr)}/yr passive income · {selectedLoc.flag} {selectedLoc.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                          <span className="text-4xl font-black text-orange-400">{pct.toFixed(1)}%</span>
                          <span className="text-slate-400 text-sm mb-1">of goal reached</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden mb-3">
                          <div
                            className="h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mb-4">
                          <span>{fmt(_fireLiquidNW)} liquid today</span>
                          <span>{fmt(FIRE_GOAL - _fireLiquidNW)} remaining</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-700/40 rounded-lg p-3">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Projected FIRE Age</p>
                            {fireAge !== null
                              ? <p className="text-2xl font-bold text-green-400 mt-0.5">{fireAge} <span className="text-sm font-normal text-slate-400">({fireYear})</span></p>
                              : <p className="text-sm text-red-400 mt-1">Can't project — negative savings</p>
                            }
                            <p className="text-[10px] text-slate-500 mt-1">at 7% avg annual return</p>
                          </div>
                          <div className="bg-slate-700/40 rounded-lg p-3">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Years Until FIRE</p>
                            {yearsToFire !== null
                              ? <p className="text-2xl font-bold text-yellow-400 mt-0.5">{yearsToFire} <span className="text-sm font-normal text-slate-400">yrs</span></p>
                              : <p className="text-sm text-red-400 mt-1">—</p>
                            }
                            <p className="text-[10px] text-slate-500 mt-1">W2 cash + 401k: {fmt(_fireAnnualSavings)}/yr</p>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-slate-700/20 rounded-lg text-[10px] text-slate-500">
                          <span className="text-slate-400 font-semibold">Assumptions: </span>
                          Born Oct 1, 1997 · Investments grow at <span className="text-slate-300">8%/yr nominal</span> · Home equity grows at <span className="text-slate-300">4%/yr</span> · Annual new savings = W2 net cash ({fmt(_fireAnnualDirectSavings)}/yr) + 401k capped at IRS 2026 limit × 68¢ ({fmt(_fireAnnualRetirementNet)}/yr) · <span className="text-yellow-300">Local costs inflated at {(fireColInflation * 100).toFixed(0)}%/yr</span> · Buffers: currency {(fireCurrencyBuffer * 100).toFixed(0)}% + healthcare {(fireHealthcareBuffer * 100).toFixed(0)}% + lifestyle {(fireLifestyleBuffer * 100).toFixed(0)}% = {(totalBuffer * 100).toFixed(0)}% total ·{" "}
                          {fireInheritanceMode
                            ? <><span className="text-emerald-300">Inheritance mode: drawdown {_inheritanceDrawdownYrs}yrs to age {fireInheritanceAge} at 7%/yr portfolio return, then ${(fireInheritanceAmount/1_000_000).toFixed(1)}M inheritance takes over</span></>
                            : <>FIRE goal = inflated annual spend ÷ {(fireSwr * 100).toFixed(2)}% SWR</>
                          } · Early withdrawal haircuts: Roth IRA 25%, 401k 32%, HSA 42%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Advanced Assumptions Sliders ── */}
                  <Card className={`bg-slate-800/60 border-slate-600/40 ${fireInheritanceMode ? "ring-1 ring-emerald-500/40" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-slate-300 text-sm">⚙️ Advanced Assumptions</CardTitle>
                          <CardDescription className="text-slate-400 text-xs">Adjust parameters to see how your FIRE target changes</CardDescription>
                        </div>
                        {/* ── Inheritance toggle ── */}
                        <button
                          onClick={() => setFireInheritanceMode(m => !m)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${fireInheritanceMode ? "bg-emerald-700/50 border-emerald-500/60 text-emerald-200" : "bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-slate-500/60"}`}
                        >
                          <span>{fireInheritanceMode ? "💎" : "🏦"}</span>
                          <span>{fireInheritanceMode ? "Inheritance Mode ON" : "Without Inheritance"}</span>
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                          { label: "Safe Withdrawal Rate", value: fireSwr, set: setFireSwr, min: 0.025, max: 0.05, step: 0.0025, fmt: (v: number) => `${(v * 100).toFixed(2)}%`, color: "text-orange-300", disabled: fireInheritanceMode },
                          { label: "COL Inflation / yr", value: fireColInflation, set: setFireColInflation, min: 0, max: 0.10, step: 0.005, fmt: (v: number) => `${(v * 100).toFixed(1)}%`, color: "text-yellow-300", disabled: false },
                          { label: "Currency Buffer", value: fireCurrencyBuffer, set: setFireCurrencyBuffer, min: 0, max: 0.30, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%`, color: "text-blue-300", disabled: false },
                          { label: "Healthcare Buffer", value: fireHealthcareBuffer, set: setFireHealthcareBuffer, min: 0, max: 0.50, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%`, color: "text-green-300", disabled: false },
                          { label: "Lifestyle Buffer", value: fireLifestyleBuffer, set: setFireLifestyleBuffer, min: 0, max: 0.50, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%`, color: "text-purple-300", disabled: false },
                        ].map(s => (
                          <div key={s.label} className={s.disabled ? "opacity-40 pointer-events-none" : ""}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-slate-400">{s.label}{s.disabled && " (N/A in inheritance mode)"}</span>
                              <span className={`text-xs font-bold ${s.color}`}>{s.fmt(s.value)}</span>
                            </div>
                            <input
                              type="range"
                              min={s.min}
                              max={s.max}
                              step={s.step}
                              value={s.value}
                              onChange={e => s.set(parseFloat(e.target.value))}
                              className="w-full accent-orange-500"
                              disabled={s.disabled}
                            />
                            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                              <span>{s.fmt(s.min)}</span>
                              <span>{s.fmt(s.max)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── Inheritance Mode Panel ── */}
                      {fireInheritanceMode && (
                        <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                          <p className="text-emerald-300 text-xs font-semibold mb-3 flex items-center gap-1.5">💎 Inheritance Mode — FIRE target is how much you need until age {fireInheritanceAge}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                            {/* Inheritance Amount */}
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-xs text-slate-300">Inheritance Amount (today's $)</span>
                                <span className="text-xs font-bold text-emerald-300">${fireInheritanceAmount.toLocaleString()}</span>
                              </div>
                              <input
                                type="range"
                                min={500_000}
                                max={10_000_000}
                                step={250_000}
                                value={fireInheritanceAmount}
                                onChange={e => setFireInheritanceAmount(parseFloat(e.target.value))}
                                className="w-full accent-emerald-500"
                              />
                              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                                <span>$500k</span><span>$10M</span>
                              </div>
                            </div>
                            {/* Inheritance Age */}
                            <div>
                              <div className="flex justify-between mb-1">
                                <div>
                                  <span className="text-xs text-slate-300">Inheritance Age</span>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Parents age {73 + (fireInheritanceAge - 28)} at that time</p>
                                </div>
                                <span className="text-xs font-bold text-emerald-300">Age {fireInheritanceAge}</span>
                              </div>
                              <input
                                type="range"
                                min={35}
                                max={65}
                                step={1}
                                value={fireInheritanceAge}
                                onChange={e => setFireInheritanceAge(parseFloat(e.target.value))}
                                className="w-full accent-emerald-500"
                              />
                              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                                <span>35</span><span>65</span>
                              </div>
                            </div>
                          </div>

                          {/* Inheritance math breakdown */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="bg-emerald-900/30 rounded-lg p-2.5">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Drawdown period</p>
                              <p className="text-lg font-bold text-emerald-300 mt-0.5">{_inheritanceDrawdownYrs} yrs</p>
                              <p className="text-[10px] text-slate-500">from FIRE → age {fireInheritanceAge}</p>
                            </div>
                            <div className="bg-emerald-900/30 rounded-lg p-2.5">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">FIRE target</p>
                              <p className="text-lg font-bold text-white mt-0.5">{fmt(FIRE_GOAL)}</p>
                              <p className="text-[10px] text-slate-500">PV of {_inheritanceDrawdownYrs}-yr annuity</p>
                            </div>
                            <div className="bg-emerald-900/30 rounded-lg p-2.5">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">vs standard</p>
                              <p className="text-lg font-bold text-green-400 mt-0.5">−{fmt(Math.round(_selectedInflatedAnnual / fireSwr) - FIRE_GOAL)}</p>
                              <p className="text-[10px] text-slate-500">saved vs {(fireSwr*100).toFixed(2)}% SWR</p>
                            </div>
                            <div className="bg-emerald-900/30 rounded-lg p-2.5">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Inheritance @ {fireInheritanceAge}</p>
                              <p className="text-lg font-bold text-emerald-300 mt-0.5">{fmt(_inheritanceNominal)}</p>
                              <p className="text-[10px] text-slate-500">nominal ({fmt(fireInheritanceAmount)} today)</p>
                            </div>
                          </div>

                          <div className="mt-3 p-2 bg-slate-800/60 rounded-lg text-[10px] text-slate-400 leading-relaxed">
                            <span className="text-emerald-300 font-semibold">Logic: </span>
                            Instead of building a portfolio large enough to last forever (classic 4% rule), you only need enough to cover living expenses from your FIRE date until age {fireInheritanceAge} — at which point a <span className="text-emerald-300 font-semibold">${(fireInheritanceAmount / 1_000_000).toFixed(1)}M inheritance</span> (~{fmt(_inheritanceNominal)} in nominal dollars) takes over. Target = PV of a {_inheritanceDrawdownYrs}-year spending annuity at 7% portfolio return. After age {fireInheritanceAge}, the inheritance provides <span className="text-emerald-300">{fmt(Math.round(_inheritanceNominal * fireSwr))}/yr</span> at {(fireSwr * 100).toFixed(2)}% SWR — well above your projected {fmt(Math.round(selectedLoc.inflatedMonthly * 12))}/yr expenses.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Monthly COL by Tier Table ── */}
                  <Card className="bg-slate-800/60 border-slate-600/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-300 text-sm">📊 Monthly Budget by Lifestyle Tier — {selectedLoc.flag} {selectedLoc.name}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Before buffers. Total buffer: {(totalBuffer * 100).toFixed(0)}% added to base costs.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 text-slate-400 font-medium">Category</th>
                            <th className="text-right py-2 text-blue-300 font-semibold">🎒 Lean</th>
                            <th className="text-right py-2 text-orange-300 font-semibold">🏠 Comfortable</th>
                            <th className="text-right py-2 text-purple-300 font-semibold">✨ Cushy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(["rent","food","transport","health","entertainment","utilities","visa"] as const).map(cat => {
                            const labels: Record<string, string> = { rent: "Housing / Rent", food: "Food & Groceries", transport: "Transportation", health: "Health Insurance", entertainment: "Entertainment", utilities: "Utilities & Internet", visa: "Visa & Travel Buffer" };
                            const td = FIRE_TIER_DATA[fireLocationKey];
                            return (
                              <tr key={cat} className="border-b border-slate-800 hover:bg-slate-700/20">
                                <td className="py-1.5 text-slate-300">{labels[cat]}</td>
                                <td className="py-1.5 text-right text-blue-200">${td.lean[cat].toLocaleString()}</td>
                                <td className={`py-1.5 text-right font-semibold ${fireTier === "comfortable" ? "text-orange-300" : "text-orange-200"}`}>${td.comfortable[cat].toLocaleString()}</td>
                                <td className="py-1.5 text-right text-purple-200">${td.cushy[cat].toLocaleString()}</td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-slate-600 font-bold">
                            <td className="py-2 text-slate-200">Base Total / mo</td>
                            {(["lean","comfortable","cushy"] as const).map(t => {
                              const td = FIRE_TIER_DATA[fireLocationKey][t];
                              const base = Object.values(td).reduce((s, v) => s + v, 0);
                              return <td key={t} className={`py-2 text-right ${t === "lean" ? "text-blue-300" : t === "comfortable" ? "text-orange-300" : "text-purple-300"}`}>${base.toLocaleString()}</td>;
                            })}
                          </tr>
                          <tr className="font-bold">
                            <td className="py-2 text-slate-200">+{(totalBuffer * 100).toFixed(0)}% Buffers</td>
                            {(["lean","comfortable","cushy"] as const).map(t => {
                              const td = FIRE_TIER_DATA[fireLocationKey][t];
                              const base = Object.values(td).reduce((s, v) => s + v, 0);
                              const total = Math.round(base * (1 + totalBuffer));
                              return <td key={t} className={`py-2 text-right ${t === "lean" ? "text-blue-300" : t === "comfortable" ? "text-orange-300" : "text-purple-300"} ${fireTier === t ? "underline decoration-dotted" : ""}`}>${total.toLocaleString()}</td>;
                            })}
                          </tr>
                          <tr className="font-bold bg-slate-700/30">
                            <td className="py-2 text-white rounded-l">
                              {fireInheritanceMode
                                ? `💎 FIRE Goal (drawdown to age ${fireInheritanceAge})`
                                : `FIRE Goal (${(fireSwr * 100).toFixed(2)}% SWR · ${(fireColInflation * 100).toFixed(0)}%/yr inflation)`}
                            </td>
                            {(["lean","comfortable","cushy"] as const).map(t => {
                              const td = FIRE_TIER_DATA[fireLocationKey][t];
                              const base = Object.values(td).reduce((s, v) => s + v, 0);
                              const totalMo = Math.round(base * (1 + totalBuffer));
                              const totalAnnual = totalMo * 12;
                              const yrsEstimate = yearsToFire ?? _fireYrsPass1;
                              const inflatedForTier = totalAnnual * Math.pow(1 + fireColInflation, yrsEstimate);
                              const goal = fireInheritanceMode
                                ? Math.round(inflatedForTier * (1 - Math.pow(1 + R_RETIRE, -Math.max(1, fireInheritanceAge - (ageYears + yrsEstimate)))) / R_RETIRE)
                                : Math.round(inflatedForTier / fireSwr);
                              return <td key={t} className={`py-2 text-right ${t === "lean" ? "text-blue-300" : t === "comfortable" ? "text-orange-300" : "text-purple-300"} ${fireTier === t ? "font-black" : ""}`}>{fmt(goal)}</td>;
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* ── FIRE Target by WR Rate ── */}
                  <Card className="bg-slate-800/60 border-slate-600/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-300 text-sm">
                        {fireInheritanceMode
                          ? `💎 FIRE Target by Drawdown Years × Tier — ${selectedLoc.flag} Inheritance Mode`
                          : `🎯 FIRE Target by Withdrawal Rate × Tier — ${selectedLoc.flag} Today's Costs`}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs">
                        {fireInheritanceMode
                          ? `PV annuity at 7% return · ${(totalBuffer * 100).toFixed(0)}% buffer · inflated at ${(fireColInflation * 100).toFixed(0)}%/yr · inheritance arrives at age ${fireInheritanceAge}`
                          : `Based on today's monthly costs (no inflation), includes ${(totalBuffer * 100).toFixed(0)}% buffer. Lower SWR = more conservative = larger target.`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 text-slate-400 font-medium">
                              {fireInheritanceMode ? "Drawdown Years" : "Withdrawal Rate"}
                            </th>
                            <th className="text-right py-2 text-blue-300 font-semibold">🎒 Lean</th>
                            <th className="text-right py-2 text-orange-300 font-semibold">🏠 Comfortable</th>
                            <th className="text-right py-2 text-purple-300 font-semibold">✨ Cushy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fireInheritanceMode
                            ? [5, 8, 10, 12, 15, 20].map(drawYrs => {
                                const isCurrent = Math.abs(drawYrs - _inheritanceDrawdownYrs) <= 1;
                                return (
                                  <tr key={drawYrs} className={`border-b border-slate-800 hover:bg-slate-700/20 ${isCurrent ? "bg-emerald-900/20" : ""}`}>
                                    <td className={`py-1.5 ${isCurrent ? "text-emerald-300 font-bold" : "text-slate-300"}`}>
                                      {drawYrs} yrs {isCurrent ? "← current est." : ""}
                                    </td>
                                    {(["lean","comfortable","cushy"] as const).map(t => {
                                      const td = FIRE_TIER_DATA[fireLocationKey][t];
                                      const moBase = Object.values(td).reduce((s, v) => s + v, 0);
                                      const moTotal = Math.round(moBase * (1 + totalBuffer));
                                      const annualInflated = moTotal * 12 * Math.pow(1 + fireColInflation, yearsToFire ?? _fireYrsPass1);
                                      const goal = Math.round(annualInflated * (1 - Math.pow(1 + R_RETIRE, -drawYrs)) / R_RETIRE);
                                      return <td key={t} className={`py-1.5 text-right ${t === "lean" ? "text-blue-200" : t === "comfortable" ? "text-orange-200" : "text-purple-200"}`}>{fmt(goal)}</td>;
                                    })}
                                  </tr>
                                );
                              })
                            : [0.05, 0.045, 0.04, 0.035, 0.0325, 0.03].map(wr => (
                                <tr key={wr} className={`border-b border-slate-800 hover:bg-slate-700/20 ${Math.abs(wr - fireSwr) < 0.0001 ? "bg-orange-900/20" : ""}`}>
                                  <td className={`py-1.5 ${Math.abs(wr - fireSwr) < 0.0001 ? "text-orange-300 font-bold" : "text-slate-300"}`}>{(wr * 100).toFixed(2)}% {Math.abs(wr - fireSwr) < 0.0001 ? "← current" : ""}</td>
                                  {(["lean","comfortable","cushy"] as const).map(t => {
                                    const td = FIRE_TIER_DATA[fireLocationKey][t];
                                    const moBase = Object.values(td).reduce((s, v) => s + v, 0);
                                    const moTotal = Math.round(moBase * (1 + totalBuffer));
                                    const goal = Math.round((moTotal * 12) / wr);
                                    return <td key={t} className={`py-1.5 text-right ${t === "lean" ? "text-blue-200" : t === "comfortable" ? "text-orange-200" : "text-purple-200"}`}>{fmt(goal)}</td>;
                                  })}
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* ── COL Inflation Scenarios Table ── */}
                  <Card className="bg-slate-800/60 border-slate-600/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-300 text-sm">📈 Monthly COL Over Time — {selectedLoc.flag} {selectedLoc.name} · {fireTier === "lean" ? "🎒 Lean" : fireTier === "comfortable" ? "🏠 Comfortable" : "✨ Cushy"} Tier</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">How much you'd actually spend per month at various inflation rates (with {(totalBuffer * 100).toFixed(0)}% buffer)</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 text-slate-400 font-medium">Year</th>
                            <th className="text-right py-2 text-slate-300 font-semibold">3% / yr</th>
                            <th className="text-right py-2 text-yellow-300 font-semibold">5% / yr</th>
                            <th className="text-right py-2 text-orange-300 font-semibold">7% / yr</th>
                            <th className="text-right py-2 text-red-300 font-semibold">9% / yr</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[0, 5, 10, 15, 20, 25, 30].map(y => {
                            const base = selectedLoc.monthlyToday;
                            const fireYr = yearsToFire ?? _fireYrsPass1;
                            const isFireRow = y !== 0 && Math.abs(y - fireYr) < 3 && y <= fireYr + 2;
                            return (
                              <tr key={y} className={`border-b border-slate-800 hover:bg-slate-700/20 ${y === fireYr ? "bg-yellow-900/20" : ""}`}>
                                <td className={`py-1.5 ${y === 0 ? "text-green-300 font-bold" : y === fireYr ? "text-yellow-300 font-bold" : isFireRow ? "text-yellow-200/60" : "text-slate-300"}`}>
                                  {y === 0 ? "Today (2026)" : `+${y}yrs (${2026 + y})`} {y === fireYr ? "← est. FIRE" : ""}
                                </td>
                                {[0.03, 0.05, 0.07, 0.09].map(rate => (
                                  <td key={rate} className={`py-1.5 text-right ${Math.abs(rate - fireColInflation) < 0.001 ? "font-bold text-yellow-300" : "text-slate-200"}`}>
                                    ${Math.round(base * Math.pow(1 + rate, y)).toLocaleString()}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* ── Projection Chart ── */}
                  <Card className={`bg-slate-800/60 ${fireInheritanceMode ? "border-emerald-500/30" : "border-orange-500/20"}`}>
                    <CardHeader>
                      <CardTitle className={`text-sm flex items-center gap-2 ${fireInheritanceMode ? "text-emerald-300" : "text-orange-300"}`}>
                        <TrendingUp className="h-4 w-4" />Liquid Net Worth Projection (8% investments · 4% home)
                        {fireInheritanceMode && <span className="text-[10px] bg-emerald-700/40 border border-emerald-500/40 rounded px-1.5 py-0.5 font-normal">💎 Inheritance Mode</span>}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs">
                        Investments at 8%/yr · home equity at 4%/yr · adding {fmt(_fireAnnualSavings)}/yr W2 cash savings · dashed line = {fmt(FIRE_GOAL)} {fireInheritanceMode ? "drawdown target" : "FIRE goal"}
                        {fireInheritanceMode && ` · green vertical = age ${fireInheritanceAge} inheritance (${fmt(_inheritanceNominal)} nominal)`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={fireInheritanceMode ? "#10B981" : "#F97316"} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={fireInheritanceMode ? "#10B981" : "#F97316"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                          <XAxis dataKey="age" tickFormatter={(v: number) => `Age ${v}`} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                          <YAxis
                            tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k` : `$${v}`}
                            tick={{ fill: "#94A3B8", fontSize: 10 }}
                            width={65}
                            domain={[0, Math.max(FIRE_GOAL * 1.1, ...(fireInheritanceMode ? [_inheritanceNominal * 0.5] : []), ...projectionData.map(d => d.value))]}
                          />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              const isFireAge = d?.age === fireAge;
                              const isInheritAge = d?.age === fireInheritanceAge;
                              return (
                                <div className={`bg-slate-800 border rounded-lg p-3 text-xs ${isInheritAge ? "border-emerald-500/60" : "border-orange-500/40"}`}>
                                  <p className={`font-bold mb-1 ${isInheritAge ? "text-emerald-300" : "text-orange-300"}`}>Age {d?.age} ({d?.year})</p>
                                  <p className="text-white">Projected NW: {fmt(d?.value ?? 0)}</p>
                                  <p className={fireInheritanceMode ? "text-emerald-400" : "text-orange-400"}>{fireInheritanceMode ? "Drawdown" : "FIRE"} Target: {fmt(FIRE_GOAL)}</p>
                                  {isFireAge && <p className="text-green-400 mt-1">🎉 {fireInheritanceMode ? "Drawdown starts!" : "FIRE achieved!"}</p>}
                                  {fireInheritanceMode && isInheritAge && <p className="text-emerald-300 mt-1">💎 Inheritance arrives: {fmt(_inheritanceNominal)}</p>}
                                  {d?.value >= FIRE_GOAL && !isFireAge && <p className="text-green-400 mt-1">✅ {fireInheritanceMode ? "Runway funded" : "FIRE achieved!"}</p>}
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine y={FIRE_GOAL} stroke={fireInheritanceMode ? "#10B981" : "#F97316"} strokeDasharray="6 3" strokeWidth={2}
                            label={{ value: `${fireInheritanceMode ? "💎" : "🔥"} ${fmt(FIRE_GOAL)}`, position: "insideTopRight", fill: fireInheritanceMode ? "#10B981" : "#F97316", fontSize: 10 }} />
                          {fireAge !== null && (
                            <ReferenceLine x={fireAge} stroke="#22C55E" strokeDasharray="4 3" strokeWidth={2}
                              label={{ value: `✅ Age ${fireAge}`, position: "top", fill: "#22C55E", fontSize: 10 }} />
                          )}
                          {fireInheritanceMode && (
                            <ReferenceLine x={fireInheritanceAge} stroke="#6EE7B7" strokeDasharray="3 2" strokeWidth={2}
                              label={{ value: `💎 Age ${fireInheritanceAge}`, position: "top", fill: "#6EE7B7", fontSize: 10 }} />
                          )}
                          <Area type="monotone" dataKey="value" stroke={fireInheritanceMode ? "#10B981" : "#F97316"} fill="url(#fireGradient)" strokeWidth={2} dot={false} name="Projected NW" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* ── Cost of Living Breakdown ── */}
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">🌏 Early Retirement Abroad — Cost of Living Comparison</h3>
                    <p className="text-slate-400 text-xs mb-4">
                      Click a destination above to set your FIRE goal. All figures include {(totalBuffer * 100).toFixed(0)}% buffer · {(fireColInflation * 100).toFixed(0)}%/yr COL inflation · {fireInheritanceMode ? `💎 Drawdown to age ${fireInheritanceAge}` : `${(fireSwr * 100).toFixed(2)}% SWR (${Math.round(1/fireSwr)}× annual spend)`}.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {FIRE_LOCATIONS_COMPUTED.map(loc => (
                        <Card
                          key={loc.name}
                          onClick={() => setFireLocationKey(loc.key)}
                          className={`${loc.color} border cursor-pointer transition-all ${fireLocationKey === loc.key ? `ring-2 ring-offset-1 ring-offset-slate-900` : "opacity-70 hover:opacity-90"}`}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className={`${loc.accent} text-base flex items-center justify-between`}>
                              <span>{loc.flag} {loc.name}</span>
                              {fireLocationKey === loc.key && <span className="text-[10px] bg-white/10 rounded px-1.5 py-0.5 font-normal">✓ Selected</span>}
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-[11px]">{fireTier === "lean" ? "🎒 Lean" : fireTier === "comfortable" ? "🏠 Comfortable" : "✨ Cushy"} tier · with {(totalBuffer * 100).toFixed(0)}% buffers · today's USD</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1.5 mb-3">
                              {loc.items.map(item => (
                                <div key={item.label} className="flex justify-between text-xs">
                                  <span className="text-slate-200">{item.label}</span>
                                  <span className="text-white font-medium">${item.mo}/mo</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-700/60 pt-2 space-y-1">
                              <div className="flex justify-between text-sm font-bold">
                                <span className={loc.accent}>Today's Monthly Total</span>
                                <span className="text-white">${loc.monthlyTotal.toLocaleString()}/mo</span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-300">
                                <span>Annual spend (today)</span>
                                <span>${loc.annualTotal.toLocaleString()}/yr</span>
                              </div>
                              <div className="flex justify-between text-xs text-yellow-300">
                                <span>📈 At retirement ({loc.locYrs}yrs × {(fireColInflation * 100).toFixed(0)}%/yr)</span>
                                <span>${Math.round(loc.inflatedMonthly).toLocaleString()}/mo</span>
                              </div>
                                <div className="flex justify-between text-xs font-bold mt-1">
                                <span className={loc.accent}>
                                  {fireInheritanceMode
                                    ? `💎 FIRE goal (drawdown ${loc.locInheritanceDrawdownYrs}yrs to age ${fireInheritanceAge})`
                                    : `FIRE goal (inflated ÷ ${(fireSwr * 100).toFixed(2)}% SWR)`}
                                </span>
                                <span className="text-white">{fmt(loc.effectiveFireNeeded)}</span>
                              </div>
                              <div className="mt-2 p-2 bg-black/30 rounded-lg space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Your liquid NW covers</span>
                                  <span className={`font-bold ${_fireLiquidNW >= loc.effectiveFireNeeded ? "text-green-400" : "text-orange-400"}`}>
                                    {(_fireLiquidNW / loc.annualTotal).toFixed(1)} yrs of today's spend
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Progress to {fireInheritanceMode ? "drawdown" : "inflated"} goal</span>
                                  <span className={`font-bold ${_fireLiquidNW >= loc.effectiveFireNeeded ? "text-green-400" : "text-slate-200"}`}>
                                    {Math.min((_fireLiquidNW / loc.effectiveFireNeeded) * 100, 100).toFixed(1)}%
                                  </span>
                                </div>
                                {fireInheritanceMode
                                  ? <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">Inheritance covers after age {fireInheritanceAge}</span>
                                      <span className="text-emerald-300 font-semibold">{fmt(Math.round(_inheritanceNominal * fireSwr))}/yr</span>
                                    </div>
                                  : <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">SWR income vs inflated spend</span>
                                      <span className={`font-semibold ${Math.round(loc.fireNeeded * fireSwr / 12) - Math.round(loc.inflatedMonthly) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {Math.round(loc.fireNeeded * fireSwr / 12) - Math.round(loc.inflatedMonthly) >= 0 ? "+" : ""}${(Math.round(loc.fireNeeded * fireSwr / 12) - Math.round(loc.inflatedMonthly)).toLocaleString()}/mo
                                      </span>
                                    </div>
                                }
                              </div>
                            </div>
                            {/* Expandable methodology essay */}
                            <button
                              onClick={e => { e.stopPropagation(); setFireColExpanded(fireColExpanded === loc.key ? null : loc.key); }}
                              className={`mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${fireColExpanded === loc.key ? "bg-slate-700/60 border-slate-500/50 text-slate-200" : "bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-500/40"}`}
                            >
                              <span>📖 How these numbers were calculated</span>
                              <span className="text-slate-500">{fireColExpanded === loc.key ? "▲ collapse" : "▼ expand"}</span>
                            </button>
                            {fireColExpanded === loc.key && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="mt-2 p-3 bg-slate-800/80 border border-slate-600/40 rounded-lg text-[11px] text-slate-300 leading-relaxed space-y-2 max-h-96 overflow-y-auto"
                              >
                                {loc.methodology.split("\n\n").map((para, i) => (
                                  <p key={i} className={para.startsWith("**") ? "text-slate-100 font-semibold" : "text-slate-300"}>
                                    {para.replace(/\*\*(.*?)\*\*/g, "$1")}
                                  </p>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* ── Key milestones ── */}
                  <Card className="bg-slate-800/60 border-slate-700/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-300 text-sm">📍 Key FIRE Milestones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[
                          { pctMile: 25, label: "First 25% — hardest part, building momentum", color: "text-red-400" },
                          { pctMile: 50, label: "Half-FIRE — investment returns start doing the heavy lifting", color: "text-yellow-400" },
                          { pctMile: 75, label: fireInheritanceMode ? "75% of runway funded — almost there" : "Coast-FIRE — can slow savings and still hit goal via compounding", color: "text-blue-400" },
                          { pctMile: 100, label: fireInheritanceMode ? `Full drawdown runway funded — retire until age ${fireInheritanceAge}, then inheritance takes over 💎` : "Full FIRE — retire anywhere in the world 🎉", color: "text-green-400" },
                        ].map(m => {
                          const target = FIRE_GOAL * (m.pctMile / 100);
                          const reached = _fireLiquidNW >= target;
                          const milestone = projectionData.find(d => d.value >= target);
                          return (
                            <div key={m.pctMile} className={`flex items-center gap-3 p-2.5 rounded-lg ${reached ? "bg-green-900/20 border border-green-700/30" : "bg-slate-700/20"}`}>
                              <span className="text-lg">{reached ? "✅" : "⏳"}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold ${m.color}`}>{m.pctMile}% — {fmt(target)}</p>
                                <p className="text-[10px] text-slate-400 truncate">{m.label}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {reached
                                  ? <span className="text-green-400 text-xs font-bold">Reached!</span>
                                  : milestone
                                    ? <span className="text-slate-300 text-xs">~Age {milestone.age} ({milestone.year})</span>
                                    : <span className="text-slate-500 text-xs">25+ yrs away</span>
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* ── All Items Table ───────────────────────── */}
          <TabsContent value="table" className="space-y-4">
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-300 text-base">Add New Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Item</Label>
                    <Input value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                      placeholder="Item name" className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Category</Label>
                    <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Extra Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1 min-h-[32px] bg-slate-900/50 border border-slate-600 rounded-md px-2 py-1">
                      {["Business", "Income", "Investment", "Retirement"].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewItem(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
                          }))}
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                            newItem.tags.includes(tag)
                              ? "bg-blue-600/50 text-blue-200 border-blue-500/60"
                              : "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Monthly Cost ($)</Label>
                    <Input type="number" step="0.01" value={newItem.monthlyCost}
                      onChange={(e) => setNewItem({ ...newItem, monthlyCost: e.target.value })}
                      placeholder="0.00" className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Recur Type</Label>
                    <Select value={newItem.recurType} onValueChange={(v) => setNewItem({ ...newItem, recurType: v })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {RECUR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full bg-green-600 hover:bg-green-700 h-8 text-sm">
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full Breakdown Table */}
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-purple-300 text-base">All Financial Items</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">{sortedItems.length} items · click column headers to sort</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Search items…"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white h-8 text-xs w-44 placeholder:text-slate-500"
                    />
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="All">All Categories</SelectItem>
                        <SelectItem value="Income">💚 Income</SelectItem>
                        <SelectItem value="Investment">💚 Investment</SelectItem>
                        <SelectItem value="Retirement">💛 Retirement</SelectItem>
                        {CATEGORIES.filter(c => !["Income", "Investment", "Retirement"].includes(c))
                          .map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {(() => {
                  const searched = sortedItems.filter(i =>
                    tableSearch === "" ||
                    i.item.toLowerCase().includes(tableSearch.toLowerCase()) ||
                    i.category.toLowerCase().includes(tableSearch.toLowerCase())
                  );

                  const groups: { label: string; colorClass: string; headerBg: string; items: typeof searched }[] = [
                    {
                      label: "💚 Income & Investment",
                      colorClass: "text-green-300",
                      headerBg: "bg-green-500/10 border-green-500/20",
                      items: searched.filter(i => classifyItem(i.category, i.tags) === "income"),
                    },
                    {
                      label: "💛 Retirement",
                      colorClass: "text-yellow-300",
                      headerBg: "bg-yellow-500/10 border-yellow-500/20",
                      items: searched.filter(i => classifyItem(i.category, i.tags) === "retirement"),
                    },
                    {
                      label: "🔴 Expenses",
                      colorClass: "text-red-300",
                      headerBg: "bg-red-500/10 border-red-500/20",
                      items: searched.filter(i => classifyItem(i.category, i.tags) === "expense"),
                    },
                  ].filter(g => g.items.length > 0);

                  const renderGroup = (g: typeof groups[0]) => {
                    const type = g.label.startsWith("💚") ? "income" : g.label.startsWith("💛") ? "retirement" : "expense";
                    const groupTotal = g.items.reduce((s, i) => s + i.monthlyCost, 0);
                    return (
                      <div key={g.label} className="mb-0">
                        {/* Section header */}
                        <div className={`flex items-center justify-between px-4 py-2 border-y border-slate-700/60 ${g.headerBg}`}>
                          <span className={`text-xs font-bold tracking-wide ${g.colorClass}`}>{g.label}</span>
                          <span className={`text-xs font-semibold ${g.colorClass}`}>
                            {g.items.length} items · {formatCurrency(groupTotal)}/mo · {formatCurrency(groupTotal * 12)}/yr
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table style={{ tableLayout: "fixed", width: colWidths.reduce((a, b) => a + b, 0) }}>
                            <colgroup>
                              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
                            </colgroup>
                            <TableHeader>
                              <TableRow className="border-slate-700/40 bg-slate-900/20">
                                {[
                                  { key: "item", label: "Item" },
                                  { key: "category", label: "Category" },
                                  { key: "monthlyCost", label: "Monthly" },
                                  { key: null, label: "Annual" },
                                  { key: "recurType", label: "Recur" },
                                  { key: null, label: "" },
                                ].map((col, ci) => (
                                  <TableHead
                                    key={ci}
                                    className={`text-slate-400 text-[11px] relative select-none overflow-visible ${ci === 0 ? "pl-4" : ""} ${col.key ? "cursor-pointer hover:text-white" : ""}`}
                                    style={{ width: colWidths[ci], position: "relative" }}
                                    onClick={col.key ? () => handleSort(col.key as any) : undefined}
                                  >
                                    <div className="flex items-center pr-2 truncate">
                                      {col.label}{col.key && getSortIcon(col.key as any)}
                                    </div>
                                    {/* Resize handle — not on last column */}
                                    {ci < 5 && (
                                      <div
                                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-10 flex items-center justify-center group/rh"
                                        style={{ touchAction: "none" }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          resizingCol.current = { idx: ci, startX: e.clientX, startW: colWidths[ci] };
                                          const onMove = (me: MouseEvent) => {
                                            if (!resizingCol.current) return;
                                            const delta = me.clientX - resizingCol.current.startX;
                                            const newW = Math.max(60, resizingCol.current.startW + delta);
                                            setColWidths(prev => { const next = [...prev]; next[resizingCol.current!.idx] = newW; return next; });
                                          };
                                          const onUp = () => {
                                            resizingCol.current = null;
                                            window.removeEventListener("mousemove", onMove);
                                            window.removeEventListener("mouseup", onUp);
                                          };
                                          window.addEventListener("mousemove", onMove);
                                          window.addEventListener("mouseup", onUp);
                                        }}
                                      >
                                        <div className="w-px h-4 bg-slate-600 group-hover/rh:bg-yellow-500/70 transition-colors" />
                                      </div>
                                    )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.items.map((item) => (
                                <TableRow key={item.id} className="border-slate-700/30 hover:bg-slate-700/20 group">
                                  <TableCell className="text-white text-xs py-2 pl-4 font-medium">
                                    {item.item}
                                    {item.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{item.notes}</p>}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${classifyBadge(item.category)}`}>
                                      {item.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={`text-xs py-2 font-semibold tabular-nums ${
                                    type === "income" ? "text-green-300" :
                                    type === "retirement" ? "text-yellow-300" : "text-red-300"
                                  }`}>
                                    {type !== "expense" ? "+" : "-"}{formatCurrency(item.monthlyCost)}
                                  </TableCell>
                                  <TableCell className={`text-xs py-2 tabular-nums opacity-70 ${
                                    type === "income" ? "text-green-200" :
                                    type === "retirement" ? "text-yellow-200" : "text-red-200"
                                  }`}>
                                    {type !== "expense" ? "+" : "-"}{formatCurrency(item.monthlyCost * 12)}
                                  </TableCell>
                                  <TableCell className="text-slate-400 text-[10px] py-2">{item.recurType}</TableCell>
                                  <TableCell className="py-2 pr-3">
                                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}
                                      className="h-6 w-6 p-0 text-red-400/30 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Group subtotal */}
                              <TableRow className="border-t border-slate-600/50 bg-slate-900/30">
                                <TableCell className={`text-xs font-bold pl-4 py-2 ${g.colorClass}`} colSpan={2}>Subtotal</TableCell>
                                <TableCell className={`text-xs font-bold py-2 tabular-nums ${g.colorClass}`}>
                                  {type !== "expense" ? "+" : "-"}{formatCurrency(groupTotal)}
                                </TableCell>
                                <TableCell className={`text-xs font-semibold py-2 tabular-nums opacity-80 ${g.colorClass}`}>
                                  {type !== "expense" ? "+" : "-"}{formatCurrency(groupTotal * 12)}
                                </TableCell>
                                <TableCell colSpan={2} />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="divide-y divide-slate-700/30">
                      {groups.map(renderGroup)}
                      {/* Grand totals footer */}
                      <div className="px-4 py-3 flex flex-wrap gap-x-8 gap-y-1 bg-slate-900/40 text-xs">
                        <span className="text-slate-400">{searched.length} items shown</span>
                        <span className="text-green-300 font-semibold">Income: +{formatCurrency(totalIncome)}/mo</span>
                        <span className="text-yellow-300 font-semibold">Retirement: +{formatCurrency(totalRetirement)}/mo</span>
                        <span className="text-red-300 font-semibold">Expenses: -{formatCurrency(totalExpenses)}/mo</span>
                        <span className={`font-bold ${netCashFlow >= 0 ? "text-white" : "text-red-300"}`}>
                          Net: {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow)}/mo
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Cash Flow (W2 Only) ───────────────────── */}
          <TabsContent value="cashflow" className="space-y-4">
            <Card className="bg-slate-800/60 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> W2 Salary Cash Flow
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Only your <span className="text-blue-300 font-semibold">Post-Tax W2 Salary</span> counts as income here —
                  RSUs, ESPP, and HSA contributions are excluded. This shows your true monthly budget reality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Key numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                    <p className="text-xs text-blue-400 mb-1">W2 Salary (take-home)</p>
                    <p className="text-3xl font-bold text-blue-300">{formatCurrency(w2Income)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                    <p className="text-xs text-red-400 mb-1">Total Expenses</p>
                    <p className="text-3xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${cashflowNetRaw >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <p className={`text-xs mb-1 ${cashflowNetRaw >= 0 ? "text-green-400" : "text-red-400"}`}>W2 Net (excl. retirement)</p>
                    <p className={`text-3xl font-bold ${cashflowNetRaw >= 0 ? "text-green-300" : "text-red-300"}`}>{formatCurrency(cashflowNetRaw)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {w2Income > 0 ? ((cashflowNetRaw / w2Income) * 100).toFixed(1) : "0"}% of W2
                    </p>
                  </div>
                </div>

                {nonW2Income > 0 && (
                  <div className="rounded-lg bg-slate-700/30 border border-slate-600/30 px-4 py-3 mb-5 flex items-start gap-2.5">
                    <span className="text-yellow-400 text-sm mt-0.5">💡</span>
                    <p className="text-xs text-slate-300">
                      <span className="text-yellow-300 font-semibold">{formatCurrency(nonW2Income)}/mo</span> of additional income from
                      RSUs, ESPP, HSA, and other non-W2 sources is excluded from this view.
                      Including those, your total income is <span className="text-green-300 font-semibold">{formatCurrency(totalIncome)}/mo</span>.
                    </p>
                  </div>
                )}

                {/* Pie chart */}
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsPieChart>
                    <Pie data={cashflowPie} cx="50%" cy="50%" outerRadius={120} innerRadius={55}
                      dataKey="value" labelLine={false} label={false}>
                      {cashflowPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-200 text-sm">{value}</span>} />
                  </RechartsPieChart>
                </ResponsiveContainer>

                {/* Expense detail */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" /> Where your W2 salary goes (top expenses)
                  </p>
                  <div className="space-y-1">
                    {topExpenses.slice(0, 12).map(item => {
                      const pct = w2Income > 0 ? (item.monthlyCost / w2Income) * 100 : 0;
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-slate-300 truncate mr-2">{item.item}</span>
                              <span className="text-red-300 shrink-0 font-medium">{formatCurrency(item.monthlyCost)} ({pct.toFixed(1)}% of W2)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-700">
                              <div className="h-1.5 rounded-full bg-red-500/60" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ── Net Worth ────────────────────────────── */}
          <TabsContent value="networth" className="space-y-4">
            {(() => {
              const btcPrice = btcData?.price ?? cachedBtcPrice;
              const vtsaxPrice = vtsaxData?.price ?? cachedVtsaxPrice;
              const vooPrice = vooData?.price ?? cachedVooPrice;
              const ibitPrice = ibitData?.price ?? cachedIbitPrice;
              const viiixPrice = viiixData?.price ?? cachedViiixPrice;

              const btcValue = btcHoldings * btcPrice;
              const coinbaseValue = coinbaseBtcHoldings * btcPrice;
              const totalBtcValue = btcValue + coinbaseValue;
              const vtsaxValue = vtsaxHoldings * vtsaxPrice;
              const vooValue = vooHoldings * vooPrice;
              const rothIraValue = (rothIraIbitHoldings * ibitPrice) + (rothIraVtsaxHoldings * vtsaxPrice);
              const k401Value = k401Shares * viiixPrice;
              // Early withdrawal haircuts (retiring before 55: 10% penalty + income tax on gains)
              const rothIraAfterPenalty = rothIraValue * 0.75; // 25% haircut (10% penalty + ~15% income tax)
              const k401AfterPenalty = k401Value * 0.68;       // 32% haircut (10% penalty + ~22% income tax)
              const vanguardTotal = vtsaxValue + vooValue;

              // Real estate — use live Redfin price when available, else fall back to manual
              const homeLivePrice = propertyData?.price ?? null;
              const homePriceIsLive = homeLivePrice !== null && homeLivePrice > 0;
              const homeSalePrice = homePriceIsLive ? homeLivePrice : homeEstValue;

              // Full Rocklin/Placer County formula (May 2026)
              // Transfer tax: Placer County $0.55/$500 + Rocklin city $0.55/$500 = 0.22% combined
              const HOME_TRANSFER_TAX_RATE = 0.0022;
              const homeAgentCommission = homeSalePrice * (homeSellerFee / 100);
              const homeTransferTax = homeSalePrice * HOME_TRANSFER_TAX_RATE;
              const homeTotalSellingCosts = homeAgentCommission + homeTransferTax + homeOtherCosts;
              const homeNetCashAfterSale = homeSalePrice - homeLoanBalance - homeTotalSellingCosts;
              // Capital gains side (loan not subtracted — IRS basis calculation)
              const homeAdjustedBasis = homePurchasePrice + homeCapImprovements - homeDepreciation;
              const homeRawGain = homeSalePrice - homeTotalSellingCosts - homeAdjustedBasis;
              const homeTaxableGain = Math.max(0, homeRawGain - homePrimaryExclusion);
              const homeCapGainsTax = homeTaxableGain * ((homeFedCapGainsRate + homeCaCapGainsRate) / 100);
              const homeAfterTaxNetCash = homeNetCashAfterSale - homeCapGainsTax;
              // homeEquity = after-tax net cash proceeds (used throughout for net worth)
              const homeEquity = homeAfterTaxNetCash;

              const annualSavings = ((totalIncome - totalExpenses - totalRetirement) / 100) * 12;
              // BTC wallets and Vanguard brokerage use after-tax (85%) values in totals
              const btcAfterTax = totalBtcValue * 0.85;
              const vanguardAfterTax = vanguardTotal * 0.85;
              // Domain: only gains above purchase price are taxed at 15%; loss = no tax
              const domainCapGain = Math.max(0, velunaDomainValue - velunaDomainPurchasePrice);
              const domainAfterTax = velunaDomainValue - domainCapGain * 0.15;
              const investmentTotal = btcAfterTax + vanguardAfterTax + rothIraAfterPenalty + k401AfterPenalty + homeEquity + checkingBalance + careerglowBalance + hsaBalance + domainAfterTax + eTradeRsuValue + fordExplorerValue + kawasakiNinjaValue;
              const isLoading = btcLoading || vtsaxLoading || vooLoading || ibitLoading || viiixLoading;

              const cryptoTotal = btcAfterTax + (rothIraIbitHoldings * ibitPrice) * 0.75; // BTC wallets (after-tax) + Roth IRA IBIT (after 25% early withdrawal)
              const indexFundsTotal = vanguardAfterTax + k401AfterPenalty + eTradeRsuValue + (rothIraVtsaxHoldings * vtsaxPrice) * 0.75; // Vanguard after-tax + 401k after penalty + Apple RSUs + Roth IRA VTSAX after penalty
              const domainTotal = domainAfterTax;
              const vehicleTotal = fordExplorerValue + kawasakiNinjaValue;
              const pieData = [
                { name: "Crypto", value: Math.round(cryptoTotal), color: "#F59E0B" },
                { name: "Index Funds & Equity", value: Math.round(indexFundsTotal), color: "#6366F1" },
                { name: "Cash", value: Math.round(checkingBalance + careerglowBalance + hsaBalance), color: "#22D3EE" },
                { name: "Domain Names", value: Math.round(domainTotal), color: "#8B5CF6" },
                { name: "Vehicle", value: Math.round(vehicleTotal), color: "#F97316" },
                ...(homeAfterTaxNetCash > 0 ? [{ name: "Real Estate", value: Math.round(homeAfterTaxNetCash), color: "#EC4899" }] : []),
              ].filter(d => d.value > 0).map(d => ({
                ...d,
                pct: investmentTotal > 0 ? (d.value / investmentTotal) * 100 : 0,
              }));

              const fmt = (n: number) => n > 0
                ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—";

              const nwWidgetMeta: Record<NWWidgetKey, { label: string; dot: string; border: string }> = {
                assets:       { label: "Asset Cards",         dot: "bg-yellow-400",  border: "border-yellow-500/30 hover:border-yellow-500/60" },
                holdings:     { label: "My Holdings",         dot: "bg-orange-400",  border: "border-orange-500/30 hover:border-orange-500/60" },
                portfolioPie: { label: "Portfolio Allocation", dot: "bg-purple-400", border: "border-purple-500/30 hover:border-purple-500/60" },
                nwSummary:    { label: "Net Worth Summary",    dot: "bg-green-400",  border: "border-green-500/30 hover:border-green-500/60" },
              };
              const toggleNwWidget = (key: NWWidgetKey) => {
                setNwWidgetVisible(prev => {
                  const next = { ...prev, [key]: !prev[key] };
                  try { localStorage.setItem("nw-widget-visible", JSON.stringify(next)); } catch {}
                  saveWidgetPrefs({ nwVisible: next });
                  return next;
                });
              };
              const handleNwDragStart = (e: React.DragEvent, idx: number) => {
                nwDragSrcIdx.current = idx;
                e.dataTransfer.effectAllowed = "move";
              };
              const handleNwDragOver = (e: React.DragEvent, idx: number) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setNwDragOverIdx(idx);
              };
              const handleNwDrop = (e: React.DragEvent, idx: number) => {
                e.preventDefault();
                if (nwDragSrcIdx.current === null || nwDragSrcIdx.current === idx) {
                  setNwDragOverIdx(null); return;
                }
                const next = [...nwWidgetOrder];
                const [removed] = next.splice(nwDragSrcIdx.current, 1);
                next.splice(idx, 0, removed);
                setNwWidgetOrder(next);
                try { localStorage.setItem("nw-widget-order", JSON.stringify(next)); } catch {}
                saveWidgetPrefs({ nwOrder: next });
                nwDragSrcIdx.current = null;
                setNwDragOverIdx(null);
              };
              const handleNwDragEnd = () => { nwDragSrcIdx.current = null; setNwDragOverIdx(null); };

              const nwRenderWidget = (key: NWWidgetKey) => {
                if (!nwWidgetVisible[key]) return null;
                if (key === "assets") return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bitcoin — Personal Wallet */}
                    <Card className="bg-slate-800/60 border-yellow-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-yellow-400 font-bold tracking-wide">₿ Bitcoin Wallet</p>
                            <p className="text-2xl font-bold text-white mt-0.5">
                              {isLoading ? <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                                : btcPrice > 0 ? fmt(btcValue * 0.85) : <span className="text-red-400 text-sm">Unavailable</span>}
                            </p>
                            {!isLoading && btcPrice > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">after ~15% long-term cap. gains tax</p>
                            )}
                          </div>
                          {btcData?.change24h != null && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${btcData.change24h >= 0 ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                              {btcData.change24h >= 0 ? "▲" : "▼"} {Math.abs(btcData.change24h).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>{btcHoldings} BTC · gross value</span>
                            <span className="font-semibold text-yellow-300">{fmt(btcValue)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Est. 15% LTCG tax</span>
                            <span className="text-red-400">−{fmt(btcValue * 0.15)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Coinbase */}
                    <Card className="bg-slate-800/60 border-orange-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-orange-400 font-bold tracking-wide">🔵 Coinbase</p>
                            <p className="text-2xl font-bold text-white mt-0.5">
                              {isLoading ? <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                                : coinbaseValue > 0 ? fmt(coinbaseValue * 0.85) : <span className="text-red-400 text-sm">Unavailable</span>}
                            </p>
                            {!isLoading && coinbaseValue > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">after ~15% long-term cap. gains tax</p>
                            )}
                          </div>
                          <span className="text-[10px] text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5">BTC</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>{coinbaseBtcHoldings} BTC · gross value</span>
                            <span className="font-semibold text-orange-300">{fmt(coinbaseValue)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Est. 15% LTCG tax</span>
                            <span className="text-red-400">−{fmt(coinbaseValue * 0.15)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vanguard Brokerage bundle */}
                    <Card className="bg-slate-800/60 border-indigo-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-indigo-400 font-bold tracking-wide">🏦 Vanguard Brokerage</p>
                            <p className="text-2xl font-bold text-white mt-0.5">
                              {isLoading ? <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                                : vanguardTotal > 0 ? fmt(vanguardTotal * 0.85) : <span className="text-red-400 text-sm">Unavailable</span>}
                            </p>
                            {!isLoading && vanguardTotal > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">after ~15% long-term cap. gains tax</p>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-400 border border-indigo-500/30 rounded px-1.5 py-0.5">VTSAX + VOO</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Gross value</span>
                            <span className="font-semibold text-indigo-300">{fmt(vanguardTotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Est. 15% LTCG tax</span>
                            <span className="text-red-400">−{fmt(vanguardTotal * 0.15)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 pt-0.5">
                            <span>VTSAX · {vtsaxHoldings} sh.</span>
                            <span className="text-indigo-300">{fmt(vtsaxValue)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>VOO · {vooHoldings} sh.</span>
                            <span className="text-indigo-300">{fmt(vooValue)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Roth IRA — VTSAX + IBIT */}
                    <Card className="bg-slate-800/60 border-emerald-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-emerald-400 font-bold tracking-wide">🌿 Roth IRA</p>
                            <p className="text-2xl font-bold text-white mt-0.5">
                              {isLoading ? <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                                : rothIraAfterPenalty > 0 ? fmt(rothIraAfterPenalty) : <span className="text-red-400 text-sm">Unavailable</span>}
                            </p>
                            {!isLoading && rothIraValue > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">after ~25% early withdrawal penalty</p>
                            )}
                          </div>
                          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">VTSAX + IBIT</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>VTSAX · {rothIraVtsaxHoldings} sh. · {fmt(vtsaxPrice)}/sh.</span>
                            <span className="font-semibold text-emerald-300">{fmt(rothIraVtsaxHoldings * vtsaxPrice)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>IBIT · {rothIraIbitHoldings} sh. · {fmt(ibitPrice)}/sh.</span>
                            <span className="font-semibold text-emerald-300">{fmt(rothIraIbitHoldings * ibitPrice)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Est. 25% early withdrawal</span>
                            <span className="text-red-400">−{fmt(rothIraValue * 0.25)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 401k — ProShares Ultra S&P500 (SSO) */}
                    <Card className="bg-slate-800/60 border-teal-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-teal-400 font-bold tracking-wide">🏦 401k</p>
                            <p className="text-2xl font-bold text-white mt-0.5">
                              {isLoading ? <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                                : k401AfterPenalty > 0 ? fmt(k401AfterPenalty) : <span className="text-red-400 text-sm">Unavailable</span>}
                            </p>
                            {!isLoading && k401Value > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">after ~32% early withdrawal penalty</p>
                            )}
                          </div>
                          <span className="text-[10px] text-teal-400 border border-teal-500/30 rounded px-1.5 py-0.5">SSO</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>SSO · {k401Shares} sh. · {fmt(viiixPrice)}/sh.</span>
                            <span className="font-semibold text-teal-300">{fmt(k401Value)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Est. 32% early withdrawal</span>
                            <span className="text-red-400">−{fmt(k401Value * 0.32)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Real Estate — 2605 Plumbago Court */}
                    <Card className={`bg-slate-800/60 ${homeEquity >= 0 ? "border-pink-500/30" : "border-red-500/40"}`}>
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-pink-400 font-bold tracking-wide">🏠 2605 Plumbago Ct</p>
                              {homePriceIsLive
                                ? <span className="text-[9px] text-emerald-400 border border-emerald-600/50 rounded px-1 py-0.5 leading-none">● live · redfin</span>
                                : <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                              }
                            </div>
                            <p className={`text-2xl font-bold mt-0.5 ${homeEquity >= 0 ? "text-white" : "text-red-300"}`}>
                              {homeEquity >= 0
                                ? `$${Math.round(homeEquity).toLocaleString("en-US")}`
                                : `-$${Math.abs(Math.round(homeEquity)).toLocaleString("en-US")}`}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">est. after-tax net cash from sale</p>
                          </div>
                          <span className={`text-[10px] border rounded px-1.5 py-0.5 mt-0.5 ${homeEquity >= 0 ? "text-pink-400 border-pink-500/30" : "text-red-400 border-red-500/30"}`}>
                            {homeEquity >= 0 ? "equity" : "underwater"}
                          </span>
                        </div>

                        {/* Selling costs breakdown */}
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs text-slate-400">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sale Proceeds</p>
                          <div className="flex justify-between">
                            <span>{homePriceIsLive ? "Sale price (Redfin live)" : "Sale price (manual)"}</span>
                            <span className={homePriceIsLive ? "text-emerald-400" : "text-slate-300"}>${homeSalePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Agent commission ({homeSellerFee}%)</span>
                            <span className="text-red-400">-${Math.round(homeAgentCommission).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transfer tax (0.22% Rocklin)</span>
                            <span className="text-red-400">-${Math.round(homeTransferTax).toLocaleString()}</span>
                          </div>
                          {homeOtherCosts > 0 && (
                            <div className="flex justify-between">
                              <span>Other costs</span>
                              <span className="text-red-400">-${Math.round(homeOtherCosts).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="flex items-center gap-1.5">Loan payoff <span className="text-[9px] bg-slate-700 text-slate-400 px-1 py-0.5 rounded">manual</span></span>
                            <span className="text-red-400">-${homeLoanBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-slate-700/30 pt-1 mt-1">
                            <span className="text-slate-300">Net cash (pre-tax)</span>
                            <span className={homeNetCashAfterSale >= 0 ? "text-slate-200" : "text-red-400"}>
                              {homeNetCashAfterSale >= 0 ? `$${Math.round(homeNetCashAfterSale).toLocaleString()}` : `-$${Math.abs(Math.round(homeNetCashAfterSale)).toLocaleString()}`}
                            </span>
                          </div>
                        </div>

                        {/* Capital gains breakdown */}
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs text-slate-400">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Capital Gains</p>
                          <div className="flex justify-between">
                            <span>Purchase price</span>
                            <span>${homePurchasePrice.toLocaleString()}</span>
                          </div>
                          {homeCapImprovements > 0 && (
                            <div className="flex justify-between">
                              <span>+ Capital improvements</span>
                              <span>${homeCapImprovements.toLocaleString()}</span>
                            </div>
                          )}
                          {homeDepreciation > 0 && (
                            <div className="flex justify-between">
                              <span>- Depreciation taken</span>
                              <span className="text-red-400">-${homeDepreciation.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Raw gain / (loss)</span>
                            <span className={homeRawGain >= 0 ? "text-slate-300" : "text-emerald-400"}>
                              {homeRawGain >= 0 ? `$${Math.round(homeRawGain).toLocaleString()}` : `-$${Math.abs(Math.round(homeRawGain)).toLocaleString()}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Primary home exclusion</span>
                            <span className="text-emerald-400">-${homePrimaryExclusion.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxable gain</span>
                            <span className={homeTaxableGain > 0 ? "text-yellow-400" : "text-emerald-400"}>
                              ${Math.round(homeTaxableGain).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-slate-700/30 pt-1 mt-1">
                            <span className="text-slate-300">Est. cap gains tax ({homeFedCapGainsRate + homeCaCapGainsRate}%)</span>
                            <span className={homeCapGainsTax > 0 ? "text-red-400" : "text-emerald-400"}>
                              {homeCapGainsTax > 0 ? `-$${Math.round(homeCapGainsTax).toLocaleString()}` : "$0"}
                            </span>
                          </div>
                        </div>

                        {/* Final after-tax */}
                        <div className="mt-2 pt-2 border-t border-slate-600/60">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-200">After-tax net cash</span>
                            <span className={homeAfterTaxNetCash >= 0 ? "text-emerald-300" : "text-red-300"}>
                              {homeAfterTaxNetCash >= 0
                                ? `$${Math.round(homeAfterTaxNetCash).toLocaleString()}`
                                : `-$${Math.abs(Math.round(homeAfterTaxNetCash)).toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cash */}
                    <Card className="bg-slate-800/60 border-cyan-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-cyan-400 font-bold tracking-wide">💵 Cash</p>
                              <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">BMO Checking Account ···1711</p>
                            <p className="text-2xl font-bold mt-0.5 text-white">${(checkingBalance + careerglowBalance + hsaBalance).toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] border rounded px-1.5 py-0.5 text-cyan-400 border-cyan-500/30">cash</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>BMO Checking ···1711</span>
                            <span>${checkingBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>CareerGlow LLC (Mercury)</span>
                            <span>${careerglowBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>HSA (Optum Financial)</span>
                            <span>${hsaBalance.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* veluna.com Domain */}
                    <Card className="bg-slate-800/60 border-violet-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-violet-400 font-bold tracking-wide">🌐 veluna.com</p>
                              <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                            </div>
                            {(() => {
                              const domainGain = velunaDomainValue - velunaDomainPurchasePrice;
                              const domainTaxableGain = Math.max(0, domainGain);
                              const domainCapGainsTax = domainTaxableGain * 0.15;
                              const domainAfterTax = velunaDomainValue - domainCapGainsTax;
                              return (
                                <>
                                  <p className={`text-2xl font-bold mt-0.5 ${domainAfterTax >= velunaDomainPurchasePrice ? "text-white" : "text-red-300"}`}>
                                    ${Math.round(domainAfterTax).toLocaleString()}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">est. after-tax net proceeds</p>
                                </>
                              );
                            })()}
                          </div>
                          <span className="text-[10px] border rounded px-1.5 py-0.5 text-violet-400 border-violet-500/30">domain</span>
                        </div>

                        {/* Sale proceeds */}
                        {(() => {
                          const domainGain = velunaDomainValue - velunaDomainPurchasePrice;
                          const domainTaxableGain = Math.max(0, domainGain);
                          const domainCapGainsTax = domainTaxableGain * 0.15;
                          const domainAfterTax = velunaDomainValue - domainCapGainsTax;
                          return (
                            <>
                              <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs text-slate-400">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sale Proceeds</p>
                                <div className="flex justify-between">
                                  <span>Estimated sale price</span>
                                  <span className="text-slate-300">${velunaDomainValue.toLocaleString()}</span>
                                </div>
                              </div>

                              {/* Capital gains breakdown */}
                              <div className="mt-2 pt-2 border-t border-slate-700/40 space-y-0.5 text-xs text-slate-400">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Capital Gains</p>
                                <div className="flex justify-between">
                                  <span>Purchase price</span>
                                  <span>${velunaDomainPurchasePrice.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Raw gain / (loss)</span>
                                  <span className={domainGain >= 0 ? "text-slate-300" : "text-emerald-400"}>
                                    {domainGain >= 0 ? `$${Math.round(domainGain).toLocaleString()}` : `-$${Math.abs(Math.round(domainGain)).toLocaleString()}`}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Taxable gain</span>
                                  <span className={domainTaxableGain > 0 ? "text-yellow-400" : "text-emerald-400"}>
                                    ${Math.round(domainTaxableGain).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between font-semibold border-t border-slate-700/30 pt-1 mt-1">
                                  <span className="text-slate-300">Est. cap gains tax (15%)</span>
                                  <span className={domainCapGainsTax > 0 ? "text-red-400" : "text-emerald-400"}>
                                    {domainCapGainsTax > 0 ? `-$${Math.round(domainCapGainsTax).toLocaleString()}` : "$0"}
                                  </span>
                                </div>
                              </div>

                              {/* Final after-tax */}
                              <div className="mt-2 pt-2 border-t border-slate-600/60">
                                <div className="flex justify-between text-sm font-bold">
                                  <span className="text-slate-200">After-tax net proceeds</span>
                                  <span className={domainAfterTax >= 0 ? "text-emerald-300" : "text-red-300"}>
                                    ${Math.round(domainAfterTax).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* E*Trade — Apple RSU */}
                    <Card className="bg-slate-800/60 border-green-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-green-400 font-bold tracking-wide">📈 E*Trade (Apple RSU)</p>
                              <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Apple Inc. RSU vested shares — E*Trade account</p>
                            <p className="text-2xl font-bold mt-0.5 text-white">${eTradeRsuValue.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] border rounded px-1.5 py-0.5 text-green-400 border-green-500/30">equity</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ford Explorer XLT */}
                    <Card className="bg-slate-800/60 border-orange-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-orange-400 font-bold tracking-wide">🚗 Ford Explorer XLT</p>
                              <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Vehicle — estimated market value</p>
                            <p className="text-2xl font-bold mt-0.5 text-white">${fordExplorerValue.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] border rounded px-1.5 py-0.5 text-orange-400 border-orange-500/30">vehicle</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Kawasaki Ninja 300 */}
                    <Card className="bg-slate-800/60 border-red-500/30">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-red-400 font-bold tracking-wide">🏍️ Kawasaki Ninja 300</p>
                              <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1 py-0.5 leading-none">manual · May 2026</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">2014 motorcycle — estimated sell value</p>
                            <p className="text-2xl font-bold mt-0.5 text-white">${kawasakiNinjaValue.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] border rounded px-1.5 py-0.5 text-red-400 border-red-500/30">vehicle</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
                if (key === "holdings") return (
                  <Card className="bg-slate-800/60 border-orange-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-orange-300 text-base flex items-center gap-2">
                          <Edit3 className="h-4 w-4" /> My Holdings
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setEditingHoldings(v => !v)}
                          className="text-xs text-slate-400 hover:text-white h-7">
                          {editingHoldings ? "Done" : "Edit"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editingHoldings ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">Bitcoin — Personal Wallet (BTC)</Label>
                            <Input type="number" min="0" step="0.0001" value={btcHoldings}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setBtcHoldings(v); try { localStorage.setItem("nw-btc", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">Coinbase (BTC)</Label>
                            <Input type="number" min="0" step="0.00000001" value={coinbaseBtcHoldings}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setCoinbaseBtcHoldings(v); try { localStorage.setItem("nw-coinbase-btc", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">VTSAX shares (Vanguard Brokerage)</Label>
                            <Input type="number" min="0" step="0.001" value={vtsaxHoldings}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setVtsaxHoldings(v); try { localStorage.setItem("nw-vtsax", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">VOO shares (Vanguard Brokerage)</Label>
                            <Input type="number" min="0" step="0.001" value={vooHoldings}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setVooHoldings(v); try { localStorage.setItem("nw-voo", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">IBIT shares (Roth IRA)</Label>
                            <Input type="number" min="0" step="0.001" value={rothIraIbitHoldings}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setRothIraIbitHoldings(v); try { localStorage.setItem("nw-roth-ibit", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="text-slate-300 text-xs mb-1 block">VIIIX shares (401k — VG INST 500 IDX)</Label>
                            <Input type="number" min="0" step="0.001" value={k401Shares}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setK401Shares(v); try { localStorage.setItem("nw-401k-viiix", String(v)); } catch {} }}
                              className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                          </div>
                          {/* Real Estate — organized into 3 sub-sections */}
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-pink-500/20">
                            <p className="text-[10px] text-pink-400/70 uppercase tracking-widest font-semibold mb-3">🏠 2605 Plumbago Court — Property &amp; Loan</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-3">
                                <Label className="text-slate-300 text-xs mb-1 block">Property Address (used for live Redfin lookup)</Label>
                                <input
                                  type="text"
                                  value={homeAddress}
                                  onChange={e => { setHomeAddress(e.target.value); try { localStorage.setItem("nw-home-address", e.target.value); } catch {} }}
                                  className="w-full bg-slate-900/50 border border-slate-600 text-white h-9 text-sm rounded-md px-3"
                                  placeholder="2605 Plumbago Court, Rocklin, CA 95677"
                                />
                                {homePriceIsLive && (
                                  <p className="text-[10px] text-emerald-400 mt-1">✓ Live Redfin price: ${homeLivePrice!.toLocaleString()} — manual fallback value below is ignored</p>
                                )}
                                {!homePriceIsLive && (
                                  <p className="text-[10px] text-slate-500 mt-1">Redfin lookup unavailable — using manual value below</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Manual Est. Value ($) <span className="text-slate-600">(fallback)</span></Label>
                                <Input type="number" min="0" step="1000" value={homeEstValue}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeEstValue(v); try { localStorage.setItem("nw-home-value", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Loan Balance ($)</Label>
                                <Input type="number" min="0" step="1000" value={homeLoanBalance}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeLoanBalance(v); try { localStorage.setItem("nw-home-loan", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Original Purchase Price ($)</Label>
                                <Input type="number" min="0" step="1000" value={homePurchasePrice}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomePurchasePrice(v); try { localStorage.setItem("nw-home-purchase", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <p className="text-[10px] text-pink-400/70 uppercase tracking-widest font-semibold mb-3">Selling Costs</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Agent Commission (%)</Label>
                                <Input type="number" min="0" step="0.5" value={homeSellerFee}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeSellerFee(v); try { localStorage.setItem("nw-home-fee", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Other Selling Costs ($)</Label>
                                <Input type="number" min="0" step="100" value={homeOtherCosts}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeOtherCosts(v); try { localStorage.setItem("nw-home-other-costs", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <p className="text-[10px] text-pink-400/70 uppercase tracking-widest font-semibold mb-3">Tax Basis &amp; Rates</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Capital Improvements ($)</Label>
                                <Input type="number" min="0" step="500" value={homeCapImprovements}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeCapImprovements(v); try { localStorage.setItem("nw-home-cap-imp", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Depreciation Taken ($)</Label>
                                <Input type="number" min="0" step="500" value={homeDepreciation}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeDepreciation(v); try { localStorage.setItem("nw-home-depreciation", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Primary Home Exclusion ($)</Label>
                                <Input type="number" min="0" step="50000" value={homePrimaryExclusion}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomePrimaryExclusion(v); try { localStorage.setItem("nw-home-exclusion", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Federal Cap Gains Rate (%)</Label>
                                <Input type="number" min="0" step="1" value={homeFedCapGainsRate}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeFedCapGainsRate(v); try { localStorage.setItem("nw-home-fed-cg", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">CA Cap Gains Rate (%)</Label>
                                <Input type="number" min="0" step="0.1" value={homeCaCapGainsRate}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setHomeCaCapGainsRate(v); try { localStorage.setItem("nw-home-ca-cg", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                              </div>
                            </div>
                          </div>
                          {/* Cash */}
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-cyan-500/20">
                            <p className="text-[10px] text-cyan-400/70 uppercase tracking-widest font-semibold mb-3">💵 Cash</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Cash Balance — BMO ···1711 ($)</Label>
                                <Input type="number" min="0" step="100" value={checkingBalance}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setCheckingBalance(v); try { localStorage.setItem("nw-checking", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Manual entry · last updated May 2026</p>
                              </div>
                            </div>
                          </div>
                          {/* veluna.com Domain */}
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-violet-500/20">
                            <p className="text-[10px] text-violet-400/70 uppercase tracking-widest font-semibold mb-3">🌐 Digital Assets</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">veluna.com — Estimated Sale Value ($)</Label>
                                <Input type="number" min="0" step="100" value={velunaDomainValue}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setVelunaDomainValue(v); try { localStorage.setItem("nw-veluna-domain", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Manual estimate · as of May 2026</p>
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">veluna.com — Original Purchase Price ($)</Label>
                                <Input type="number" min="0" step="100" value={velunaDomainPurchasePrice}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setVelunaDomainPurchasePrice(v); try { localStorage.setItem("nw-veluna-domain-purchase", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Used for cap gains calculation</p>
                              </div>
                            </div>
                          </div>
                          {/* E*Trade Apple RSU */}
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-green-500/20">
                            <p className="text-[10px] text-green-400/70 uppercase tracking-widest font-semibold mb-3">📈 Equity — E*Trade</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Apple RSU — Estimated Value ($)</Label>
                                <Input type="number" min="0" step="100" value={eTradeRsuValue}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setETradeRsuValue(v); try { localStorage.setItem("nw-etrade-rsu", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Manual estimate · as of May 2026</p>
                              </div>
                            </div>
                          </div>
                          {/* Ford Explorer XLT */}
                          <div className="col-span-1 md:col-span-2 pt-2 border-t border-orange-500/20">
                            <p className="text-[10px] text-orange-400/70 uppercase tracking-widest font-semibold mb-3">🚗 Vehicles</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Ford Explorer XLT — Estimated Market Value ($)</Label>
                                <Input type="number" min="0" step="100" value={fordExplorerValue}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setFordExplorerValue(v); try { localStorage.setItem("nw-ford-explorer", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Manual estimate · as of May 2026</p>
                              </div>
                              <div>
                                <Label className="text-slate-300 text-xs mb-1 block">Kawasaki Ninja 300 (2014) — Estimated Sell Value ($)</Label>
                                <Input type="number" min="0" step="100" value={kawasakiNinjaValue}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setKawasakiNinjaValue(v); try { localStorage.setItem("nw-kawasaki-ninja", String(v)); } catch {} }}
                                  className="bg-slate-900/50 border-slate-600 text-white h-9 text-sm" />
                                <p className="text-[10px] text-slate-500 mt-1">Manual estimate · as of May 2026</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Filter tabs */}
                          <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 w-fit">
                            <button
                              onClick={() => setHoldingsView("type")}
                              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${holdingsView === "type" ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "text-slate-400 hover:text-slate-200"}`}
                            >
                              By Asset Type
                            </button>
                            <button
                              onClick={() => setHoldingsView("account")}
                              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${holdingsView === "account" ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "text-slate-400 hover:text-slate-200"}`}
                            >
                              By Account
                            </button>
                          </div>

                          {holdingsView === "type" ? (
                            <div className="space-y-2">
                              {/* Bitcoin umbrella */}
                              <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
                                <p className="text-[10px] text-yellow-500/70 font-semibold uppercase tracking-widest mb-2">₿ Bitcoin</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-md bg-yellow-500/10 p-2 text-center">
                                    <p className="text-[10px] text-yellow-400 mb-0.5">BTC Wallet</p>
                                    <p className="text-sm font-bold text-yellow-300">{btcPrice > 0 ? `$${Math.round(btcValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{btcHoldings} BTC</p>
                                  </div>
                                  <div className="rounded-md bg-orange-500/10 p-2 text-center">
                                    <p className="text-[10px] text-orange-400 mb-0.5">Coinbase</p>
                                    <p className="text-sm font-bold text-orange-300">{btcPrice > 0 ? `$${Math.round(coinbaseValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{coinbaseBtcHoldings} BTC</p>
                                  </div>
                                  <div className="rounded-md bg-emerald-500/10 p-2 text-center">
                                    <p className="text-[10px] text-emerald-400 mb-0.5">IBIT (Roth IRA)</p>
                                    <p className="text-sm font-bold text-emerald-300">{ibitPrice > 0 ? `$${Math.round(rothIraValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{rothIraIbitHoldings} sh. IBIT</p>
                                  </div>
                                </div>
                              </div>
                              {/* Stocks & Funds umbrella */}
                              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-3">
                                <p className="text-[10px] text-indigo-400/70 font-semibold uppercase tracking-widest mb-2">📈 Stocks & Mutual Funds</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-md bg-indigo-500/10 p-2 text-center">
                                    <p className="text-[10px] text-indigo-400 mb-0.5">VTSAX</p>
                                    <p className="text-sm font-bold text-indigo-300">{vtsaxPrice > 0 ? `$${Math.round(vtsaxValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{vtsaxHoldings} sh.</p>
                                  </div>
                                  <div className="rounded-md bg-indigo-500/10 p-2 text-center">
                                    <p className="text-[10px] text-indigo-400 mb-0.5">VOO</p>
                                    <p className="text-sm font-bold text-indigo-300">{vooPrice > 0 ? `$${Math.round(vooValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{vooHoldings} sh.</p>
                                  </div>
                                </div>
                              </div>
                              {/* 401k umbrella */}
                              <div className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-3">
                                <p className="text-[10px] text-teal-400/70 font-semibold uppercase tracking-widest mb-2">🏦 401k</p>
                                <div className="rounded-md bg-teal-500/10 p-2 text-center">
                                  <p className="text-[10px] text-teal-400 mb-0.5">VG INST 500 IDX</p>
                                  <p className="text-sm font-bold text-teal-300">{viiixPrice > 0 ? `$${Math.round(k401Value).toLocaleString()}` : "—"}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{k401Shares} sh. VIIIX</p>
                                </div>
                              </div>
                              {/* Real Estate umbrella */}
                              <div className={`rounded-lg p-3 ${homeAfterTaxNetCash >= 0 ? "bg-pink-500/5 border border-pink-500/20" : "bg-red-500/5 border border-red-500/20"}`}>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${homeAfterTaxNetCash >= 0 ? "text-pink-400/70" : "text-red-400/70"}`}>🏠 Real Estate</p>
                                <div className="rounded-md p-2 text-center bg-slate-900/30">
                                  <p className={`text-[10px] mb-0.5 ${homeAfterTaxNetCash >= 0 ? "text-pink-400" : "text-red-400"}`}>Plumbago Ct</p>
                                  <p className={`text-sm font-bold ${homeAfterTaxNetCash >= 0 ? "text-pink-300" : "text-red-300"}`}>
                                    {homeAfterTaxNetCash >= 0 ? `$${Math.round(homeAfterTaxNetCash).toLocaleString()}` : `-$${Math.abs(Math.round(homeAfterTaxNetCash)).toLocaleString()}`}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">after-tax net cash</p>
                                </div>
                              </div>
                              {/* Cash umbrella */}
                              <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3">
                                <p className="text-[10px] text-cyan-400/70 font-semibold uppercase tracking-widest mb-2">💵 Cash</p>
                                <div className="rounded-md bg-cyan-500/10 p-2 text-center">
                                  <p className="text-[10px] text-cyan-400 mb-0.5">Checking</p>
                                  <p className="text-sm font-bold text-cyan-300">${checkingBalance.toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">manual · May 2026</p>
                                </div>
                              </div>
                              {/* Digital Assets umbrella */}
                              <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
                                <p className="text-[10px] text-violet-400/70 font-semibold uppercase tracking-widest mb-2">🌐 Digital Assets</p>
                                <div className="rounded-md bg-violet-500/10 p-2 text-center">
                                  <p className="text-[10px] text-violet-400 mb-0.5">veluna.com</p>
                                  <p className="text-sm font-bold text-violet-300">${velunaDomainValue.toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">manual · May 2026</p>
                                </div>
                              </div>
                              {/* E*Trade Equity umbrella */}
                              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
                                <p className="text-[10px] text-green-400/70 font-semibold uppercase tracking-widest mb-2">📈 Equity — E*Trade</p>
                                <div className="rounded-md bg-green-500/10 p-2 text-center">
                                  <p className="text-[10px] text-green-400 mb-0.5">Apple RSU</p>
                                  <p className="text-sm font-bold text-green-300">${eTradeRsuValue.toLocaleString()}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">manual · May 2026</p>
                                </div>
                              </div>
                              {/* Vehicle umbrella */}
                              <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3">
                                <p className="text-[10px] text-orange-400/70 font-semibold uppercase tracking-widest mb-2">🚗 Vehicles</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-md bg-orange-500/10 p-2 text-center">
                                    <p className="text-[10px] text-orange-400 mb-0.5">Ford Explorer XLT</p>
                                    <p className="text-sm font-bold text-orange-300">${fordExplorerValue.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">manual · May 2026</p>
                                  </div>
                                  <div className="rounded-md bg-red-500/10 p-2 text-center">
                                    <p className="text-[10px] text-red-400 mb-0.5">Kawasaki Ninja 300</p>
                                    <p className="text-sm font-bold text-red-300">${kawasakiNinjaValue.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">2014 · manual · May 2026</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* BTC Wallet */}
                              <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-yellow-400 font-semibold">BTC Wallet</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Self-custody · {btcHoldings} BTC</p>
                                </div>
                                <p className="text-sm font-bold text-yellow-300">{btcPrice > 0 ? `$${Math.round(btcValue).toLocaleString()}` : "—"}</p>
                              </div>
                              {/* Coinbase */}
                              <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-orange-400 font-semibold">Coinbase</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Exchange · {coinbaseBtcHoldings} BTC</p>
                                </div>
                                <p className="text-sm font-bold text-orange-300">{btcPrice > 0 ? `$${Math.round(coinbaseValue).toLocaleString()}` : "—"}</p>
                              </div>
                              {/* Vanguard Brokerage */}
                              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-xs text-indigo-400 font-semibold">Vanguard Brokerage</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Taxable brokerage · Stocks</p>
                                  </div>
                                  <p className="text-sm font-bold text-indigo-300">{vtsaxPrice > 0 || vooPrice > 0 ? `$${Math.round(vanguardTotal).toLocaleString()}` : "—"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-md bg-indigo-500/10 p-2 text-center">
                                    <p className="text-[10px] text-indigo-400 mb-0.5">VTSAX</p>
                                    <p className="text-sm font-bold text-indigo-300">{vtsaxPrice > 0 ? `$${Math.round(vtsaxValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{vtsaxHoldings} sh.</p>
                                  </div>
                                  <div className="rounded-md bg-indigo-500/10 p-2 text-center">
                                    <p className="text-[10px] text-indigo-400 mb-0.5">VOO</p>
                                    <p className="text-sm font-bold text-indigo-300">{vooPrice > 0 ? `$${Math.round(vooValue).toLocaleString()}` : "—"}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{vooHoldings} sh.</p>
                                  </div>
                                </div>
                              </div>
                              {/* Roth IRA */}
                              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-emerald-400 font-semibold">Roth IRA</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Retirement · {rothIraIbitHoldings} sh. IBIT</p>
                                </div>
                                <p className="text-sm font-bold text-emerald-300">{ibitPrice > 0 ? `$${Math.round(rothIraValue).toLocaleString()}` : "—"}</p>
                              </div>
                              {/* 401k */}
                              <div className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-teal-400 font-semibold">401k</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Employer plan · {k401Shares} sh. VIIIX</p>
                                </div>
                                <p className="text-sm font-bold text-teal-300">{viiixPrice > 0 ? `$${Math.round(k401Value).toLocaleString()}` : "—"}</p>
                              </div>
                              {/* Real Estate */}
                              <div className={`rounded-lg p-3 flex items-center justify-between ${homeAfterTaxNetCash >= 0 ? "bg-pink-500/5 border border-pink-500/20" : "bg-red-500/5 border border-red-500/20"}`}>
                                <div>
                                  <p className={`text-xs font-semibold ${homeAfterTaxNetCash >= 0 ? "text-pink-400" : "text-red-400"}`}>2605 Plumbago Ct</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Real estate · after-tax net cash</p>
                                </div>
                                <p className={`text-sm font-bold ${homeAfterTaxNetCash >= 0 ? "text-pink-300" : "text-red-300"}`}>
                                  {homeAfterTaxNetCash >= 0 ? `$${Math.round(homeAfterTaxNetCash).toLocaleString()}` : `-$${Math.abs(Math.round(homeAfterTaxNetCash)).toLocaleString()}`}
                                </p>
                              </div>
                              {/* Cash */}
                              <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-cyan-400 font-semibold">Cash</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">BMO Checking Account ···1711 · manual</p>
                                </div>
                                <p className="text-sm font-bold text-cyan-300">${checkingBalance.toLocaleString()}</p>
                              </div>
                              {/* veluna.com */}
                              <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-violet-400 font-semibold">veluna.com</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Domain name · manual estimate · May 2026</p>
                                </div>
                                <p className="text-sm font-bold text-violet-300">${velunaDomainValue.toLocaleString()}</p>
                              </div>
                              {/* E*Trade Apple RSU */}
                              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-green-400 font-semibold">E*Trade (Apple RSU)</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Apple RSU vested shares · manual · May 2026</p>
                                </div>
                                <p className="text-sm font-bold text-green-300">${eTradeRsuValue.toLocaleString()}</p>
                              </div>
                              {/* Ford Explorer XLT */}
                              <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-orange-400 font-semibold">Ford Explorer XLT</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Vehicle · estimated market value · May 2026</p>
                                </div>
                                <p className="text-sm font-bold text-orange-300">${fordExplorerValue.toLocaleString()}</p>
                              </div>
                              {/* Kawasaki Ninja 300 */}
                              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-red-400 font-semibold">Kawasaki Ninja 300 (2014)</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Motorcycle · estimated sell value · May 2026</p>
                                </div>
                                <p className="text-sm font-bold text-red-300">${kawasakiNinjaValue.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
                if (key === "portfolioPie") return (
                  <>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-purple-300 text-base">Portfolio Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pieData.length > 0 ? (
                        <>
                        <div style={{ width: "100%", minHeight: 220 }}>
                        <ResponsiveContainer width="99%" height={220}>
                          <RechartsPieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                              dataKey="value" labelLine={false} label={false}>
                              {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />)}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-slate-800 border border-purple-500/50 rounded-lg px-3 py-2 shadow-xl text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                      <span className="text-white font-semibold">{d.name}</span>
                                    </div>
                                    <p className="text-slate-200">{fmt(d.value)}</p>
                                    <p className="text-purple-300 font-bold">{d.pct.toFixed(1)}% of portfolio</p>
                                  </div>
                                );
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1">
                          {pieData.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                              <span className="text-xs text-slate-300">{d.name}</span>
                              <span className="text-xs font-semibold" style={{ color: d.color }}>{d.pct.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-[240px] text-slate-500 text-sm">
                          {isLoading ? "Loading prices…" : "Price data unavailable"}
                        </div>
                      )}
                    </CardContent>
                  </>
                );
                if (key === "nwSummary") return (
                  <>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-300 text-base">Net Worth Summary</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Live investment value</CardDescription>
                    </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-yellow-300">₿ Bitcoin (all wallets)</span>
                            <span className="text-white font-semibold">{fmt(totalBtcValue * 0.85)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 pl-3">
                            <span>Gross value</span>
                            <span>{fmt(totalBtcValue)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-red-500/80 pl-3">
                            <span>Est. 15% LTCG tax</span>
                            <span>−{fmt(totalBtcValue * 0.15)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 pl-3">
                            <span>Personal Wallet · {btcHoldings} BTC</span>
                            <span>{fmt(btcValue)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                            <span>Coinbase · {coinbaseBtcHoldings} BTC</span>
                            <span>{fmt(coinbaseValue)}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-indigo-300">🏦 Vanguard Brokerage</span>
                            <span className="text-white font-semibold">{fmt(vanguardTotal * 0.85)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 pl-3">
                            <span>Gross value</span>
                            <span>{fmt(vanguardTotal)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-red-500/80 pl-3">
                            <span>Est. 15% LTCG tax</span>
                            <span>−{fmt(vanguardTotal * 0.15)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 pl-3">
                            <span>VTSAX {vtsaxHoldings} × {fmt(vtsaxPrice)}</span>
                            <span>{fmt(vtsaxValue)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                            <span>VOO {vooHoldings} × {fmt(vooPrice)}</span>
                            <span>{fmt(vooValue)}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-300">🌿 Roth IRA</span>
                            <span className="text-white font-semibold">{fmt(rothIraValue)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>IBIT {rothIraIbitHoldings} × {fmt(ibitPrice)}</span>
                            <span>{fmt(rothIraValue)}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-teal-300">🏦 401k</span>
                            <span className="text-white font-semibold">{fmt(k401Value)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>VIIIX {k401Shares} × {fmt(viiixPrice)}</span>
                            <span>{fmt(k401Value)}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-pink-300">🏠 2605 Plumbago Court</span>
                            <span className={`font-semibold ${homeAfterTaxNetCash >= 0 ? "text-white" : "text-red-300"}`}>
                              {homeAfterTaxNetCash >= 0 ? `$${Math.round(homeAfterTaxNetCash).toLocaleString("en-US")}` : `-$${Math.abs(Math.round(homeAfterTaxNetCash)).toLocaleString("en-US")}`}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>After-tax net cash · {homeSellerFee}% commission + 0.22% transfer tax · {homeFedCapGainsRate + homeCaCapGainsRate}% cap gains</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-cyan-300">💵 Cash</span>
                            <span className="text-white font-semibold">${(checkingBalance + careerglowBalance + hsaBalance).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>BMO Checking ···1711</span>
                            <span>${checkingBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 pl-3">
                            <span>CareerGlow LLC (Mercury)</span>
                            <span>${careerglowBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 pl-3">
                            <span>HSA (Optum Financial)</span>
                            <span>${hsaBalance.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-violet-300">🌐 veluna.com</span>
                            <span className="text-white font-semibold">
                              ${Math.round(velunaDomainValue - Math.max(0, velunaDomainValue - velunaDomainPurchasePrice) * 0.15).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 pl-3">
                            <span>Est. sale value</span>
                            <span>${velunaDomainValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                            <span>Purchase price</span>
                            <span>${velunaDomainPurchasePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-red-500/80 pl-3">
                            <span>Est. 15% LTCG tax on gain</span>
                            <span>−${Math.round(Math.max(0, velunaDomainValue - velunaDomainPurchasePrice) * 0.15).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-300">📈 E*Trade (Apple RSU)</span>
                            <span className="text-white font-semibold">${eTradeRsuValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>Apple RSU vested shares · manual estimate · May 2026</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-orange-300">🚗 Ford Explorer XLT</span>
                            <span className="text-white font-semibold">${fordExplorerValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>Vehicle · estimated market value · May 2026</span>
                          </div>
                        </div>
                        <div className="py-2 border-b border-slate-700/40">
                          <div className="flex justify-between text-sm">
                            <span className="text-red-300">🏍️ Kawasaki Ninja 300 (2014)</span>
                            <span className="text-white font-semibold">${kawasakiNinjaValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1 pl-3">
                            <span>Motorcycle · estimated sell value · May 2026</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                          <span className="text-green-300">💵 Est. Annual Savings</span>
                          <span className="text-green-300 font-semibold">
                            ${annualSavings > 0 ? annualSavings.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between text-base pt-2">
                          <span className="text-white font-bold">Total Investments</span>
                          <span className="text-green-300 font-bold text-lg">{fmt(investmentTotal)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1">* Prices live from CoinGecko & Yahoo Finance. Holdings saved in browser.</p>
                      </CardContent>
                  </>
                );
                return null;
              };

              return (
                <>
                  {/* Header — always visible */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-orange-300 flex items-center gap-2">
                        <Scale className="h-5 w-5" /> Investment Net Worth
                      </h2>
                      {pricesUsingCache ? (
                        <p className="text-xs text-amber-400/80 flex items-center gap-1">
                          <span>⚠️</span> Live prices unavailable · showing last fetched prices
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Live prices via CoinGecko & Yahoo Finance · auto-refreshes every 60s</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm"
                      onClick={() => { refetchBtc(); refetchVtsax(); refetchVoo(); refetchIbit(); }}
                      className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh Prices
                    </Button>
                  </div>

                  {/* Widget toggle bar */}
                  <div className="flex flex-wrap gap-2 pb-1">
                    {(["assets", "holdings", "portfolioPie", "nwSummary"] as NWWidgetKey[]).map(k => (
                      <button key={k} onClick={() => toggleNwWidget(k)}
                        className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-all border ${
                          nwWidgetVisible[k]
                            ? "border-orange-500/50 text-slate-200 bg-slate-700/60"
                            : "border-slate-700/40 text-slate-500 bg-transparent line-through"
                        }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${nwWidgetMeta[k].dot} ${nwWidgetVisible[k] ? "opacity-100" : "opacity-30"}`} />
                        {nwWidgetMeta[k].label}
                      </button>
                    ))}
                  </div>

                  {/* Widgets rendered in draggable order */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nwWidgetOrder.filter(key => nwWidgetVisible[key]).map((key, idx) => {
                      const isDraggingOver = nwDragOverIdx === idx && nwDragSrcIdx.current !== idx;
                      const content = nwRenderWidget(key);
                      if (!content) return null;
                      // "assets" and "holdings" span full width
                      const fullWidth = key === "assets" || key === "holdings";
                      return (
                        <div key={key}
                          className={fullWidth ? "md:col-span-2" : ""}
                          draggable
                          onDragStart={e => handleNwDragStart(e, idx)}
                          onDragOver={e => handleNwDragOver(e, idx)}
                          onDrop={e => handleNwDrop(e, idx)}
                          onDragEnd={handleNwDragEnd}
                        >
                          <div className={`rounded-xl border bg-slate-800/60 transition-all duration-150 ${nwWidgetMeta[key].border} ${isDraggingOver ? "ring-2 ring-orange-500/60 scale-[1.01]" : ""}`}>
                            {/* Drag handle */}
                            <div className="flex items-center justify-end px-3 pt-2 pb-0 cursor-grab active:cursor-grabbing select-none">
                              <div className="flex items-center gap-1 text-slate-600 hover:text-slate-400 transition-colors">
                                <GripVertical className="h-4 w-4" />
                                <GripVertical className="h-4 w-4 -ml-2.5" />
                              </div>
                            </div>
                            {content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </TabsContent>

          {/* ── Credit Cards ─────────────────────────────── */}
          <TabsContent value="credit-cards" className="space-y-4">
            <Card className="bg-slate-800/60 border-red-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-300 text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Credit Cards
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Cards on file — verify status before use. ⚠️ = needs verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      name: "Citi Double Cash Card",
                      issuer: "Citi",
                      type: "2% Cash Back",
                      status: "active",
                      color: "border-sky-500/30 bg-sky-500/5",
                      badge: "text-sky-400 border-sky-500/30",
                      icon: "💳",
                    },
                    {
                      name: "Chase Sapphire Preferred®",
                      issuer: "Chase",
                      type: "Travel Rewards · Points",
                      status: "active",
                      color: "border-purple-500/30 bg-purple-500/5",
                      badge: "text-purple-400 border-purple-500/30",
                      icon: "�",
                    },
                    {
                      name: "United Gateway℠ Card (MileagePlus)",
                      issuer: "Chase",
                      type: "Travel Miles · United",
                      status: "active",
                      color: "border-indigo-500/30 bg-indigo-500/5",
                      badge: "text-indigo-400 border-indigo-500/30",
                      icon: "✈️",
                    },
                    {
                      name: "BMO Cash Back World Elite Mastercard",
                      issuer: "BMO",
                      type: "Cash Back",
                      status: "active",
                      color: "border-blue-500/30 bg-blue-500/5",
                      badge: "text-blue-400 border-blue-500/30",
                      icon: "🏦",
                    },
                    {
                      name: "Chase Freedom Flex℠",
                      issuer: "Chase",
                      type: "5% Rotating + Cash Back",
                      status: "active",
                      color: "border-green-500/30 bg-green-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "�",
                    },
                    {
                      name: "Citi Custom Cash℠ Card",
                      issuer: "Citi",
                      type: "5% Top Spend Category",
                      status: "active",
                      color: "border-cyan-500/30 bg-cyan-500/5",
                      badge: "text-cyan-400 border-cyan-500/30",
                      icon: "�",
                    },
                    {
                      name: "Wells Fargo Active Cash Visa Card",
                      issuer: "Wells Fargo",
                      type: "2% Cash Back",
                      status: "active",
                      color: "border-red-500/30 bg-red-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "🏛️",
                    },
                    {
                      name: "Barclays View Mastercard ...3373",
                      issuer: "Barclays",
                      type: "Cash Back",
                      status: "active",
                      color: "border-yellow-500/30 bg-yellow-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "🏴",
                    },
                    {
                      name: "Discover it® Cash Back",
                      issuer: "Discover",
                      type: "5% Rotating Categories",
                      status: "active",
                      color: "border-amber-500/30 bg-amber-500/5",
                      badge: "text-amber-400 border-amber-500/30",
                      icon: "�",
                    },
                    {
                      name: "Bank of America Card",
                      issuer: "Bank of America",
                      type: "Product unspecified",
                      status: "verify",
                      statusNote: "⚠️ Verify which Bank of America card and confirm current status.",
                      color: "border-rose-500/30 bg-rose-500/5",
                      badge: "text-rose-400 border-rose-500/30",
                      icon: "�",
                    },
                    {
                      name: "Optum HSA Debit Card **3290",
                      issuer: "Optum Bank",
                      type: "HSA Debit",
                      status: "active",
                      color: "border-teal-500/30 bg-teal-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "🏥",
                    },
                  ].map(card => (
                    <div key={card.name} className={`rounded-lg border p-3 ${card.color}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-base leading-none">{card.icon}</span>
                            <p className="text-sm font-semibold text-white leading-tight">{card.name}</p>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{card.issuer} · {card.type}</p>
                          {card.statusNote && (
                            <p className="text-[10px] text-yellow-400/80 mt-1.5 leading-snug">{card.statusNote}</p>
                          )}
                        </div>
                        <span className={`text-[9px] border rounded px-1.5 py-0.5 shrink-0 font-medium ${card.badge} ${card.status === "discontinued" || card.status === "verify" ? "opacity-70" : ""}`}>
                          {card.status === "active" ? "active" : card.status === "discontinued" ? "discontinued?" : "verify"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-4">Last reviewed May 2026. ⚠️ cards require manual verification before use.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Accounts ─────────────────────────────── */}
          <TabsContent value="accounts" className="space-y-4">
            {(() => {
              type AccountEntry = {
                name: string;
                institution: string;
                detail: string;
                category: string;
                status: "active" | "verify" | "empty";
                color: string;
                badge: string;
                icon: string;
                note?: string;
              };
              const accountGroups: { label: string; icon: string; color: string; accounts: AccountEntry[] }[] = [
                {
                  label: "Crypto",
                  icon: "₿",
                  color: "border-yellow-500/20",
                  accounts: [
                    {
                      name: "Ledger Hardware Wallet",
                      institution: "Ledger",
                      detail: "Self-custody cold storage · BTC",
                      category: "crypto",
                      status: "active",
                      color: "border-yellow-500/30 bg-yellow-500/5",
                      badge: "text-yellow-400 border-yellow-500/30",
                      icon: "🔐",
                    },
                    {
                      name: "Coinbase",
                      institution: "Coinbase",
                      detail: "Exchange · BTC",
                      category: "crypto",
                      status: "active",
                      color: "border-orange-500/30 bg-orange-500/5",
                      badge: "text-orange-400 border-orange-500/30",
                      icon: "🪙",
                    },
                  ],
                },
                {
                  label: "Investments & Retirement",
                  icon: "📈",
                  color: "border-indigo-500/20",
                  accounts: [
                    {
                      name: "Vanguard Brokerage",
                      institution: "Vanguard",
                      detail: "Taxable brokerage · VTSAX, VOO",
                      category: "brokerage",
                      status: "active",
                      color: "border-indigo-500/30 bg-indigo-500/5",
                      badge: "text-indigo-400 border-indigo-500/30",
                      icon: "📊",
                    },
                    {
                      name: "Vanguard Roth IRA",
                      institution: "Vanguard",
                      detail: "Roth IRA · IBIT (iShares Bitcoin ETF)",
                      category: "retirement",
                      status: "active",
                      color: "border-emerald-500/30 bg-emerald-500/5",
                      badge: "text-emerald-400 border-emerald-500/30",
                      icon: "🌿",
                    },
                    {
                      name: "E*Trade (Apple RSUs)",
                      institution: "E*Trade / Morgan Stanley",
                      detail: "Equity compensation · Apple Inc. RSU vested shares",
                      category: "equity",
                      status: "active",
                      color: "border-green-500/30 bg-green-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "📈",
                    },
                    {
                      name: "Fidelity 401k (Apple)",
                      institution: "Fidelity",
                      detail: "Employer 401k · VG INST 500 IDX (VIIIX) · via Apple",
                      category: "retirement",
                      status: "active",
                      color: "border-teal-500/30 bg-teal-500/5",
                      badge: "text-teal-400 border-teal-500/30",
                      icon: "🏦",
                    },
                  ],
                },
                {
                  label: "Banking",
                  icon: "🏛️",
                  color: "border-cyan-500/20",
                  accounts: [
                    {
                      name: "BMO Checking Account",
                      institution: "BMO",
                      detail: "Primary checking · ···1711",
                      category: "checking",
                      status: "active",
                      color: "border-cyan-500/30 bg-cyan-500/5",
                      badge: "text-cyan-400 border-cyan-500/30",
                      icon: "💵",
                    },
                    {
                      name: "Mercury (CareerGlow LLC)",
                      institution: "Mercury",
                      detail: "Business checking · CareerGlow LLC · $13,348 reserves",
                      category: "checking",
                      status: "active",
                      color: "border-blue-500/30 bg-blue-500/5",
                      badge: "text-blue-400 border-blue-500/30",
                      icon: "🏢",
                    },
                    {
                      name: "Charles Schwab Checking",
                      institution: "Charles Schwab",
                      detail: "Checking account · $0 balance · no foreign transaction fees",
                      category: "checking",
                      status: "empty",
                      color: "border-slate-500/30 bg-slate-500/5",
                      badge: "text-slate-400 border-slate-500/30",
                      icon: "🏦",
                      note: "Kept open — useful for ATM fee reimbursements while traveling.",
                    },
                  ],
                },
                {
                  label: "Credit Card Accounts",
                  icon: "💳",
                  color: "border-red-500/20",
                  accounts: [
                    {
                      name: "Chase",
                      institution: "Chase",
                      detail: "Sapphire Preferred · Freedom Flex · United Gateway",
                      category: "credit",
                      status: "active",
                      color: "border-purple-500/30 bg-purple-500/5",
                      badge: "text-purple-400 border-purple-500/30",
                      icon: "💎",
                    },
                    {
                      name: "Citi",
                      institution: "Citi",
                      detail: "Custom Cash · Double Cash",
                      category: "credit",
                      status: "active",
                      color: "border-sky-500/30 bg-sky-500/5",
                      badge: "text-sky-400 border-sky-500/30",
                      icon: "🔵",
                    },
                    {
                      name: "Discover",
                      institution: "Discover",
                      detail: "Discover it® Cash Back",
                      category: "credit",
                      status: "active",
                      color: "border-amber-500/30 bg-amber-500/5",
                      badge: "text-amber-400 border-amber-500/30",
                      icon: "🔍",
                    },
                    {
                      name: "Wells Fargo Active Cash Visa Card",
                      institution: "Wells Fargo",
                      detail: "Active Cash · 2% Cash Back",
                      category: "credit",
                      status: "active",
                      color: "border-red-500/30 bg-red-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "🏛️",
                    },
                    {
                      name: "Barclays View Mastercard ...3373",
                      institution: "Barclays",
                      detail: "Barclays View Mastercard",
                      category: "credit",
                      status: "active",
                      color: "border-yellow-500/30 bg-yellow-500/5",
                      badge: "text-green-400 border-green-500/30",
                      icon: "🏴",
                    },
                    {
                      name: "Bank of America",
                      institution: "Bank of America",
                      detail: "Credit card account — product TBD",
                      category: "credit",
                      status: "verify",
                      color: "border-rose-500/30 bg-rose-500/5",
                      badge: "text-rose-400 border-rose-500/30",
                      icon: "🔴",
                      note: "⚠️ Verify which Bank of America card and confirm current status.",
                    },
                  ],
                },
                {
                  label: "Digital Assets",
                  icon: "🌐",
                  color: "border-violet-500/20",
                  accounts: [
                    {
                      name: "GoDaddy — veluna.com",
                      institution: "GoDaddy",
                      detail: "Domain registrar · veluna.com · est. value $2,500",
                      category: "domain",
                      status: "active",
                      color: "border-violet-500/30 bg-violet-500/5",
                      badge: "text-violet-400 border-violet-500/30",
                      icon: "🌐",
                    },
                  ],
                },
              ];

              const totalAccounts = accountGroups.reduce((s, g) => s + g.accounts.length, 0);
              const verifyCount = accountGroups.flatMap(g => g.accounts).filter(a => a.status === "verify").length;

              return (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-slate-800/60 border-slate-700/40">
                      <CardContent className="pt-3 pb-3 px-4 text-center">
                        <p className="text-2xl font-bold text-white">{totalAccounts}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Total Accounts</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/60 border-green-500/20">
                      <CardContent className="pt-3 pb-3 px-4 text-center">
                        <p className="text-2xl font-bold text-green-300">{totalAccounts - verifyCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Confirmed Active</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-800/60 border-yellow-500/20">
                      <CardContent className="pt-3 pb-3 px-4 text-center">
                        <p className="text-2xl font-bold text-yellow-300">{verifyCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Needs Verification</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Account groups */}
                  {accountGroups.map(group => (
                    <Card key={group.label} className={`bg-slate-800/60 ${group.color}`}>
                      <CardHeader className="pb-3 pt-4">
                        <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
                          <span className="text-base leading-none">{group.icon}</span>
                          {group.label}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">{group.accounts.length} account{group.accounts.length !== 1 ? "s" : ""}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {group.accounts.map(acct => (
                            <div key={acct.name} className={`rounded-lg border p-3 ${acct.color}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm leading-none">{acct.icon}</span>
                                    <p className="text-sm font-semibold text-white leading-tight">{acct.name}</p>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{acct.detail}</p>
                                  {acct.note && (
                                    <p className="text-[10px] text-yellow-400/80 mt-1.5 leading-snug">{acct.note}</p>
                                  )}
                                </div>
                                <span className={`text-[9px] border rounded px-1.5 py-0.5 shrink-0 font-medium ${acct.badge} ${acct.status !== "active" ? "opacity-70" : ""}`}>
                                  {acct.status === "active" ? "active" : acct.status === "empty" ? "open · $0" : "verify"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-[11px] text-slate-500 pb-2">Last reviewed May 2026.</p>
                </>
              );
            })()}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
