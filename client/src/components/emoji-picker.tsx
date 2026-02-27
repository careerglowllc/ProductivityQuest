import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Comprehensive keyword-searchable emoji database
const EMOJI_DATA: Array<{ emoji: string; keywords: string[] }> = [
  // Common / General
  { emoji: "📝", keywords: ["note", "memo", "write", "writing", "pencil", "paper", "document", "task"] },
  { emoji: "📋", keywords: ["clipboard", "list", "task", "checklist", "todo", "plan"] },
  { emoji: "📌", keywords: ["pin", "pushpin", "location", "mark", "important", "save"] },
  { emoji: "📎", keywords: ["paperclip", "clip", "attach", "attachment"] },
  { emoji: "✏️", keywords: ["pencil", "write", "edit", "draw", "writing"] },
  { emoji: "🖊️", keywords: ["pen", "write", "sign", "ink", "writing"] },
  { emoji: "✍️", keywords: ["writing", "hand", "write", "compose", "author"] },
  { emoji: "📖", keywords: ["book", "read", "open", "reading", "study", "learn"] },
  { emoji: "📚", keywords: ["books", "library", "study", "read", "reading", "learn", "education", "school"] },
  { emoji: "💡", keywords: ["idea", "lightbulb", "light", "bulb", "think", "creative", "innovation", "bright"] },
  { emoji: "🎯", keywords: ["target", "goal", "aim", "bullseye", "focus", "dart", "objective"] },
  { emoji: "⭐", keywords: ["star", "favorite", "important", "special", "gold", "rating"] },
  { emoji: "🌟", keywords: ["star", "glowing", "sparkle", "shine", "bright", "special"] },
  { emoji: "💪", keywords: ["strong", "muscle", "arm", "strength", "power", "gym", "flex", "workout", "exercise"] },
  { emoji: "🚀", keywords: ["rocket", "launch", "fast", "speed", "startup", "ship", "space", "fly"] },
  { emoji: "🔥", keywords: ["fire", "hot", "flame", "lit", "trending", "popular", "urgent", "burn"] },
  { emoji: "⚡", keywords: ["lightning", "electric", "bolt", "fast", "quick", "energy", "power", "thunder", "zap"] },
  { emoji: "💎", keywords: ["diamond", "gem", "jewel", "precious", "valuable", "luxury"] },
  { emoji: "🏆", keywords: ["trophy", "award", "winner", "champion", "prize", "gold", "first", "achievement"] },
  { emoji: "🎉", keywords: ["party", "celebrate", "celebration", "confetti", "congrats", "birthday"] },
  { emoji: "✅", keywords: ["check", "done", "complete", "yes", "correct", "approve", "green"] },
  { emoji: "❌", keywords: ["cross", "no", "wrong", "delete", "remove", "cancel", "error", "fail"] },
  { emoji: "❗", keywords: ["exclamation", "important", "alert", "warning", "attention", "urgent"] },
  { emoji: "❓", keywords: ["question", "ask", "help", "what", "why", "how", "unknown"] },
  { emoji: "⚠️", keywords: ["warning", "caution", "alert", "danger", "attention"] },

  // Hearts / Emotions
  { emoji: "❤️", keywords: ["heart", "love", "red", "like", "favorite"] },
  { emoji: "💛", keywords: ["heart", "yellow", "love", "gold"] },
  { emoji: "💚", keywords: ["heart", "green", "love", "nature", "health"] },
  { emoji: "💙", keywords: ["heart", "blue", "love", "trust"] },
  { emoji: "💜", keywords: ["heart", "purple", "love"] },
  { emoji: "🤍", keywords: ["heart", "white", "love", "pure"] },
  { emoji: "🖤", keywords: ["heart", "black", "love", "dark"] },
  { emoji: "🧡", keywords: ["heart", "orange", "love", "warm"] },
  { emoji: "💗", keywords: ["heart", "growing", "love", "pink"] },
  { emoji: "😀", keywords: ["smile", "happy", "face", "grin", "joy"] },
  { emoji: "😊", keywords: ["smile", "happy", "blush", "pleased", "warm"] },
  { emoji: "😎", keywords: ["cool", "sunglasses", "awesome", "confident"] },
  { emoji: "🤔", keywords: ["think", "thinking", "hmm", "consider", "wonder"] },
  { emoji: "😴", keywords: ["sleep", "tired", "rest", "zzz", "nap", "sleepy"] },
  { emoji: "😤", keywords: ["angry", "frustrated", "mad", "huff"] },
  { emoji: "🥳", keywords: ["party", "celebrate", "birthday", "fun", "excited"] },
  { emoji: "🤩", keywords: ["star", "excited", "starstruck", "wow", "amazing"] },
  { emoji: "😇", keywords: ["angel", "innocent", "good", "halo", "blessed"] },
  { emoji: "🥰", keywords: ["love", "hearts", "adore", "affection", "sweet"] },
  { emoji: "😂", keywords: ["laugh", "lol", "funny", "cry", "tears", "joy", "haha"] },
  { emoji: "🥲", keywords: ["smile", "tear", "sad", "happy", "bittersweet"] },
  { emoji: "😏", keywords: ["smirk", "sly", "suggestive", "flirt"] },
  { emoji: "😡", keywords: ["angry", "mad", "rage", "furious", "red"] },
  { emoji: "😱", keywords: ["scream", "fear", "scared", "shock", "horror", "omg"] },
  { emoji: "🤯", keywords: ["mind", "blown", "explode", "shock", "surprise", "wow"] },
  { emoji: "🫠", keywords: ["melt", "melting", "disappear", "hot", "embarrassed"] },

  // Work / Business
  { emoji: "💼", keywords: ["briefcase", "work", "business", "job", "office", "professional", "career"] },
  { emoji: "🏢", keywords: ["office", "building", "work", "company", "corporate", "business"] },
  { emoji: "💻", keywords: ["laptop", "computer", "code", "coding", "programming", "work", "tech", "dev"] },
  { emoji: "🖥️", keywords: ["desktop", "computer", "monitor", "screen", "pc", "mac"] },
  { emoji: "📊", keywords: ["chart", "graph", "data", "analytics", "statistics", "bar", "report"] },
  { emoji: "📈", keywords: ["chart", "growth", "increase", "up", "trending", "profit", "stocks"] },
  { emoji: "📉", keywords: ["chart", "decrease", "down", "loss", "decline", "stocks"] },
  { emoji: "📧", keywords: ["email", "mail", "inbox", "message", "letter", "send"] },
  { emoji: "📞", keywords: ["phone", "call", "telephone", "contact", "ring"] },
  { emoji: "📱", keywords: ["phone", "mobile", "cell", "smartphone", "iphone", "app"] },
  { emoji: "🗂️", keywords: ["folder", "file", "organize", "divider", "tab", "index"] },
  { emoji: "📁", keywords: ["folder", "file", "directory", "organize"] },
  { emoji: "📅", keywords: ["calendar", "date", "schedule", "event", "plan", "day"] },
  { emoji: "📆", keywords: ["calendar", "date", "schedule", "tearoff"] },
  { emoji: "🗓️", keywords: ["calendar", "date", "schedule", "spiral"] },
  { emoji: "⏰", keywords: ["clock", "alarm", "time", "wake", "timer", "morning"] },
  { emoji: "⏳", keywords: ["hourglass", "time", "timer", "wait", "sand", "patience"] },
  { emoji: "⏱️", keywords: ["stopwatch", "timer", "time", "speed", "race"] },
  { emoji: "🔔", keywords: ["bell", "notification", "alert", "ring", "reminder"] },
  { emoji: "📣", keywords: ["megaphone", "announce", "announcement", "loud", "marketing"] },
  { emoji: "💰", keywords: ["money", "bag", "rich", "cash", "finance", "dollar", "wealth", "gold"] },
  { emoji: "💵", keywords: ["money", "dollar", "cash", "bill", "pay", "payment", "finance"] },
  { emoji: "💳", keywords: ["credit", "card", "payment", "pay", "bank", "buy"] },
  { emoji: "🏦", keywords: ["bank", "money", "finance", "institution"] },
  { emoji: "🤝", keywords: ["handshake", "deal", "agreement", "partner", "meeting", "collaborate"] },
  { emoji: "👔", keywords: ["tie", "business", "formal", "suit", "professional", "work"] },
  { emoji: "🎤", keywords: ["microphone", "speak", "presentation", "talk", "sing", "voice", "podcast"] },
  { emoji: "🖨️", keywords: ["printer", "print", "document", "paper", "office"] },

  // Health / Fitness
  { emoji: "🏃", keywords: ["run", "running", "jog", "exercise", "fitness", "cardio", "sprint"] },
  { emoji: "🧘", keywords: ["yoga", "meditate", "meditation", "zen", "calm", "mindfulness", "stretch"] },
  { emoji: "💊", keywords: ["pill", "medicine", "drug", "pharmacy", "health", "medication", "vitamin"] },
  { emoji: "🩺", keywords: ["stethoscope", "doctor", "medical", "health", "hospital", "checkup"] },
  { emoji: "🏋️", keywords: ["weightlifting", "gym", "exercise", "workout", "fitness", "weights", "lift", "strength"] },
  { emoji: "🚴", keywords: ["bike", "bicycle", "cycling", "ride", "exercise", "cardio"] },
  { emoji: "🏊", keywords: ["swim", "swimming", "pool", "water", "exercise"] },
  { emoji: "🧠", keywords: ["brain", "mind", "think", "smart", "intelligence", "mental", "mindset", "psychology"] },
  { emoji: "🍎", keywords: ["apple", "fruit", "health", "food", "red", "healthy", "diet"] },
  { emoji: "🥗", keywords: ["salad", "healthy", "food", "diet", "green", "vegetable", "nutrition"] },
  { emoji: "💧", keywords: ["water", "drop", "hydrate", "drink", "liquid", "hydration"] },
  { emoji: "🫁", keywords: ["lungs", "breath", "breathing", "respiratory", "health"] },
  { emoji: "❤️‍🩹", keywords: ["healing", "heart", "health", "recover", "mend", "bandage"] },
  { emoji: "🦷", keywords: ["tooth", "teeth", "dental", "dentist", "brush", "mouth"] },
  { emoji: "👁️", keywords: ["eye", "see", "vision", "look", "watch", "sight", "observe"] },
  { emoji: "💉", keywords: ["syringe", "needle", "injection", "vaccine", "shot", "blood", "medical"] },
  { emoji: "🧬", keywords: ["dna", "gene", "genetic", "science", "biology", "health"] },
  { emoji: "🌿", keywords: ["herb", "plant", "natural", "nature", "green", "herbal", "organic"] },
  { emoji: "🧘‍♀️", keywords: ["yoga", "meditate", "woman", "zen", "calm", "mindfulness"] },
  { emoji: "🏌️", keywords: ["golf", "sport", "swing", "club"] },
  { emoji: "🤸", keywords: ["gymnastics", "cartwheel", "flexible", "acrobat", "exercise"] },

  // Learning / Education
  { emoji: "🎓", keywords: ["graduation", "school", "university", "degree", "education", "graduate", "cap", "study"] },
  { emoji: "🧪", keywords: ["test", "tube", "science", "experiment", "lab", "chemistry", "research"] },
  { emoji: "🔬", keywords: ["microscope", "science", "research", "lab", "biology", "study"] },
  { emoji: "🔭", keywords: ["telescope", "space", "astronomy", "star", "observe", "science"] },
  { emoji: "🌍", keywords: ["earth", "globe", "world", "planet", "global", "geography", "travel"] },
  { emoji: "🗺️", keywords: ["map", "world", "travel", "geography", "explore", "navigate"] },
  { emoji: "🎨", keywords: ["art", "paint", "palette", "creative", "design", "color", "draw", "artist"] },
  { emoji: "🎵", keywords: ["music", "note", "song", "melody", "sound", "listen", "audio"] },
  { emoji: "🎶", keywords: ["music", "notes", "song", "melody", "sound"] },
  { emoji: "🎹", keywords: ["piano", "keyboard", "music", "keys", "instrument", "play"] },
  { emoji: "🎸", keywords: ["guitar", "music", "rock", "instrument", "play", "band"] },
  { emoji: "📐", keywords: ["ruler", "triangle", "math", "geometry", "measure", "angle"] },
  { emoji: "📏", keywords: ["ruler", "straight", "measure", "length", "math"] },
  { emoji: "🧮", keywords: ["abacus", "math", "calculate", "count", "numbers"] },
  { emoji: "🔢", keywords: ["numbers", "math", "count", "1234", "digits"] },
  { emoji: "🔤", keywords: ["letters", "alphabet", "abc", "language", "word", "text"] },
  { emoji: "🗣️", keywords: ["speak", "talk", "voice", "language", "say", "speech"] },
  { emoji: "💬", keywords: ["speech", "bubble", "chat", "message", "talk", "comment", "conversation"] },

  // Life / Home
  { emoji: "🏠", keywords: ["house", "home", "building", "residence", "family"] },
  { emoji: "🏡", keywords: ["house", "home", "garden", "yard", "building"] },
  { emoji: "🛒", keywords: ["cart", "shopping", "buy", "store", "grocery", "purchase"] },
  { emoji: "🧹", keywords: ["broom", "clean", "sweep", "cleaning", "tidy", "chore"] },
  { emoji: "🧺", keywords: ["basket", "laundry", "clothes", "wash", "chore"] },
  { emoji: "🍳", keywords: ["cook", "cooking", "egg", "fry", "kitchen", "breakfast", "food"] },
  { emoji: "🚗", keywords: ["car", "drive", "auto", "vehicle", "road", "transport"] },
  { emoji: "🚙", keywords: ["car", "suv", "drive", "vehicle", "transport"] },
  { emoji: "🏍️", keywords: ["motorcycle", "bike", "ride", "motor", "motorbike"] },
  { emoji: "✈️", keywords: ["airplane", "travel", "fly", "flight", "plane", "trip", "vacation"] },
  { emoji: "🌅", keywords: ["sunrise", "morning", "dawn", "sun", "beach", "early"] },
  { emoji: "🌄", keywords: ["sunrise", "mountain", "morning", "dawn"] },
  { emoji: "🎂", keywords: ["cake", "birthday", "celebrate", "party", "candle"] },
  { emoji: "🎁", keywords: ["gift", "present", "birthday", "surprise", "wrap", "box"] },
  { emoji: "👨‍👩‍👧‍👦", keywords: ["family", "parents", "children", "kids", "home"] },
  { emoji: "🐶", keywords: ["dog", "puppy", "pet", "animal", "woof"] },
  { emoji: "🐱", keywords: ["cat", "kitten", "pet", "animal", "meow"] },
  { emoji: "🌸", keywords: ["flower", "cherry", "blossom", "spring", "pink", "nature"] },
  { emoji: "🌻", keywords: ["sunflower", "flower", "sun", "yellow", "nature", "garden"] },
  { emoji: "🌈", keywords: ["rainbow", "colorful", "colors", "weather", "pride", "joy"] },
  { emoji: "☀️", keywords: ["sun", "sunny", "weather", "bright", "day", "warm", "summer"] },
  { emoji: "🌙", keywords: ["moon", "night", "crescent", "sleep", "dark", "evening"] },
  { emoji: "🛏️", keywords: ["bed", "sleep", "rest", "bedroom", "nap"] },
  { emoji: "🪴", keywords: ["plant", "pot", "garden", "grow", "green", "houseplant"] },

  // Fun / Entertainment
  { emoji: "🎮", keywords: ["game", "gaming", "controller", "video", "play", "console", "xbox", "playstation"] },
  { emoji: "🎲", keywords: ["dice", "game", "roll", "board", "gamble", "random", "chance"] },
  { emoji: "🎭", keywords: ["theater", "drama", "mask", "acting", "perform", "play", "comedy", "tragedy"] },
  { emoji: "🎬", keywords: ["movie", "film", "clapper", "cinema", "video", "direct", "action"] },
  { emoji: "📺", keywords: ["tv", "television", "watch", "show", "screen", "streaming"] },
  { emoji: "🎪", keywords: ["circus", "tent", "show", "carnival", "fun"] },
  { emoji: "⚽", keywords: ["soccer", "football", "ball", "sport", "game", "kick"] },
  { emoji: "🏀", keywords: ["basketball", "ball", "sport", "game", "hoop", "nba"] },
  { emoji: "🎾", keywords: ["tennis", "ball", "sport", "racket", "game"] },
  { emoji: "🏈", keywords: ["football", "american", "sport", "ball", "nfl"] },
  { emoji: "⛳", keywords: ["golf", "flag", "sport", "hole"] },
  { emoji: "🎳", keywords: ["bowling", "ball", "pins", "sport", "game"] },
  { emoji: "🃏", keywords: ["joker", "card", "game", "play", "wild"] },
  { emoji: "🧩", keywords: ["puzzle", "piece", "game", "solve", "jigsaw"] },
  { emoji: "📸", keywords: ["camera", "photo", "picture", "snap", "photography"] },
  { emoji: "📷", keywords: ["camera", "photo", "picture", "photography"] },
  { emoji: "🎧", keywords: ["headphones", "music", "listen", "audio", "podcast"] },

  // Food / Drink
  { emoji: "☕", keywords: ["coffee", "tea", "cup", "hot", "drink", "cafe", "morning", "espresso"] },
  { emoji: "🍕", keywords: ["pizza", "food", "slice", "italian", "cheese"] },
  { emoji: "🍔", keywords: ["burger", "hamburger", "food", "fast", "meal"] },
  { emoji: "🍜", keywords: ["noodles", "ramen", "soup", "asian", "food", "bowl"] },
  { emoji: "🍣", keywords: ["sushi", "japanese", "food", "fish", "rice"] },
  { emoji: "🥑", keywords: ["avocado", "food", "healthy", "green", "guacamole"] },
  { emoji: "🍓", keywords: ["strawberry", "fruit", "berry", "red", "food"] },
  { emoji: "🍰", keywords: ["cake", "dessert", "sweet", "slice", "birthday", "food"] },
  { emoji: "🍪", keywords: ["cookie", "biscuit", "sweet", "snack", "food"] },
  { emoji: "🧁", keywords: ["cupcake", "dessert", "sweet", "cake", "food"] },
  { emoji: "🥤", keywords: ["drink", "cup", "soda", "juice", "beverage", "straw"] },
  { emoji: "🍷", keywords: ["wine", "glass", "drink", "alcohol", "red", "dinner"] },
  { emoji: "🍺", keywords: ["beer", "drink", "mug", "alcohol", "bar"] },
  { emoji: "🫖", keywords: ["teapot", "tea", "drink", "pour", "hot"] },
  { emoji: "🥐", keywords: ["croissant", "bread", "pastry", "french", "breakfast", "food"] },
  { emoji: "🌮", keywords: ["taco", "mexican", "food", "shell", "meat"] },
  { emoji: "🍱", keywords: ["bento", "box", "japanese", "food", "lunch", "meal"] },
  { emoji: "🥘", keywords: ["pot", "food", "stew", "cook", "meal"] },
  { emoji: "🍝", keywords: ["spaghetti", "pasta", "italian", "food", "noodle"] },
  { emoji: "🥞", keywords: ["pancake", "breakfast", "food", "stack", "syrup"] },

  // Nature
  { emoji: "🌳", keywords: ["tree", "deciduous", "nature", "green", "forest", "wood"] },
  { emoji: "🌲", keywords: ["tree", "evergreen", "pine", "christmas", "forest", "nature"] },
  { emoji: "🌴", keywords: ["palm", "tree", "tropical", "beach", "island", "vacation"] },
  { emoji: "🌵", keywords: ["cactus", "desert", "plant", "dry", "nature"] },
  { emoji: "🌊", keywords: ["wave", "ocean", "sea", "water", "surf", "beach", "tide"] },
  { emoji: "🏔️", keywords: ["mountain", "snow", "peak", "hike", "nature", "climb"] },
  { emoji: "⛰️", keywords: ["mountain", "nature", "hike", "climb", "outdoor"] },
  { emoji: "🌋", keywords: ["volcano", "eruption", "lava", "mountain", "nature"] },
  { emoji: "🏝️", keywords: ["island", "tropical", "beach", "vacation", "palm"] },
  { emoji: "🌤️", keywords: ["sun", "cloud", "weather", "partly", "sunny"] },
  { emoji: "🌧️", keywords: ["rain", "cloud", "weather", "rainy", "wet"] },
  { emoji: "❄️", keywords: ["snow", "cold", "ice", "winter", "freeze", "snowflake"] },
  { emoji: "🦋", keywords: ["butterfly", "insect", "nature", "beautiful", "colorful"] },
  { emoji: "🐝", keywords: ["bee", "honey", "buzz", "insect", "nature"] },
  { emoji: "🌺", keywords: ["flower", "hibiscus", "nature", "tropical", "pink"] },
  { emoji: "🍀", keywords: ["clover", "luck", "lucky", "four", "leaf", "green", "irish"] },
  { emoji: "🍂", keywords: ["leaf", "fall", "autumn", "leaves", "nature"] },
  { emoji: "🌹", keywords: ["rose", "flower", "red", "love", "romantic", "nature"] },

  // Tools / Symbols
  { emoji: "⚙️", keywords: ["gear", "settings", "config", "mechanical", "tool", "cog"] },
  { emoji: "🔧", keywords: ["wrench", "tool", "fix", "repair", "mechanic", "settings"] },
  { emoji: "🔨", keywords: ["hammer", "tool", "build", "construct", "fix", "nail"] },
  { emoji: "🛠️", keywords: ["tools", "hammer", "wrench", "fix", "repair", "build", "maintenance"] },
  { emoji: "🔩", keywords: ["nut", "bolt", "screw", "hardware", "tool", "fix"] },
  { emoji: "🔑", keywords: ["key", "lock", "unlock", "access", "password", "security"] },
  { emoji: "🗝️", keywords: ["key", "old", "vintage", "unlock", "secret"] },
  { emoji: "🔒", keywords: ["lock", "locked", "secure", "security", "private", "password"] },
  { emoji: "🔓", keywords: ["lock", "unlock", "open", "unlocked", "access"] },
  { emoji: "📍", keywords: ["pin", "location", "map", "place", "marker", "gps"] },
  { emoji: "🏷️", keywords: ["tag", "label", "price", "name", "category"] },
  { emoji: "🔖", keywords: ["bookmark", "save", "mark", "tag", "ribbon"] },
  { emoji: "💭", keywords: ["thought", "bubble", "think", "dream", "idea"] },
  { emoji: "🚫", keywords: ["no", "forbidden", "stop", "prohibited", "ban", "block"] },
  { emoji: "♻️", keywords: ["recycle", "green", "environment", "reuse", "eco"] },
  { emoji: "🔗", keywords: ["link", "chain", "url", "connect", "web"] },
  { emoji: "📤", keywords: ["outbox", "send", "upload", "share", "export"] },
  { emoji: "📥", keywords: ["inbox", "receive", "download", "import"] },
  { emoji: "🗑️", keywords: ["trash", "delete", "garbage", "bin", "remove", "waste"] },
  { emoji: "✂️", keywords: ["scissors", "cut", "trim", "edit", "snip"] },

  // People / Gestures
  { emoji: "👋", keywords: ["wave", "hello", "hi", "bye", "hand", "greet"] },
  { emoji: "👍", keywords: ["thumbs", "up", "good", "like", "approve", "yes", "ok"] },
  { emoji: "👎", keywords: ["thumbs", "down", "bad", "dislike", "no", "disapprove"] },
  { emoji: "👏", keywords: ["clap", "applause", "bravo", "congrats", "hands"] },
  { emoji: "🙏", keywords: ["pray", "please", "thank", "thanks", "hope", "hands", "namaste", "grateful"] },
  { emoji: "🤞", keywords: ["fingers", "crossed", "luck", "hope", "wish"] },
  { emoji: "✌️", keywords: ["peace", "victory", "two", "fingers", "v"] },
  { emoji: "🫡", keywords: ["salute", "respect", "yes", "sir", "acknowledge"] },
  { emoji: "🧑‍💻", keywords: ["developer", "programmer", "coder", "tech", "computer", "work"] },
  { emoji: "🧑‍🎓", keywords: ["student", "graduate", "school", "study", "learn", "education"] },
  { emoji: "🧑‍🏫", keywords: ["teacher", "instructor", "professor", "educate", "school"] },
  { emoji: "🧑‍⚕️", keywords: ["doctor", "nurse", "medical", "health", "hospital"] },
  { emoji: "🧑‍🍳", keywords: ["cook", "chef", "food", "kitchen", "restaurant"] },
  { emoji: "🧑‍🔧", keywords: ["mechanic", "fix", "repair", "tool", "plumber"] },
  { emoji: "🧑‍💼", keywords: ["office", "worker", "business", "professional", "corporate"] },
  { emoji: "🧑‍🎨", keywords: ["artist", "paint", "creative", "art", "design"] },

  // Transport / Travel
  { emoji: "🚌", keywords: ["bus", "transport", "public", "commute", "ride"] },
  { emoji: "🚂", keywords: ["train", "locomotive", "rail", "transport", "travel"] },
  { emoji: "🛳️", keywords: ["ship", "cruise", "boat", "travel", "sea", "ocean"] },
  { emoji: "🚁", keywords: ["helicopter", "fly", "transport", "air"] },
  { emoji: "🛫", keywords: ["airplane", "departure", "takeoff", "travel", "fly", "airport"] },
  { emoji: "🏖️", keywords: ["beach", "vacation", "sand", "umbrella", "holiday", "summer"] },
  { emoji: "⛺", keywords: ["tent", "camp", "camping", "outdoor", "nature", "hike"] },

  // Misc useful
  { emoji: "🧲", keywords: ["magnet", "attract", "magnetic", "pull"] },
  { emoji: "🔮", keywords: ["crystal", "ball", "magic", "fortune", "predict", "future", "mystic"] },
  { emoji: "🧿", keywords: ["evil", "eye", "nazar", "protection", "amulet", "charm"] },
  { emoji: "🪄", keywords: ["wand", "magic", "wizard", "spell", "trick"] },
  { emoji: "👑", keywords: ["crown", "king", "queen", "royal", "ruler", "leader", "boss"] },
  { emoji: "💍", keywords: ["ring", "diamond", "wedding", "marriage", "engaged", "jewelry"] },
  { emoji: "🧸", keywords: ["teddy", "bear", "toy", "stuffed", "cute", "childhood"] },
  { emoji: "🎀", keywords: ["ribbon", "bow", "gift", "present", "decorative", "pink"] },
  { emoji: "🏅", keywords: ["medal", "award", "achievement", "sport", "gold", "first"] },
  { emoji: "🥇", keywords: ["gold", "medal", "first", "winner", "champion", "award"] },
  { emoji: "🥈", keywords: ["silver", "medal", "second", "award"] },
  { emoji: "🥉", keywords: ["bronze", "medal", "third", "award"] },
  { emoji: "⏸️", keywords: ["pause", "stop", "break", "wait", "hold"] },
  { emoji: "▶️", keywords: ["play", "start", "go", "begin", "video", "resume"] },
  { emoji: "⏭️", keywords: ["next", "skip", "forward", "fast"] },
  { emoji: "🔁", keywords: ["repeat", "loop", "cycle", "again", "recur", "recurring"] },
  { emoji: "🔀", keywords: ["shuffle", "random", "mix", "swap"] },
  { emoji: "💤", keywords: ["sleep", "zzz", "tired", "rest", "nap", "snore"] },
  { emoji: "🌀", keywords: ["cyclone", "spiral", "dizzy", "spin", "tornado"] },
  { emoji: "🩹", keywords: ["bandage", "heal", "fix", "patch", "medical", "wound"] },
  { emoji: "🪞", keywords: ["mirror", "reflection", "look", "beauty", "vanity", "face"] },
  { emoji: "💄", keywords: ["lipstick", "makeup", "beauty", "cosmetics", "fashion"] },
  { emoji: "🪥", keywords: ["toothbrush", "teeth", "dental", "brush", "hygiene", "clean"] },
  { emoji: "🧼", keywords: ["soap", "clean", "wash", "hygiene", "hand"] },
  { emoji: "💅", keywords: ["nail", "polish", "manicure", "beauty", "salon", "nails"] },
  { emoji: "🏥", keywords: ["hospital", "medical", "doctor", "health", "emergency", "clinic"] },
  { emoji: "⚖️", keywords: ["balance", "scale", "justice", "law", "legal", "weigh", "fair"] },
  { emoji: "📜", keywords: ["scroll", "document", "ancient", "paper", "certificate", "decree"] },
  { emoji: "🧾", keywords: ["receipt", "bill", "invoice", "purchase", "transaction"] },
  { emoji: "🪡", keywords: ["needle", "sew", "sewing", "thread", "stitch", "tailor", "fabric"] },
  { emoji: "🧵", keywords: ["thread", "sew", "sewing", "needle", "fabric", "string"] },
  { emoji: "🧶", keywords: ["yarn", "knit", "knitting", "crochet", "wool", "craft"] },
  { emoji: "🪜", keywords: ["ladder", "climb", "step", "up", "height"] },
  { emoji: "🧯", keywords: ["extinguisher", "fire", "safety", "emergency"] },
  { emoji: "🔦", keywords: ["flashlight", "torch", "light", "dark", "search"] },
  { emoji: "🕯️", keywords: ["candle", "light", "flame", "wax", "romantic", "prayer"] },
  { emoji: "💣", keywords: ["bomb", "explode", "explosion", "danger", "boom"] },
  { emoji: "🎈", keywords: ["balloon", "party", "birthday", "celebrate", "float"] },
  { emoji: "🎗️", keywords: ["ribbon", "awareness", "cause", "charity", "support"] },
  { emoji: "🛡️", keywords: ["shield", "protect", "defense", "security", "guard", "safe"] },
  { emoji: "⚔️", keywords: ["swords", "fight", "battle", "crossed", "combat", "war"] },
  { emoji: "🗡️", keywords: ["sword", "dagger", "knife", "blade", "weapon"] },
  { emoji: "🏹", keywords: ["bow", "arrow", "archery", "shoot", "hunt"] },
  { emoji: "🧭", keywords: ["compass", "navigate", "direction", "north", "explore"] },
  { emoji: "🔍", keywords: ["search", "magnify", "glass", "find", "look", "zoom", "inspect", "investigate"] },
  { emoji: "🔎", keywords: ["search", "magnify", "glass", "find", "look", "zoom"] },
  { emoji: "📮", keywords: ["mailbox", "post", "letter", "mail", "send"] },
  { emoji: "🧰", keywords: ["toolbox", "tools", "repair", "fix", "kit", "maintenance"] },
  { emoji: "⛏️", keywords: ["pick", "mine", "mining", "dig", "rock"] },
  { emoji: "🪓", keywords: ["axe", "chop", "wood", "cut", "lumber"] },
  { emoji: "🔐", keywords: ["lock", "key", "secure", "encrypted", "password", "private"] },
  { emoji: "🌱", keywords: ["seedling", "grow", "plant", "sprout", "new", "beginning", "growth"] },
  { emoji: "🪵", keywords: ["wood", "log", "timber", "lumber", "tree"] },
  { emoji: "🎖️", keywords: ["medal", "military", "honor", "badge", "award", "decoration"] },
  { emoji: "🦾", keywords: ["robot", "arm", "mechanical", "prosthetic", "strong", "bionic"] },
  { emoji: "🧳", keywords: ["luggage", "travel", "suitcase", "trip", "vacation", "bag"] },
  { emoji: "🛍️", keywords: ["shopping", "bag", "bags", "buy", "store", "retail", "purchase"] },
  { emoji: "🪙", keywords: ["coin", "money", "gold", "currency", "token", "payment"] },
  { emoji: "💸", keywords: ["money", "fly", "spend", "spending", "expensive", "waste", "cash"] },
  { emoji: "🎼", keywords: ["music", "score", "treble", "clef", "sheet", "compose"] },
  { emoji: "🎻", keywords: ["violin", "music", "instrument", "classical", "string"] },
  { emoji: "🥁", keywords: ["drum", "music", "instrument", "beat", "percussion"] },
  { emoji: "🎺", keywords: ["trumpet", "music", "instrument", "horn", "brass"] },
  { emoji: "🎷", keywords: ["saxophone", "sax", "music", "instrument", "jazz"] },
  { emoji: "🐸", keywords: ["frog", "toad", "animal", "amphibian", "green"] },
  { emoji: "🐔", keywords: ["chicken", "rooster", "bird", "farm", "animal"] },
  { emoji: "🦅", keywords: ["eagle", "bird", "fly", "freedom", "america", "soar"] },
  { emoji: "🐻", keywords: ["bear", "animal", "grizzly", "brown", "nature"] },
  { emoji: "🦊", keywords: ["fox", "animal", "clever", "red", "nature"] },
  { emoji: "🐺", keywords: ["wolf", "animal", "howl", "nature", "wild"] },
  { emoji: "🦁", keywords: ["lion", "animal", "king", "brave", "wild", "roar"] },
  { emoji: "🐍", keywords: ["snake", "reptile", "animal", "slither", "python"] },
  { emoji: "🦈", keywords: ["shark", "fish", "ocean", "sea", "danger", "animal"] },
  { emoji: "🐙", keywords: ["octopus", "sea", "ocean", "animal", "tentacle"] },
  { emoji: "🐢", keywords: ["turtle", "tortoise", "slow", "shell", "animal"] },
  { emoji: "🐘", keywords: ["elephant", "animal", "big", "large", "trunk", "memory"] },
  { emoji: "🦄", keywords: ["unicorn", "magic", "fantasy", "horse", "mythical", "rainbow"] },
  { emoji: "🐉", keywords: ["dragon", "fantasy", "fire", "mythical", "legend"] },

  // Clothing / Fashion
  { emoji: "👕", keywords: ["shirt", "tshirt", "t-shirt", "top", "clothing", "clothes", "wear", "casual"] },
  { emoji: "👚", keywords: ["blouse", "shirt", "top", "clothing", "clothes", "woman", "fashion"] },
  { emoji: "👗", keywords: ["dress", "clothing", "clothes", "woman", "fashion", "formal", "gown"] },
  { emoji: "👖", keywords: ["jeans", "pants", "trousers", "clothing", "clothes", "denim"] },
  { emoji: "🧥", keywords: ["coat", "jacket", "clothing", "clothes", "winter", "warm", "outerwear"] },
  { emoji: "👒", keywords: ["hat", "sun", "summer", "clothing", "clothes", "fashion", "woman"] },
  { emoji: "🧢", keywords: ["cap", "hat", "baseball", "clothing", "clothes", "casual", "sport"] },
  { emoji: "🎩", keywords: ["hat", "top", "formal", "magic", "gentleman", "fancy", "clothing"] },
  { emoji: "🧣", keywords: ["scarf", "winter", "warm", "clothing", "clothes", "neck", "cold"] },
  { emoji: "🧤", keywords: ["gloves", "winter", "warm", "clothing", "clothes", "cold", "hands"] },
  { emoji: "🧦", keywords: ["socks", "clothing", "clothes", "feet", "warm", "wear"] },
  { emoji: "👞", keywords: ["shoe", "shoes", "formal", "dress", "clothing", "footwear", "man"] },
  { emoji: "👟", keywords: ["shoe", "shoes", "sneaker", "running", "athletic", "sport", "clothing", "footwear"] },
  { emoji: "👠", keywords: ["heel", "heels", "shoe", "shoes", "woman", "fashion", "formal", "clothing"] },
  { emoji: "👡", keywords: ["sandal", "shoe", "shoes", "woman", "summer", "clothing", "footwear"] },
  { emoji: "👢", keywords: ["boot", "boots", "shoe", "shoes", "woman", "clothing", "footwear", "winter"] },
  { emoji: "🥾", keywords: ["boot", "boots", "hiking", "shoe", "shoes", "outdoor", "clothing", "footwear"] },
  { emoji: "👙", keywords: ["bikini", "swimsuit", "swim", "beach", "summer", "clothing"] },
  { emoji: "🩱", keywords: ["swimsuit", "swim", "one-piece", "beach", "clothing"] },
  { emoji: "🩲", keywords: ["briefs", "underwear", "clothing", "swim"] },
  { emoji: "🩳", keywords: ["shorts", "clothing", "clothes", "summer", "casual"] },
  { emoji: "👘", keywords: ["kimono", "japanese", "clothing", "clothes", "robe", "traditional"] },
  { emoji: "🥻", keywords: ["sari", "indian", "clothing", "clothes", "traditional", "dress"] },
  { emoji: "🩴", keywords: ["flip-flop", "sandal", "thong", "beach", "summer", "shoe", "clothing"] },
  { emoji: "👜", keywords: ["handbag", "purse", "bag", "fashion", "accessory"] },
  { emoji: "👝", keywords: ["clutch", "bag", "purse", "fashion", "accessory"] },
  { emoji: "🎒", keywords: ["backpack", "bag", "school", "travel", "hiking"] },
  { emoji: "👓", keywords: ["glasses", "eyeglasses", "reading", "vision", "nerd", "accessory"] },
  { emoji: "🕶️", keywords: ["sunglasses", "cool", "sun", "shades", "fashion", "accessory"] },
  { emoji: "🥽", keywords: ["goggles", "swim", "safety", "lab", "ski", "eyewear"] },
  { emoji: "🧳", keywords: ["luggage", "travel", "suitcase", "trip", "vacation", "bag"] },

  // More Food / Drink
  { emoji: "🍗", keywords: ["chicken", "leg", "meat", "food", "drumstick", "poultry"] },
  { emoji: "🥩", keywords: ["steak", "meat", "beef", "food", "red", "cut"] },
  { emoji: "🥓", keywords: ["bacon", "meat", "pork", "breakfast", "food"] },
  { emoji: "🍞", keywords: ["bread", "loaf", "food", "toast", "bake", "carb"] },
  { emoji: "🥖", keywords: ["baguette", "bread", "french", "food", "bakery"] },
  { emoji: "🥨", keywords: ["pretzel", "snack", "food", "bread", "twisted"] },
  { emoji: "🧀", keywords: ["cheese", "food", "dairy", "yellow", "wedge"] },
  { emoji: "🥚", keywords: ["egg", "food", "breakfast", "cook", "poultry"] },
  { emoji: "🥜", keywords: ["peanut", "nut", "snack", "food", "allergy"] },
  { emoji: "🍫", keywords: ["chocolate", "candy", "sweet", "food", "bar", "dessert"] },
  { emoji: "🍬", keywords: ["candy", "sweet", "food", "sugar", "treat"] },
  { emoji: "🍿", keywords: ["popcorn", "movie", "snack", "food", "cinema"] },
  { emoji: "🧃", keywords: ["juice", "box", "drink", "beverage", "kid"] },
  { emoji: "🥛", keywords: ["milk", "glass", "drink", "dairy", "white"] },
  { emoji: "🍵", keywords: ["tea", "green", "cup", "drink", "hot", "matcha"] },
  { emoji: "🍩", keywords: ["donut", "doughnut", "food", "sweet", "dessert", "snack"] },
  { emoji: "🥧", keywords: ["pie", "food", "dessert", "bake", "sweet", "thanksgiving"] },
  { emoji: "🍨", keywords: ["ice cream", "dessert", "sweet", "food", "sundae"] },
  { emoji: "🍦", keywords: ["ice cream", "cone", "dessert", "sweet", "food", "summer"] },
  { emoji: "🥪", keywords: ["sandwich", "food", "bread", "lunch", "meal", "sub"] },
  { emoji: "🌯", keywords: ["burrito", "food", "wrap", "mexican", "meal"] },
  { emoji: "🥙", keywords: ["pita", "food", "falafel", "wrap", "stuffed"] },
  { emoji: "🫕", keywords: ["fondue", "food", "cheese", "chocolate", "dip", "melt"] },
  { emoji: "🍲", keywords: ["stew", "pot", "food", "soup", "hot", "meal"] },
  { emoji: "🍛", keywords: ["curry", "rice", "food", "indian", "meal"] },
  { emoji: "🍤", keywords: ["shrimp", "prawn", "food", "seafood", "fried"] },
  { emoji: "🥦", keywords: ["broccoli", "vegetable", "food", "green", "healthy"] },
  { emoji: "🥕", keywords: ["carrot", "vegetable", "food", "orange", "healthy"] },
  { emoji: "🌽", keywords: ["corn", "vegetable", "food", "yellow", "cob", "maize"] },
  { emoji: "🍅", keywords: ["tomato", "vegetable", "food", "red", "sauce"] },
  { emoji: "🫐", keywords: ["blueberry", "berry", "fruit", "food", "blue"] },
  { emoji: "🍌", keywords: ["banana", "fruit", "food", "yellow", "potassium"] },
  { emoji: "🍊", keywords: ["orange", "fruit", "food", "citrus", "tangerine"] },
  { emoji: "🍋", keywords: ["lemon", "fruit", "food", "citrus", "sour", "yellow"] },
  { emoji: "🍇", keywords: ["grapes", "fruit", "food", "wine", "purple"] },
  { emoji: "🍑", keywords: ["peach", "fruit", "food", "fuzzy", "pink"] },
  { emoji: "🍉", keywords: ["watermelon", "fruit", "food", "summer", "red", "green"] },
  { emoji: "🥝", keywords: ["kiwi", "fruit", "food", "green", "tropical"] },
  { emoji: "🥭", keywords: ["mango", "fruit", "food", "tropical", "orange", "sweet"] },
  { emoji: "🫑", keywords: ["pepper", "bell", "vegetable", "food", "green"] },
  { emoji: "🧅", keywords: ["onion", "vegetable", "food", "cook", "ingredient"] },
  { emoji: "🧄", keywords: ["garlic", "vegetable", "food", "cook", "ingredient", "flavor"] },
  { emoji: "🍄", keywords: ["mushroom", "food", "fungus", "vegetable", "nature"] },

  // Household / Home items
  { emoji: "🪑", keywords: ["chair", "seat", "sit", "furniture", "home", "office"] },
  { emoji: "🛋️", keywords: ["couch", "sofa", "furniture", "home", "living room", "relax"] },
  { emoji: "🚿", keywords: ["shower", "bath", "clean", "water", "bathroom", "wash"] },
  { emoji: "🛁", keywords: ["bathtub", "bath", "clean", "water", "bathroom", "relax"] },
  { emoji: "🪣", keywords: ["bucket", "pail", "water", "clean", "mop"] },
  { emoji: "🧽", keywords: ["sponge", "clean", "wash", "dishes", "scrub"] },
  { emoji: "🫧", keywords: ["bubbles", "clean", "soap", "wash", "fun"] },
  { emoji: "🪤", keywords: ["mousetrap", "trap", "pest", "mouse", "catch"] },
  { emoji: "🧴", keywords: ["lotion", "bottle", "cream", "sunscreen", "moisturizer", "skincare"] },
  { emoji: "🪒", keywords: ["razor", "shave", "grooming", "hygiene", "blade"] },
  { emoji: "🚽", keywords: ["toilet", "bathroom", "restroom", "clean"] },
  { emoji: "🧻", keywords: ["toilet paper", "roll", "tissue", "bathroom", "clean"] },
  { emoji: "🪠", keywords: ["plunger", "toilet", "fix", "bathroom", "clog"] },
  { emoji: "🗄️", keywords: ["cabinet", "file", "storage", "furniture", "office", "organize"] },
  { emoji: "🪟", keywords: ["window", "glass", "house", "home", "view", "clean"] },
  { emoji: "🚪", keywords: ["door", "entrance", "exit", "house", "home", "open", "close"] },
  { emoji: "💡", keywords: ["idea", "lightbulb", "light", "bulb", "think", "creative"] },
  { emoji: "🔌", keywords: ["plug", "electric", "power", "outlet", "charge", "connect"] },
  { emoji: "🔋", keywords: ["battery", "power", "energy", "charge", "low", "full"] },
  { emoji: "📻", keywords: ["radio", "music", "listen", "broadcast", "news", "fm"] },
  { emoji: "🧲", keywords: ["magnet", "attract", "magnetic", "pull"] },

  // Weather / Sky
  { emoji: "🌪️", keywords: ["tornado", "wind", "storm", "twister", "weather"] },
  { emoji: "🌩️", keywords: ["thunder", "lightning", "storm", "cloud", "weather"] },
  { emoji: "🌨️", keywords: ["snow", "cloud", "weather", "winter", "cold", "blizzard"] },
  { emoji: "🌫️", keywords: ["fog", "foggy", "mist", "weather", "haze"] },
  { emoji: "🌬️", keywords: ["wind", "blow", "breeze", "weather", "face"] },
  { emoji: "🌡️", keywords: ["thermometer", "temperature", "hot", "cold", "weather", "fever"] },
  { emoji: "☔", keywords: ["umbrella", "rain", "weather", "wet", "rainy"] },
  { emoji: "⛈️", keywords: ["storm", "thunder", "lightning", "rain", "weather"] },
  { emoji: "🌥️", keywords: ["cloud", "sun", "partly", "weather", "overcast"] },
  { emoji: "☁️", keywords: ["cloud", "cloudy", "weather", "overcast", "sky"] },
  { emoji: "🌦️", keywords: ["rain", "sun", "weather", "shower", "partly"] },
  { emoji: "☃️", keywords: ["snowman", "snow", "winter", "cold", "frosty"] },

  // More Sports / Activities
  { emoji: "⚾", keywords: ["baseball", "ball", "sport", "game", "pitch", "mlb"] },
  { emoji: "🏐", keywords: ["volleyball", "ball", "sport", "game", "beach"] },
  { emoji: "🏓", keywords: ["ping pong", "table tennis", "paddle", "sport", "game"] },
  { emoji: "🏸", keywords: ["badminton", "shuttlecock", "sport", "racket", "game"] },
  { emoji: "🥊", keywords: ["boxing", "glove", "fight", "sport", "punch"] },
  { emoji: "🥋", keywords: ["martial arts", "karate", "judo", "sport", "uniform", "gi"] },
  { emoji: "⛷️", keywords: ["ski", "skiing", "snow", "winter", "sport", "mountain"] },
  { emoji: "🏂", keywords: ["snowboard", "snow", "winter", "sport", "mountain"] },
  { emoji: "🏄", keywords: ["surf", "surfing", "wave", "ocean", "beach", "sport"] },
  { emoji: "🤿", keywords: ["dive", "diving", "scuba", "snorkel", "underwater", "ocean"] },
  { emoji: "🧗", keywords: ["climb", "climbing", "rock", "sport", "boulder", "wall"] },
  { emoji: "🪂", keywords: ["parachute", "skydive", "jump", "fall", "air"] },
  { emoji: "🏇", keywords: ["horse", "racing", "jockey", "ride", "sport"] },
  { emoji: "⛸️", keywords: ["ice", "skating", "skate", "winter", "sport", "rink"] },
  { emoji: "🛹", keywords: ["skateboard", "skate", "ride", "sport", "board"] },
  { emoji: "🛷", keywords: ["sled", "sledge", "snow", "winter", "slide"] },
  { emoji: "🎿", keywords: ["ski", "skiing", "snow", "winter", "sport", "mountain"] },
  { emoji: "🏋️‍♀️", keywords: ["weightlifting", "woman", "gym", "exercise", "workout", "fitness"] },
  { emoji: "🤾", keywords: ["handball", "sport", "throw", "ball", "game"] },
  { emoji: "🤺", keywords: ["fencing", "sword", "sport", "fight", "duel"] },
  { emoji: "🥅", keywords: ["goal", "net", "hockey", "sport", "score"] },
  { emoji: "🏒", keywords: ["hockey", "ice", "sport", "stick", "puck", "nhl"] },
  { emoji: "🥍", keywords: ["lacrosse", "stick", "sport", "ball", "game"] },
  { emoji: "🏑", keywords: ["field hockey", "sport", "stick", "ball"] },
  { emoji: "🏏", keywords: ["cricket", "bat", "sport", "ball", "game"] },

  // More Animals
  { emoji: "🐕", keywords: ["dog", "pet", "animal", "guide", "service"] },
  { emoji: "🐈", keywords: ["cat", "pet", "animal", "house", "feline"] },
  { emoji: "🐦", keywords: ["bird", "animal", "fly", "tweet", "wing"] },
  { emoji: "🦜", keywords: ["parrot", "bird", "colorful", "talk", "animal", "tropical"] },
  { emoji: "🐧", keywords: ["penguin", "bird", "animal", "cold", "arctic", "cute"] },
  { emoji: "🐴", keywords: ["horse", "animal", "ride", "equestrian", "stable"] },
  { emoji: "🐮", keywords: ["cow", "animal", "farm", "milk", "moo", "cattle"] },
  { emoji: "🐷", keywords: ["pig", "animal", "farm", "oink", "piggy"] },
  { emoji: "🐑", keywords: ["sheep", "animal", "farm", "wool", "lamb"] },
  { emoji: "🐐", keywords: ["goat", "animal", "farm", "greatest", "billy"] },
  { emoji: "🦆", keywords: ["duck", "bird", "animal", "water", "quack", "pond"] },
  { emoji: "🦉", keywords: ["owl", "bird", "animal", "night", "wise", "hoot"] },
  { emoji: "🐬", keywords: ["dolphin", "ocean", "sea", "animal", "smart", "swim"] },
  { emoji: "🐳", keywords: ["whale", "ocean", "sea", "animal", "big", "splash"] },
  { emoji: "🐠", keywords: ["fish", "tropical", "ocean", "sea", "animal", "swim"] },
  { emoji: "🦎", keywords: ["lizard", "reptile", "animal", "gecko", "chameleon"] },
  { emoji: "🐛", keywords: ["bug", "insect", "animal", "caterpillar", "worm"] },
  { emoji: "🕷️", keywords: ["spider", "web", "insect", "creepy", "animal"] },
  { emoji: "🦀", keywords: ["crab", "animal", "sea", "ocean", "beach", "seafood"] },
  { emoji: "🐌", keywords: ["snail", "slow", "animal", "shell", "slug"] },
  { emoji: "🦇", keywords: ["bat", "animal", "night", "halloween", "fly", "cave"] },
  { emoji: "🦧", keywords: ["orangutan", "monkey", "ape", "animal", "primate"] },
  { emoji: "🐒", keywords: ["monkey", "animal", "primate", "ape", "banana"] },
  { emoji: "🦥", keywords: ["sloth", "animal", "slow", "lazy", "hang", "tree"] },

  // Symbols / Signs
  { emoji: "🔴", keywords: ["red", "circle", "dot", "stop", "color"] },
  { emoji: "🟠", keywords: ["orange", "circle", "dot", "color"] },
  { emoji: "🟡", keywords: ["yellow", "circle", "dot", "color"] },
  { emoji: "🟢", keywords: ["green", "circle", "dot", "go", "color"] },
  { emoji: "🔵", keywords: ["blue", "circle", "dot", "color"] },
  { emoji: "🟣", keywords: ["purple", "circle", "dot", "color"] },
  { emoji: "⬛", keywords: ["black", "square", "block", "color"] },
  { emoji: "⬜", keywords: ["white", "square", "block", "color"] },
  { emoji: "🟥", keywords: ["red", "square", "block", "color"] },
  { emoji: "🟧", keywords: ["orange", "square", "block", "color"] },
  { emoji: "🟨", keywords: ["yellow", "square", "block", "color"] },
  { emoji: "🟩", keywords: ["green", "square", "block", "color"] },
  { emoji: "🟦", keywords: ["blue", "square", "block", "color"] },
  { emoji: "🟪", keywords: ["purple", "square", "block", "color"] },
  { emoji: "🔶", keywords: ["diamond", "orange", "shape", "large"] },
  { emoji: "🔷", keywords: ["diamond", "blue", "shape", "large"] },
  { emoji: "🔸", keywords: ["diamond", "orange", "shape", "small"] },
  { emoji: "🔹", keywords: ["diamond", "blue", "shape", "small"] },
  { emoji: "💠", keywords: ["diamond", "blue", "cute", "shape"] },
  { emoji: "🔲", keywords: ["button", "black", "square"] },
  { emoji: "🔳", keywords: ["button", "white", "square"] },
  { emoji: "⏺️", keywords: ["record", "circle", "red", "dot"] },
  { emoji: "➡️", keywords: ["arrow", "right", "direction", "next", "forward"] },
  { emoji: "⬅️", keywords: ["arrow", "left", "direction", "back", "previous"] },
  { emoji: "⬆️", keywords: ["arrow", "up", "direction", "increase"] },
  { emoji: "⬇️", keywords: ["arrow", "down", "direction", "decrease"] },
  { emoji: "↗️", keywords: ["arrow", "up right", "diagonal", "northeast", "increase"] },
  { emoji: "↘️", keywords: ["arrow", "down right", "diagonal", "southeast"] },
  { emoji: "🔄", keywords: ["refresh", "reload", "arrows", "cycle", "sync", "update"] },
  { emoji: "♾️", keywords: ["infinity", "forever", "infinite", "loop", "endless"] },
  { emoji: "💲", keywords: ["dollar", "money", "price", "cost", "currency", "sign"] },
  { emoji: "⚛️", keywords: ["atom", "science", "physics", "nuclear", "react", "symbol"] },
  { emoji: "☮️", keywords: ["peace", "symbol", "sign", "love", "harmony"] },
  { emoji: "☯️", keywords: ["yin yang", "balance", "harmony", "duality", "zen"] },
  { emoji: "✝️", keywords: ["cross", "christian", "religion", "faith", "church"] },
  { emoji: "☪️", keywords: ["star", "crescent", "islam", "muslim", "religion"] },
  { emoji: "🕉️", keywords: ["om", "hindu", "buddhist", "religion", "meditation", "yoga"] },
  { emoji: "✡️", keywords: ["star", "david", "jewish", "judaism", "religion"] },
  { emoji: "💯", keywords: ["hundred", "perfect", "score", "100", "full", "complete"] },
  { emoji: "‼️", keywords: ["exclamation", "double", "important", "urgent", "attention"] },
  { emoji: "⁉️", keywords: ["question", "exclamation", "surprise", "what", "interrobang"] },

  // More Technology
  { emoji: "⌨️", keywords: ["keyboard", "type", "typing", "computer", "input", "keys"] },
  { emoji: "🖱️", keywords: ["mouse", "click", "computer", "cursor", "pointer"] },
  { emoji: "🖲️", keywords: ["trackball", "computer", "input", "control"] },
  { emoji: "💾", keywords: ["floppy", "disk", "save", "data", "storage", "retro"] },
  { emoji: "💿", keywords: ["cd", "disc", "compact", "music", "data"] },
  { emoji: "📀", keywords: ["dvd", "disc", "movie", "data", "video"] },
  { emoji: "🎙️", keywords: ["microphone", "studio", "podcast", "record", "voice", "audio"] },
  { emoji: "📡", keywords: ["satellite", "dish", "signal", "broadcast", "antenna", "communication"] },
  { emoji: "🔊", keywords: ["speaker", "loud", "volume", "sound", "audio", "music"] },
  { emoji: "🔇", keywords: ["mute", "silent", "quiet", "speaker", "no sound"] },
  { emoji: "📶", keywords: ["signal", "bars", "wifi", "network", "connection", "mobile"] },
  { emoji: "🌐", keywords: ["globe", "internet", "web", "world", "network", "global", "website"] },
  { emoji: "🖼️", keywords: ["frame", "picture", "image", "photo", "art", "painting"] },

  // More Flags / Travel
  { emoji: "🏁", keywords: ["checkered", "flag", "race", "finish", "win", "racing"] },
  { emoji: "🚩", keywords: ["flag", "red", "warning", "marker", "triangular"] },
  { emoji: "🎌", keywords: ["flags", "crossed", "japanese", "celebrate"] },
  { emoji: "🏳️", keywords: ["flag", "white", "surrender", "peace"] },
  { emoji: "🏴", keywords: ["flag", "black", "pirate"] },
  { emoji: "🗽", keywords: ["statue", "liberty", "new york", "america", "landmark", "travel"] },
  { emoji: "🗼", keywords: ["tokyo", "tower", "japan", "landmark", "travel"] },
  { emoji: "🗿", keywords: ["moai", "statue", "easter island", "stone", "face"] },
  { emoji: "🏛️", keywords: ["museum", "classical", "building", "government", "column", "greek"] },
  { emoji: "⛪", keywords: ["church", "religion", "building", "prayer", "worship"] },
  { emoji: "🕌", keywords: ["mosque", "islam", "religion", "building", "prayer"] },
  { emoji: "🏰", keywords: ["castle", "medieval", "kingdom", "royal", "building", "fantasy"] },
  { emoji: "🎡", keywords: ["ferris wheel", "amusement", "park", "carnival", "ride", "fun"] },
  { emoji: "🎢", keywords: ["roller coaster", "amusement", "park", "ride", "fun", "thrill"] },
  { emoji: "🎠", keywords: ["carousel", "merry go round", "horse", "ride", "fun"] },
  { emoji: "⛲", keywords: ["fountain", "water", "park", "garden", "city"] },
  { emoji: "🌉", keywords: ["bridge", "night", "city", "golden gate", "travel"] },
  { emoji: "🗻", keywords: ["mount fuji", "mountain", "japan", "snow", "travel"] },

  // Additional Misc
  { emoji: "🎃", keywords: ["pumpkin", "halloween", "jack", "lantern", "fall", "autumn", "spooky"] },
  { emoji: "🎄", keywords: ["christmas", "tree", "holiday", "december", "festive", "xmas"] },
  { emoji: "🎅", keywords: ["santa", "christmas", "holiday", "gift", "december", "claus"] },
  { emoji: "🤖", keywords: ["robot", "machine", "ai", "artificial", "tech", "bot"] },
  { emoji: "👻", keywords: ["ghost", "halloween", "spooky", "boo", "spirit"] },
  { emoji: "💀", keywords: ["skull", "death", "dead", "skeleton", "danger", "scary"] },
  { emoji: "👽", keywords: ["alien", "space", "ufo", "extraterrestrial", "sci-fi"] },
  { emoji: "🧑‍🚀", keywords: ["astronaut", "space", "nasa", "cosmonaut", "rocket"] },
  { emoji: "🧑‍🚒", keywords: ["firefighter", "fire", "rescue", "emergency", "hero"] },
  { emoji: "🧑‍✈️", keywords: ["pilot", "airplane", "captain", "fly", "aviation"] },
  { emoji: "🧑‍🔬", keywords: ["scientist", "research", "lab", "experiment", "science"] },
  { emoji: "🧑‍🌾", keywords: ["farmer", "farm", "agriculture", "plant", "grow", "harvest"] },
  { emoji: "🧑‍🏭", keywords: ["factory", "worker", "industrial", "manufacture"] },
  { emoji: "🧑‍⚖️", keywords: ["judge", "law", "court", "justice", "legal"] },
  { emoji: "💐", keywords: ["bouquet", "flowers", "gift", "love", "congratulations"] },
  { emoji: "🪻", keywords: ["hyacinth", "flower", "purple", "nature", "spring"] },
  { emoji: "🌷", keywords: ["tulip", "flower", "spring", "nature", "pink", "garden"] },
  { emoji: "🌼", keywords: ["blossom", "flower", "nature", "yellow", "daisy"] },
  { emoji: "🍁", keywords: ["maple", "leaf", "fall", "autumn", "canada", "nature"] },
  { emoji: "🎋", keywords: ["tanabata", "bamboo", "japanese", "wish", "star", "festival"] },
  { emoji: "🎍", keywords: ["pine", "bamboo", "japanese", "new year", "decoration"] },
  { emoji: "🍃", keywords: ["leaf", "wind", "blow", "nature", "green", "breeze"] },
  { emoji: "☘️", keywords: ["shamrock", "clover", "irish", "luck", "green", "three"] },
  { emoji: "🥀", keywords: ["wilted", "flower", "dead", "sad", "drooping", "rose"] },
  { emoji: "🫧", keywords: ["bubbles", "soap", "water", "float", "clean", "fun"] },
  { emoji: "💫", keywords: ["dizzy", "star", "shooting", "sparkle", "wow", "magic"] },
  { emoji: "🌠", keywords: ["shooting star", "wish", "star", "night", "sky"] },
  { emoji: "🎆", keywords: ["fireworks", "celebrate", "new year", "night", "sparkle"] },
  { emoji: "🎇", keywords: ["sparkler", "fireworks", "celebrate", "light", "night"] },
  { emoji: "✨", keywords: ["sparkles", "magic", "shine", "glitter", "new", "clean", "special"] },
  { emoji: "🫶", keywords: ["heart hands", "love", "care", "support", "appreciation"] },
  { emoji: "🤌", keywords: ["pinched", "fingers", "italian", "chef kiss", "what", "gesture"] },
  { emoji: "🫰", keywords: ["money", "snap", "fingers", "gesture", "hand"] },
  { emoji: "🤙", keywords: ["call me", "hang loose", "shaka", "surf", "chill", "hand"] },
  { emoji: "🖐️", keywords: ["hand", "five", "high five", "stop", "raised", "palm"] },
  { emoji: "🫵", keywords: ["point", "pointing", "you", "finger", "hand", "direct"] },
  { emoji: "🤘", keywords: ["rock", "metal", "horns", "hand", "sign"] },
  { emoji: "🦴", keywords: ["bone", "skeleton", "body", "dog", "anatomy"] },
  { emoji: "🫀", keywords: ["heart", "organ", "anatomical", "body", "pump", "health"] },
  { emoji: "🫁", keywords: ["lungs", "breath", "breathing", "body", "health"] },
  { emoji: "👀", keywords: ["eyes", "look", "see", "watch", "stare", "peek", "attention"] },
  { emoji: "👃", keywords: ["nose", "smell", "sniff", "face", "body"] },
  { emoji: "👂", keywords: ["ear", "hear", "listen", "body", "sound"] },
  { emoji: "👄", keywords: ["mouth", "lips", "kiss", "body", "talk"] },
  { emoji: "👅", keywords: ["tongue", "taste", "lick", "body", "mouth"] },
];

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Common": ["📝", "📋", "📌", "✏️", "📖", "📚", "💡", "🎯", "⭐", "🌟", "💪", "🚀", "🔥", "⚡", "💎", "🏆", "🎉", "✅", "❤️", "💛", "💚", "💙", "💜", "🧡", "❗", "❓", "😀", "😊", "😎", "🤔", "✨", "💯", "👀", "🫶"],
  "Work": ["💼", "🏢", "💻", "🖥️", "📊", "📈", "📧", "📞", "📱", "📅", "⏰", "⏳", "🔔", "💰", "💵", "💳", "🤝", "👔", "🎤", "🖨️", "📤", "📥", "🧑‍💻", "🧑‍💼", "📣", "🗂️", "📁", "⌨️", "🖱️", "💾", "📡", "🌐"],
  "Health": ["🏃", "🧘", "💊", "🩺", "🏋️", "🚴", "🏊", "🧠", "🍎", "🥗", "💧", "❤️‍🩹", "🦷", "👁️", "💉", "🧬", "🌿", "😴", "💤", "🩹", "🏥", "🧑‍⚕️", "🫀", "🫁", "🧴"],
  "Learn": ["📖", "📚", "🎓", "🧪", "🔬", "🔭", "🌍", "🎨", "🎵", "🎹", "🎸", "📐", "🧮", "🔢", "✍️", "💬", "🗣️", "🧑‍🎓", "🧑‍🏫", "🧑‍🔬"],
  "Clothing": ["👕", "👚", "👗", "👖", "🧥", "👒", "🧢", "🎩", "🧣", "🧤", "🧦", "👞", "👟", "👠", "👡", "👢", "🥾", "👙", "🩳", "👘", "🩴", "👜", "🎒", "👓", "🕶️", "🥽", "💍", "💄", "💅"],
  "Life": ["🏠", "🛒", "🧹", "🧺", "🍳", "🚗", "✈️", "🌅", "🎂", "🎁", "🐶", "🐱", "🌸", "🌈", "☀️", "🌙", "🛏️", "🪴", "👨‍👩‍👧‍👦", "🏍️", "🚪", "🪑", "🛋️", "🚿", "🧽"],
  "Fun": ["🎮", "🎲", "🎭", "🎬", "📺", "🎵", "🎶", "⚽", "🏀", "🎾", "🧩", "📸", "🎧", "🎪", "🥳", "🎡", "🎢", "🎠", "🏈", "🏐"],
  "Food": ["☕", "🍕", "🍔", "🍜", "🍣", "🥑", "🍓", "🍰", "🍪", "🥤", "🍷", "🍺", "🫖", "🌮", "🍝", "🥞", "🍗", "🥩", "🍞", "🧀", "🍫", "🍩", "🍦", "🥪", "🍛", "🥦", "🥕", "🍌", "🍊", "🍇", "🍉"],
  "Nature": ["🌳", "🌲", "🌴", "🌊", "🏔️", "🌋", "🏝️", "🌤️", "🌧️", "❄️", "🦋", "🐝", "🌺", "🍀", "🌹", "🌱", "🌪️", "🌩️", "☔", "☁️", "🌷", "🌼", "🍁", "🍃", "☘️", "🐬", "🦅", "🦉"],
  "Tools": ["⚙️", "🔧", "🔨", "🛠️", "🔑", "🔒", "📍", "🏷️", "🔖", "🚫", "♻️", "🔗", "🗑️", "✂️", "⚖️", "🔍", "🔌", "🔋", "🔦", "🧰", "🪜", "🛡️", "⚔️"],
  "Symbols": ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⬛", "⬜", "➡️", "⬅️", "⬆️", "⬇️", "🔄", "♾️", "💲", "⚛️", "☮️", "☯️", "💯", "‼️", "🔶", "🔷", "🏁", "🚩"],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  size?: "sm" | "md" | "lg";
}

export function EmojiPicker({ value, onChange, size = "md" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Common");

  const sizeClasses = {
    sm: "text-lg w-8 h-8",
    md: "text-2xl w-10 h-10",
    lg: "text-3xl w-12 h-12",
  };

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch("");
  };

  // Keyword-based search: score and filter emojis by relevance
  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];

    const scored: Array<{ emoji: string; score: number }> = [];

    for (const item of EMOJI_DATA) {
      let bestScore = 0;
      for (const kw of item.keywords) {
        if (kw === q) {
          bestScore = Math.max(bestScore, 3); // Exact keyword match
        } else if (kw.startsWith(q)) {
          bestScore = Math.max(bestScore, 2); // Prefix match
        } else if (kw.includes(q)) {
          bestScore = Math.max(bestScore, 1); // Substring match
        }
      }
      if (bestScore > 0) {
        scored.push({ emoji: item.emoji, score: bestScore });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.emoji);
  }, [search]);

  const displayedEmojis = search
    ? searchResults
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`${sizeClasses[size]} flex items-center justify-center rounded-md hover:bg-slate-700/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/40`}
          title="Change emoji"
        >
          {value || "📝"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 bg-slate-900 border-yellow-600/30"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 pb-2">
          <Input
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-slate-800/50 border-yellow-600/20 text-yellow-100 text-sm placeholder:text-yellow-200/30"
            autoFocus
          />
        </div>

        {/* Category tabs - only show when not searching */}
        {!search && (
          <div className="px-3 pb-2">
            <div className="flex gap-1 overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-yellow-600/30 text-yellow-200 font-medium"
                      : "text-yellow-400/60 hover:text-yellow-300 hover:bg-slate-800/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results count */}
        {search && (
          <div className="px-3 pb-1">
            <span className="text-[10px] text-yellow-400/50">
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`
                : "No matches found"}
            </span>
          </div>
        )}

        {/* Emoji grid */}
        <div className="h-[200px] overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-8 gap-1">
            {displayedEmojis.map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                onClick={() => handleSelect(emoji)}
                className={`w-8 h-8 flex items-center justify-center text-lg rounded-md hover:bg-yellow-600/20 transition-colors ${
                  value === emoji ? "bg-yellow-600/30 ring-1 ring-yellow-500/50" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
