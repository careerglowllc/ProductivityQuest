const { Pool } = require('@neondatabase/serverless');

async function updateFinanceData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // First, find the user "replittest"
    const userResult = await pool.query(`
      SELECT id, username, email 
      FROM users 
      WHERE username = 'replittest' OR email LIKE '%replittest%'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('User "replittest" not found. Listing all users:');
      const allUsers = await pool.query(`SELECT id, username, email FROM users`);
      allUsers.rows.forEach(u => console.log(`  - ${u.username || 'N/A'} (${u.email || 'N/A'}) - ID: ${u.id}`));
      await pool.end();
      return;
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    console.log(`Found user: ${user.username || user.email} (ID: ${userId})`);
    
    // Delete existing financial items for this user
    const deleteResult = await pool.query(`
      DELETE FROM financial_items WHERE user_id = $1
    `, [userId]);
    console.log(`Deleted ${deleteResult.rowCount} existing financial items`);
    
    // New financial data from CSV - monthlyCost in cents (multiply dollar amount by 100)
    // Income items will have positive monthlyCost, expenses negative internally handled in app
    const financialData = [
      // Expenses (all non-Income categories)
      { item: "Spotify", category: "Entertainment", monthlyCost: 1300, recurType: "Monthly" },
      { item: "Gas (29 mpg, gas price, miles driven a day)", category: "Transportation", monthlyCost: 20000, recurType: "Monthly" },
      { item: "Charity (Giving What We Can/Effective Altruism)", category: "Charity", monthlyCost: 500, recurType: "Monthly" },
      { item: "Charity (Wikipedia)", category: "Charity", monthlyCost: 960, recurType: "Monthly" },
      { item: "Amazon Prime Personal", category: "General", monthlyCost: 1200, recurType: "Yearly (Amortized)" },
      { item: "Dashlane", category: "General", monthlyCost: 500, recurType: "Monthly" },
      { item: "Google Drive Expanded Storage (personal account)", category: "General", monthlyCost: 199, recurType: "Monthly" },
      { item: "Food (Groceries+ Eating Out)", category: "Food", monthlyCost: 93000, recurType: "Monthly" },
      { item: "Phone Bill (data and call stuff, my part of dad's family plan)", category: "Phone", monthlyCost: 4000, recurType: "Monthly" },
      { item: "Toiletries/Hygeine", category: "Toiletries", monthlyCost: 1500, recurType: "Monthly" },
      { item: "Rough Electricity and Gas bill monthly", category: "Housing", monthlyCost: 15000, recurType: "Monthly" },
      { item: "Microsoft 365 Suite", category: "General", monthlyCost: 699, recurType: "Monthly" },
      { item: "Apple iCloud Storage Plan", category: "General", monthlyCost: 1000, recurType: "Monthly" },
      { item: "HSA, max payments (one maxed out not paid but assume this amount in for simplicity)", category: "Investment", monthlyCost: 26296, recurType: "Biweekly (Summed Monthly)" },
      { item: "Dental Insurance (Apple Metlife Plan)", category: "Insurance", monthlyCost: 2516, recurType: "Biweekly (Summed Monthly)" },
      { item: "Vision Insurance (Apple VSP Plan)", category: "Insurance", monthlyCost: 302, recurType: "Biweekly (Summed Monthly)" },
      { item: "Motorcycle Registration", category: "Transportation", monthlyCost: 1367, recurType: "Yearly (Amortized)" },
      { item: "Semi Monthly Deep Tissue Message (Arisa Thai)", category: "Health (Non Insurance)", monthlyCost: 7000, recurType: "Monthly" },
      { item: "Chase Sapphire Preferred Annual Fee (not including $50 annual travel credit)", category: "Credit Card", monthlyCost: 792, recurType: "Yearly (Amortized)" },
      { item: "alexbaer.com and alexanderbaer.com Squarespace Domains", category: "General", monthlyCost: 200, recurType: "Yearly (Amortized)" },
      { item: "Apple gym", category: "Health (Non Insurance)", monthlyCost: 2200, recurType: "Biweekly (Summed Monthly)" },
      { item: "Costco Membership", category: "Food", monthlyCost: 542, recurType: "Monthly" },
      { item: "2020 Honda Car Insurance (Progressive)", category: "Transportation", monthlyCost: 14254, recurType: "Monthly" },
      { item: "Motorcycle Insurance (Progressive)", category: "Transportation", monthlyCost: 641, recurType: "Monthly" },
      { item: "notion plus membership personal notion account (delete once no longer need freelancer on the gaification shared folder)", category: "General", monthlyCost: 1200, recurType: "Monthly" },
      { item: "401k Contribution (my unmatched paid into portion)", category: "Retirement", monthlyCost: 73034, recurType: "Biweekly (Summed Monthly)" },
      { item: "Mortgage/PMI/Property Tax Payment (Net, after $3500 Tom and Joanna Payment", category: "Housing", monthlyCost: 164700, recurType: "Monthly" },
      { item: "Careerglow llc CA state franchsie annual tax", category: "Business", monthlyCost: 6700, recurType: "Yearly (Amortized)" },
      { item: "(REFINE WITH HISTORY OF BILL AT PCWA WEBSITE) Rocklin Water Utility Bill (PCWA) (ESTIMATE)", category: "Housing", monthlyCost: 6600, recurType: "Monthly" },
      { item: "Astound Internet Bill", category: "Housing", monthlyCost: 6500, recurType: "Monthly" },
      { item: "Nord vpn annual paid", category: "General", monthlyCost: 500, recurType: "Yearly (Amortized)" },
      { item: "chat gpt pro for alexbaerclean account", category: "General", monthlyCost: 2000, recurType: "Monthly" },
      { item: "Veluna.com domain renewals (may increase after year one)", category: "General", monthlyCost: 183, recurType: "Yearly (Amortized)" },
      { item: "rocklin house garbage bin rentals or pickup", category: "Housing", monthlyCost: 3400, recurType: "Monthly" },
      { item: "nord dedicated ip (used because rocklin Astround IP is falgged by paypal, quickbooks , etc)", category: "Internet", monthlyCost: 899, recurType: "Monthly" },
      { item: "(Careerglow) ipostal green plan (monthly charged veresion) (1)", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
      { item: "carrerglow: zenbusiness annual fee for regeistered agent service", category: "Business", monthlyCost: 1658, recurType: "Yearly (Amortized)" },
      { item: "Car Wear and Tear Amortized (based on Honda mileage, car type, etc)", category: "Transportation", monthlyCost: 30000, recurType: "Monthly" },
      { item: "Google Workspace Business: Admin CareerGlow,", category: "Business", monthlyCost: 700, recurType: "Monthly" },
      { item: "rocklin house sewer utilit bill", category: "Housing", monthlyCost: 4000, recurType: "Monthly" },
      { item: "mycareerglow tello phone number", category: "Business", monthlyCost: 964, recurType: "Monthly" },
      { item: "Zoho CareerGlow Accounting (FREE if under 50k revenue)", category: "Business", monthlyCost: 100, recurType: "Monthly" },
      { item: "careerglow northwestrgistered agent CA annual filing", category: "Business", monthlyCost: 1042, recurType: "Yearly (Amortized)" },
      { item: "careerglow github copilot pro", category: "Business", monthlyCost: 1000, recurType: "Monthly" },
      { item: "neon launch plan (for app data storage)(CG)", category: "Business", monthlyCost: 500, recurType: "Monthly" },
      { item: "apple developer membership careerglow", category: "Business", monthlyCost: 825, recurType: "Yearly (Amortized)" },
      { item: "Honda Accord Registration", category: "Transportation", monthlyCost: 2925, recurType: "Yearly (Amortized)" },
      { item: "careerglow northwest regsitered agent renewal", category: "Business", monthlyCost: 1041, recurType: "Yearly (Amortized)" },
      { item: "CG: AWS for testimonial info storage price not routine", category: "Business", monthlyCost: 100, recurType: "Monthly" },
      { item: "productivityquest render service under careerglow", category: "Business", monthlyCost: 700, recurType: "Monthly" },
      { item: "alexanderbaer.com and alexbaer.com squarespace annual renewal", category: "General", monthlyCost: 250, recurType: "Yearly (Amortized)" },
      { item: "wafffle amazon prime", category: "General", monthlyCost: 1200, recurType: "Yearly (Amortized)" },
      { item: "mailwisp render webservice standard", category: "Business", monthlyCost: 2500, recurType: "Monthly" },
      { item: "render deploy for careeglow cgmain app (ON PAUSE NOW SO NOW CHARGE BUT IF RESUME ADD COST)", category: "Business", monthlyCost: 0, recurType: "Monthly" },
      { item: "tello alexbaer321 backup phone number", category: "General", monthlyCost: 600, recurType: "Monthly" },
      { item: "render webservice hosting for inboxflicker webs ervice landing page", category: "Business", monthlyCost: 700, recurType: "Monthly" },
      { item: "UHC PPO Health Insurance", category: "Insurance", monthlyCost: 8008, recurType: "Biweekly (Summed Monthly)" },
      { item: "mailwisp instagram verified checkmark perosnal cc", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
      { item: "iCloud 2TB storage", category: "General", monthlyCost: 1000, recurType: "Monthly" },
      { item: "Resend Pro Tier careerglow/mailswipe", category: "Business", monthlyCost: 2000, recurType: "Monthly" },
      { item: "replit core careerglow for getting nice UI for ads", category: "Business", monthlyCost: 2500, recurType: "Monthly" },
      { item: "401k Apple's Contribution", category: "Retirement", monthlyCost: 73034, recurType: "Biweekly (Summed Monthly)" },
      { item: "canva pro admin@mycareerglow (on personal CC)", category: "Business", monthlyCost: 1500, recurType: "Monthly" },
      { item: "14 squarespace domains (under careerglow LLC): mailwisp.com/, inboxwisp.com/, mailwiper.com/, inxobcfilcker.com/, getmailswipe.com/ mail-swipe.com/, photpowisp.com/ picwisp.com/ inboxswiper.com/, productivity-quest.com/, getcareerglow.com/, mymailswipe.com/, mycareerglow.com/, trymailsage.com", category: "Business", monthlyCost: 2300, recurType: "Yearly (Amortized)" },
      { item: "Supplements (using cost per bottle, how many capsules per bottle, how many i take a day to amortize rough total monthly cost for magnesium. glycine, calcium, liver, k2)", category: "Food", monthlyCost: 2315, recurType: "Monthly" },
      // Income items
      { item: "Post Tax W2 Salary Income", category: "Income", monthlyCost: 630000, recurType: "Biweekly (Summed Monthly)" },
      { item: "Apple Employee Stock Purchase Plan (not the actual sell +15% market value)", category: "Income", monthlyCost: 121722, recurType: "Biweekly (Summed Monthly)" },
      { item: "Apple RSUs (Rough Amortization based on Etrade yearly table data)(after taxes)", category: "Income", monthlyCost: 430000, recurType: "Monthly" },
    ];
    
    // Insert all financial items
    let insertedCount = 0;
    for (const item of financialData) {
      await pool.query(`
        INSERT INTO financial_items (user_id, item, category, monthly_cost, recur_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, item.item, item.category, item.monthlyCost, item.recurType]);
      insertedCount++;
    }
    
    console.log(`Successfully inserted ${insertedCount} financial items for user ${user.username || user.email}`);
    
    // Verify
    const countResult = await pool.query(`
      SELECT COUNT(*) as count, 
             SUM(CASE WHEN category = 'Income' THEN monthly_cost ELSE 0 END) as total_income,
             SUM(CASE WHEN category != 'Income' THEN monthly_cost ELSE 0 END) as total_expenses
      FROM financial_items WHERE user_id = $1
    `, [userId]);
    
    const { count, total_income, total_expenses } = countResult.rows[0];
    console.log(`\nVerification:`);
    console.log(`  Total items: ${count}`);
    console.log(`  Total Income: $${(total_income / 100).toFixed(2)}`);
    console.log(`  Total Expenses: $${(total_expenses / 100).toFixed(2)}`);
    console.log(`  Net: $${((total_income - total_expenses) / 100).toFixed(2)}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

updateFinanceData();
