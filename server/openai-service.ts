import OpenAI from "openai";
import type { UserSkill } from "../shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default skill descriptions (fallback if user hasn't customized)
const DEFAULT_SKILL_DESCRIPTIONS = {
  Craftsman: "Building, creating, repairing physical objects, DIY projects, crafting, woodworking, hands-on creation",
  Artist: "Creative expression, visual arts, music, writing, performance, artistic work, design",
  Mindset: "Mental transformation, positive mindset, emotional management, resilience, converting challenges to growth, turning negative emotions into positive energy, mindfulness, gratitude, inner peace, mental wellness, peaceful mind",
  Merchant: "Business, sales, negotiation, entrepreneurship, wealth building, financial literacy, deals",
  Physical: "Martial arts, strength training, combat, firearms, cardiovascular endurance, tactical fitness, self-defense",
  Scholar: "Academic knowledge, learning, research, reading, studying, intellectual pursuits, education",
  Health: "Physical wellness, nutrition, sleep, recovery, longevity, biological health, fitness foundation",
  Connector: "Networking, relationships, friendships, building connections, maintaining relationships, social capital",
  Charisma: "Social influence, communication, leadership, charm, public speaking, persuasion, interpersonal skills",
  Explorer: "World travel, cultural immersion, trying new experiences, new foods, adventure, discovering new places, exploring unfamiliar territory, embracing novel activities, wanderlust"
};

export interface CategorizationResult {
  skills: string[];
  reasoning: string;
}

export interface TrainingExample {
  taskTitle: string;
  taskDetails?: string;
  correctSkills: string[];
}

export async function categorizeTaskWithAI(
  title: string,
  details?: string,
  trainingExamples: TrainingExample[] = [],
  userSkills: UserSkill[] = []
): Promise<CategorizationResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not configured");
      throw new Error("OpenAI API key not configured");
    }

    // Build skill descriptions from user's skills
    const skillDescriptions: Record<string, string> = {};
    const availableSkills: string[] = [];
    
    for (const skill of userSkills) {
      availableSkills.push(skill.skillName);
      
      // Use custom description if available, otherwise fall back to default
      if (skill.skillDescription) {
        skillDescriptions[skill.skillName] = skill.skillDescription;
      } else if (DEFAULT_SKILL_DESCRIPTIONS[skill.skillName as keyof typeof DEFAULT_SKILL_DESCRIPTIONS]) {
        skillDescriptions[skill.skillName] = DEFAULT_SKILL_DESCRIPTIONS[skill.skillName as keyof typeof DEFAULT_SKILL_DESCRIPTIONS];
      } else {
        skillDescriptions[skill.skillName] = `A skill representing ${skill.skillName}`;
      }
    }

    // Build few-shot examples from training data
    const fewShotExamples = trainingExamples.length > 0
      ? `\n\nLearned Examples (from your feedback):\n${trainingExamples.map(ex => 
          `- "${ex.taskTitle}"${ex.taskDetails ? ` (${ex.taskDetails})` : ''} → ${ex.correctSkills.join(', ')}`
        ).join('\n')}`
      : '';

    const prompt = `You are a productivity expert helping categorize tasks into skill categories.

Available skills and their descriptions:
${Object.entries(skillDescriptions).map(([skill, desc]) => `- ${skill}: ${desc}`).join('\n')}
${fewShotExamples}

Task to categorize:
Title: ${title}
Details: ${details || 'No additional details'}

Instructions:
1. Analyze the task and identify which skills it primarily develops
2. Select 1-3 most relevant skills from the available list
3. A task can develop multiple skills if it genuinely involves multiple areas
4. If similar tasks appear in the learned examples above, follow that pattern
5. Be thoughtful - for example:
   - "Run a mile" → Health, Physical
   - "Read philosophy book" → Scholar
   - "Networking event" → Merchant, Connector, Charisma
   - "Build a bookshelf" → Craftsman
   - "Practice meditation" → Mindset, Health
   - "Reframe negative thoughts" → Mindset
   - "Write a blog post" → Artist, Scholar

Respond with a JSON object in this exact format:
{
  "skills": ["Skill1", "Skill2"],
  "reasoning": "Brief explanation of why these skills were chosen"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster, cheaper model
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that categorizes tasks into skill development categories. Always respond with valid JSON. When similar examples exist in the learned examples, prioritize matching those patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(responseContent) as CategorizationResult;

    // Validate that returned skills are in our available list
    const validSkills = result.skills.filter(skill => availableSkills.includes(skill));
    
    if (validSkills.length === 0) {
      // Fallback to first available skill if no valid skills identified
      const fallbackSkill = availableSkills[0] || "Scholar";
      return {
        skills: [fallbackSkill],
        reasoning: "Default categorization - task requires skill development"
      };
    }

    return {
      skills: validSkills,
      reasoning: result.reasoning
    };
  } catch (error: any) {
    console.error("❌ Error categorizing task with AI:", error);
    
    // Log specific error details
    if (error.status === 401) {
      console.error("❌ Invalid OpenAI API key - check OPENAI_API_KEY in .env");
    } else if (error.status === 429) {
      console.error("❌ OpenAI rate limit exceeded");
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error("❌ Network error connecting to OpenAI");
    }
    
    // Fallback to first available skill on error
    const fallbackSkill = userSkills[0]?.skillName || "Scholar";
    return {
      skills: [fallbackSkill],
      reasoning: "Auto-categorized (AI service unavailable)"
    };
  }
}

export async function categorizeMultipleTasks(
  tasks: Array<{ id: number; title: string; details?: string }>,
  trainingExamples: TrainingExample[] = [],
  userSkills: UserSkill[] = []
): Promise<Map<number, CategorizationResult>> {
  const results = new Map<number, CategorizationResult>();

  // Process tasks in parallel but limit concurrency to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (task) => ({
        id: task.id,
        result: await categorizeTaskWithAI(task.title, task.details, trainingExamples, userSkills)
      }))
    );
    
    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
  }

  return results;
}
