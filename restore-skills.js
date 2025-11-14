import { db } from './server/db.ts';
import { userSkills, users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function restoreSkills() {
  try {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, 'alexbaer321@gmail.com'));
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.id, user.email);

    // Get existing skills
    const existingSkills = await db.select().from(userSkills).where(eq(userSkills.userId, user.id));
    console.log('Existing skills:', existingSkills.length);
    existingSkills.forEach(s => console.log(`  - ${s.skillName} (Level ${s.level})`));

    const skillNames = [
      "Craftsman",
      "Artist", 
      "Will",
      "Merchant",
      "Warrior",
      "Scholar",
      "Connector",
      "Charisma",
      "Health"
    ];

    const existingSkillNames = existingSkills.map(s => s.skillName);
    const missingSkills = skillNames.filter(name => !existingSkillNames.includes(name));

    if (missingSkills.length > 0) {
      console.log('\nAdding missing skills:', missingSkills);
      
      const skillsToAdd = missingSkills.map(name => ({
        userId: user.id,
        skillName: name,
        level: 1,
        xp: 0,
        maxXp: 100,
      }));

      await db.insert(userSkills).values(skillsToAdd);
      console.log('✅ Skills added successfully!');
    } else {
      console.log('\n✅ All 9 default skills are already present');
    }

    // Show final skills
    const finalSkills = await db.select().from(userSkills).where(eq(userSkills.userId, user.id));
    console.log('\nFinal skills count:', finalSkills.length);
    finalSkills.forEach(s => console.log(`  - ${s.skillName} (Level ${s.level})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

restoreSkills();
