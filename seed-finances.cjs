// Seed finance data from the attached CSV (Routine Income Expense spreadsheet)
// Usage: node -r dotenv/config seed-finances.cjs YOUR_USER_ID
// Run from project root where .env has DATABASE_URL

const { neon } = require('@neondatabase/serverless');

const FINANCE_DATA = [
  { item: "Spotify", category: "Entertainment", monthlyCost: 1300, recurType: "Monthly" },
  { item: "Gas (~1480 mi/mo @ $3.90/gal, 24.5mpg)", category: "Transportation", monthlyCost: 33000, recurType: "Monthly" },
  { item: "Charity (Giving What We Can / Effective Altruism)", category: "Charity", monthlyCost: 500, recurType: "Monthly" },
  { item: "Charity (Wikipedia)", category: "Charity", monthlyCost: 960, recurType: "Monthly" },
  { item: "Amazon Prime Personal", category: "General", monthlyCost: 1200, recurType: "Yearly (Amortized)" },
  { item: "Dashlane", category: "General", monthlyCost: 542, recurType: "Monthly" },
  { item: "Google Drive Expanded Storage (personal)", category: "General", monthlyCost: 199, recurType: "Monthly" },
  { item: "Food (Groceries + Eating Out)", category: "Food", monthlyCost: 93000, recurType: "Monthly" },
  { item: "Phone Bill (my part of dad's family plan)", category: "Phone", monthlyCost: 3600, recurType: "Monthly" },
  { item: "Toiletries / Hygiene", category: "Toiletries", monthlyCost: 1500, recurType: "Monthly" },
  { item: "Electricity & Gas Bill (rough monthly)", category: "Housing", monthlyCost: 15000, recurType: "Monthly" },
  { item: "Apple iCloud Storage Plan", category: "General", monthlyCost: 1000, recurType: "Monthly" },
  { item: "HSA Max Payments", category: "Investment", monthlyCost: 33504, recurType: "Biweekly (Summed Monthly)" },
  { item: "Dental Insurance (Apple MetLife Plan)", category: "Insurance", monthlyCost: 2516, recurType: "Biweekly (Summed Monthly)" },
  { item: "Vision Insurance (Apple VSP Plan)", category: "Insurance", monthlyCost: 302, recurType: "Biweekly (Summed Monthly)" },
  { item: "Motorcycle Registration", category: "Transportation", monthlyCost: 1367, recurType: "Yearly (Amortized)" },
  { item: "Semi-Monthly Deep Tissue Massage (Arisa Thai)", category: "Health (Non Insurance)", monthlyCost: 7000, recurType: "Monthly" },
  { item: "Chase Sapphire Preferred Annual Fee (net of $50 travel credit)", category: "Credit Card", monthlyCost: 792, recurType: "Yearly (Amortized)" },
  { item: "alexbaer.com + alexanderbaer.com Squarespace Domains", category: "General", monthlyCost: 200, recurType: "Yearly (Amortized)" },
  { item: "Apple Gym", category: "Health (Non Insurance)", monthlyCost: 2200, recurType: "Biweekly (Summed Monthly)" },
  { item: "2021 Explorer Car Insurance (Progressive)", category: "Transportation", monthlyCost: 12150, recurType: "Monthly" },
  { item: "Motorcycle Insurance (Progressive)", category: "Transportation", monthlyCost: 641, recurType: "Monthly" },
  { item: "Post-Tax W2 Salary Income", category: "Income", monthlyCost: 630000, recurType: "Biweekly (Summed Monthly)" },
  { item: "Notion Plus Membership (personal)", category: "General", monthlyCost: 1200, recurType: "Monthly" },
  { item: "401k Contribution (my unmatched portion)", category: "Retirement", monthlyCost: 73034, recurType: "Biweekly (Summed Monthly)" },
  { item: "Mortgage / PMI / Property Tax", category: "Housing", monthlyCost: 446714, recurType: "Monthly" },
  { item: "CareerGlow LLC CA State Franchise Annual Tax", category: "Business", monthlyCost: 6700, recurType: "Yearly (Amortized)" },
  { item: "Rocklin Water Utility Bill (PCWA)", category: "Housing", monthlyCost: 11526, recurType: "Monthly" },
  { item: "Astound Internet Bill", category: "Housing", monthlyCost: 6500, recurType: "Monthly" },
  { item: "Apple Employee Stock Purchase Plan (ESPP)", category: "Income", monthlyCost: 121722, recurType: "Biweekly (Summed Monthly)" },
  { item: "NordVPN Annual", category: "General", monthlyCost: 500, recurType: "Yearly (Amortized)" },
  { item: "ChatGPT Pro (alexbaerclean account)", category: "General", monthlyCost: 2000, recurType: "Monthly" },
  { item: "Veluna.com Domain Renewal", category: "General", monthlyCost: 183, recurType: "Yearly (Amortized)" },
  { item: "Rocklin House Garbage Bin Rental/Pickup", category: "Housing", monthlyCost: 3400, recurType: "Monthly" },
  { item: "Nord Dedicated IP (Astound IP flagged by PayPal/QB)", category: "Internet", monthlyCost: 899, recurType: "Monthly" },
  { item: "(CareerGlow) iPostal Green Plan", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
  { item: "CareerGlow: ZenBusiness Annual Fee (Registered Agent)", category: "Business", monthlyCost: 1658, recurType: "Yearly (Amortized)" },
  { item: "Car Wear & Tear Amortization (Explorer)", category: "Transportation", monthlyCost: 30000, recurType: "Monthly" },
  { item: "Google Workspace Business (Admin CareerGlow)", category: "Business", monthlyCost: 700, recurType: "Monthly" },
  { item: "Rocklin House Sewer Utility Bill", category: "Housing", monthlyCost: 4000, recurType: "Monthly" },
  { item: "MyCareerglow Tello Phone Number", category: "Business", monthlyCost: 964, recurType: "Monthly" },
  { item: "CareerGlow Northwest Registered Agent CA Annual Filing", category: "Business", monthlyCost: 1042, recurType: "Yearly (Amortized)" },
  { item: "CareerGlow GitHub Copilot Pro", category: "Business", monthlyCost: 1000, recurType: "Monthly" },
  { item: "Neon Database for MailWisp", category: "Business", monthlyCost: 3000, recurType: "Monthly" },
  { item: "Apple Developer Membership (CareerGlow)", category: "Business", monthlyCost: 825, recurType: "Yearly (Amortized)" },
  { item: "Ford Explorer Registration (estimate)", category: "Transportation", monthlyCost: 4600, recurType: "Yearly (Amortized)" },
  { item: "CareerGlow Northwest Registered Agent Renewal", category: "Business", monthlyCost: 1041, recurType: "Yearly (Amortized)" },
  { item: "CG: AWS (testimonial info storage)", category: "Business", monthlyCost: 100, recurType: "Monthly" },
  { item: "ProductivityQuest Render Service (CareerGlow)", category: "Business", monthlyCost: 700, recurType: "Monthly" },
  { item: "alexanderbaer.com + alexbaer.com Squarespace Renewal", category: "General", monthlyCost: 250, recurType: "Yearly (Amortized)" },
  { item: "Waffle Amazon Prime", category: "General", monthlyCost: 1200, recurType: "Yearly (Amortized)" },
  { item: "MailWisp Render Web Service Standard", category: "Business", monthlyCost: 2500, recurType: "Monthly" },
  { item: "Render Deploy for CareerGlow cgmain app (ON PAUSE)", category: "Business", monthlyCost: 0, recurType: "Monthly" },
  { item: "Tello alexbaer321 Backup Phone Number", category: "General", monthlyCost: 600, recurType: "Monthly" },
  { item: "Render Web Service – InboxFlicker Landing Page", category: "Business", monthlyCost: 700, recurType: "Monthly" },
  { item: "UHC PPO Health Insurance", category: "Insurance", monthlyCost: 8008, recurType: "Biweekly (Summed Monthly)" },
  { item: "MailWisp Instagram Verified Checkmark", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
  { item: "iCloud 2TB Storage", category: "General", monthlyCost: 1000, recurType: "Monthly" },
  { item: "Resend Pro Tier (CareerGlow/MailWisp)", category: "Business", monthlyCost: 2000, recurType: "Monthly" },
  { item: "Replit Core (CareerGlow – ad UI)", category: "Business", monthlyCost: 2000, recurType: "Monthly" },
  { item: "401k – Apple's Matching Contribution", category: "Retirement", monthlyCost: 73034, recurType: "Biweekly (Summed Monthly)" },
  { item: "Apple RSUs (rough amortization, after taxes)", category: "Income", monthlyCost: 430000, recurType: "Monthly" },
  { item: "Canva Pro (admin@mycareerglow)", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
  { item: "15 Squarespace Domains (CareerGlow LLC)", category: "Business", monthlyCost: 2550, recurType: "Yearly (Amortized)" },
  { item: "Supplements (magnesium, glycine, calcium, liver, K2)", category: "Food", monthlyCost: 2315, recurType: "Monthly" },
  { item: "FasTrak Tolls (Sacramento commuting)", category: "Transportation", monthlyCost: 2500, recurType: "Monthly" },
  { item: "Midjourney", category: "Business", monthlyCost: 1000, recurType: "Monthly" },
  { item: "Wave Accounting Premium Tier", category: "Business", monthlyCost: 1900, recurType: "Monthly" },
  { item: "NordVPN Dedicated IP", category: "General", monthlyCost: 899, recurType: "Monthly" },
  { item: "Hushed Alt Phone Line", category: "General", monthlyCost: 500, recurType: "Monthly" },
  { item: "reviewer@mycareerglow.com Google Workspace (OAuth testing)", category: "Business", monthlyCost: 700, recurType: "Monthly" },
  { item: "Costco Gold Membership", category: "Food", monthlyCost: 542, recurType: "Yearly (Amortized)" },
  { item: "Seedance 2.0 Standard Subscription", category: "Business", monthlyCost: 5000, recurType: "Monthly" },
  { item: "Netflix (Ads Version)", category: "Entertainment", monthlyCost: 899, recurType: "Monthly" },
  { item: "Rocklin House Rental Income", category: "Income", monthlyCost: 350000, recurType: "Monthly" },
];

async function seedFinances() {
  const sql = neon(process.env.DATABASE_URL);
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Please provide userId as argument');
    console.log('Usage: node -r dotenv/config seed-finances.cjs YOUR_USER_ID');
    return;
  }

  try {
    console.log(`\n💰 Seeding finance data for user: ${userId}\n`);

    // Delete existing finance items for user
    const deleted = await sql`DELETE FROM financial_items WHERE user_id = ${userId} RETURNING id`;
    console.log(`🗑️  Cleared ${deleted.length} existing items`);

    // Insert new items
    let inserted = 0;
    for (const item of FINANCE_DATA) {
      await sql`
        INSERT INTO financial_items (user_id, item, category, monthly_cost, recur_type)
        VALUES (${userId}, ${item.item}, ${item.category}, ${item.monthlyCost}, ${item.recurType})
      `;
      inserted++;
    }

    console.log(`✅ Inserted ${inserted} finance items`);
    console.log('\n📊 Summary:');

    const incomeCategories = ['Income', 'Investment'];
    const retirementCategories = ['Retirement'];

    const totalIncome = FINANCE_DATA.filter(i => incomeCategories.includes(i.category))
      .reduce((s, i) => s + i.monthlyCost, 0);
    const totalRetirement = FINANCE_DATA.filter(i => retirementCategories.includes(i.category))
      .reduce((s, i) => s + i.monthlyCost, 0);
    const totalExpenses = FINANCE_DATA.filter(i => !incomeCategories.includes(i.category) && !retirementCategories.includes(i.category))
      .reduce((s, i) => s + i.monthlyCost, 0);

    console.log(`  Income + Investment:  $${(totalIncome / 100).toFixed(2)}/mo`);
    console.log(`  Retirement:           $${(totalRetirement / 100).toFixed(2)}/mo`);
    console.log(`  Expenses:             $${(totalExpenses / 100).toFixed(2)}/mo`);
    console.log(`  Net (income - exp):   $${((totalIncome - totalExpenses) / 100).toFixed(2)}/mo`);
    console.log('\n✨ Done!');
  } catch (err) {
    console.error('❌ Error seeding finances:', err);
  }
}

seedFinances();
