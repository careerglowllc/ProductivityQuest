import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateGoldValue } from "@/lib/goldCalculation";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";

const TASK_EMOJIS = [
  "📝","⚔️","🎯","🚀","💡","🔥","⭐","🏆","💼","📱","💻","🌐","📊","📈","🔧","🛠️",
  "📦","🎨","✏️","📚","🧠","💪","🤝","📞","✉️","🗓️","⏰","🔔","🎉","🌟","💰","🏦",
  "🔍","🧩","🎭","🎬","🎵","🎮","🏋️","🧘","🌱","🌍","🚗","✈️","🏠","🍽️","☕","🎁",
  "🛡️","⚡","🔑","🧪","🔬","📡","🤖","👁️","🦁","🐉","🌈","🎪","🏗️","📌","🗺️","💎",
  "⚙️","🔩","🏭","🔨","⚒️","🪛","🪚","⛏️","🔗","🧱","🪝","🦾","🔋","🔌","🏚️","🛗",
  "🔆","🌞","🪫","🛢️","🌬️","🌍",
];

const EMOJI_CATEGORIES = [
  { label: "Work", emojis: ["📝","💼","💻","📱","🔧","🛠️","📊","📈","📦","🔍","📡","🤖","🖥️","⌨️","🖨️","💾","📁","📂","🗂️","📋","📌","📍","✂️","📏","📐","🔏","🔐","🔒","🔓","🔑","🗝️","🏗️","🏢","📠","📺","📷","📸","📹","🎞️","📽️","🎙️","📻"] },
  { label: "Industrial", emojis: ["⚙️","🔩","🏭","🔨","⚒️","🛠️","🪛","🪚","⛏️","🔧","🔗","⛓️","🪝","🧱","🔋","🔌","💡","🪜","🧲","🗜️","🪤","🛢️","⚗️","🧪","🔬","🔭","📡","🤖","🦾","🦿","🚧","🏗️","🏚️","🏠","🏘️","🏛️","🏟️","🏬","🏭","🚜","🚛","🚚","🏎️","🚒","🚑","⚓","🪝","🧰","🪣","🗑️","⚠️","🔴","🟠","🟡","🟢"] },
  { label: "Energy", emojis: ["🔆","☀️","🌞","⚡","🔋","🪫","🔌","💡","🔦","🕯️","🌬️","💨","🌊","💧","🏭","🛢️","⛽","🔥","♻️","🌍","🌡️","🧯","⚙️","🧲"] },
  { label: "Goals", emojis: ["🎯","🚀","⭐","🏆","💡","🔥","💪","🌟","⚔️","🛡️","⚡","💎","🥇","🥈","🥉","🎖️","🏅","🎗️","🎀","👑","✨","🌠","🌌","🧭","🗺️","🏁","🚩","🎌","🏴","🔮","⚗️","🧬","🔬","🔭","🧪","🧫","💫","🌀","🎆","🎇"] },
  { label: "Spooky", emojis: ["💀","☠️","👻","🎃","😈","👿","👹","👺","🤡","🤖","👽","👾","🧟","🧟‍♂️","🧟‍♀️","🧛","🧛‍♂️","🧙","🧙‍♂️","🧌","🧞","🦇","🕷️","🕸️","🦂","🐍","🐀","🦉","🐺","⚰️","⚱️","🪦","🔮","🧿","🗡️","⚔️","🛡️","🩸","🦴","🥀","🌑","🌕","🕯️","🌫️","🍄","⛓️","🔥","🌪️"] },
  { label: "Appearance", emojis: ["💇","💇‍♂️","💇‍♀️","💈","🪮","💆","💆‍♂️","💆‍♀️","🧖","🪒","💅","💄","🪞","🧴","🧼","🧑","👨","👩","🧔","🧔‍♂️","👱‍♂️","👱‍♀️","👨‍🦰","👩‍🦰","👨‍🦱","👩‍🦱","👨‍🦳","👩‍🦳","👨‍🦲","👩‍🦲","🧑‍🦰","🧑‍🦱","🧑‍🦳","🧑‍🦲","😀","🙂","😎","🤳","👤","🕶️","👓","🧢","🎩","👒","👔","👗","👠","💍"] },
  { label: "Social", emojis: ["🤝","📞","✉️","🎉","🎁","🎭","🎬","🎵","🎮","👁️","🦁","🐉","💬","💭","🗨️","🗯️","👋","🙌","👏","🤗","🥂","🍾","🎤","🎧","🎼","🎹","🥁","🎷","🎸","🎺","🎻","🪗","👥","👤","🧑‍🤝‍🧑","🫂","💌","📮","📯","📣","📢"] },
  { label: "Life", emojis: ["🏠","🚗","✈️","🍽️","☕","🌱","🌍","🧘","🏋️","🌈","🗓️","⏰","🏡","🛖","🏘️","🏰","🏯","🚂","🚢","🛸","🚁","⛵","🏄","🚴","🏇","⛷️","🤸","🧗","🎭","🎠","🎡","🎢","🌅","🌇","🌆","🏖️","🏕️","🌲","🌳","🌴","🌵","🌾","🍀","🌺","🌸","🌼","🌻","🍁","🍂","🍃","🌙","☀️","⛅","🌤️","🌦️","⛈️","❄️","🌊","🌋"] },
  { label: "Furniture & Home", emojis: ["🛋️","🪑","🛏️","🚿","🛁","🪠","🚽","🪣","🧴","🧼","🪥","🪒","🧹","🧺","🧻","🪤","🚪","🪞","🪟","🖼️","🏺","🕯️","💡","🔦","🪔","🛒","🧯","⚗️","🧲","🔌","🔋","🪜","🧱","🗑️","📦","🗄️","🗃️","🗂️","📁","🔩","🔧","🪛","🔨","🪚","🛠️","⚙️","🪝","🔗","⛓️","🧰","🪣","🪤","🏗️","🏚️","🏠","🏡","🛖"] },
  { label: "Health", emojis: ["🏥","💊","💉","🩺","🩻","🩹","🧬","🩸","🩼","🦽","🦼","🧪","🔬","🧫","❤️","🧡","💛","💚","💙","💜","🖤","🤍","❤️‍🔥","💓","💗","💖","💝","�","🫀","🫁","🧠","🦷","🦴","�️","👅","👂","👃","�","�","🦾","�","👋","�️","✋","�","👌","✌️","�","�","�","💪","🏃","🚶","�","�","🥗","🥤","🍎","�","💆","💇","🛁","🚿","🪥","🧼","🏋️","🧘"] },
  { label: "Finance", emojis: ["💰","💵","💴","💶","💷","💸","💳","🏦","📈","📉","💹","🪙","💲","🤑","🏧","🏷️","🧾","📊","⚖️","🔖","💼","🪙","🏪","🏬","🏫","🏨","🏩","🏛️","⚱️","🎰","🎲","🃏","🀄","🎴"] },
  { label: "Food", emojis: ["🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🧇","🥞","🧈","🥓","🥩","🍗","🍖","🌭","🍟","🫔","🍱","🍘","🍣","🍤","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","☕","🍵","🧋","🥛","🍺","🍷","🥤"] },
  { label: "Travel", emojis: ["✈️","🚀","🛸","🚂","🚢","🛳️","⛴️","🚁","🛩️","🪂","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🛼","🛷","⛷️","🏄","🚣","🧗","🏇","🏊","🤽","🚵","🏌️","🗺️","🌐","🏔️","🏝️","🏜️","🏟️"] },
  { label: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲","🌵","🌲","🌳","🌴"] },
  { label: "Objects", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🏒","🥍","🏑","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🪄","🎿","🛷","🥌","🎯","🎳","🎰","🎲","♟️","🧩","🪆","🪅","🎭","🎨","🖼️","🎪","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎸","🎺","🎻","🪗","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","💰","💳","🪙","💎","⚖️","🧲","🔧","🔨","⚒️","🛠️","⛏️","🔩","🗜️","🔗","⛓️","🪝","🧱","🪞","🪟","🛏️","🛋️","🪑","🚽","🚿","🛁","🧴","🪒","🧼","🪥","🧻","🪣","🧺","🧹","🧽","�","�🪤","🪣","🧴","🛒","🚪","🪣","🏺","🎎","🪆","🪅","🎠","🎡","🎢"] },
  { label: "Art & Performance", emojis: ["🎭","🎪","🎨","🖼️","🖌️","🖍️","✏️","🎬","🎥","📽️","🎞️","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎸","🎺","🎻","🪗","🪕","🎙️","📻","🎵","🎶","🎤","🎼","🎟️","🎫","🃏","🀄","🎴","🃏","🎭","🃏","🎩","🪄","🧿","🪬","👁️","🔮","🪩","💃","🕺","🩰","🩱","🩲","🩳","👘","🥻","🩴","🎒","👒","🎓","⛑️","🪖","👑","💍","💎","🧵","🧶","🪡","🧷","🪢","🎀","🎗️","🪭","🪮","🖼️","🗿","🏛️","🎠","🎡","🎢","🎪","🌂","☂️","🪆","🎎","🎏","🎐","🎑","🧧","🎊","🎉","🎈","🎋","🎍","🎆","🎇","🧨","✨","🪅"] },
  { label: "School & Office", emojis: ["✏️","🖊️","🖋️","✒️","🖍️","🖌️","📝","📋","📌","📍","📎","🖇️","📏","📐","✂️","🗑️","📁","📂","🗂️","🗃️","🗄️","📄","📃","📜","📑","🗒️","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🏷️","✉️","📧","📨","📩","📬","📫","📭","📪","📮","📥","📤","📦","🎒","🎓","🏫","🖥️","⌨️","🖱️","🖨️","📠","💾","💿","📀","📼","🔍","🔎","🧮","📆","📅","🗓️","🗳️","🧲","🪝","📯","📢","📣"] },
];

// All emojis with searchable keywords
const EMOJI_SEARCH_MAP: { emoji: string; keywords: string }[] = [
  { emoji: "📝", keywords: "note write task memo document" },
  { emoji: "💼", keywords: "work business briefcase job" },
  { emoji: "💻", keywords: "laptop computer work tech" },
  { emoji: "📱", keywords: "phone mobile app" },
  { emoji: "🔧", keywords: "fix repair tool wrench" },
  { emoji: "🛠️", keywords: "tools build repair" },
  { emoji: "📊", keywords: "chart graph data analytics" },
  { emoji: "📈", keywords: "growth increase stock up" },
  { emoji: "📉", keywords: "decline decrease down" },
  { emoji: "📦", keywords: "box package ship deliver" },
  { emoji: "🔍", keywords: "search find look investigate" },
  { emoji: "📡", keywords: "signal broadcast antenna tech" },
  { emoji: "🤖", keywords: "robot ai tech automation" },
  { emoji: "🎯", keywords: "goal target aim focus" },
  { emoji: "🚀", keywords: "launch start rocket growth" },
  { emoji: "⭐", keywords: "star favorite rating" },
  { emoji: "🏆", keywords: "trophy win achievement" },
  { emoji: "💡", keywords: "idea lightbulb creative" },
  { emoji: "🔥", keywords: "fire hot streak urgent" },
  { emoji: "💪", keywords: "strong workout gym fitness" },
  { emoji: "🌟", keywords: "star shine glow special" },
  { emoji: "⚔️", keywords: "sword battle fight challenge" },
  { emoji: "🛡️", keywords: "shield protect defend" },
  { emoji: "⚡", keywords: "lightning fast electric energy power volt electricity charge solar" },
  { emoji: "💎", keywords: "diamond gem value precious" },
  { emoji: "🤝", keywords: "handshake deal partner meet" },
  { emoji: "📞", keywords: "call phone talk" },
  { emoji: "✉️", keywords: "email letter message" },
  { emoji: "🎉", keywords: "party celebrate event" },
  { emoji: "🎁", keywords: "gift present reward" },
  { emoji: "🎭", keywords: "theater drama art performance" },
  { emoji: "🎬", keywords: "film movie video camera" },
  { emoji: "🎵", keywords: "music note song audio" },
  { emoji: "🎮", keywords: "game gaming controller play" },
  { emoji: "🏠", keywords: "house home real estate" },
  { emoji: "🚗", keywords: "car drive vehicle auto" },
  { emoji: "✈️", keywords: "plane flight travel trip" },
  { emoji: "🍽️", keywords: "food eat meal restaurant" },
  { emoji: "☕", keywords: "coffee morning drink" },
  { emoji: "🌱", keywords: "grow plant nature garden" },
  { emoji: "�", keywords: "leaf leaves foliage rake yard garden fall autumn nature greenery" },
  { emoji: "🌿", keywords: "herb plant foliage greenery nature green sprig" },
  { emoji: "🍂", keywords: "leaves fall autumn rake yard cleanup garden" },
  { emoji: "🌳", keywords: "tree nature forest yard outdoor green" },
  { emoji: "�🌍", keywords: "earth world global" },
  { emoji: "🧘", keywords: "meditation yoga relax mindful" },
  { emoji: "🏋️", keywords: "gym lift weight exercise" },
  { emoji: "🌈", keywords: "rainbow color diversity" },
  { emoji: "🗓️", keywords: "calendar schedule date plan" },
  { emoji: "⏰", keywords: "alarm time clock deadline" },
  { emoji: "💰", keywords: "money cash rich finance" },
  { emoji: "🏦", keywords: "bank finance money savings" },
  { emoji: "💊", keywords: "medicine pill health drug" },
  { emoji: "❤️", keywords: "love heart care" },
  { emoji: "🧠", keywords: "brain think mind smart" },
  { emoji: "🏃", keywords: "run jog sprint exercise" },
  { emoji: "🎨", keywords: "art paint creative design" },
  { emoji: "📚", keywords: "books study read learn" },
  { emoji: "🔑", keywords: "key unlock access" },
  { emoji: "👑", keywords: "crown king queen royal important" },
  { emoji: "🧩", keywords: "puzzle piece solve problem" },
  { emoji: "🌙", keywords: "moon night sleep rest" },
  { emoji: "☀️", keywords: "sun morning bright day solar energy renewable photovoltaic" },
  // Energy & power (solar, renewable, electricity)
  { emoji: "🔆", keywords: "solar solar panel panel photovoltaic brightness bright sun energy renewable power" },
  { emoji: "🌞", keywords: "sun solar solar panel energy renewable bright warm summer" },
  { emoji: "🔋", keywords: "battery power energy charge storage solar full" },
  { emoji: "🪫", keywords: "battery low empty drained dead power charge energy" },
  { emoji: "🔌", keywords: "plug electric power outlet charge electricity connect" },
  { emoji: "🌬️", keywords: "wind wind turbine windmill energy renewable air breeze blow" },
  { emoji: "💨", keywords: "wind dash air blow gust fast energy breeze" },
  { emoji: "⛽", keywords: "gas fuel pump gasoline petrol energy fill station" },
  { emoji: "🌡️", keywords: "thermometer temperature heat climate weather energy" },
  { emoji: "🧯", keywords: "fire extinguisher safety emergency fire hazard" },
  { emoji: "🌊", keywords: "wave ocean water surf" },
  { emoji: "🏡", keywords: "home house family" },
  { emoji: "🐶", keywords: "dog pet animal" },
  { emoji: "🐱", keywords: "cat pet animal" },
  { emoji: "🦁", keywords: "lion courage brave strong" },
  { emoji: "🐉", keywords: "dragon power fantasy" },
  { emoji: "🦋", keywords: "butterfly change transform" },
  { emoji: "🌺", keywords: "flower bloom beauty" },
  { emoji: "🏔️", keywords: "mountain climb peak challenge" },
  { emoji: "🍕", keywords: "pizza food eat" },
  { emoji: "🧪", keywords: "science lab experiment test" },
  { emoji: "⚽", keywords: "soccer football sport" },
  { emoji: "🏀", keywords: "basketball sport" },
  { emoji: "🎯", keywords: "bullseye target goal" },
  { emoji: "🪙", keywords: "coin money gold token" },
  { emoji: "🎭", keywords: "theater theatre drama mask performance art" },
  { emoji: "🎪", keywords: "circus performance show event" },
  { emoji: "🎨", keywords: "art paint creative design palette" },
  { emoji: "🖌️", keywords: "brush paint art creative" },
  { emoji: "🖍️", keywords: "crayon draw art color" },
  { emoji: "🎬", keywords: "film movie clapper action" },
  { emoji: "🎤", keywords: "mic microphone sing perform" },
  { emoji: "🎼", keywords: "music score sheet compose" },
  { emoji: "🪄", keywords: "magic wand trick performance" },
  { emoji: "🎩", keywords: "top hat magic fancy performance" },
  { emoji: "🧿", keywords: "evil eye amulet mystical" },
  // Furniture & Home
  { emoji: "🛋️", keywords: "sofa couch furniture living room sit" },
  { emoji: "🪑", keywords: "chair seat furniture sit" },
  { emoji: "🛏️", keywords: "bed sleep bedroom furniture rest" },
  { emoji: "🚿", keywords: "shower bath bathroom clean" },
  { emoji: "🛁", keywords: "bathtub bath bathroom soak" },
  { emoji: "🚽", keywords: "toilet bathroom sink restroom" },
  { emoji: "🪠", keywords: "plunger toilet unclog bathroom" },
  { emoji: "🪞", keywords: "mirror reflection dresser vanity bedroom" },
  { emoji: "🪟", keywords: "window blinds curtain home house" },
  { emoji: "🚪", keywords: "door entry entrance room" },
  { emoji: "🛒", keywords: "cart shopping store buy" },
  { emoji: "🕯️", keywords: "candle lamp light flame decor" },
  { emoji: "💡", keywords: "lamp light bulb idea bright" },
  { emoji: "🪔", keywords: "lamp diya light oil candle" },
  { emoji: "🖼️", keywords: "picture frame art wall decor painting" },
  { emoji: "🏺", keywords: "vase urn decor pottery home" },
  { emoji: "🧹", keywords: "broom sweep clean floor" },
  { emoji: "🧺", keywords: "basket laundry wicker storage" },
  { emoji: "🧻", keywords: "toilet paper roll bathroom" },
  { emoji: "🪣", keywords: "bucket mop clean water" },
  { emoji: "🧴", keywords: "lotion soap dispenser bathroom counter" },
  { emoji: "🧼", keywords: "soap clean wash bathroom sink" },
  { emoji: "🪥", keywords: "toothbrush bathroom hygiene" },
  { emoji: "🧯", keywords: "fire extinguisher safety home garage" },
  { emoji: "🪜", keywords: "ladder step stool climb home" },
  { emoji: "🗑️", keywords: "trash bin garbage can waste" },
  { emoji: "🗄️", keywords: "cabinet file drawer office storage" },
  { emoji: "🧰", keywords: "toolbox tools kit home repair" },
  { emoji: "🪤", keywords: "mousetrap trap home pest" },
  { emoji: "🔮", keywords: "crystal ball magic future predict" },
  { emoji: "💃", keywords: "dance woman dancer performance" },
  { emoji: "🕺", keywords: "dance man dancer performance" },
  { emoji: "🩰", keywords: "ballet dance performance art" },
  { emoji: "🎟️", keywords: "ticket event show theater" },
  { emoji: "🎫", keywords: "ticket event concert show" },
  { emoji: "🃏", keywords: "joker card wild card game" },
  { emoji: "🎴", keywords: "cards game japan flower" },
  { emoji: "🀄", keywords: "mahjong tiles game" },
  { emoji: "♟️", keywords: "chess strategy game" },
  { emoji: "🪅", keywords: "pinata party festive art" },
  { emoji: "🪆", keywords: "matryoshka nesting doll art" },
  { emoji: "🎎", keywords: "japanese doll art culture" },
  { emoji: "🎐", keywords: "wind chime art decoration" },
  { emoji: "🎑", keywords: "moon viewing art japanese" },
  { emoji: "🎊", keywords: "confetti party celebrate" },
  { emoji: "🎉", keywords: "party popper celebrate confetti" },
  { emoji: "📜", keywords: "scroll document plan quest" },
  { emoji: "🗡️", keywords: "dagger blade combat" },
  { emoji: "🏹", keywords: "bow arrow shoot aim" },
  { emoji: "⛏️", keywords: "pickaxe mine dig work" },
  { emoji: "🔮", keywords: "crystal ball magic future predict" },
  { emoji: "🗺️", keywords: "map explore travel quest" },
  { emoji: "🧲", keywords: "magnet attract pull" },
  { emoji: "🫂", keywords: "hug support friend care" },
  { emoji: "🧑‍💻", keywords: "developer code programmer" },
  { emoji: "🏗️", keywords: "build construct project" },
  { emoji: "🚁", keywords: "helicopter fly transport" },
  { emoji: "🚢", keywords: "ship ocean travel voyage" },
  { emoji: "🛒", keywords: "shop shopping cart buy" },
  { emoji: "📌", keywords: "pin mark location note" },
  { emoji: "🗂️", keywords: "folder organize files" },
  { emoji: "🔬", keywords: "microscope research science" },
  { emoji: "🔭", keywords: "telescope observe space" },
  { emoji: "💫", keywords: "sparkle special highlight" },
  { emoji: "🎪", keywords: "circus fun entertainment" },
  { emoji: "🧹", keywords: "clean sweep tidy" },
  { emoji: "🧽", keywords: "sponge scrub clean dishes wash kitchen chore" },
  { emoji: "🧼", keywords: "soap wash clean dishes laundry hygiene chore" },
  { emoji: "🫧", keywords: "bubbles soap wash laundry dishwasher clean chore" },
  { emoji: "🧺", keywords: "laundry basket clothes wash hamper chore" },
  { emoji: "🧦", keywords: "socks laundry clothes wash" },
  { emoji: "📺", keywords: "television tv watch screen entertainment home" },
  { emoji: "📻", keywords: "radio listen music broadcast home" },
  { emoji: "🚿", keywords: "shower clean refresh" },
  { emoji: "🛁", keywords: "bath relax clean" },
  { emoji: "🪴", keywords: "plant grow indoor home" },
  { emoji: "🧳", keywords: "luggage travel pack trip" },
  { emoji: "🎓", keywords: "graduation school learn study" },
  { emoji: "👨‍⚕️", keywords: "doctor health medical" },
  { emoji: "👩‍⚕️", keywords: "doctor health medical nurse" },
  { emoji: "🧑‍🏫", keywords: "teacher education school" },
  { emoji: "👮", keywords: "police law protect" },
  { emoji: "🧑‍🍳", keywords: "chef cook food kitchen" },
  { emoji: "🧑‍🚀", keywords: "astronaut space explore" },
  { emoji: "🦺", keywords: "safety vest protect work" },
  { emoji: "🪖", keywords: "helmet safety construction" },
  { emoji: "🎤", keywords: "microphone sing speak present" },
  { emoji: "📸", keywords: "camera photo capture" },
  { emoji: "🛺", keywords: "ride transport" },
  { emoji: "🏊", keywords: "swim water pool exercise" },
  { emoji: "🚴", keywords: "bike cycle exercise commute" },
  { emoji: "⛳", keywords: "golf sport club" },
  // Industrial / manufacturing / factory
  { emoji: "⚙️", keywords: "gear settings cog machine industrial factory engineering" },
  { emoji: "🔩", keywords: "bolt screw nut fastener hardware industrial" },
  { emoji: "🏭", keywords: "factory industrial manufacturing plant production power energy emissions pollution" },
  { emoji: "🪛", keywords: "screwdriver tool repair fix" },
  { emoji: "🪚", keywords: "saw cut wood carpentry tool" },
  { emoji: "🪜", keywords: "ladder climb steps construction" },
  { emoji: "🧲", keywords: "magnet attract pull industrial" },
  { emoji: "🗜️", keywords: "clamp press vise mechanical tool" },
  { emoji: "🛢️", keywords: "drum barrel oil industrial storage fuel petroleum fossil energy gas" },
  { emoji: "🧰", keywords: "toolbox repair tools kit maintenance" },
  { emoji: "🦾", keywords: "mechanical arm robot industrial prosthetic" },
  { emoji: "🚧", keywords: "construction warning barrier work in progress" },
  { emoji: "⚒️", keywords: "hammer pick mining tools construction" },
  // Medical / body parts
  { emoji: "🩸", keywords: "blood drop red medical health" },
  { emoji: "🩺", keywords: "stethoscope doctor medical exam" },
  { emoji: "🩻", keywords: "xray scan medical bone" },
  { emoji: "🩹", keywords: "bandage wound medical first aid" },
  { emoji: "💉", keywords: "syringe injection shot needle vaccine" },
  { emoji: "💊", keywords: "pill medicine tablet drug" },
  { emoji: "🩼", keywords: "crutch mobility medical disability" },
  { emoji: "🦽", keywords: "wheelchair accessibility medical" },
  { emoji: "🧬", keywords: "dna genetics biology science" },
  { emoji: "🧫", keywords: "petri dish bacteria science lab" },
  { emoji: "🫀", keywords: "heart organ cardiac medical" },
  { emoji: "🫁", keywords: "lungs organ respiratory medical" },
  { emoji: "🧠", keywords: "brain mind intelligence mental" },
  { emoji: "🦷", keywords: "tooth dental oral health" },
  { emoji: "🦴", keywords: "bone skeleton orthopedic" },
  { emoji: "👁️", keywords: "eye vision sight optical" },
  { emoji: "👂", keywords: "ear hearing audio" },
  { emoji: "👃", keywords: "nose smell sinus" },
  { emoji: "🦵", keywords: "leg knee medical limb" },
  { emoji: "🦶", keywords: "foot podiatry medical" },
  { emoji: "💪", keywords: "muscle arm strength fitness" },
  { emoji: "🦾", keywords: "prosthetic arm robotic medical" },
  { emoji: "🦿", keywords: "prosthetic leg robotic medical" },
  // School & office supplies
  { emoji: "✏️", keywords: "pencil write draw school office" },
  { emoji: "🖊️", keywords: "pen write sign office school" },
  { emoji: "🖋️", keywords: "fountain pen write ink office formal" },
  { emoji: "✒️", keywords: "nib pen ink calligraphy formal" },
  { emoji: "🖍️", keywords: "crayon color draw school kids" },
  { emoji: "📎", keywords: "paperclip attach clip office school" },
  { emoji: "🖇️", keywords: "paperclips linked attach clip office" },
  { emoji: "📏", keywords: "ruler measure straight school office" },
  { emoji: "📐", keywords: "ruler triangle measure angle school" },
  { emoji: "✂️", keywords: "scissors cut craft school office" },
  { emoji: "🗑️", keywords: "trash bin wastebasket delete remove office" },
  { emoji: "📁", keywords: "folder file organize office school" },
  { emoji: "📂", keywords: "open folder file organize office" },
  { emoji: "🗂️", keywords: "dividers tabs organize files office" },
  { emoji: "🗃️", keywords: "card box file cabinet storage office" },
  { emoji: "🗄️", keywords: "file cabinet drawer storage office" },
  { emoji: "📋", keywords: "clipboard notes list office school" },
  { emoji: "📄", keywords: "page document sheet paper office" },
  { emoji: "📃", keywords: "page curl document paper office" },
  { emoji: "📑", keywords: "bookmark tabs documents office" },
  { emoji: "🗒️", keywords: "notepad spiral notes office school" },
  { emoji: "📓", keywords: "notebook journal school office" },
  { emoji: "📔", keywords: "notebook cover journal diary school" },
  { emoji: "📒", keywords: "ledger notebook accounts office" },
  { emoji: "📕", keywords: "book closed school study" },
  { emoji: "📗", keywords: "book green school study" },
  { emoji: "📘", keywords: "book blue school study" },
  { emoji: "📙", keywords: "book orange school study" },
  { emoji: "📖", keywords: "open book read study school" },
  { emoji: "🔖", keywords: "bookmark save page reading school" },
  { emoji: "🏷️", keywords: "tag label price sticker office" },
  { emoji: "✉️", keywords: "envelope letter mail office send" },
  { emoji: "📧", keywords: "email electronic mail office" },
  { emoji: "📨", keywords: "incoming envelope mail receive office" },
  { emoji: "📩", keywords: "envelope arrow mail send office" },
  { emoji: "📬", keywords: "mailbox open raised flag post" },
  { emoji: "📫", keywords: "mailbox closed raised flag post" },
  { emoji: "📭", keywords: "mailbox open lowered flag empty" },
  { emoji: "📪", keywords: "mailbox closed lowered flag empty" },
  { emoji: "📮", keywords: "postbox mail send letter post office" },
  { emoji: "📥", keywords: "inbox in tray receive documents office" },
  { emoji: "📤", keywords: "outbox out tray send documents office" },
  { emoji: "🎒", keywords: "backpack school bag student carry" },
  { emoji: "🎓", keywords: "graduation cap school degree university" },
  { emoji: "🏫", keywords: "school building education class" },
  { emoji: "🖥️", keywords: "desktop computer monitor office work" },
  { emoji: "⌨️", keywords: "keyboard type input office computer" },
  { emoji: "🖱️", keywords: "mouse click computer office" },
  { emoji: "🖨️", keywords: "printer print document office" },
  { emoji: "📠", keywords: "fax machine send document office" },
  { emoji: "💾", keywords: "floppy disk save storage old" },
  { emoji: "💿", keywords: "disc cd storage data" },
  { emoji: "📀", keywords: "dvd disc storage data" },
  { emoji: "🧮", keywords: "abacus calculate math count school" },
  { emoji: "🔎", keywords: "magnifying glass right search investigate" },
  { emoji: "🗓️", keywords: "calendar spiral schedule plan office" },
  { emoji: "📆", keywords: "tear-off calendar date schedule" },
  { emoji: "📅", keywords: "calendar date event schedule office" },
  { emoji: "🗳️", keywords: "ballot box vote election office" },
  { emoji: "📯", keywords: "postal horn announce mail post" },
  { emoji: "📣", keywords: "megaphone announce office broadcast" },
  { emoji: "📢", keywords: "loudspeaker announce broadcast office" },
  // Spooky / Horror
  { emoji: "💀", keywords: "skull death dead skeleton spooky danger scary" },
  { emoji: "☠️", keywords: "skull crossbones death poison danger spooky pirate" },
  { emoji: "👻", keywords: "ghost spooky halloween boo spirit scary" },
  { emoji: "🎃", keywords: "pumpkin jack lantern halloween spooky fall" },
  { emoji: "😈", keywords: "devil evil horns naughty spooky demon" },
  { emoji: "👿", keywords: "devil angry evil horns mad spooky demon imp" },
  { emoji: "👹", keywords: "ogre monster demon japanese spooky scary" },
  { emoji: "👺", keywords: "goblin monster tengu mask japanese spooky" },
  { emoji: "🤡", keywords: "clown creepy circus scary funny spooky" },
  { emoji: "👽", keywords: "alien ufo space extraterrestrial spooky" },
  { emoji: "👾", keywords: "monster alien space invader game creature spooky" },
  { emoji: "🧟", keywords: "zombie undead monster halloween spooky scary walking dead" },
  { emoji: "🧛", keywords: "vampire dracula bite blood spooky halloween" },
  { emoji: "🧙", keywords: "wizard witch mage magic spell fantasy" },
  { emoji: "🧌", keywords: "troll monster creature fantasy spooky ugly" },
  { emoji: "🧞", keywords: "genie wish magic lamp spirit djinn fantasy" },
  { emoji: "🦇", keywords: "bat night halloween fly cave spooky" },
  { emoji: "🕷️", keywords: "spider web creepy bug spooky halloween" },
  { emoji: "🕸️", keywords: "spider web cobweb creepy spooky halloween dusty" },
  { emoji: "🦂", keywords: "scorpion sting venom danger desert" },
  { emoji: "🐍", keywords: "snake serpent reptile slither danger" },
  { emoji: "⚰️", keywords: "coffin casket death funeral grave spooky halloween" },
  { emoji: "🪦", keywords: "headstone tombstone grave gravestone rip death cemetery spooky" },
  { emoji: "🦴", keywords: "bone skeleton skull dead anatomy spooky" },
  { emoji: "🩸", keywords: "blood drop red gore spooky horror" },
  { emoji: "🥀", keywords: "wilted flower dead rose sad dying" },
  { emoji: "🌑", keywords: "new moon dark night black spooky" },
  { emoji: "🕯️", keywords: "candle flame light wax prayer spooky" },
  { emoji: "🔮", keywords: "crystal ball magic fortune future mystic spooky" },
  { emoji: "🧿", keywords: "evil eye nazar amulet protection charm" },
  // Appearance / People / Hair / Grooming
  { emoji: "💇", keywords: "haircut hair hairstyle hairdo wig salon barber cut grooming trim style appearance look" },
  { emoji: "💇‍♂️", keywords: "man male guy haircut hair hairstyle wig barber cut grooming trim style appearance" },
  { emoji: "💇‍♀️", keywords: "woman female haircut hair hairstyle wig salon cut grooming trim style appearance" },
  { emoji: "💈", keywords: "barber barbershop pole haircut hair hairstyle shave grooming salon appearance" },
  { emoji: "🪮", keywords: "comb hair hairstyle wig detangle brush grooming style afro pick appearance" },
  { emoji: "🪒", keywords: "razor shave shaving grooming beard face hair blade appearance" },
  { emoji: "💆", keywords: "massage face spa facial skincare self care relax grooming appearance" },
  { emoji: "🧖", keywords: "sauna spa steam self care relax face skincare grooming appearance" },
  { emoji: "💅", keywords: "nails manicure polish beauty salon self care grooming appearance" },
  { emoji: "💄", keywords: "lipstick makeup beauty cosmetics face glam grooming appearance" },
  { emoji: "🪞", keywords: "mirror reflection look face beauty grooming vanity appearance check" },
  { emoji: "🧑", keywords: "person human adult face people someone gender neutral" },
  { emoji: "👨", keywords: "man male guy person human face dude adult" },
  { emoji: "👩", keywords: "woman female lady person human face adult" },
  { emoji: "🧔", keywords: "man beard bearded face facial hair male person human" },
  { emoji: "👱", keywords: "blond blonde hair person face man woman human" },
  { emoji: "👨‍🦰", keywords: "man red hair ginger redhead face male human hairstyle" },
  { emoji: "👩‍🦰", keywords: "woman red hair ginger redhead face female human hairstyle" },
  { emoji: "👨‍🦱", keywords: "man curly hair face male human hairstyle" },
  { emoji: "👩‍🦱", keywords: "woman curly hair face female human hairstyle" },
  { emoji: "👨‍🦳", keywords: "man white gray hair senior face male human hairstyle" },
  { emoji: "👨‍🦲", keywords: "man bald no hair face male human shaved" },
  { emoji: "🙂", keywords: "face smile slight happy person human" },
  { emoji: "🤳", keywords: "selfie phone photo face self picture appearance" },
  { emoji: "👤", keywords: "silhouette person human user profile face anonymous" },
  { emoji: "👓", keywords: "glasses spectacles eyewear face look appearance" },
  { emoji: "🕶️", keywords: "sunglasses shades cool face look appearance" },
];



interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [taskEmoji, setTaskEmoji] = useState("📝");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<QuestAttachment[]>([]);
  const [duration, setDuration] = useState<string>("30");

  // Duration slider helpers
  // Snap points in minutes: 5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240+
  const DURATION_SNAPS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240];
  const formatDuration = (min: number): string => {
    if (min < 60) return `${min} min`;
    if (min === 60) return "1 hr";
    if (min < 120) return `1 hr ${min - 60} min`;
    if (min === 120) return "2 hrs";
    if (min < 180) return `2 hrs ${min - 120} min`;
    if (min === 180) return "3 hrs";
    if (min < 240) return `3 hrs ${min - 180} min`;
    return "4+ hrs";
  };
  // Slider index (0–11) maps to DURATION_SNAPS
  const durationIndex = DURATION_SNAPS.indexOf(parseInt(duration)) === -1
    ? DURATION_SNAPS.findIndex(s => s >= parseInt(duration)) || 4
    : DURATION_SNAPS.indexOf(parseInt(duration));
  const setDurationByIndex = (idx: number) => setDuration(String(DURATION_SNAPS[Math.max(0, Math.min(idx, DURATION_SNAPS.length - 1))]));
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [importance, setImportance] = useState<string>("Medium");
  const [kanbanStage, setKanbanStage] = useState<string>("To Do");
  const [recurType, setRecurType] = useState<string>("one-time");
  const [businessWorkFilter, setBusinessWorkFilter] = useState<string>("General");
  const [campaign, setCampaign] = useState<string>("unassigned");
  const [assignedTo, setAssignedTo] = useState<string>("Alex");
  const [assigneeInput, setAssigneeInput] = useState<string>("Alex");
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Known assignee names — seed list, grows via localStorage
  const SEED_ASSIGNEES = ["Alex"];
  const getKnownAssignees = (): string[] => {
    try {
      const stored = JSON.parse(localStorage.getItem("pq-known-assignees") || "[]");
      const merged = Array.from(new Set([...SEED_ASSIGNEES, ...stored])) as string[];
      return merged;
    } catch { return SEED_ASSIGNEES; }
  };
  const saveAssignee = (name: string) => {
    if (!name.trim()) return;
    try {
      const existing = getKnownAssignees();
      if (!existing.includes(name.trim())) {
        localStorage.setItem("pq-known-assignees", JSON.stringify([...existing, name.trim()]));
      }
    } catch {}
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setShowAssigneeSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  
  // Checkbox filters
  const [apple, setApple] = useState(false);
  const [smartPrep, setSmartPrep] = useState(false);
  const [delegationTask, setDelegationTask] = useState(false);
  const [velin, setVelin] = useState(false);

  // Auto-calculate gold value whenever duration or importance changes
  const goldValue = calculateGoldValue(importance, parseInt(duration) || 30);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
      toast({
        title: "✓ Quest Created!",
        description: "Your new quest has been added to the list.",
      });
      resetForm();
      onOpenChange(false);
      
      // Refetch tasks after delays to pick up auto-categorized skillTags
      // Try at 1s and 3s in case AI categorization takes longer
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 1000);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Quest",
        description: error.message || "Failed to create quest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setTaskEmoji("📝");
    setDescription("");
    setAttachments([]);
    setDuration("30");
    // goldValue is auto-calculated, no need to reset
    setDueDate(undefined);
    setImportance("Medium");
    setKanbanStage("To Do");
    setRecurType("one-time");
    setBusinessWorkFilter("General");
    setCampaign("unassigned");
    setAssignedTo("Alex");
    setAssigneeInput("Alex");
    setApple(false);
    setSmartPrep(false);
    setDelegationTask(false);
    setVelin(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a quest title.",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Due Date Required",
        description: "Please select a due date for this quest.",
        variant: "destructive",
      });
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    // goldValue is auto-calculated, no need to validate user input

    const taskData = {
      title: title.trim(),
      emoji: taskEmoji,
      description: description.trim(),
      details: description.trim(),
      attachments,
      duration: durationNum,
      goldValue, // Use auto-calculated value
      dueDate: dueDate ? dueDate.toISOString() : null,
      importance,
      kanbanStage,
      recurType,
      businessWorkFilter,
      campaign,
      apple,
      smartPrep,
      delegationTask,
      velin,
      assignedTo: assignedTo.trim() || "Alex",
      completed: false,
      skillTags: [], // Initialize with empty array
    };

    saveAssignee(assignedTo.trim() || "Alex");
    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/40 text-yellow-100">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Create New Quest
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-yellow-200">
              Quest Title <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              {/* Emoji picker */}
              <Popover open={emojiPickerOpen} onOpenChange={(open) => { setEmojiPickerOpen(open); if (!open) setEmojiSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 h-10 w-10 flex items-center justify-center text-xl rounded-md border border-yellow-600/30 bg-slate-800/50 hover:bg-slate-700/70 hover:border-yellow-500/60 transition-colors cursor-pointer"
                    title="Choose emoji"
                  >
                    {taskEmoji}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-slate-900 border-yellow-600/40" side="bottom" align="start">
                  <p className="text-xs text-yellow-400/70 mb-2 font-semibold">Choose quest icon</p>
                  {/* Search */}
                  <input
                    type="text"
                    value={emojiSearch}
                    onChange={e => setEmojiSearch(e.target.value)}
                    placeholder="Search emojis… (e.g. fire, goal, money)"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 placeholder:text-slate-500 outline-none focus:border-yellow-600/60 mb-2"
                  />
                  <div className="h-56 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                    {emojiSearch.trim() ? (
                      /* Search results */
                      (() => {
                        const q = emojiSearch.trim().toLowerCase();
                        const matches = EMOJI_SEARCH_MAP.filter(e =>
                          e.keywords.includes(q) || e.emoji === q
                        ).map(e => e.emoji);
                        // Also include any category emojis that happen to contain the search char
                        const allCatEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
                        const extra = allCatEmojis.filter(e => !matches.includes(e) && e.toLowerCase().includes(q));
                        const seen = new Set<string>();
                        const results = [...matches, ...extra].filter(e => seen.has(e) ? false : seen.add(e) && true);
                        return results.length > 0 ? (
                          <div className="grid grid-cols-10 gap-0.5">
                            {results.map(e => (
                              <button key={e} type="button"
                                onClick={() => { setTaskEmoji(e); setEmojiPickerOpen(false); setEmojiSearch(""); }}
                                className={cn("h-7 w-7 flex items-center justify-center text-base rounded hover:bg-yellow-600/20 transition-colors", taskEmoji === e && "bg-yellow-600/30 ring-1 ring-yellow-500/50")}
                              >{e}</button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 text-center pt-4">No emojis found for "{emojiSearch}"</p>
                        );
                      })()
                    ) : (
                      /* Categorized browse */
                      EMOJI_CATEGORIES.map(cat => (
                        <div key={cat.label}>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{cat.label}</p>
                          <div className="grid grid-cols-10 gap-0.5">
                            {cat.emojis.map(e => (
                              <button key={e} type="button"
                                onClick={() => { setTaskEmoji(e); setEmojiPickerOpen(false); }}
                                className={cn("h-7 w-7 flex items-center justify-center text-base rounded hover:bg-yellow-600/20 transition-colors", taskEmoji === e && "bg-yellow-600/30 ring-1 ring-yellow-500/50")}
                              >{e}</button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quest title..."
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
                maxLength={200}
              />
            </div>
            <p className="text-xs text-yellow-400/60">{title.length}/200 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-yellow-200">
              Description <span className="text-yellow-400/50 text-xs">(optional)</span>
            </Label>
            <AttachmentArea attachments={attachments} onChange={setAttachments}>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this quest..."
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40 min-h-[100px] pr-10"
                maxLength={2000}
              />
            </AttachmentArea>
            <p className="text-xs text-yellow-400/60">{description.length}/2000 characters</p>
          </div>

          {/* Duration — Slider */}
          <div className="space-y-3">
            <Label className="text-yellow-200">
              Duration <span className="text-red-400">*</span>
            </Label>
            <div className="flex items-center gap-4 px-1">
              <span className="text-xs text-yellow-400/60 w-10 shrink-0">5 min</span>
              <Slider
                min={0}
                max={DURATION_SNAPS.length - 1}
                step={1}
                value={[durationIndex]}
                onValueChange={([val]) => setDurationByIndex(val)}
                className="flex-1"
              />
              <span className="text-xs text-yellow-400/60 w-12 shrink-0 text-right">4+ hrs</span>
            </div>
            <div className="text-center">
              <span className="inline-block bg-yellow-600/20 border border-yellow-600/40 rounded-full px-4 py-1 text-yellow-200 font-semibold text-sm">
                ⏱ {formatDuration(parseInt(duration))}
              </span>
            </div>
          </div>

          {/* Gold Value (auto-calculated) */}
          <div className="space-y-2">
            <Label htmlFor="goldValue" className="text-yellow-200 flex items-center gap-2">
              Gold Reward
              <span className="text-xs text-yellow-400/60">(Auto-calculated)</span>
            </Label>
            <Input
              id="goldValue"
              type="number"
              value={goldValue}
              readOnly
              disabled
              className="bg-slate-800/30 border-yellow-600/20 text-yellow-300 cursor-not-allowed"
            />
            <p className="text-xs text-yellow-400/60">
              Based on duration ({duration} min) and importance ({importance})
            </p>
          </div>


          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-yellow-200">Due Date <span className="text-red-400">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-slate-800/50 border-yellow-600/30 text-yellow-100 hover:bg-slate-700/50 hover:text-yellow-100",
                    !dueDate && "text-red-400/80 border-red-500/40"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date (required)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-yellow-600/40">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="bg-slate-800 text-yellow-100"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label htmlFor="importance" className="text-yellow-200">
              Importance
            </Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="Pareto">� Pareto (Critical)</SelectItem>
                <SelectItem value="High">� High</SelectItem>
                <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                <SelectItem value="Medium">� Medium</SelectItem>
                <SelectItem value="Med-Low">� Med-Low</SelectItem>
                <SelectItem value="Low">� Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kanban Stage */}
          <div className="space-y-2">
            <Label htmlFor="kanbanStage" className="text-yellow-200">
              Kanban Stage
            </Label>
            <Select value={kanbanStage} onValueChange={setKanbanStage}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label htmlFor="recurType" className="text-yellow-200">
              Recurrence
            </Label>
            <Select value={recurType} onValueChange={setRecurType}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="one-time">⏳ One-time</SelectItem>
                <SelectItem value="daily">� Daily</SelectItem>
                <SelectItem value="every other day">📆 Every Other Day</SelectItem>
                <SelectItem value="2x week">2️⃣ 2x Week</SelectItem>
                <SelectItem value="3x week">3️⃣ 3x Week</SelectItem>
                <SelectItem value="weekly">📅 Weekly</SelectItem>
                <SelectItem value="2x month">📅 2x Month</SelectItem>
                <SelectItem value="monthly">📅 Monthly</SelectItem>
                <SelectItem value="every 2 months">📅 Every 2 Months</SelectItem>
                <SelectItem value="quarterly">� Quarterly</SelectItem>
                <SelectItem value="every 6 months">📅 Every 6 Months</SelectItem>
                <SelectItem value="yearly">📅 Yearly</SelectItem>
                <SelectItem value="every 2 years">🗓️ Every 2 Years</SelectItem>
                <SelectItem value="every 3 years">🗓️ Every 3 Years</SelectItem>
                <SelectItem value="every 5 years">🗓️ Every 5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business/Work Filter */}
          <div className="space-y-2">
            <Label htmlFor="businessWorkFilter" className="text-yellow-200">
              Business/Work Filter
            </Label>
            <Select value={businessWorkFilter} onValueChange={setBusinessWorkFilter}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Apple">Apple</SelectItem>
                <SelectItem value="MW">MW</SelectItem>
                <SelectItem value="GPR">GPR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-yellow-200">
              Assigned To
            </Label>
            <div className="relative" ref={assigneeRef}>
              <Input
                id="assignedTo"
                value={assigneeInput}
                onChange={(e) => {
                  setAssigneeInput(e.target.value);
                  setAssignedTo(e.target.value);
                  setShowAssigneeSuggestions(true);
                }}
                onFocus={() => setShowAssigneeSuggestions(true)}
                placeholder="e.g. Alex"
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
              />
              {showAssigneeSuggestions && (
                <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-yellow-600/30 rounded-md shadow-lg overflow-hidden">
                  {getKnownAssignees()
                    .filter(n => n.toLowerCase().includes(assigneeInput.toLowerCase()))
                    .map(name => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setAssignedTo(name); setAssigneeInput(name); setShowAssigneeSuggestions(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-yellow-600/20 transition-colors ${assignedTo === name ? "bg-yellow-600/20 text-yellow-200" : "text-slate-200"}`}
                      >
                        👤 {name}
                      </button>
                    ))
                  }
                  {assigneeInput.trim() && !getKnownAssignees().includes(assigneeInput.trim()) && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setAssignedTo(assigneeInput.trim()); setShowAssigneeSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-600/20 transition-colors border-t border-slate-700"
                    >
                      ➕ Add "{assigneeInput.trim()}" as new assignee
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Campaign */}
          <div className="space-y-2">
            <Label htmlFor="campaign" className="text-yellow-200">
              Questline
            </Label>            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="Main">Main</SelectItem>
                <SelectItem value="Side">Side</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="border-yellow-600/40 text-yellow-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 font-semibold"
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Quest"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
