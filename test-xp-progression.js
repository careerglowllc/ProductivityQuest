// Quick test to verify skill XP progression formula
// Formula: XP_required = base * (1 + rate)^(level - 1)

const SKILL_BASE_XP = 100;
const SKILL_GROWTH_RATE = 0.02;

function calculateXpForLevel(level) {
  if (level <= 1) return SKILL_BASE_XP;
  return Math.floor(SKILL_BASE_XP * Math.pow(1 + SKILL_GROWTH_RATE, level - 1));
}

console.log("Skill XP Progression Test");
console.log("=========================");
console.log(`Base XP: ${SKILL_BASE_XP}`);
console.log(`Growth Rate: ${SKILL_GROWTH_RATE * 100}%`);
console.log("");

console.log("Early Levels (1-10):");
console.log("Level | XP Required | Cumulative");
console.log("------|-------------|------------");
let cumulative = 0;
for (let i = 1; i <= 10; i++) {
  const xp = calculateXpForLevel(i);
  cumulative += xp;
  console.log(`${i.toString().padStart(5)} | ${xp.toString().padStart(11)} | ${cumulative.toString().padStart(10)}`);
}

console.log("\nMid Levels (20, 30, 40, 50):");
console.log("Level | XP Required | Cumulative");
console.log("------|-------------|------------");
cumulative = 0;
for (let i = 1; i <= 50; i++) {
  const xp = calculateXpForLevel(i);
  cumulative += xp;
  if ([20, 30, 40, 50].includes(i)) {
    console.log(`${i.toString().padStart(5)} | ${xp.toString().padStart(11)} | ${cumulative.toString().padStart(10)}`);
  }
}

console.log("\nHigh Levels (60, 70, 80, 90, 99):");
console.log("Level | XP Required | Cumulative");
console.log("------|-------------|------------");
cumulative = 0;
for (let i = 1; i <= 99; i++) {
  const xp = calculateXpForLevel(i);
  cumulative += xp;
  if ([60, 70, 80, 90, 99].includes(i)) {
    console.log(`${i.toString().padStart(5)} | ${xp.toString().padStart(11)} | ${cumulative.toString().padStart(10)}`);
  }
}

console.log("\n\nComparison: New (2%) vs Old (1.5x multiplier)");
console.log("Level | New System | Old System | Difference");
console.log("------|------------|------------|------------");
let oldXp = 100;
for (let i = 1; i <= 20; i++) {
  const newXp = calculateXpForLevel(i);
  if ([1, 5, 10, 15, 20].includes(i)) {
    console.log(`${i.toString().padStart(5)} | ${newXp.toString().padStart(10)} | ${Math.floor(oldXp).toString().padStart(10)} | ${(oldXp - newXp > 0 ? '+' : '')}${Math.floor(oldXp - newXp).toString()}`);
  }
  oldXp = oldXp * 1.5;
}
