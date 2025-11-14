import { db } from "./db";
import { shopItems } from "@shared/schema";

// Default global shop items that all users will see
const defaultShopItems = [
  {
    userId: null,
    name: "Health Potion",
    description: "A refreshing potion to restore your vitality",
    cost: 50,
    icon: "🧪",
    category: "consumables",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Enchanted Scroll",
    description: "Ancient knowledge waiting to be discovered",
    cost: 100,
    icon: "📜",
    category: "items",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Dragon's Gem",
    description: "A rare and valuable treasure",
    cost: 250,
    icon: "💎",
    category: "treasures",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Master's Trophy",
    description: "Symbol of great achievement",
    cost: 500,
    icon: "🏆",
    category: "rewards",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Royal Crown",
    description: "Fit for a champion of productivity",
    cost: 1000,
    icon: "👑",
    category: "treasures",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Magic Sword",
    description: "A legendary weapon for legendary tasks",
    cost: 750,
    icon: "⚔️",
    category: "equipment",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Crystal Ball",
    description: "See your future success",
    cost: 300,
    icon: "🔮",
    category: "items",
    isGlobal: true,
  },
  {
    userId: null,
    name: "Golden Key",
    description: "Unlock new possibilities",
    cost: 150,
    icon: "🔑",
    category: "items",
    isGlobal: true,
  },
];

async function seedShopItems() {
  try {
    console.log("Seeding default shop items...");
    
    for (const item of defaultShopItems) {
      await db.insert(shopItems).values(item as any).onConflictDoNothing();
    }
    
    console.log("✅ Default shop items seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding shop items:", error);
    process.exit(1);
  }
}

seedShopItems();
