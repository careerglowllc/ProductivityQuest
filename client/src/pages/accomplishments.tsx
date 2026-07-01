import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { TrendingUp, ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";

type AccomplishmentCategory = "practical" | "mindset" | "life" | "adventure" | "career" | "health" | "relationships" | "financial";

const CATEGORIES: Record<AccomplishmentCategory, { label: string; color: string; bg: string; border: string }> = {
  practical:     { label: "Practical Skills",   color: "#34D399", bg: "bg-emerald-500/15",  border: "border-emerald-500/40" },
  mindset:       { label: "Mindset & Spirit",   color: "#A78BFA", bg: "bg-violet-500/15",   border: "border-violet-500/40" },
  life:          { label: "Life Milestones",    color: "#FCD34D", bg: "bg-yellow-500/15",   border: "border-yellow-500/40" },
  adventure:     { label: "Adventure & Travel", color: "#38BDF8", bg: "bg-sky-500/15",      border: "border-sky-500/40" },
  career:        { label: "Career & Business",  color: "#FB923C", bg: "bg-orange-500/15",   border: "border-orange-500/40" },
  health:        { label: "Health & Body",      color: "#F472B6", bg: "bg-pink-500/15",     border: "border-pink-500/40" },
  relationships: { label: "Relationships",      color: "#F87171", bg: "bg-red-500/15",      border: "border-red-500/40" },
  financial:     { label: "Financial",          color: "#4ADE80", bg: "bg-green-500/15",    border: "border-green-500/40" },
};

type Accomplishment = { year: number; yearEnd?: number; title: string; detail: string; category: AccomplishmentCategory; emoji: string };

const ACCOMPLISHMENTS: Accomplishment[] = [
  { year: 2015, title: "First Time Surfing", detail: "Got in the water and tried surfing for the first time. Paddled out, caught some waves, wiped out plenty. A taste of ocean culture and a physical challenge that was equal parts humbling and fun.", category: "health", emoji: "🏄" },
  { year: 2016, title: "Switched to Engineering", detail: "Made the pivotal career-path decision to pursue engineering — a leap of faith that set the whole journey in motion.", category: "career", emoji: "⚙️" },
  { year: 2016, title: "Self-Help Deep Dive (2016–2018)", detail: "Devoured the canon — Man's Search for Meaning, 7 Habits, and dozens more. Planted seeds of intentional living.", category: "mindset", emoji: "📚" },
            { year: 2019, title: "Military Decision — Scoped It, Chose My Path", detail: "Early in my career, seriously considered joining the military. Did a deep dive into the pros and cons — the structure, the culture, the tradeoffs. Ultimately made the right call to skip it and pursue my own path. But the research and self-reflection were valuable: I understood the military world, what it demands, what it offers, and why it wasn't right for me. A formative decision that clarified my values and direction.", category: "career", emoji: "🎖️" },
  { year: 2019, title: "Proactively Joined XRL Soft Robotics Lab — Career Foundation Move", detail: "Recognized early that a strong résumé required more than just grades — it required real research experience. Cold-reached out directly to the lab director, pitched myself, and got into the XRL Soft Robotics Lab entirely through my own initiative. Nobody told me to do this. No hand-holding. Just the proactive realization that positioning myself ahead of the curve was the move — and acting on it. That research experience became a cornerstone of the résumé that eventually landed Apple. A foundational example of the career instinct that would define everything that followed. (Confirm year.)", category: "career", emoji: "🤖" },
  { year: 2019, title: "The Hard Truth About Looks — Painful Clarity That Changed Everything", detail: "Stumbled into the uncomfortable, socially taboo truth about how much physical appearance actually matters — in dating, social dynamics, and how the world treats you. It hurt at the time. The truth usually does. But instead of staying ignorant or bitter, I let it shift my entire operating model. Stopped wasting energy on things that barely move the needle — fashion, accessories, surface-level style — and started thinking clearly about what actually makes a difference: facial structure, body composition, skin, hair. That clarity is what eventually led to PRK, genioplasty, turbinectomy, and a deliberate long-term investment in looking my best. Most people never get this clarity. They spend decades confused about why effort isn't converting. I got it early, processed it, and used it to plan ahead. One of the most practically valuable realizations of my life. (Confirm year.)", category: "mindset", emoji: "🪞" },
  { year: 2019, title: "Finance & FIRE Awakening (2019–2021)", detail: "Discovered Naval Ravikant, FIRE movement, and the real rules of money and wealth. Changed the way I see time and work forever.", category: "financial", emoji: "📈" },
  { year: 2020, title: "Discovered the Red Pill — Dating Clarity Unlocked", detail: "Stumbled into red pill philosophy and it reframed everything about dating, attraction, and relationship dynamics that had never made sense. Cut through years of confusing mixed signals and social conditioning with a cleaner, more honest model of how things actually work. Not about bitterness — about clarity. Put me in a permanently strong position to thrive in relationships, choose wisely, and avoid the kind of catastrophic marriage-related financial and life wipeout that quietly destroys so many men.", category: "mindset", emoji: "💊" },
  { year: 2020, title: "Apple Internship — The Ultimate Positioning Move", detail: "Landed the penultimate internship at Apple after relentless grinding — studying, applying, grinding LeetCode, nailing interviews. Lived at home for free and stacked money while building the résumé that would change my financial trajectory forever. Not just a job — a positional foundation that most people never get. Set the stage for everything that followed.", category: "career", emoji: "🍎" },
  { year: 2020, title: "Boston, College & Engineering Glory", detail: "4.0, Magna Cum Laude, dream job offer — after countless all-nighters, last-second cramming, and relentless grind. Won in the academic arena.", category: "career", emoji: "🎓" },
  { year: 2020, title: "Rock Climbing & Challenging Comfort Zone", detail: "Hit real rock walls with Karl, Ben and crew. Learned to trust the rope, face height, and push physical limits IRL.", category: "health", emoji: "🧗" },
  { year: 2021, title: "Apple Full-Time Offer — Foundation Locked In", detail: "Got the full-time offer from Apple. That summer after finals — one of the best feelings of my life. Knowing that at that age I had one of the strongest foundations almost anyone could have: high-paying Big Tech job, living expenses minimal, compound interest starting early, limitless wealth potential ahead. That feeling of having the whole world open in front of me. A moment I still draw energy from.", category: "career", emoji: "💼" },
  { year: 2021, title: "First Gun & Shooting Range — Fundamental Skill", detail: "Bought my first gun and went to the range. Learned firearm safety, handling, and marksmanship. A fundamental skill that connects to self-reliance, personal protection, and a part of American culture worth understanding firsthand. (Double-check year.)", category: "practical", emoji: "🎯" },
  { year: 2021, title: "Wim Hof Method", detail: "Adopted breathwork and cold exposure. Discovered what the body is capable of when the mind stops complaining.", category: "health", emoji: "🧊" },
  { year: 2021, title: "First Motorcycle — Kawasaki Ninja 300", detail: "Got my license, bought the bike, and learned to ride. Freedom, risk, and the open road became personal.", category: "practical", emoji: "🏍️" },
  { year: 2022, title: "Started BJJ", detail: "Stepped onto the mats and began training Brazilian Jiu-Jitsu. Learned the fundamentals of grappling, submission defense, and positional control. A humbling and addictive art that rewards patience and persistence. (Double-check year.)", category: "health", emoji: "🥋" },
  { year: 2022, title: "PRK Eye Surgery — Clarity Earned", detail: "Chose PRK over LASIK, dealt with the significant upfront pain, blurry weeks of recovery, and the anxiety of not knowing if it would fully work. Paid the cost to ditch contacts forever, improve vision, and eliminate under-eye wear from years of contact use. A calculated investment in long-term quality of life that required real courage to go through.", category: "health", emoji: "👁️" },
  { year: 2022, title: "Las Vegas — Supercars, Casinos & Heavy Weapons", detail: "A legendary trip. Drove a supercar for the first time — raw power and speed on a real track. Sat down at poker in a real famous Vegas casino and played the game for real. Then went fully off the rails at a shooting range: fired a sniper rifle, an assault rifle, and a minigun off a helicopter. The kind of day that sounds made up. (Double-check year.)", category: "adventure", emoji: "🎰" },
  { year: 2022, title: "Thailand — Reflection, Path & Transformation", detail: "A solo journey that cracked something open. Began the long arc from who I was to who I was becoming — still unfolding.", category: "adventure", emoji: "🌏" },
  { year: 2022, title: "$1 Roadside Haircut in Vietnam", detail: "Sat down in a plastic chair on the side of a Vietnam street and got a full haircut for $1. Barber didn't speak a word of English, communicated entirely through hand gestures and a battered reference book of styles. The whole thing worked out perfectly. One of those small, spontaneous travel moments that's completely unremarkable to locals and completely unforgettable to you — a reminder that quality of life is wildly relative and that the best experiences often cost almost nothing.", category: "adventure", emoji: "💈" },
  { year: 2022, title: "Rode an Elephant in Thailand", detail: "In Thailand, got up close and personal with elephants — and actually rode one. An ancient, surreal experience that felt completely removed from the modern world. Massive, gentle, impossibly strong creatures. A bucket-list moment that connects you to nature and to cultures that have lived alongside these animals for thousands of years. The kind of experience you can't replicate anywhere else.", category: "adventure", emoji: "🐘" },
  { year: 2022, title: "War Room Boxing Sparring — Bravery & Brotherhood", detail: "Showed up to a War Room network event and stepped into the boxing ring to spar with brand-new strangers — with zero formal training. Real boxing, real contact, real vulnerability. The courage it took wasn't just physical — it was social. Choosing to be bad at something in front of people you just met, putting your body on the line, not hiding in comfort. The kind of move that builds real confidence: not because you won, but because you showed up and swung.", category: "health", emoji: "🥊" },
  { year: 2022, title: "Ireland & Europe Travels (First Time)", detail: "Explored castles, coastlines, and cultures far outside the American bubble. History became tangible.", category: "adventure", emoji: "🍀" },
  { year: 2022, title: "White Water Rafting — Kennebec River, Maine", detail: "Tackled the Kennebec River in Maine — one of the best whitewater runs in the Northeast. Class IV rapids, cold water, and the kind of controlled chaos that forces you to stay present and trust your crew. A bucket-list adventure experience. (Tentative date — verify year.)", category: "adventure", emoji: "🚣" },
  { year: 2023, title: "Started Wrestling", detail: "Added wrestling to the training mix — takedowns, clinch work, and the brutal conditioning that comes with it. A sport that demands full physical and mental commitment. (Double-check year.)", category: "health", emoji: "🤼" },
  { year: 2023, title: "Real Self-Defense Education — IcyMike, Armchair Violence & the MA Rabbit Hole", detail: "Went deep on YouTube channels like IcyMike, Armchair Violence, and the broader evidence-based self-defense community. Developed a genuinely informed framework for what real violence looks like, which martial arts actually prepare you for it, and which are larping. Learned to distinguish between sport martial arts (BJJ, wrestling — useful but incomplete), traditional arts with zero aliveness training (Aikido, Wing Chun — largely useless against a resisting opponent), and the reality-based principles that actually matter: early threat detection, de-escalation, takedown defense, control in the clinch, and the legal/psychological aftermath of violence. Not just 'what's the best martial art' but a full systems understanding of self-defense as a skill set. Rare clarity most people never get. (Tentative date.)", category: "practical", emoji: "🥊" },
  { year: 2023, title: "Colombia — $30/Day Living & Real Life Adventures", detail: "Learned to live richly on very little. Survived the cop pull-over, hit-and-run chaos, and found beauty in the balance of danger and magic.", category: "adventure", emoji: "🌿" },
  { year: 2023, title: "First Time in China — Disorienting, Eye-Opening, Unforgettable", detail: "Traveled to China for the first time and was immediately hit with the full force of how different a world it is. Nobody spoke English — navigated entirely alone through a system built for a billion people who didn't need to accommodate you. Tried weird foods, some of which were genuinely great and some deeply questionable. Saw the Chinese countryside — vast, quiet, agricultural, nothing like what Western media shows. Walked through major Chinese factories and got a firsthand look at where so much of the physical world actually gets made. An immersive reality check on just how big, complex, and self-contained Chinese civilization is. Left with more questions than answers — and a permanently expanded worldview. (Confirm year.)", category: "adventure", emoji: "🇨🇳" },
  { year: 2023, title: "Mexico Immersion", detail: "Culture, food, people and perspective. Another layer stripped off of Bay Area insularity.", category: "adventure", emoji: "🌮" },
  { year: 2023, title: "Japan Discovery", detail: "Experienced world-class quality of life, discipline, and food culture. Set a new benchmark for what civilization can look like.", category: "adventure", emoji: "🗾" },
  { year: 2023, title: "Learning to Sing with Joanna", detail: "Opened a creative and emotional channel I'd kept closed. Cut bad ties and found a freer, more expressive version of myself.", category: "relationships", emoji: "🎶" },
  { year: 2023, title: "First Real Relationship — Joanna", detail: "Learned how to love, be loved, communicate, and navigate real intimacy. Growth that can't come from any book.", category: "relationships", emoji: "❤️" },
  { year: 2024, yearEnd: 2026, title: "Boxing Training (2024–2026)", detail: "Committed to boxing over multiple years — footwork, combinations, head movement, sparring. The sport that most directly builds aggression, precision, and mental toughness simultaneously. An ongoing physical investment. (Double-check year range.)", category: "health", emoji: "🥊" },
  { year: 2024, title: "Bought First Car — Dealerships, Loans & Adult Unlocks", detail: "Navigated the full car-buying experience for the first time — dealership negotiations, contracts, financing, taking out an auto loan, and learning the basics of car ownership. Figured out how loans actually work in practice, what to watch out for at dealerships, and what it means to own and maintain a vehicle. A major real-world adulting unlock. (Double-check year.)", category: "practical", emoji: "🚗" },
  { year: 2024, title: "GT Master's — Proactive CS Pivot & Timely Exit", detail: "Got into Georgia Tech's OMSCS through sheer proactivity. Recognized early that AI was making the degree obsolete and pivoted out before sinking years in. Dodged a major bullet and redirected toward business.", category: "career", emoji: "🧠" },
  { year: 2024, title: "Redding Family & Fourth of July Traditions", detail: "Discovered the magic of small-town American summers, firework sessions, and the Redding family. Moments that redefine 'home'.", category: "life", emoji: "🎆" },
  { year: 2024, title: "First Firework Session", detail: "Lit off fireworks for the first time. Simple, childlike joy — underrated milestone.", category: "life", emoji: "✨" },
  { year: 2024, title: "Puerto Rico — Island Living", detail: "Sun, culture, food and a different rhythm of life. Added another data point to the map of what 'good living' can mean.", category: "adventure", emoji: "🌊" },
  { year: 2024, title: "Whitewater Rafting with Eamon, Deirdre & Artis — Coming Alive Socially", detail: "Went on a whitewater rafting trip with Eamon, Deirdre, and Artis — and something clicked. Felt genuinely engaged and alive in a way that had been rare. A moment of real connection, shared adrenaline, and group energy that started to crack through the walls of social isolation I'd built up. Laughing, reacting, being fully present with people instead of half-checked-out and guarded. A small but meaningful step out of the bubble and back toward a fuller social self. (Confirm year — likely 2024.)", category: "relationships", emoji: "🚣" },
  { year: 2024, title: "Varun's Engagement & Yuliya — Untethered Soul Glimpses", detail: "A moment of witnessing love, celebration, and the potential of presence. Sparked deeper reading and reflection on the untethered path.", category: "mindset", emoji: "🌸" },
  { year: 2024, title: "Religious & Philosophical Deep Dive (2024–2026)", detail: "Confronted the biggest questions — death, meaning, God, suffering. Built a real framework. Not just beliefs inherited but ones forged through reading, thinking and living.", category: "mindset", emoji: "🔭" },
  { year: 2024, title: "Hair Transplant & Physical Transformation", detail: "Made the call, went through the process, and saw it through. Confidence upgrade and proof that taking action beats rumination.", category: "health", emoji: "💇" },
  { year: 2024, title: "Working Through Family Trauma & Shell", detail: "Began actively detoxing from toxic family patterns. The unlearning is hard — but it's the most freeing work there is.", category: "mindset", emoji: "🌱" },
  { year: 2024, yearEnd: 2026, title: "Joanna's Family — Mirror That Revealed My Own Shell", detail: "Being around Joanna's family was the first time I had sustained exposure to a genuinely warm, loving family dynamic. Watching how they talked to each other, showed affection, expressed care without conditions — it was disorienting in the best way. It also made something painful undeniable: a lot of my shelledness, emotional flatness, and difficulty with vulnerability wasn't just personality — it was a direct product of growing up in a cold, anxious, neurotic family environment where emotional openness wasn't modeled or safe. The contrast was stark enough to crack something open. That recognition — painful as it was — was the first real step toward understanding where the shell came from and starting to dismantle it. You can't unlearn what you can't first see. This was the seeing. (Tentative 2024–2026.)", category: "mindset", emoji: "🪞" },
  { year: 2025, title: "Joanna's World — Seeing the Non-Privileged Side of Life", detail: "My relationship with Joanna pulled back a curtain I didn't even know was there. My own friend group was rich and successful — Bay Area professionals on the winning track — and I had quietly assumed that was just what life looked like. Through Joanna I got sustained, real exposure to people living an entirely different reality: folks who had survived abuse, sexual assault, drug addiction, DUIs, miscarriages — hardships that were abstractions to me and daily facts of life to them. And this wasn't some far-off place; these were Bay Area people too, living in the same region as my privileged bubble, just on the other side of an invisible line I'd never had to notice. It grounded me hard. It made me more sober, more humble, and far less quick to judge. It replaced a shallow, sheltered worldview with genuine empathy and a real understanding of how much of life's difficulty is circumstance, not character. Just as importantly, it made me dramatically better at connecting with working-class people — meeting them as equals instead of talking down or past them. One of the most quietly important expansions of my perspective, and it made me a better, more relatable human being.", category: "mindset", emoji: "🌍" },
  { year: 2025, title: "Learned to Change a Car Tire", detail: "No more waiting on the side of the road. Basic but empowering — the kind of self-reliance that matters when it counts.", category: "practical", emoji: "🔧" },
  { year: 2025, title: "Existential Peace — Masterpiece Essay", detail: "Addressed years of existential and religious anxiety. Synthesized a personal nihilism-meets-meaning framework and wrote it all down. Finally at peace with the big questions.", category: "mindset", emoji: "🕊️" },
  { year: 2025, title: "Bought First House — 2605 Plumbago Ct", detail: "Learned the entire homebuying process: offers, inspections, escrow, financing, refinancing. A massive adult unlock.", category: "life", emoji: "🏠" },
  { year: 2025, title: "California Wisdom — Beyond the Bay Area Bubble", detail: "Explored hidden gems in rural and Central California. Permanently dismantled Bay Area superiority complex. Found beauty in slower, deeper living.", category: "life", emoji: "🌾" },
  { year: 2025, title: "Vietnam Street Market Haggling — Bartering Done Right", detail: "Had multiple genuine haggling and bartering sessions with Vietnamese street vendors and local shop owners — an immersive, laugh-out-loud cultural experience. A long way from an embarrassing bartering attempt back in 2016 at the Vatican. In Vietnam, it clicked: the back-and-forth, the theatrics, the genuine fun of the negotiation. Scored some great bargains, but more importantly got to participate in a commercial culture where this is normal and expected rather than awkward. The kind of authentic, unscripted travel moment that no tour package can manufacture.", category: "adventure", emoji: "🛒" },
  { year: 2025, title: "Bogotá Taxi Scare — Almost Kidnapped, Walked Away Fine", detail: "Got into what turned out to be a very sketchy taxi situation in Bogotá. The driver started taking wrong turns, the vibe shifted, and it became clear something was off. Stayed calm, read the situation, and got out safely before it escalated into anything serious. Walked away completely fine — but it was a genuine brush with the kind of danger you hear about in travel warnings and dismiss until it's actually happening to you. More than just a story: it was a real test of situational awareness, composure under pressure, and the ability to trust your gut and act decisively without panicking. Came out the other side with more confidence in my own instincts and a healthy respect for staying alert in unfamiliar cities.", category: "adventure", emoji: "🚕" },
  { year: 2025, title: "Got a Puppy — Unconditional Love Unlocked", detail: "Learned to care for a dog and discovered what unconditional love actually feels like in practice. Life is measurably better with a good dog.", category: "life", emoji: "🐶" },
  { year: 2025, title: "LLC — Founded, Ran & Learned the Business World", detail: "Started CareerGlow LLC and went from building a couple of HTML apps to fully understanding real deployments — architecture, infrastructure, and everything in between. Launched CareerGlow as a live, production service with Stripe payments integrated, a real domain, a real company. Fully legitimized. Now have the skills, the keywords, and the engineering confidence to take any idea in my head and make it real — deployed, scaled, and live to anyone in the world. Found my calling.", category: "career", emoji: "🚀" },
  { year: 2025, title: "Genioplasty — Investing in Long-Term Looks", detail: "Made the brave call to undergo genioplasty surgery to enhance facial structure and long-term appearance. Faced the uncertainty, the surgical risk, and an uncomfortable recovery head-on. Came out the other side with a stronger jawline and the confidence that comes from choosing self-investment over fear.", category: "health", emoji: "🦷" },
  { year: 2025, title: "Turbinectomy — Unlocking Real Breathing", detail: "Underwent turbinectomy to correct a blocked airway that had been silently degrading quality of life — sleep, energy, exercise, everything. Another surgery most people would avoid. Dealt with the recovery and came out breathing better than ever. A deep, life-improving unlock that most people never address.", category: "health", emoji: "🌬️" },
  { year: 2025, title: "Disneyland LA — Fear Conquered", detail: "Faced and defeated roller coaster phobia. Rode every major ride at Disneyland and DCA. Childhood fears — done.", category: "health", emoji: "🎢" },
  { year: 2026, title: "Learned to Change Car Oil", detail: "Added another practical self-reliance tool to the belt. Less dependency, more capability.", category: "practical", emoji: "🛢️" },
  { year: 2026, title: "Learned to Draft Business Contracts & Legal Documents", detail: "Took something that felt intimidating and gatekept — legal contracts and business documents — and fully demystified it. Learned all three approaches: drafting from scratch, using quality online templates, and knowing when and how to engage an actual lawyer. Covered contracts, policies, terms of service, NDAs, and more. Now able to handle legal documentation for any business need without being dependent on or intimidated by the legal system. A massively enabling skill for anyone running a business, renting property, or operating in a world where agreements matter. No more feeling like you need someone else's permission to protect yourself.", category: "practical", emoji: "📜" },
  { year: 2026, title: "Went to Small Claims Court — Learned to Sue & Defend", detail: "Actually went through small claims court — the whole process. Learned how to file a claim, how to prepare and present evidence in front of a real judge, what the courtroom dynamic actually looks like, how appeals work, and what makes a strong versus weak case. Deeply empowering. In California especially — one of the most litigious states in the country — this is an incredibly valuable tool. As a landlord, you can use it to protect yourself from bad tenants. As a tenant, you can use it to sue a shady landlord. In business, in daily life, in any dispute: knowing how to sue someone — or defend yourself if sued — changes the entire power dynamic. Most people are terrified of the legal system because they've never been in it. Now it's just another tool in the arsenal.", category: "practical", emoji: "⚖️" },
  { year: 2026, title: "Built a Gate", detail: "Designed and built a real gate from scratch. Hands, wood, tools — and a result that stands.", category: "practical", emoji: "🚪" },
  { year: 2026, title: "Learned Drywall", detail: "Patched, taped and finished drywall. The house teaches humility and competence in equal measure.", category: "practical", emoji: "🏗️" },
  { year: 2026, title: "Plastering, Painting & Spackling", detail: "Took walls from rough to smooth to painted. A satisfying arc of craft from damage to beauty.", category: "practical", emoji: "🖌️" },
  { year: 2026, title: "Got Ducks", detail: "Adopted ducks and gained a mindset shift: stop overthinking hard things and just be more active. Turns out ducks are delightful.", category: "life", emoji: "🦆" },
  { year: 2026, title: "Solved ED — For Good (Mostly)", detail: "Addressed and resolved a sensitive health issue that had lingered. An underrated life quality unlock that deserves to be logged.", category: "health", emoji: "💪" },
  { year: 2026, title: "Sold First Car — Learned the Other Side", detail: "Went through the full process of selling a car — pricing it right, listing it, dealing with buyers, handling the paperwork, title transfer, and closing the deal. Learned what dealerships don't tell you when you're buying. Closed the loop on car ownership and came away knowing both sides of the transaction.", category: "practical", emoji: "🤝" },
  { year: 2026, title: "Gum & Bone Graft Surgery", detail: "Proactively addressed gum recession and jaw bone resorption with graft surgery — not because it was urgent, but because ignoring it meant compounding problems decades down the line. Another uncomfortable procedure chosen deliberately for long-term health and aesthetics. Thinking decades ahead and acting on it.", category: "health", emoji: "🦴" },
  { year: 2026, title: "Sperm Freezing & Fertility Mastery — Securing the Future of Fatherhood", detail: "Took full ownership of my fertility and reproductive future — one of the most important and least-discussed forms of long-term planning a man can do. Went through comprehensive fertility testing to actually understand my sperm quality, counts, and reproductive health, which mattered enormously given childhood surgeries that raised real questions about natural conception. Then completed two separate sessions of sperm freezing and long-term storage, banking optimized, high-quality samples while I'm young and at my biological peak. The knowledge alone was worth it: I learned that natural conception will likely be harder for me — a massive thing to find out now, in my prime, rather than discovering it at 40 with no backup and no options left. Instead I've positioned myself with a frozen insurance policy that lets me delay having kids for years without the ticking-clock anxiety, keeps the door open for a future vasectomy without ever closing off fatherhood, and means any future family planning starts from security rather than panic. Beyond the logistics, I came away understanding my own body, my risks, and the real tradeoffs of different reproductive choices far better than almost any man my age. Proactive, unglamorous, decades-ahead thinking applied to the single most consequential area of long-term life planning.", category: "health", emoji: "🧬" },
  { year: 2026, title: "Romantic Breakthrough with Daniela — Confidence & Genuine Attraction", detail: "A major milestone in my romantic life. Got together with Daniela — a genuinely beautiful woman who was into me — and crossed from dating into real intimacy. For the first time it all came together at once: I felt truly attractive, I was authentically attracted to her rather than performing, there was no performance anxiety, and afterward she was still interested. Set against years of quietly feeling undesirable in both looks and personality, this milestone — building on the earlier Yuliya glimpse — is proof that slow, steady, unglamorous self-development finally paid off in the one area that resisted it longest. The contrast says everything: from defaulting to online videos after work to an actual, developed social and sexual life. That juxtaposition is the nail in the coffin for the older, less confident version of me. I also established something important about myself — that I genuinely love being the more dominant partner, and that the less-dominant tendencies were just old childhood programming reinforced by the internet during puberty, not anything I actually identify with. I overcame it not through repression but through real growth in taste and confidence. A proud marker of who I've become and where I'm headed.", category: "relationships", emoji: "💞" },
  { year: 2016, title: "Ireland & Europe — Early Travels", detail: "Explored more of Europe with fresh eyes and a richer context. Every trip builds on the last.", category: "adventure", emoji: "🏰" },
  { year: 2016, title: "Vatican City & Rome — Sistine Chapel, Colosseum & Pasta Lessons", detail: "Stood inside the Vatican and looked up at the Sistine Chapel — one of those moments where you genuinely can't believe you're there. Walked through the Colosseum and felt the weight of 2,000 years of history under your feet. Ate real, authentic pasta in Rome, and got a hilariously memorable lesson from an Italian waitress who watched my fork technique with visible concern and took it upon herself to correct me — the kind of spontaneous, human travel moment that no guidebook prepares you for. A trip that made history tangible and knocked the American insularity down another few notches.", category: "adventure", emoji: "🏛️" },
];

function exportAccomplishmentsCSV(items: Accomplishment[]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const headers = ["Year", "Year End", "Title", "Category", "Category Label", "Emoji", "Detail", "Duration (years)", "Time Span"];
  const rows = items
    .slice()
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.title.localeCompare(b.title))
    .map(item => {
      const yearEnd = item.yearEnd ?? item.year;
      const duration = yearEnd - item.year + 1;
      const timeSpan = item.yearEnd ? `${item.year}–${item.yearEnd}` : String(item.year);
      const catLabel = CATEGORIES[item.category].label;
      return [item.year, yearEnd, item.title, item.category, catLabel, item.emoji, item.detail, duration, timeSpan].map(v => escape(String(v))).join(",");
    });
  const csv = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `accomplishments_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccomplishmentsPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showChart, setShowChart] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<Accomplishment | null>(null);

  const years = Array.from(new Set(ACCOMPLISHMENTS.map(a => a.year))).sort((a, b) => a - b);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = ACCOMPLISHMENTS;
  const byYear = years
    .map(y => ({ year: y, items: filtered.filter(a => a.year === y) }))
    .filter(g => g.items.length > 0);

  const chartData = years.map(y => ({
    year: y,
    count: filtered.filter(a => a.year === y).length,
    total: ACCOMPLISHMENTS.filter(a => a.year === y).length,
  }));
  const maxCount = Math.max(...chartData.map(d => d.total), 1);

  // Cumulative running totals
  let runningFiltered = 0;
  let runningTotal = 0;
  const cumulativeData = years.map(y => {
    runningFiltered += filtered.filter(a => a.year === y).length;
    runningTotal += ACCOMPLISHMENTS.filter(a => a.year === y).length;
    return { year: y, cumFiltered: runningFiltered, cumTotal: runningTotal };
  });
  const maxCumulative = Math.max(...cumulativeData.map(d => d.cumTotal), 1);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      {/* Subtle starfield */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-sky-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-violet-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-80 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-4xl mx-auto px-4 pt-4" : viewMode === 'horizontal' ? "px-2 pt-10" : "max-w-4xl mx-auto px-6 pt-10"}`}>

        {/* Back link */}
        <Link href="/skills">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Skills
          </a>
        </Link>

        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className="h-7 w-7 text-emerald-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Accomplishments Timeline
            </h1>
            <TrendingUp className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-slate-400 italic text-sm">A living record of growth — practical, mental, spiritual, and experiential</p>
          <p className="text-emerald-400/70 text-xs">{ACCOMPLISHMENTS.length} accomplishments across {years.length} years</p>
          <div className="flex justify-center pt-1">
            <button
              onClick={() => exportAccomplishmentsCSV(ACCOMPLISHMENTS)}
              className="inline-flex items-center gap-2 text-xs rounded-full px-4 py-2 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Widget & View Controls ── */}
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2 mb-6">
          {/* Chart toggle */}
          <button
            onClick={() => setShowChart(v => !v)}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-all ${showChart ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-slate-800/40 border-slate-700/40 text-slate-500"}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: showChart ? "#34D399" : "#475569" }} />
            📊 Stats Chart
          </button>
          {/* Divider */}
          <span className="text-slate-700 text-xs">|</span>
          {/* Timeline toggle */}
          <button
            onClick={() => setShowTimeline(v => !v)}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-all ${showTimeline ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-200" : "bg-slate-800/40 border-slate-700/40 text-slate-500"}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: showTimeline ? "#FCD34D" : "#475569" }} />
            🗓️ Timeline
          </button>
          {/* View toggle (only relevant when timeline visible) */}
          {showTimeline && (
            <div className="flex items-center rounded-full border border-slate-700/60 overflow-hidden">
              <button
                onClick={() => setViewMode('vertical')}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'vertical' ? 'bg-emerald-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
              >↕ Vertical</button>
              <button
                onClick={() => setViewMode('horizontal')}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'horizontal' ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
              >↔ Horizontal</button>
            </div>
          )}
        </div>

        {/* ── STATS WIDGET — combined stacked bar + cumulative line ── */}
        <div className="max-w-4xl mx-auto mb-6">
          {showChart && (
            <div className="rounded-xl border border-emerald-500/20 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs text-slate-400">Accomplishments per year <span className="text-emerald-400">(green)</span> + running total <span className="text-yellow-400">(yellow)</span></p>
                <p className="text-xs text-emerald-400 font-semibold">{ACCOMPLISHMENTS.length} total</p>
              </div>
              {/* Chart */}
              <div className="relative px-2" style={{ height: 130 }}>
                {/* Bars */}
                <div className="absolute inset-0 flex items-end gap-1.5 px-2 pb-5">
                  {chartData.map((d, i) => {
                    const BAR_MAX = 96;
                    const cum = cumulativeData[i];
                    const prevCum = i === 0 ? 0 : cumulativeData[i - 1].cumTotal;
                    // Total bar height = cumulative total scaled
                    const totalPx = Math.max(4, (cum.cumTotal / maxCumulative) * BAR_MAX);
                    // Green bottom segment = this year's new accomplishments
                    const newPx = Math.max(2, (d.total / maxCumulative) * BAR_MAX);
                    // Yellow top segment = all previous years
                    const prevPx = Math.max(0, (prevCum / maxCumulative) * BAR_MAX);
                    return (
                      <div key={d.year} className="flex-1 flex flex-col items-center justify-end relative group">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg">
                          <span className="text-emerald-400 font-bold">+{d.total}</span> in {d.year} · <span className="text-yellow-400 font-bold">{cum.cumTotal}</span> total
                        </div>
                        {/* Stacked bar */}
                        <div className="w-full flex flex-col justify-end overflow-hidden rounded-t" style={{ height: totalPx }}>
                          {/* Yellow top = previous years' cumulative */}
                          {prevPx > 0 && (
                            <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-500" style={{ height: prevPx }} />
                          )}
                          {/* Green bottom = this year's new */}
                          <div className="w-full bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all duration-500" style={{ height: newPx }} />
                        </div>
                        <span className="text-[8px] text-slate-500 mt-0.5 leading-none">{d.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 justify-center mt-2">
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /><span className="text-[10px] text-slate-400">This year (new)</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-yellow-500 inline-block" /><span className="text-[10px] text-slate-400">All prior years (running total)</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ── VERTICAL VIEW ── */}
        {showTimeline && viewMode === 'vertical' && (
          <>
            <div className="mb-3" />

            {/* Vertical Timeline */}
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/70 via-yellow-500/40 to-violet-500/30" />
              <div className="space-y-10 pl-16">
                {byYear.map(({ year, items }) => (
                  <div key={year}>
                    <div className="flex items-center gap-4 mb-5 -ml-16">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-400/60 flex items-center justify-center shadow-lg shadow-yellow-900/30 shrink-0">
                        <span className="text-slate-900 font-bold text-xs leading-none">{year}</span>
                      </div>
                      <div>
                        <span className="text-yellow-200 font-bold text-xl font-serif">{year}</span>
                        <span className="text-slate-500 text-xs ml-2">· {items.length} accomplishment{items.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item, idx) => {
                        const cat = CATEGORIES[item.category];
                        const key = `${item.year}-${idx}`;
                        const isExpanded = expandedItems.has(key);
                        return (
                          <div key={key} onClick={() => toggleExpand(key)}
                            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${cat.bg} ${cat.border} hover:scale-[1.01] hover:shadow-lg`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl shrink-0">{item.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-white font-semibold text-sm leading-snug">{item.title}</p>
                                  <span className="text-[9px] rounded-full px-2 py-0.5 shrink-0 mt-0.5" style={{ background: cat.color + "22", color: cat.color, border: `1px solid ${cat.color}50` }}>
                                    {cat.label}
                                  </span>
                                </div>
                                {isExpanded ? (
                                  <p className="text-slate-300 text-xs mt-2 leading-relaxed">{item.detail}</p>
                                ) : (
                                  <p className="text-slate-500 text-[10px] mt-1">tap to expand</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── HORIZONTAL GANTT VIEW ── */}
        {showTimeline && viewMode === 'horizontal' && (() => {
          const CURRENT_YEAR = 2026;
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          const allYears: number[] = [];
          for (let y = minYear; y <= maxYear; y++) allYears.push(y);
          const COL_W = 130;
          const ROW_H = 44;
          const HEADER_H = 40;
          const ROW_PAD = 6; // vertical padding between rows

          const sorted = [...filtered].sort((a, b) => a.year !== b.year ? a.year - b.year : a.title.localeCompare(b.title));
          const totalW = allYears.length * COL_W;

          // ── Greedy interval packing: assign each item a row index ──
          type Packed = { item: Accomplishment; row: number; startIdx: number; endIdx: number };
          const rowEnds: number[] = []; // tracks the endIdx of the last item in each row
          const packed: Packed[] = sorted.map(item => {
            const startIdx = allYears.indexOf(item.year);
            const endIdx = allYears.indexOf(item.yearEnd ?? item.year);
            // find first row where last item ended before this one starts
            let row = rowEnds.findIndex(end => end < startIdx);
            if (row === -1) { row = rowEnds.length; rowEnds.push(endIdx); }
            else { rowEnds[row] = endIdx; }
            return { item, row, startIdx, endIdx };
          });
          const numRows = rowEnds.length;
          const gridH = numRows * (ROW_H + ROW_PAD) + ROW_PAD;

          const YearHeader = () => (
            <div className="flex" style={{ width: totalW }}>
              {allYears.map(y => {
                const isCurrent = y === CURRENT_YEAR;
                return (
                  <div key={y} className="flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-700/30 py-2 relative overflow-hidden" style={{ width: COL_W, height: HEADER_H }}>
                    {isCurrent && <div className="absolute inset-0 bg-gradient-to-b from-violet-500/20 to-transparent pointer-events-none" />}
                    <span className={`text-sm font-bold font-serif relative z-10 ${isCurrent ? 'text-violet-300' : years.includes(y) ? 'text-yellow-300' : 'text-slate-600'}`}>{y}</span>
                    {isCurrent ? <div className="w-4 h-0.5 rounded-full bg-violet-400 mt-1" /> : years.includes(y) ? <div className="w-1 h-1 rounded-full bg-yellow-400 mt-1" /> : null}
                  </div>
                );
              })}
            </div>
          );

          return (
            <>
              {/* Detail modal */}
              {modalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalItem(null)}>
                  <div
                    className="relative max-w-lg w-full rounded-2xl border shadow-2xl p-6 bg-slate-900"
                    style={{ borderColor: CATEGORIES[modalItem.category].color + '50', boxShadow: `0 0 40px ${CATEGORIES[modalItem.category].color}20` }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => setModalItem(null)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 text-lg leading-none">✕</button>
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-4xl shrink-0">{modalItem.emoji}</span>
                      <div>
                        <h2 className="text-white font-bold text-lg leading-snug">{modalItem.title}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs rounded-full px-2 py-0.5 font-semibold" style={{ background: CATEGORIES[modalItem.category].color + '25', color: CATEGORIES[modalItem.category].color, border: `1px solid ${CATEGORIES[modalItem.category].color}50` }}>
                            {CATEGORIES[modalItem.category].label}
                          </span>
                          <span className="text-slate-500 text-xs font-serif font-bold">
                            {modalItem.yearEnd ? `${modalItem.year}–${modalItem.yearEnd}` : modalItem.year}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-700/60 mb-4" />
                    <p className="text-slate-300 text-sm leading-relaxed">{modalItem.detail}</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-violet-500/30 bg-slate-900/70 overflow-hidden shadow-2xl shadow-violet-900/20">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/40">
                  <p className="text-[11px] text-slate-400">Scroll right to explore all years · tap any bar for details</p>
                  <p className="text-[11px] text-violet-400 font-semibold">{filtered.length} accomplishments</p>
                </div>

                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '75vh' }}>
                  <div style={{ width: totalW, position: 'relative' }}>

                    {/* TOP year header (sticky) */}
                    <div className="sticky top-0 z-20 bg-slate-900/95 border-b border-slate-700/60">
                      <YearHeader />
                    </div>

                    {/* Packed grid */}
                    <div style={{ position: 'relative', height: gridH }}>

                      {/* Current year column highlight */}
                      {allYears.map((y, i) => y === CURRENT_YEAR ? (
                        <div key={y} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: i * COL_W, width: COL_W, background: 'linear-gradient(to bottom, rgba(139,92,246,0.07), transparent 80%)' }} />
                      ) : null)}

                      {/* Column grid lines */}
                      {allYears.map((y, i) => (
                        <div key={y} className={`absolute top-0 bottom-0 border-r pointer-events-none ${years.includes(y) ? 'border-slate-600/25' : 'border-slate-800/20'}`} style={{ left: (i + 1) * COL_W - 1 }} />
                      ))}

                      {/* Row stripe backgrounds */}
                      {Array.from({ length: numRows }).map((_, r) => (
                        <div key={r} className={`absolute left-0 right-0 ${r % 2 === 0 ? 'bg-slate-800/15' : ''}`}
                          style={{ top: ROW_PAD + r * (ROW_H + ROW_PAD), height: ROW_H }} />
                      ))}

                      {/* Bars */}
                      {packed.map(({ item, row, startIdx, endIdx }, idx) => {
                        const cat = CATEGORIES[item.category];
                        const barLeft = startIdx * COL_W + 4;
                        const barWidth = (endIdx - startIdx + 1) * COL_W - 8;
                        const barTop = ROW_PAD + row * (ROW_H + ROW_PAD);

                        return (
                          <div
                            key={idx}
                            className="absolute rounded-lg cursor-pointer transition-all duration-150 border select-none hover:brightness-125 hover:shadow-lg"
                            style={{
                              left: barLeft,
                              width: barWidth,
                              top: barTop,
                              height: ROW_H,
                              background: cat.color + '22',
                              borderColor: cat.color + '55',
                              zIndex: 1,
                            }}
                            onClick={() => setModalItem(item)}
                          >
                            <div className="flex items-center gap-2 px-2 h-full overflow-hidden">
                              <span className="text-base shrink-0 leading-none">{item.emoji}</span>
                              <p className="font-semibold text-[11px] leading-tight truncate" style={{ color: cat.color }}>{item.title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* BOTTOM year header (sticky) */}
                    <div className="sticky bottom-0 z-20 bg-slate-900/95 border-t border-slate-700/60">
                      <YearHeader />
                    </div>

                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Footer flourish */}
        <div className="mt-16 text-center text-slate-600 text-xs italic pb-4">
          "The unexamined life is not worth living." — Socrates
        </div>
      </div>
    </div>
  );
}
