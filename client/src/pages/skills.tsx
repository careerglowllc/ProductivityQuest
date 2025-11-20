import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddSkillModal } from "@/components/add-skill-modal";
import { EditSkillIconModal } from "@/components/edit-skill-icon-modal";
import { EditMilestonesModal } from "@/components/edit-milestones-modal";
import { WhySkillsModal } from "@/components/why-skills-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { getSkillIcon } from "@/lib/skillIcons";
import type { UserProgress, UserSkill } from "@/../../shared/schema";
import { 
  Wrench, 
  Palette, 
  Brain, 
  Briefcase, 
  Sword, 
  Book, 
  Activity, 
  Network, 
  Users,
  Crown,
  Star,
  Grid3x3,
  List,
  Plus,
  Trash2,
  Edit,
  HelpCircle,
  Compass,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Flame,
  Rocket,
  Award,
  Flag,
  Heart,
  Shield,
  Lightbulb,
  GraduationCap,
  TrendingUp,
  CheckCircle,
  Mountain,
  Eye,
  Gem,
  Bolt,
  Crosshair,
  Dumbbell,
  Bike,
  Medal
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";

const skillDescriptions = {
  Craftsman: {
    description: "The path of creation through hands and tools. This skill represents your ability to build, repair, and craft physical objects in the real world.",
    level10: "Amateur hobbyist who can handle basic DIY projects, simple repairs, and follows instructions for basic builds. Comfortable with common hand tools.",
    level30: "Skilled craftsperson with 5+ years experience. Can tackle complex projects, custom furniture, home renovations, and advanced woodworking or metalwork.",
    level50: "Master artisan - professional level expertise across multiple crafts. Creates custom pieces, teaches others, and can build virtually anything from raw materials.",
    level99: "Legendary master craftsman - world-renowned for exceptional work. Creates museum-quality pieces, innovates new techniques, and inspires generations of artisans."
  },
  Artist: {
    description: "Creative expression through visual arts, music, writing, or performance. This represents your artistic abilities and creative output in the real world.",
    level10: "Beginner artist exploring different mediums. Can create basic sketches, compositions, or performances with proper guidance and practice.",
    level30: "Accomplished artist with distinct style. Creates compelling work regularly, may sell pieces or perform publicly. 5+ years of dedicated practice.",
    level50: "Master artist with professional recognition. Exhibits/performs at high levels, has developed unique artistic voice, potentially makes living from art.",
    level99: "Legendary artist whose work transcends time. Creates masterpieces that define movements, inspires millions, and leaves an indelible mark on culture."
  },
  Mindset: {
    description: "The art of mental transformation - converting struggles and life circumstances into positive, enabling mindsets. This skill represents your ability to transmute challenges into growth, manage emotions, and maintain inner peace.",
    level10: "Beginner mindset shifter - learning to reframe negative thoughts, practicing gratitude, and developing awareness of mental patterns. Can catch and redirect some negative thinking.",
    level30: "Skilled mental alchemist - consistently transforms setbacks into opportunities. Has developed strong positive thinking habits, resilience practices, and helps others shift their perspectives. 5+ years of intentional mindset work.",
    level50: "Master of mental transformation - unshakeable positive mindset despite adversity. Expert at converting any struggle into fuel for growth, turning negative emotions into positive energy. Teaches others advanced mindset techniques and maintains peak mental state.",
    level99: "Transcendent master - legendary mental mastery that inspires worldwide transformation. Converts any darkness into light, maintains peaceful mind in any circumstance, radiates unwavering positivity, and elevates collective consciousness."
  },
  Merchant: {
    description: "Business acumen, negotiation, sales, and wealth building. Your ability to create value, close deals, and build financial success in the real world.",
    level10: "Learning business basics - can make small sales, understand simple negotiations, starting to build financial literacy.",
    level30: "Successful entrepreneur or sales professional. Closed significant deals, built profitable ventures, strong network. Consistent income growth over 5 years.",
    level50: "Business titan - multiple successful ventures, masterful negotiator, significant wealth built. Industry respected dealmaker and wealth creator.",
    level99: "Legendary magnate - reshapes industries, builds empires, creates generational wealth. Name recognized globally as a business icon and visionary."
  },
  Physical: {
    description: "Complete physical mastery - martial arts, strength training, firearm proficiency, and cardiovascular endurance. This represents your real-world combat ability, physical power, and tactical fitness.",
    level10: "Physical beginner - basic martial arts or self-defense training, starting strength program, learning firearm basics, building cardio base. Knows fundamental techniques across multiple domains.",
    level30: "Well-rounded physical practitioner - 5+ years training in martial arts, solid strength stats (intermediate lifting numbers), firearm proficiency, good cardio endurance. Competent across multiple physical disciplines.",
    level50: "Elite physical specimen - advanced martial arts skills, exceptional strength (advanced powerlifting/bodybuilding), expert marksman, and superior cardiovascular capacity. Military/LEO/pro athlete level across all domains.",
    level99: "Legendary warrior - peak human physical capability across all dimensions. World-class martial artist, exceptional strength athlete, expert tactical operator. A living weapon and inspiration."
  },
  Scholar: {
    description: "Academic knowledge, research ability, continuous learning, and intellectual mastery. Your real-world education and expertise in various fields.",
    level10: "Curious learner - reads regularly, takes courses, builds knowledge in areas of interest. Understands how to research and learn effectively.",
    level30: "Expert in multiple domains - advanced degrees or equivalent self-education. Published work, teaches others, recognized knowledge in specialized fields.",
    level50: "Polymath genius - PhD-level expertise in multiple fields, published researcher, or recognized thought leader. Lifetime dedication to learning and teaching.",
    level99: "Legendary polymath - world-renowned intellectual whose contributions advance human knowledge. Nobel-level achievements, revolutionary ideas, and timeless wisdom."
  },
  Health: {
    description: "Physical and biological health optimization - nutrition, sleep, recovery, longevity practices, and overall bodily wellness. This represents your commitment to maintaining optimal health.",
    level10: "Health-conscious beginner - learning nutrition basics, improving sleep hygiene, regular check-ups, building healthy daily habits. Understands fundamental health principles.",
    level30: "Health optimizer - 5+ years of consistent healthy practices. Excellent nutrition habits, quality sleep routine, preventive care, stress management. Tracks and optimizes key health metrics.",
    level50: "Health mastery - optimal biological health across all markers. Expert-level nutrition knowledge, perfect sleep, longevity protocols, potentially biohacks. Doctor-level understanding of personal health optimization.",
    level99: "Legendary vitality - peak biological optimization that defies aging. Perfect health markers, longevity mastery, biohacking pioneer. Living example of human health potential."
  },
  Athlete: {
    description: "Physical fitness, sports performance, endurance, and athletic ability. Your real-world strength, speed, agility, and physical conditioning.",
    level10: "Active beginner - exercises regularly, plays recreational sports, building fitness foundation and athletic skills.",
    level30: "Serious athlete - competes in sports/events, 5+ years consistent training, impressive physical stats, may coach others. Strong and capable.",
    level50: "Elite athlete - professional or Olympic-level performance. Peak physical condition, competition winner, or extreme athletic achievements.",
    level99: "Legendary champion - world record holder, Olympic gold medalist level. Name etched in sports history as one of the greatest athletes of all time."
  },
  Connector: {
    description: "Building and maintaining meaningful relationships - your network strength, deep friendships, and ability to foster genuine connections. This represents your social capital and relationship quality.",
    level10: "Relationship builder - actively nurturing friendships, expanding network, learning to maintain connections. Has 10-20 meaningful relationships and growing.",
    level30: "Master networker - extensive network of 50+ genuine connections, maintains deep friendships, regularly brings people together. 5+ years of intentional relationship building. Known as a connector in your circles.",
    level50: "Legendary connector - world-class network spanning hundreds of deep relationships. Effortlessly maintains connections, creates powerful introductions, and builds communities. Your network is your superpower.",
    level99: "Transcendent connector - legendary relationship mastery spanning thousands of genuine connections worldwide. Unites communities, changes lives through introductions, creates movements."
  },
  Charisma: {
    description: "The art of charm and connection - social influence, communication mastery, leadership presence, and the ability to connect deeply with others. This represents your interpersonal magnetism and social impact.",
    level10: "Socially developing - learning active listening, practicing confident communication, building genuine connections. Can engage in conversations and make people feel heard.",
    level30: "Charismatic communicator - 5+ years of intentional social skill development. Natural networker, compelling speaker, builds rapport easily. People are drawn to your presence and influence.",
    level50: "Master of influence - exceptional charisma and social mastery. Inspirational leader, captivating speaker, builds deep connections effortlessly. Professional-level influence (think Tony Robbins, world-class politicians, or master networkers).",
    level99: "Legendary influencer - transcendent charisma that moves millions. World-stage presence, unparalleled social mastery, and ability to inspire transformative change globally."
  },
  Explorer: {
    description: "The spirit of adventure and discovery - world travel, cultural immersion, trying new experiences, foods, and activities. This represents your commitment to exploring the world and embracing novel experiences.",
    level10: "Curious adventurer - starting to explore beyond comfort zone. Trying new restaurants, local travel, and occasional new experiences. Building courage to explore unfamiliar territory.",
    level30: "Seasoned explorer - 5+ years of intentional exploration. Traveled to 10+ countries/regions, regularly tries new cuisines and activities, embraces cultural differences. Comfortable navigating unfamiliar environments.",
    level50: "Master adventurer - extensive world travel across 30+ countries, deep cultural immersion, fluent in multiple languages, expert at adapting to new environments. Living embodiment of wanderlust and cultural appreciation.",
    level99: "Legendary explorer - visited all continents, mastered cultural navigation worldwide, speaks 5+ languages, and has transformative experiences that inspire others. A true citizen of the world whose adventures reshape perspectives."
  }
};

// Default skill constellation names
const skillConstellations: Record<string, string> = {
  Craftsman: "The Forge",
  Artist: "The Muse",
  Mindset: "The Transmuter",
  Merchant: "The Trader",
  Physical: "The Titan",
  Scholar: "The Sage",
  Health: "The Vitality",
  Connector: "The Bridge",
  Charisma: "The Influencer",
  Explorer: "The Wanderer"
};

// Milestone constellations for each skill
const skillMilestones: Record<string, Array<{
  id: string;
  title: string;
  level?: number; // Optional - milestones are not tied to skill levels
  x: number;
  y: number;
  parents?: string[]; // IDs of parent nodes
}>> = {
  Explorer: [
    // Level 1: Starting point (center bottom)
    { id: 'start', title: 'Starting point', level: 1, x: 50, y: 90 },
    
    // Level 2: Three branches from start (2-3 nodes above)
    { id: 'countries-5', title: 'Visit 5 countries', level: 5, x: 25, y: 75, parents: ['start'] },
    { id: 'abroad-4mo', title: 'Live in another country 4 months', level: 10, x: 50, y: 72, parents: ['start'] },
    { id: 'citizen-2', title: 'Get citizenship in 2 countries', level: 8, x: 75, y: 75, parents: ['start'] },
    
    // Level 3: Left branch continues (1 node)
    { id: 'countries-10', title: 'Visit 10 countries', level: 15, x: 20, y: 58, parents: ['countries-5'] },
    
    // Level 3: Middle branch splits (2 nodes from middle)
    { id: 'abroad-12mo', title: 'Live in another country 12 months', level: 20, x: 45, y: 55, parents: ['abroad-4mo'] },
    { id: 'lang-2', title: 'Learn 2 languages', level: 18, x: 60, y: 58, parents: ['abroad-4mo'] },
    
    // Level 3: Right branch continues (1 node)
    { id: 'citizen-3', title: 'Get citizenship in 3 countries', level: 22, x: 78, y: 58, parents: ['citizen-2'] },
    
    // Level 4: Remaining nodes, each attached to one parent
    { id: 'countries-20', title: 'Visit 20 countries', level: 30, x: 18, y: 40, parents: ['countries-10'] },
    { id: 'abroad-3yr', title: 'Live in another country 3 years', level: 35, x: 42, y: 38, parents: ['abroad-12mo'] },
    { id: 'lang-3', title: 'Learn 3 languages', level: 32, x: 62, y: 40, parents: ['lang-2'] },
    { id: 'citizen-5', title: 'Get citizenship in 5 countries', level: 40, x: 80, y: 40, parents: ['citizen-3'] },
    
    // Level 5: Final milestones
    { id: 'countries-50', title: 'Visit 50 countries', level: 60, x: 20, y: 22, parents: ['countries-20'] },
    { id: 'citizen-10', title: 'Get citizenship in 10 countries', level: 75, x: 78, y: 20, parents: ['citizen-5'] },
  ],
  Craftsman: [
    // Level 1: Start
    { id: 'start', title: 'Pick Up Your Tools', level: 1, x: 50, y: 88 },
    
    // Level 2: Basic skills branch out from start
    { id: 'change-tire', title: 'Change a Tire', x: 20, y: 78, parents: ['start'] },
    { id: 'project-1', title: 'Complete First Project', level: 5, x: 35, y: 72, parents: ['start'] },
    { id: 'tools-master', title: 'Master Basic Tools', level: 8, x: 65, y: 72, parents: ['start'] },
    { id: 'paint-wall', title: 'Paint a Wall', x: 80, y: 78, parents: ['start'] },
    
    // Level 3: Home & automotive maintenance
    { id: 'change-oil', title: "Change Your Car's Oil", x: 15, y: 68, parents: ['change-tire'] },
    { id: 'fix-drywall', title: 'Fix Drywall', x: 28, y: 62, parents: ['project-1'] },
    { id: 'reflip-breakers', title: 'Reflip Breakers After Power Outage', x: 42, y: 64, parents: ['tools-master'] },
    { id: 'furniture', title: 'Build Custom Furniture', level: 15, x: 58, y: 56, parents: ['tools-master'] },
    { id: 'workshop', title: 'Set Up Workshop', level: 20, x: 70, y: 62, parents: ['tools-master'] },
    { id: 'repair-fridge', title: 'Learn to Repair a Refrigerator', x: 82, y: 68, parents: ['paint-wall'] },
    
    // Level 4: Advanced building & digital skills
    { id: 'build-fence', title: 'Build a Fence', x: 22, y: 52, parents: ['change-oil', 'fix-drywall'] },
    { id: 'create-website', title: 'Create a Website', x: 38, y: 48, parents: ['fix-drywall'] },
    { id: 'apprentice', title: 'Teach an Apprentice', level: 18, x: 50, y: 46, parents: ['reflip-breakers', 'furniture'] },
    { id: 'create-app', title: 'Create a Software App', x: 62, y: 48, parents: ['furniture', 'workshop'] },
    { id: 'innovate', title: 'Innovate New Technique', level: 45, x: 75, y: 52, parents: ['workshop', 'repair-fridge'] },
    
    // Level 5: Major construction & mastery
    { id: 'build-house', title: 'Build a House', x: 30, y: 34, parents: ['build-fence', 'create-website'] },
    { id: 'masterwork', title: 'Create a Masterwork', level: 40, x: 50, y: 30, parents: ['apprentice', 'create-app'] },
    { id: 'advanced-systems', title: 'Master Advanced Systems', x: 70, y: 34, parents: ['innovate'] },
    
    // Level 6: Final milestone
    { id: 'legacy', title: 'Leave a Lasting Legacy', level: 80, x: 50, y: 14, parents: ['build-house', 'masterwork', 'advanced-systems'] },
  ],
  Artist: [
    // Level 1: Start
    { id: 'start', title: 'First Creation', level: 1, x: 50, y: 88 },
    
    // Level 2: Three paths
    { id: 'medium', title: 'Choose Your Medium', level: 5, x: 30, y: 72, parents: ['start'] },
    { id: 'daily', title: 'Create Daily for 30 Days', level: 7, x: 50, y: 70, parents: ['start'] },
    { id: 'study', title: 'Study the Masters', level: 6, x: 70, y: 72, parents: ['start'] },
    
    // Level 3: Development
    { id: 'style', title: 'Develop Unique Style', level: 15, x: 25, y: 54, parents: ['medium'] },
    { id: 'show', title: 'First Public Show', level: 18, x: 50, y: 52, parents: ['daily'] },
    { id: 'technique', title: 'Master Technique', level: 20, x: 75, y: 54, parents: ['study'] },
    
    // Level 4: Professional
    { id: 'sell', title: 'Sell Your Art', level: 30, x: 35, y: 36, parents: ['style', 'show'] },
    { id: 'commission', title: 'Work on Commission', level: 35, x: 65, y: 36, parents: ['show', 'technique'] },
    
    // Level 5: Legacy
    { id: 'inspire', title: 'Inspire Generations', level: 75, x: 50, y: 18, parents: ['sell', 'commission'] },
  ],
  Mindset: [
    // Level 1: Start
    { id: 'start', title: 'Begin Transformation', level: 1, x: 50, y: 88 },
    
    // Level 2: Foundation practices
    { id: 'gratitude', title: 'Daily Gratitude Practice', level: 5, x: 35, y: 72, parents: ['start'] },
    { id: 'reframe', title: 'Master Reframing', level: 7, x: 65, y: 72, parents: ['start'] },
    
    // Level 3: Deeper practice & Habit elimination
    { id: 'eliminate-1-habit', title: 'Eliminate 1 Bad Habit', level: 12, x: 20, y: 62, parents: ['gratitude'] },
    { id: 'meditation', title: '100 Days of Meditation', level: 15, x: 28, y: 56, parents: ['gratitude'] },
    { id: 'awareness', title: 'Develop Self-Awareness', level: 17, x: 50, y: 54, parents: ['gratitude', 'reframe'] },
    { id: 'resilience', title: 'Unshakeable Resilience', level: 20, x: 72, y: 56, parents: ['reframe'] },
    { id: 'eliminate-2-habits', title: 'Eliminate 2 Bad Habits', level: 25, x: 18, y: 45, parents: ['eliminate-1-habit'] },
    
    // Level 4: Mastery
    { id: 'flow', title: 'Enter Flow State', level: 35, x: 40, y: 38, parents: ['meditation', 'awareness'] },
    { id: 'teach', title: 'Teach Others', level: 40, x: 60, y: 38, parents: ['awareness', 'resilience'] },
    
    // Level 5: Peak states
    { id: 'mastery', title: 'Peak Mental State', level: 65, x: 50, y: 22, parents: ['flow', 'teach'] },
    { id: 'transcend', title: 'Transcendent Mastery', level: 90, x: 50, y: 8, parents: ['mastery'] },
  ],
  Merchant: [
    // Start
    { id: 'start', title: 'First Sale', x: 50, y: 90 },
    
    // Level 2: First steps in wealth & business
    { id: 'taxes-first', title: 'Do Your Taxes for the First Time', x: 30, y: 84, parents: ['start'] },
    { id: 'net-worth-1k', title: 'Get $1,000 Net Worth', x: 45, y: 82, parents: ['start'] },
    { id: 'revenue-1k', title: '$1,000 in Revenue', x: 60, y: 82, parents: ['start'] },
    { id: 'second-job', title: 'Get a Second Job Earning at Least $1,000 a Month', x: 75, y: 84, parents: ['start'] },
    
    // Level 3: Building foundations
    { id: 'tax-deductions', title: 'Take Tax Deductions Out for the First Time', x: 25, y: 74, parents: ['taxes-first'] },
    { id: 'net-worth-10k', title: 'Get $10,000 Net Worth', x: 38, y: 72, parents: ['net-worth-1k'] },
    { id: 'client-10', title: '10 Repeat Clients', x: 52, y: 74, parents: ['revenue-1k'] },
    { id: 'remote-business', title: 'Get a Remote Business', x: 68, y: 72, parents: ['second-job'] },
    { id: 'start-business', title: 'Start a Business', x: 82, y: 74, parents: ['second-job'] },
    
    // Level 4: Growing wealth & systems
    { id: 'net-worth-50k', title: 'Get $50,000 Net Worth', x: 20, y: 64, parents: ['tax-deductions', 'net-worth-10k'] },
    { id: 'net-worth-100k', title: 'Get $100,000 Net Worth', x: 35, y: 62, parents: ['net-worth-10k'] },
    { id: 'revenue-10k', title: '$10,000 Monthly', x: 50, y: 64, parents: ['client-10', 'remote-business'] },
    { id: 'venture', title: 'Launch a Venture', x: 65, y: 62, parents: ['remote-business', 'start-business'] },
    { id: 'offshore-trust', title: 'Get an Offshore Trust', x: 80, y: 64, parents: ['start-business'] },
    
    // Level 5: Significant wealth accumulation
    { id: 'net-worth-250k', title: 'Get $250,000 Net Worth', x: 25, y: 52, parents: ['net-worth-50k', 'net-worth-100k'] },
    { id: 'net-worth-500k', title: 'Get $500,000 Net Worth', x: 40, y: 50, parents: ['net-worth-100k'] },
    { id: 'team', title: 'Build a Team', x: 55, y: 52, parents: ['revenue-10k', 'venture'] },
    { id: 'revenue-100k', title: '$100,000 Yearly', x: 70, y: 50, parents: ['venture', 'offshore-trust'] },
    
    // Level 6: Millionaire status
    { id: 'net-worth-1m', title: 'Get $1,000,000 Net Worth', x: 30, y: 40, parents: ['net-worth-250k', 'net-worth-500k'] },
    { id: 'net-worth-1.5m', title: 'Get $1,500,000 Net Worth', x: 45, y: 38, parents: ['net-worth-500k'] },
    { id: 'saas-launch', title: 'Create & Launch a SaaS App', x: 60, y: 40, parents: ['team', 'revenue-100k'] },
    { id: 'multiple', title: 'Multiple Revenue Streams', x: 75, y: 38, parents: ['revenue-100k'] },
    
    // Level 7: Multi-millionaire & advanced business
    { id: 'net-worth-2m', title: 'Get $2,000,000 Net Worth', x: 35, y: 28, parents: ['net-worth-1m', 'net-worth-1.5m'] },
    { id: 'net-worth-3m', title: 'Get $3,000,000 Net Worth', x: 50, y: 26, parents: ['net-worth-1.5m', 'saas-launch'] },
    { id: 'close-business', title: 'Close a Business', x: 65, y: 28, parents: ['saas-launch', 'multiple'] },
    
    // Level 8: Elite wealth
    { id: 'net-worth-5m', title: 'Get $5,000,000 Net Worth', x: 40, y: 16, parents: ['net-worth-2m', 'net-worth-3m'] },
    { id: 'empire', title: 'Build Business Empire', x: 60, y: 16, parents: ['net-worth-3m', 'close-business'] },
    
    // Level 9: Ultimate achievement
    { id: 'legend', title: 'Industry Legend', x: 50, y: 6, parents: ['net-worth-5m', 'empire'] },
  ],
  Physical: [
    // Level 1: Start
    { id: 'start', title: 'Begin Training', level: 1, x: 50, y: 90 },
    
    // Level 2: Foundation - Multiple disciplines branch out
    { id: 'mma-first', title: 'Take an MMA Class for the First Time', x: 15, y: 84, parents: ['start'] },
    { id: 'run-10min', title: 'Run a Mile in 10 Minutes or Less', x: 30, y: 82, parents: ['start'] },
    { id: 'basics', title: 'Master Basic Techniques', level: 5, x: 45, y: 80, parents: ['start'] },
    { id: 'squat-135', title: 'Barbell Squat 5x5 for 135 Pounds', x: 55, y: 80, parents: ['start'] },
    { id: 'endurance', title: 'Build Endurance', level: 7, x: 70, y: 82, parents: ['start'] },
    { id: 'firing-range-first', title: 'Go to a Firing Range for the First Time', x: 85, y: 84, parents: ['start'] },
    
    // Level 3: Early progression across disciplines
    { id: 'mma-10', title: 'Take 10 MMA Classes', x: 12, y: 74, parents: ['mma-first'] },
    { id: 'run-8min', title: 'Run a Mile in 8 Minutes or Less', x: 24, y: 72, parents: ['run-10min'] },
    { id: 'squat-160', title: 'Barbell Squat 5x5 for 160 Pounds', x: 36, y: 70, parents: ['squat-135'] },
    { id: 'wrestling-mock-1', title: 'Do One Wrestling Class with Mock Firearm', x: 48, y: 72, parents: ['basics'] },
    { id: 'run-7min', title: 'Run a Mile in 7 Minutes or Less', x: 60, y: 70, parents: ['run-8min', 'endurance'] },
    { id: 'firing-range-5', title: 'Go to a Firing Range 5 Times', x: 72, y: 72, parents: ['firing-range-first'] },
    { id: 'firing-training', title: 'Have a Formal Firing Range Training Course', x: 88, y: 74, parents: ['firing-range-first'] },
    
    // Level 4: Intermediate development
    { id: 'mma-30', title: 'Take 30 MMA Classes', x: 10, y: 64, parents: ['mma-10'] },
    { id: 'run-6min', title: 'Run a Mile in 6 Minutes or Less', x: 22, y: 62, parents: ['run-8min'] },
    { id: 'squat-180', title: 'Barbell Squat 5x5 for 180 Pounds', x: 34, y: 60, parents: ['squat-160'] },
    { id: 'wrestling-mock-5', title: 'Do 5 Wrestling Classes with Mock Firearms', x: 46, y: 62, parents: ['wrestling-mock-1'] },
    { id: 'strength', title: 'Intermediate Strength', level: 15, x: 54, y: 60, parents: ['basics', 'squat-180'] },
    { id: 'firing-range-10', title: 'Go to a Firing Range 10 Times', x: 66, y: 62, parents: ['firing-range-5'] },
    { id: 'firing-range-20', title: 'Go to a Firing Range 20 Times', x: 78, y: 60, parents: ['firing-training'] },
    { id: 'quickdraw-5hr', title: 'Spend 5 Hours on Quickdraw Practice', x: 90, y: 64, parents: ['firing-training'] },
    
    // Level 5: Advanced training
    { id: 'mma-50', title: 'Take 50 MMA Classes', x: 8, y: 52, parents: ['mma-30'] },
    { id: 'run-5:30', title: 'Run a Mile in 5:30 or Less', x: 20, y: 50, parents: ['run-6min'] },
    { id: 'squat-190', title: 'Barbell Squat 5x5 for 190 Pounds', x: 32, y: 48, parents: ['squat-180'] },
    { id: 'squat-225', title: 'Barbell Squat 5x5 for 225 Pounds', x: 40, y: 50, parents: ['squat-190', 'strength'] },
    { id: 'wrestling-mock-20', title: 'Do 20 Wrestling Classes with Mock Firearms', x: 48, y: 48, parents: ['wrestling-mock-5'] },
    { id: 'martial', title: '3 Years Martial Arts', level: 18, x: 56, y: 50, parents: ['strength'] },
    { id: 'run-5:15', title: 'Run a Mile in 5:15 or Less', x: 64, y: 48, parents: ['run-5:30'] },
    { id: 'flexibility', title: 'Peak Flexibility', level: 20, x: 72, y: 50, parents: ['strength'] },
    { id: 'firing-range-50', title: 'Go to a Firing Range 50 Times', x: 80, y: 48, parents: ['firing-range-20'] },
    { id: 'firing-range-100', title: 'Go to a Firing Range 100 Times', x: 92, y: 52, parents: ['quickdraw-5hr'] },
    
    // Level 6: Elite progression
    { id: 'mma-100', title: 'Take 100 MMA Classes', x: 10, y: 40, parents: ['mma-50'] },
    { id: 'run-5min', title: 'Run a Mile in 5 Minutes or Less', x: 22, y: 38, parents: ['run-5:15'] },
    { id: 'squat-250', title: 'Barbell Squat 5x5 for 250 Pounds', x: 34, y: 36, parents: ['squat-225'] },
    { id: 'squat-300', title: 'Barbell Squat 5x5 for 300 Pounds', x: 42, y: 38, parents: ['squat-250'] },
    { id: 'combat', title: 'Advanced Combat Skills', level: 35, x: 50, y: 36, parents: ['wrestling-mock-20', 'martial'] },
    { id: 'run-4:45', title: 'Run a Mile in 4:45 or Less', x: 58, y: 38, parents: ['run-5min'] },
    { id: 'elite', title: 'Elite Athlete Status', level: 40, x: 66, y: 36, parents: ['martial', 'flexibility'] },
    { id: 'squat-315', title: 'Barbell Squat 5x5 for 315 Pounds', x: 74, y: 38, parents: ['squat-300'] },
    { id: 'firing-range-200', title: 'Go to a Firing Range 200 Times', x: 82, y: 36, parents: ['firing-range-100'] },
    { id: 'mma-200', title: 'Take 200 MMA Classes', x: 90, y: 40, parents: ['firing-range-100'] },
    
    // Level 7: Combat ready & competition
    { id: 'amateur-fight', title: 'Take an Amateur Martial Arts Fight', x: 18, y: 26, parents: ['mma-100'] },
    { id: 'endurance-elite', title: 'Elite Endurance Achievement', x: 32, y: 24, parents: ['run-4:45', 'elite'] },
    { id: 'strength-elite', title: 'Elite Strength Achievement', x: 48, y: 22, parents: ['squat-315', 'combat'] },
    { id: 'compete', title: 'Competition Ready', level: 65, x: 64, y: 24, parents: ['combat', 'elite'] },
    { id: 'tactical-mastery', title: 'Tactical Firearms Mastery', x: 82, y: 26, parents: ['firing-range-200', 'mma-200'] },
    
    // Level 8: Ultimate achievement
    { id: 'real-fight', title: 'Survive and Succeed in a Real Life Fight', x: 30, y: 14, parents: ['amateur-fight', 'endurance-elite'] },
    { id: 'complete-athlete', title: 'Complete Athlete Mastery', x: 50, y: 12, parents: ['endurance-elite', 'strength-elite', 'compete'] },
    { id: 'warrior', title: 'Legendary Warrior', level: 90, x: 70, y: 14, parents: ['compete', 'tactical-mastery'] },
    
    // Level 9: Apex
    { id: 'apex', title: 'Apex Predator', x: 50, y: 4, parents: ['real-fight', 'complete-athlete', 'warrior'] },
  ],
  Scholar: [
    // Level 1: Start
    { id: 'start', title: 'Curiosity Awakens', level: 1, x: 50, y: 88 },
    
    // Level 2: Learning paths
    { id: 'read-12', title: 'Read 12 Books/Year', level: 5, x: 30, y: 72, parents: ['start'] },
    { id: 'philosophy-1', title: 'Read 1 Book on Philosophy', x: 45, y: 74, parents: ['start'] },
    { id: 'focus', title: 'Choose Focus Area', level: 6, x: 60, y: 70, parents: ['start'] },
    { id: 'research', title: 'Begin Research', level: 7, x: 75, y: 72, parents: ['start'] },
    
    // Level 3: Depth
    { id: 'domain', title: 'Master One Domain', level: 15, x: 25, y: 58, parents: ['read-12'] },
    { id: 'philosophy-10', title: 'Read 10 Books on Philosophy', x: 40, y: 56, parents: ['philosophy-1'] },
    { id: 'degree', title: 'Advanced Degree', level: 18, x: 55, y: 54, parents: ['focus', 'philosophy-1'] },
    { id: 'teach', title: 'Teach Your Knowledge', level: 20, x: 70, y: 56, parents: ['research'] },
    { id: 'philosophy-essay', title: 'Write an Essay Reflecting on Philosophy', x: 82, y: 58, parents: ['research'] },
    
    // Level 4: Recognition
    { id: 'publish', title: 'Publish Research', level: 35, x: 35, y: 40, parents: ['domain', 'philosophy-10'] },
    { id: 'deep-thinker', title: 'Deep Philosophical Thinker', x: 50, y: 38, parents: ['philosophy-10', 'degree', 'philosophy-essay'] },
    { id: 'expert', title: 'Recognized Expert', level: 40, x: 65, y: 40, parents: ['teach', 'philosophy-essay'] },
    
    // Level 5: Mastery
    { id: 'polymath', title: 'True Polymath', level: 70, x: 50, y: 24, parents: ['publish', 'deep-thinker', 'expert'] },
    { id: 'wisdom', title: 'Timeless Wisdom', level: 95, x: 50, y: 10, parents: ['polymath'] },
  ],
  Health: [
    // Level 1: Start
    { id: 'start', title: 'Choose Wellness', level: 1, x: 50, y: 90 },
    
    // Level 2: Foundation - Basic health monitoring
    { id: 'dentist-checkup', title: 'Latest Dentist Appointment No New Issues', x: 25, y: 82, parents: ['start'] },
    { id: 'nutrition', title: 'Nutrition Basics', level: 5, x: 40, y: 80, parents: ['start'] },
    { id: 'sleep', title: 'Quality Sleep Routine', level: 7, x: 60, y: 80, parents: ['start'] },
    { id: 'doctor-checkup', title: 'Latest Doctor Appointment No New Issues', x: 75, y: 82, parents: ['start'] },
    
    // Level 3: Building healthy habits
    { id: 'blood-biomarkers', title: 'Within Range for Blood Test Biomarkers', x: 20, y: 72, parents: ['dentist-checkup', 'doctor-checkup'] },
    { id: 'exercise', title: 'Regular Exercise', level: 15, x: 35, y: 70, parents: ['nutrition'] },
    { id: 'keto-3months', title: 'Keto Diet for 3 Months', level: 15, x: 12, y: 68, parents: ['nutrition'] },
    { id: 'sleep-30days', title: 'Get at Least 8 Hours of Sleep for 30 Nights Straight', x: 50, y: 68, parents: ['sleep'] },
    { id: 'resting-hr', title: 'Resting Heart Rate Under 80 BPM', x: 65, y: 70, parents: ['sleep', 'doctor-checkup'] },
    { id: 'markers', title: 'Optimal Health Markers', level: 18, x: 80, y: 72, parents: ['doctor-checkup'] },
    
    // Level 4: Sustained improvement
    { id: 'sleep-60days', title: 'Get at Least 8 Hours of Sleep for 60 Nights Straight', x: 25, y: 58, parents: ['sleep-30days'] },
    { id: 'keto-1year', title: 'Keto Diet for 1 Year', level: 30, x: 10, y: 52, parents: ['keto-3months'] },
    { id: 'optimize-nutrition', title: 'Optimized Nutrition Plan', x: 40, y: 56, parents: ['exercise', 'blood-biomarkers'] },
    { id: 'sleep-90days', title: 'Get at Least 8 Hours of Sleep for 90 Nights Straight', x: 55, y: 54, parents: ['sleep-60days'] },
    { id: 'advanced-metrics', title: 'Advanced Health Metrics', x: 70, y: 56, parents: ['resting-hr', 'markers'] },
    
    // Level 5: Long-term consistency
    { id: 'sleep-100days', title: 'Get at Least 8 Hours of Sleep for 100 Nights Straight', x: 30, y: 44, parents: ['sleep-90days'] },
    { id: 'optimize', title: 'Peak Optimization', level: 35, x: 45, y: 42, parents: ['optimize-nutrition', 'sleep-90days'] },
    { id: 'keto-3years', title: 'Keto Diet for 3 Years', level: 50, x: 8, y: 36, parents: ['keto-1year'] },
    { id: 'sleep-150days', title: 'Get at Least 8 Hours of Sleep for 150 Nights Straight', x: 60, y: 40, parents: ['sleep-100days'] },
    { id: 'longevity', title: 'Longevity Protocols', level: 40, x: 75, y: 44, parents: ['advanced-metrics'] },
    
    // Level 6: Elite habits
    { id: 'habits', title: '5 Years Healthy Habits', level: 20, x: 35, y: 30, parents: ['optimize'] },
    { id: 'sleep-80percent', title: 'Get at Least 8 Hours of Sleep for 80% of the Year', x: 50, y: 28, parents: ['sleep-150days'] },
    { id: 'biohack', title: 'Master Biohacking', level: 65, x: 65, y: 30, parents: ['longevity'] },
    
    // Level 7: Ultimate vitality
    { id: 'complete-wellness', title: 'Complete Wellness Mastery', x: 42, y: 16, parents: ['habits', 'sleep-80percent'] },
    { id: 'vitality', title: 'Legendary Vitality', level: 90, x: 58, y: 16, parents: ['sleep-80percent', 'biohack'] },
    
    // Level 8: Apex health
    { id: 'health-apex', title: 'Apex of Human Health', x: 50, y: 6, parents: ['complete-wellness', 'vitality'] },
  ],
  Connector: [
    // Level 1: Start
    { id: 'start', title: 'Build First Connection', level: 1, x: 50, y: 88 },
    
    // Level 2: Build circle
    { id: 'friends-10', title: '10 Deep Friendships', level: 5, x: 38, y: 72, parents: ['start'] },
    { id: 'network-50', title: 'Network of 50', level: 8, x: 62, y: 72, parents: ['start'] },
    
    // Level 3: Expand
    { id: 'maintain', title: 'Master Maintaining Bonds', level: 15, x: 30, y: 56, parents: ['friends-10'] },
    { id: 'mentor', title: 'Find Mentors', level: 18, x: 50, y: 54, parents: ['friends-10', 'network-50'] },
    { id: 'introduce', title: 'Make 100 Introductions', level: 20, x: 70, y: 56, parents: ['network-50'] },
    
    // Level 4: Community
    { id: 'community', title: 'Build a Community', level: 35, x: 38, y: 38, parents: ['maintain', 'mentor'] },
    { id: 'network-500', title: 'Network of 500+', level: 40, x: 62, y: 38, parents: ['mentor', 'introduce'] },
    
    // Level 5: Master
    { id: 'connector', title: 'Master Connector', level: 75, x: 50, y: 20, parents: ['community', 'network-500'] },
    { id: 'hub', title: 'Social Hub', level: 95, x: 50, y: 6, parents: ['connector'] },
  ],
  Charisma: [
    // Level 1: Start
    { id: 'start', title: 'First Impression', level: 1, x: 50, y: 88 },
    
    // Level 2: Foundation
    { id: 'listen', title: 'Active Listening', level: 5, x: 38, y: 72, parents: ['start'] },
    { id: 'presence', title: 'Confident Presence', level: 7, x: 62, y: 72, parents: ['start'] },
    
    // Level 3: Skills
    { id: 'speak', title: 'Public Speaking', level: 15, x: 30, y: 56, parents: ['listen'] },
    { id: 'storytelling', title: 'Master Storytelling', level: 17, x: 50, y: 54, parents: ['listen', 'presence'] },
    { id: 'influence', title: 'Influence Skills', level: 20, x: 70, y: 56, parents: ['presence'] },
    
    // Level 4: Leadership
    { id: 'lead', title: 'Lead a Team', level: 35, x: 38, y: 38, parents: ['speak', 'storytelling'] },
    { id: 'inspire', title: 'Inspire Hundreds', level: 40, x: 62, y: 38, parents: ['storytelling', 'influence'] },
    
    // Level 5: Legend
    { id: 'movement', title: 'Start a Movement', level: 70, x: 50, y: 22, parents: ['lead', 'inspire'] },
    { id: 'legend', title: 'Legendary Influencer', level: 95, x: 50, y: 8, parents: ['movement'] },
  ],
};

// Default skill icon mapping
const defaultSkillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: Users,
  Explorer: Compass
};

export default function Skills() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Function to get icon for milestone based on title
  const getMilestoneIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    // Check for keywords in title
    if (lowerTitle.includes('start') || lowerTitle.includes('begin') || lowerTitle.includes('first')) return Flag;
    if (lowerTitle.includes('master') || lowerTitle.includes('expert')) return Crown;
    if (lowerTitle.includes('learn') || lowerTitle.includes('study') || lowerTitle.includes('education')) return GraduationCap;
    if (lowerTitle.includes('achieve') || lowerTitle.includes('accomplish')) return Trophy;
    if (lowerTitle.includes('goal') || lowerTitle.includes('target')) return Target;
    if (lowerTitle.includes('skill') || lowerTitle.includes('ability')) return Sparkles;
    if (lowerTitle.includes('champion') || lowerTitle.includes('winner')) return Medal;
    if (lowerTitle.includes('power') || lowerTitle.includes('strength')) return Dumbbell;
    if (lowerTitle.includes('speed') || lowerTitle.includes('fast')) return Zap;
    if (lowerTitle.includes('endurance') || lowerTitle.includes('stamina')) return Bike;
    if (lowerTitle.includes('think') || lowerTitle.includes('mind') || lowerTitle.includes('mental')) return Brain;
    if (lowerTitle.includes('create') || lowerTitle.includes('build') || lowerTitle.includes('craft')) return Wrench;
    if (lowerTitle.includes('art') || lowerTitle.includes('design')) return Palette;
    if (lowerTitle.includes('business') || lowerTitle.includes('deal') || lowerTitle.includes('sale')) return Briefcase;
    if (lowerTitle.includes('fight') || lowerTitle.includes('combat') || lowerTitle.includes('battle')) return Sword;
    if (lowerTitle.includes('protect') || lowerTitle.includes('defend') || lowerTitle.includes('guard')) return Shield;
    if (lowerTitle.includes('friend') || lowerTitle.includes('connect') || lowerTitle.includes('social')) return Users;
    if (lowerTitle.includes('health') || lowerTitle.includes('wellness') || lowerTitle.includes('fit')) return Heart;
    if (lowerTitle.includes('read') || lowerTitle.includes('book') || lowerTitle.includes('knowledge')) return Book;
    if (lowerTitle.includes('discover') || lowerTitle.includes('explore') || lowerTitle.includes('find')) return Compass;
    if (lowerTitle.includes('idea') || lowerTitle.includes('insight') || lowerTitle.includes('innovation')) return Lightbulb;
    if (lowerTitle.includes('grow') || lowerTitle.includes('improve') || lowerTitle.includes('progress')) return TrendingUp;
    if (lowerTitle.includes('peak') || lowerTitle.includes('summit') || lowerTitle.includes('mountain')) return Mountain;
    if (lowerTitle.includes('vision') || lowerTitle.includes('see') || lowerTitle.includes('observe')) return Eye;
    if (lowerTitle.includes('rare') || lowerTitle.includes('precious') || lowerTitle.includes('valuable')) return Gem;
    if (lowerTitle.includes('energy') || lowerTitle.includes('electric')) return Bolt;
    if (lowerTitle.includes('focus') || lowerTitle.includes('aim') || lowerTitle.includes('precision')) return Crosshair;
    if (lowerTitle.includes('launch') || lowerTitle.includes('takeoff')) return Rocket;
    if (lowerTitle.includes('fire') || lowerTitle.includes('passion') || lowerTitle.includes('burn')) return Flame;
    if (lowerTitle.includes('reward') || lowerTitle.includes('prize')) return Award;
    if (lowerTitle.includes('complete') || lowerTitle.includes('finish') || lowerTitle.includes('done')) return CheckCircle;
    
    // Default icon based on number in title if present
    const hasNumber = /\d+/.test(title);
    if (hasNumber) return Star;
    
    // Final fallback
    return Sparkles;
  };

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });
  
  const { data: skills = [], isLoading } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  const [selectedSkill, setSelectedSkill] = useState<UserSkill | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'constellation'>('constellation');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<UserSkill | null>(null);
  const [showEditIconModal, setShowEditIconModal] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<UserSkill | null>(null);
  const [showWhySkillsModal, setShowWhySkillsModal] = useState(false);
  const [showEditMilestonesModal, setShowEditMilestonesModal] = useState(false);
  const [skillToEditMilestones, setSkillToEditMilestones] = useState<UserSkill | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<{id: string; title: string; x: number; y: number} | null>(null);
  const constellationScrollRef = useRef<HTMLDivElement>(null);

  // Auto-center constellation view on starting node when modal opens
  useEffect(() => {
    if (selectedSkill && constellationScrollRef.current) {
      const scrollContainer = constellationScrollRef.current;
      
      // Get milestones for this skill
      const milestones = selectedSkill.constellationMilestones && selectedSkill.constellationMilestones.length > 0
        ? selectedSkill.constellationMilestones
        : skillMilestones[selectedSkill.skillName] || skillMilestones.Explorer;
      
      // Find the starting node (usually the first milestone at the bottom)
      const startNode = milestones.find(m => m.id === 'start') || milestones[0];
      const centerX = startNode?.x || 50;
      const centerY = startNode?.y || 90;
      
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        // Calculate scroll position to center on starter node at bottom-center of viewport
        // Mobile: 500px x 500px with 6px padding, Desktop: 1200px x 1000px with 20px padding
        const containerWidth = isMobile ? 500 : 1200;
        const containerHeight = isMobile ? 500 : 1000;
        const viewportWidth = scrollContainer.clientWidth;
        const viewportHeight = scrollContainer.clientHeight;
        
        // Node position as percentage converted to pixels
        const nodeX = (centerX / 100) * containerWidth;
        const nodeY = (centerY / 100) * containerHeight;
        
        // Position start node near the bottom with adequate space below it
        // nodeY is where the node is, viewportHeight is the visible area
        // To show the node at the bottom, we need: scrollTop = nodeY - (distance from bottom we want)
        const scrollLeft = nodeX - (viewportWidth / 2);
        const scrollTop = nodeY - (viewportHeight - 150); // Keep 150px visible below the start node
        
        // Smooth scroll to position
        scrollContainer.scrollTo({
          left: scrollLeft,
          top: scrollTop,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [selectedSkill, isMobile]);

  const createSkillMutation = useMutation({
    mutationFn: async (skillData: any) => {
      return await apiRequest("POST", "/api/skills/custom", skillData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "✓ Custom Skill Created!",
        description: "Your new skill has been added to your constellation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Skill",
        description: error.message || "Failed to create custom skill",
        variant: "destructive",
      });
    },
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ skillId, milestoneId }: { skillId: number; milestoneId: string }) => {
      const response = await fetch(`/api/skills/${skillId}/milestones/${milestoneId}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to toggle milestone');
      return response.json();
    },
    onSuccess: (updatedSkill) => {
      // Update the selectedSkill state immediately with the returned data
      // Create a new object to ensure React detects the change
      if (selectedSkill && updatedSkill.id === selectedSkill.id) {
        setSelectedSkill({ ...updatedSkill });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/skills'] });
      toast({
        title: "✨ Milestone Updated",
        description: "Constellation progress saved!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Milestone",
        description: error.message || "Failed to toggle milestone",
        variant: "destructive",
      });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: number) => {
      return await apiRequest("DELETE", `/api/skills/${skillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "✓ Skill Deleted",
        description: "The custom skill has been removed from all tasks.",
      });
      setShowDeleteDialog(false);
      setSkillToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Skill",
        description: error.message || "Failed to delete skill",
        variant: "destructive",
      });
    },
  });

  const updateSkillIconMutation = useMutation({
    mutationFn: async ({ 
      skillId, 
      icon, 
      level, 
      xp 
    }: { 
      skillId: number; 
      icon: string; 
      level?: number; 
      xp?: number; 
    }) => {
      return await apiRequest("PATCH", `/api/skills/${skillId}/icon`, { icon, level, xp });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "✓ Skill Updated!",
        description: "Skill has been updated successfully.",
      });
      setShowEditIconModal(false);
      setSkillToEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Skill",
        description: error.message || "Failed to update skill",
        variant: "destructive",
      });
    },
  });

  const updateMilestonesMutation = useMutation({
    mutationFn: async ({ 
      skillId, 
      milestones 
    }: { 
      skillId: number; 
      milestones: Array<{ id: string; title: string; level?: number; x: number; y: number }>;
    }) => {
      return await apiRequest("PATCH", `/api/skills/${skillId}/milestones`, { milestones });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "✓ Milestones Updated!",
        description: "Constellation path has been customized successfully.",
      });
      setShowEditMilestonesModal(false);
      setSkillToEditMilestones(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Milestones",
        description: error.message || "Failed to update milestones",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSkill = () => {
    if (skillToDelete) {
      deleteSkillMutation.mutate(skillToDelete.id);
    }
  };

  // Helper to get skill icon
  const getSkillIconComponent = (skill: UserSkill) => {
    if (skill.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    return defaultSkillIcons[skill.skillName] || Star;
  };

  // Helper to get constellation name
  const getConstellation = (skill: UserSkill) => {
    if (skill.isCustom) {
      return "Custom Skill";
    }
    return skillConstellations[skill.skillName] || "The Seeker";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="text-yellow-200 text-xl">Loading skills...</div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : 'pt-2'} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header */}
      <div className={`relative ${isMobile ? 'pt-4 pb-6 px-3' : 'pt-8 pb-12 px-4'} border-b border-yellow-600/30`}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-400`} />
            <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-serif font-bold text-yellow-100 tracking-wide`}>Celestial Skills</h1>
            <Crown className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-400`} />
          </div>
          <p className={`text-yellow-200/80 ${isMobile ? 'text-sm' : 'text-lg'} italic mb-6`}>Ascend Through the Constellations</p>
          
          {/* Stats and View Toggle */}
          <div className={`flex items-center justify-center ${isMobile ? 'gap-3 mb-3' : 'gap-6 mb-4'}`}>
            <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-yellow-600/30`}>
              <div className="flex items-center gap-2">
                <Star className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-400`} />
                <span className={`text-yellow-100 font-semibold ${isMobile ? 'text-xs' : ''}`}>Total XP: {(progress?.tasksCompleted || 0) * 100}</span>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className={`flex items-center justify-center gap-2 ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="font-semibold">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('constellation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'constellation'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">Constellation</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="font-semibold">List</span>
            </button>
          </div>
          
          {/* Create Custom Skill Button & Why Skills Button */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white border-2 border-purple-400 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Skill
            </Button>
            
            <Button
              onClick={() => setShowWhySkillsModal(true)}
              variant="outline"
              className="bg-slate-800/50 hover:bg-slate-700/50 text-yellow-200 border-2 border-yellow-600/40 hover:border-yellow-500/60 shadow-lg"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Why these skills?
            </Button>
          </div>
        </div>
      </div>

      {/* Skills Constellation Grid or List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {viewMode === 'constellation' ? (
          /* Constellation View */
          <div 
            className={`relative w-full ${isMobile ? 'aspect-square' : 'h-[800px]'} rounded-3xl border-2 border-yellow-600/20 ${isMobile ? 'p-4' : 'p-8'} overflow-hidden`}
            style={{
              background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #020617 100%)',
            }}
          >
            {/* Aurora Borealis Effect Layers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Purple Aurora */}
              <div 
                className="absolute top-0 left-0 w-full h-1/2 opacity-20"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(168, 85, 247, 0.4) 0%, transparent 50%)',
                  filter: 'blur(60px)',
                }}
              />
              {/* Blue Aurora */}
              <div 
                className="absolute top-0 right-0 w-full h-1/2 opacity-20"
                style={{
                  background: 'radial-gradient(ellipse at 70% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
                  filter: 'blur(60px)',
                }}
              />
              {/* Green Aurora */}
              <div 
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 opacity-15"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.3) 0%, transparent 60%)',
                  filter: 'blur(80px)',
                }}
              />
              {/* Cyan Glow */}
              <div 
                className="absolute bottom-0 left-1/4 w-1/2 h-1/3 opacity-10"
                style={{
                  background: 'radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
                  filter: 'blur(70px)',
                }}
              />
            </div>

            {/* Milky Way Effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute top-0 left-1/4 w-1/2 h-full opacity-15 rotate-12"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(139, 92, 246, 0.2) 20%, rgba(167, 139, 250, 0.3) 50%, rgba(139, 92, 246, 0.2) 80%, transparent 100%)',
                  filter: 'blur(40px)',
                }}
              />
            </div>

            {/* Layered Star Field */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Large bright stars */}
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={`large-${i}`}
                  className="absolute rounded-full animate-pulse"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${2 + Math.random() * 2}px`,
                    height: `${2 + Math.random() * 2}px`,
                    background: `radial-gradient(circle, ${
                      ['rgba(255, 255, 255, 0.9)', 'rgba(251, 191, 36, 0.8)', 'rgba(147, 197, 253, 0.8)', 'rgba(196, 181, 253, 0.8)'][Math.floor(Math.random() * 4)]
                    } 0%, transparent 70%)`,
                    boxShadow: `0 0 ${4 + Math.random() * 6}px ${
                      ['rgba(255, 255, 255, 0.5)', 'rgba(251, 191, 36, 0.5)', 'rgba(147, 197, 253, 0.5)', 'rgba(196, 181, 253, 0.5)'][Math.floor(Math.random() * 4)]
                    }`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                  }}
                />
              ))}
              {/* Medium stars */}
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={`medium-${i}`}
                  className="absolute bg-white rounded-full animate-pulse"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${1 + Math.random()}px`,
                    height: `${1 + Math.random()}px`,
                    opacity: 0.3 + Math.random() * 0.4,
                    animationDelay: `${Math.random() * 4}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
              {/* Small twinkling stars */}
              {Array.from({ length: 120 }).map((_, i) => (
                <div
                  key={`small-${i}`}
                  className="absolute bg-white rounded-full"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: '0.5px',
                    height: '0.5px',
                    opacity: 0.2 + Math.random() * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Calculate positions dynamically - Spider Chart Layout */}
            {(() => {
              const centerX = 50; // Center X percentage
              const centerY = isMobile ? 52 : 50; // Center Y percentage - slightly lower on mobile to account for header
              
              // Calculate max level for spider chart scale (highest level + 10, capped at 99)
              const maxLevel = Math.max(...skills.map(s => s.level), 0);
              const chartMax = Math.min(maxLevel + 10, 99);
              
              // Maximum radius for outer boundary (where skill nodes are placed)
              const maxRadius = 38;
              
              // Calculate fixed outer positions for skill nodes
              const getOuterPositions = () => {
                const count = skills.length;
                if (count === 0) return [];
                
                const positions: { x: number; y: number; angle: number }[] = [];
                
                for (let i = 0; i < count; i++) {
                  const angle = (2 * Math.PI * i) / count - Math.PI / 2; // Start from top
                  // Nodes are always at the outer edge
                  const x = centerX + maxRadius * Math.cos(angle);
                  const y = centerY + maxRadius * Math.sin(angle);
                  
                  positions.push({ x, y, angle });
                }
                
                return positions;
              };

              // Calculate polygon points based on skill levels
              const getPolygonPoints = () => {
                const count = skills.length;
                if (count === 0) return [];
                
                const points: { x: number; y: number }[] = [];
                
                for (let i = 0; i < count; i++) {
                  const angle = (2 * Math.PI * i) / count - Math.PI / 2;
                  const skill = skills[i];
                  const radiusRatio = skill.level / chartMax; // Scale based on level
                  const radius = radiusRatio * maxRadius;
                  
                  points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                  });
                }
                
                return points;
              };

              const outerPositions = getOuterPositions();
              const polygonPoints = getPolygonPoints();
              
              // Create grid circle levels for spider chart (25%, 50%, 75%, 100% of max)
              const gridLevels = [0.25, 0.5, 0.75, 1.0];

              return (
                <>
                  {/* Spider Chart Grid - Background circles and radial lines */}
                  <svg 
                    className="absolute inset-0 w-full h-full" 
                    style={{ zIndex: 5, pointerEvents: 'none' }}
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 100 100"
                  >
                    {/* Grid circles */}
                    {gridLevels.map((level, i) => (
                      <ellipse
                        key={`grid-${i}`}
                        cx={`${centerX}%`}
                        cy={`${centerY}%`}
                        rx={`${level * maxRadius}%`}
                        ry={`${level * maxRadius}%`}
                        fill="none"
                        stroke="rgba(250, 204, 21, 0.3)"
                        strokeWidth={isMobile ? "1" : "2"}
                        className="transition-all duration-500"
                      />
                    ))}
                    
                    {/* Radial axis lines from center to each skill position */}
                    {skills.map((skill, index) => {
                      const angle = (2 * Math.PI * index) / skills.length - Math.PI / 2;
                      const endX = centerX + maxRadius * Math.cos(angle);
                      const endY = centerY + maxRadius * Math.sin(angle);
                      
                      return (
                        <line
                          key={`axis-${skill.id}`}
                          x1={`${centerX}%`}
                          y1={`${centerY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke="rgba(250, 204, 21, 0.25)"
                          strokeWidth={isMobile ? "1" : "2"}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                    
                    {/* Spider chart polygon connecting all skill levels - fills based on actual skill levels */}
                    {polygonPoints.length > 0 && (
                      <>
                        {/* Filled polygon area */}
                        <polygon
                          points={polygonPoints.map(pos => `${pos.x}%,${pos.y}%`).join(' ')}
                          fill="rgba(234, 179, 8, 0.5)"
                          className="transition-all duration-500"
                          style={{ filter: isMobile ? 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.8))' : 'drop-shadow(0 0 25px rgba(234, 179, 8, 0.8))' }}
                        />
                        {/* Polygon outline connecting the dots */}
                        <polygon
                          points={polygonPoints.map(pos => `${pos.x}%,${pos.y}%`).join(' ')}
                          fill="none"
                          stroke="rgb(250, 204, 21)"
                          strokeWidth={isMobile ? "2" : "4"}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="transition-all duration-500"
                          style={{ filter: isMobile ? 'drop-shadow(0 0 4px rgba(250, 204, 21, 1))' : 'drop-shadow(0 0 8px rgba(250, 204, 21, 1))' }}
                        />
                        {/* Dots at each polygon vertex to show skill level points */}
                        {polygonPoints.map((point, idx) => (
                          <circle
                            key={`vertex-${idx}`}
                            cx={`${point.x}%`}
                            cy={`${point.y}%`}
                            r={isMobile ? "1" : "1.75"}
                            fill="rgb(250, 204, 21)"
                            stroke="rgb(255, 255, 255)"
                            strokeWidth={isMobile ? "0.5" : "0.75"}
                            className="transition-all duration-500"
                            style={{ filter: isMobile ? 'drop-shadow(0 0 2px rgba(250, 204, 21, 1))' : 'drop-shadow(0 0 3px rgba(250, 204, 21, 1))' }}
                          />
                        ))}
                      </>
                    )}
                  </svg>

                  {/* Skill nodes */}
                  <div className="relative w-full h-full" style={{ zIndex: 10 }}>
                    {skills.map((skill, index) => {
                      const Icon = getSkillIconComponent(skill);
                      const constellation = getConstellation(skill);
                      const progressPercent = (skill.xp / skill.maxXp) * 100;
                      const pos = outerPositions[index];
                      
                      if (!pos) return null;
                      
                      return (
                        <div
                          key={skill.id}
                          className="absolute group cursor-pointer transition-all duration-500"
                          style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={() => setSelectedSkill(skill)}
                        >
                          {/* Glow effect on hover */}
                          <div className={`absolute inset-0 ${isMobile ? '-m-3' : '-m-8'} bg-yellow-400/0 group-hover:bg-yellow-400/20 rounded-full blur-2xl transition-all duration-500`} />
                          
                          {/* Node circle */}
                          <div className={`relative ${isMobile ? 'w-12 h-12 border-2' : 'w-20 h-20 border-4'} rounded-full border-yellow-600/40 group-hover:border-yellow-400 bg-slate-800/80 backdrop-blur-sm transition-all duration-300 group-hover:scale-125 overflow-hidden shadow-lg`}>
                            {/* Progress fill */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-500"
                              style={{ height: `${progressPercent}%` }}
                            />
                            
                            {/* Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon className={`${isMobile ? 'h-6 w-6' : 'h-10 w-10'} text-yellow-100 group-hover:text-white drop-shadow-lg transition-all group-hover:scale-110`} strokeWidth={2} />
                            </div>
                            
                            {/* Level badge - hide on mobile */}
                            {!isMobile && (
                              <div className="absolute -top-1 -right-1 w-8 h-8 text-xs border-2 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 border-yellow-400 flex items-center justify-center text-slate-900 font-bold shadow-lg">
                                {skill.level}
                              </div>
                            )}
                          </div>
                          
                          {/* Skill name tooltip on hover */}
                          <div className={`absolute ${isMobile ? 'top-14' : 'top-24'} left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50`}>
                            <div className={`bg-slate-900/95 backdrop-blur-md ${isMobile ? 'px-2 py-1' : 'px-4 py-2'} rounded-lg border-2 border-yellow-500/60 shadow-xl`}>
                              <p className={`text-yellow-100 font-serif font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>{skill.skillName}</p>
                              <p className={`text-yellow-400/70 ${isMobile ? 'text-[10px]' : 'text-xs'} italic`}>{constellation}</p>
                              <p className={`text-yellow-300 ${isMobile ? 'text-[10px]' : 'text-xs'} mt-1`}>Level {skill.level} • {Math.round(progressPercent)}% XP</p>
                            </div>
                            {/* Arrow pointing up */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-l-2 border-t-2 border-yellow-500/60 rotate-45" />
                          </div>

                          {/* Action buttons on hover */}
                          <div className={`absolute ${isMobile ? '-top-1 -right-8' : '-top-4 -right-16'} opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 z-50`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSkillToEdit(skill);
                                setShowEditIconModal(true);
                              }}
                              className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400`}
                            >
                              <Edit className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-white`} />
                            </Button>
                            
                            {skill.isCustom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSkillToDelete(skill);
                                  setShowDeleteDialog(true);
                                }}
                                className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} p-0 bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400`}
                              >
                                <Trash2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-white`} />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Center decoration */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                    <div className={`${isMobile ? 'w-10 h-10' : 'w-16 h-16'} rounded-full border-2 border-yellow-600/20 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center`}>
                      <Crown className={`${isMobile ? 'h-5 w-5' : 'h-8 w-8'} text-yellow-400/30`} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-3 gap-8'}`}>
            {skills.map((skill) => {
              const Icon = getSkillIconComponent(skill);
              const constellation = getConstellation(skill);
              const progressPercent = (skill.xp / skill.maxXp) * 100;
              
              return (
                <div 
                  key={skill.id} 
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedSkill(skill)}
                >
                  {/* Action Buttons */}
                  <div className={`absolute ${isMobile ? '-top-1 -right-1' : '-top-2 -right-2'} z-10 flex gap-2`}>
                    {/* Edit Icon Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkillToEdit(skill);
                        setShowEditIconModal(true);
                      }}
                      className={`${isMobile ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'} bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400`}
                    >
                      <Edit className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                    </Button>
                    
                    {/* Delete Button for Custom Skills */}
                    {skill.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkillToDelete(skill);
                          setShowDeleteDialog(true);
                        }}
                        className={`${isMobile ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'} bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400`}
                      >
                        <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                      </Button>
                    )}
                  </div>
                  
                  {/* Constellation Card */}
                  <Card className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all duration-500 overflow-hidden">
                    <div className={isMobile ? 'p-3' : 'p-6'}>
                      {/* Level Badge */}
                      <Badge className={`absolute ${isMobile ? 'top-2 right-2 text-xs px-2 py-0.5' : 'top-3 right-3 text-sm px-3 py-1'} bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold shadow-lg`}>
                        Level {skill.level}
                      </Badge>
                      
                      {/* Custom Skill Badge */}
                      {skill.isCustom && (
                        <Badge className={`absolute ${isMobile ? 'top-2 left-2 text-[10px] px-1.5 py-0.5' : 'top-3 left-3 text-xs px-2 py-1'} bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-400 font-bold`}>
                          Custom
                        </Badge>
                      )}

                      {/* Rounded Square Icon with Bottom-to-Top Fill */}
                      <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-28 h-28'} mx-auto mb-4`}>
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-yellow-400/10 rounded-2xl blur-xl group-hover:bg-yellow-400/20 transition-all"></div>
                        
                        {/* Icon container - rounded square */}
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-yellow-600/40 group-hover:border-yellow-500/70 transition-all bg-slate-700/30">
                          {/* Gray base (unfilled background) */}
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                          
                          {/* Yellow fill from bottom to top */}
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out"
                            style={{ 
                              height: `${progressPercent}%`,
                              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)'
                            }}
                          ></div>
                          
                          {/* Icon overlay - always centered and visible */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon 
                              className={`${isMobile ? 'h-10 w-10' : 'h-16 w-16'} text-slate-900/80 drop-shadow-lg`}
                              strokeWidth={2.5}
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Constellation Name */}
                      <div className="text-center mb-3">
                        <h3 className={`${isMobile ? 'text-sm' : 'text-xl'} font-serif font-bold text-yellow-100 mb-1 tracking-wide`}>
                          {skill.skillName}
                        </h3>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-400/70 italic font-serif`}>
                          {constellation}
                        </p>
                      </div>

                      {/* XP Display */}
                      <div className={`bg-slate-900/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-yellow-600/20`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200/80 font-semibold`}>{skill.xp} / {skill.maxXp} XP</span>
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-400 font-bold`}>{Math.round(progressPercent)}%</span>
                        </div>
                        
                        <p className={`text-center ${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-300/60 font-serif italic`}>
                          {skill.maxXp - skill.xp} XP to next level
                        </p>
                      </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </Card>

                  {/* Connecting constellation lines (decorative) - hide on mobile */}
                  {!isMobile && skill.id % 3 !== 0 && (
                    <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-yellow-600/30 to-transparent hidden lg:block"></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - Two Columns */
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
            {skills.map((skill) => {
              const Icon = getSkillIconComponent(skill);
              const constellation = getConstellation(skill);
              const progressPercent = (skill.xp / skill.maxXp) * 100;
              
              return (
                <Card 
                  key={skill.id}
                  className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all cursor-pointer overflow-hidden relative"
                  onClick={() => setSelectedSkill(skill)}
                >
                  {/* Action Buttons */}
                  <div className={`absolute ${isMobile ? 'top-1 right-1' : 'top-2 right-2'} z-10 flex gap-2`}>
                    {/* Edit Icon Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkillToEdit(skill);
                        setShowEditIconModal(true);
                      }}
                      className={`${isMobile ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'} bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400`}
                    >
                      <Edit className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                    </Button>
                    
                    {/* Delete Button for Custom Skills */}
                    {skill.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkillToDelete(skill);
                          setShowDeleteDialog(true);
                        }}
                        className={`${isMobile ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'} bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400`}
                      >
                        <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                      </Button>
                    )}
                  </div>
                  
                  <div className={isMobile ? 'p-3' : 'p-4'}>
                    <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-6'}`}>
                      {/* Icon Section */}
                      <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-20 h-20'} flex-shrink-0`}>
                        <div className="absolute inset-0 bg-yellow-400/10 rounded-2xl blur-lg"></div>
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-yellow-600/40 bg-slate-700/30">
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400"
                            style={{ 
                              height: `${progressPercent}%`,
                              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)'
                            }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon 
                              className={`${isMobile ? 'h-9 w-9' : 'h-12 w-12'} text-slate-900/80 drop-shadow-lg`}
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info Section */}
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center ${isMobile ? 'gap-2 mb-1' : 'gap-3 mb-2'}`}>
                          <h3 className={`${isMobile ? 'text-base' : 'text-2xl'} font-serif font-bold text-yellow-100 tracking-wide`}>
                            {skill.skillName}
                          </h3>
                          <Badge className={`bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold ${isMobile ? 'text-xs' : ''}`}>
                            Level {skill.level}
                          </Badge>
                        </div>
                        <p className={`${isMobile ? 'text-xs mb-2' : 'text-sm mb-3'} text-yellow-400/70 italic font-serif`}>
                          {constellation}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className={`flex justify-between items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            <span className="text-yellow-200/80 font-semibold">{skill.xp} / {skill.maxXp} XP</span>
                            <span className="text-yellow-400 font-bold">{Math.round(progressPercent)}%</span>
                          </div>
                          <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-yellow-600/20">
                            <div 
                              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-yellow-300/60 font-serif italic">
                            {skill.level >= 99 
                              ? "⭐ Maximum Level ⭐" 
                              : `${skill.maxXp - skill.xp} XP to next level`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Ancient Tome Info Section */}
        <Card className="mt-12 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 overflow-hidden">
          <div className="p-8 relative">
            {/* Decorative corner ornaments */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-yellow-600/50"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-yellow-600/50"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-yellow-600/50"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-600/50"></div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-2 tracking-wide flex items-center justify-center gap-3">
                <Book className="h-6 w-6 text-yellow-400" />
                The Path of Ascension
                <Book className="h-6 w-6 text-yellow-400" />
              </h2>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent mx-auto"></div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-yellow-100/90 max-w-3xl mx-auto">
              <div className="space-y-3">
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Complete quests to fill your constellation with celestial power</span>
                </p>
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Greater challenges yield more potent experience</span>
                </p>
              </div>
              <div className="space-y-3">
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Maintain daily rituals to multiply thy gains</span>
                </p>
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Unlock divine blessings at milestone levels</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Skill Detail Modal */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && setSelectedSkill(null)}>
        <DialogContent className={`bg-slate-900/95 border-2 border-yellow-600/40 text-yellow-100 ${isMobile ? 'max-w-full w-full h-full max-h-full m-0 rounded-none' : 'max-w-4xl max-h-[90vh]'} overflow-hidden`}>
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-xl' : 'text-2xl'} font-serif text-yellow-100 flex items-center gap-3`}>
              {selectedSkill && (
                <>
                  <div className={`relative ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full overflow-hidden border-2 border-yellow-600/40 bg-slate-800/80`}>
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400"
                      style={{ 
                        height: `${(selectedSkill.xp / selectedSkill.maxXp) * 100}%`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const Icon = getSkillIconComponent(selectedSkill);
                        return <Icon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-yellow-100`} strokeWidth={2} />;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={isMobile ? 'text-base' : ''}>{selectedSkill.skillName}</span>
                      <Badge className={`bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Level {selectedSkill.level}
                      </Badge>
                    </div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-400/70 italic font-normal mt-1`}>{getConstellation(selectedSkill)}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSkill && (
            <>
              {/* Skill Description */}
              <div className={`${isMobile ? 'mb-2 p-3' : 'mb-4 p-4'} bg-slate-800/40 border border-yellow-600/30 rounded-lg`}>
                <p className={`text-yellow-200/90 ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed`}>
                  {selectedSkill.skillDescription || 
                   (skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions]?.description) || 
                   "Develop expertise in this skill area through focused practice and achievement."}
                </p>
              </div>

              {/* Edit Milestones Button and Instructions */}
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between'} items-center`}>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-400/70 italic`}>
                  💫 {isMobile ? 'Tap nodes to toggle' : 'Drag to navigate • Scroll to explore • Click nodes to toggle completion'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSkillToEditMilestones(selectedSkill);
                    setShowEditMilestonesModal(true);
                  }}
                  className={`bg-slate-700/50 hover:bg-slate-600/50 text-yellow-200 border-yellow-600/40 hover:border-yellow-500/60 ${isMobile ? 'w-full text-xs' : ''}`}
                >
                  <Edit className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                  Customize Milestones
                </Button>
              </div>

              <div 
                ref={constellationScrollRef}
                className={`relative w-full ${isMobile ? 'h-[calc(100vh-280px)]' : 'h-[600px]'} rounded-xl border border-yellow-600/20 overflow-auto cursor-grab active:cursor-grabbing`}
                style={{
                  background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #020617 100%)',
                }}
                onMouseDown={(e) => {
                  const elem = e.currentTarget;
                  const startX = e.pageX - elem.offsetLeft;
                  const startY = e.pageY - elem.offsetTop;
                  const scrollLeft = elem.scrollLeft;
                  const scrollTop = elem.scrollTop;
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    e.preventDefault();
                    const x = e.pageX - elem.offsetLeft;
                    const y = e.pageY - elem.offsetTop;
                    const walkX = (x - startX) * 2;
                    const walkY = (y - startY) * 2;
                    elem.scrollLeft = scrollLeft - walkX;
                    elem.scrollTop = scrollTop - walkY;
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                onTouchStart={(e) => {
                  if (!isMobile) return;
                  const elem = e.currentTarget;
                  const touch = e.touches[0];
                  const startX = touch.pageX - elem.offsetLeft;
                  const startY = touch.pageY - elem.offsetTop;
                  const scrollLeft = elem.scrollLeft;
                  const scrollTop = elem.scrollTop;
                  
                  const handleTouchMove = (e: TouchEvent) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const x = touch.pageX - elem.offsetLeft;
                    const y = touch.pageY - elem.offsetTop;
                    const walkX = (x - startX) * 2;
                    const walkY = (y - startY) * 2;
                    elem.scrollLeft = scrollLeft - walkX;
                    elem.scrollTop = scrollTop - walkY;
                  };
                  
                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  document.addEventListener('touchmove', handleTouchMove, { passive: false });
                  document.addEventListener('touchend', handleTouchEnd);
                }}
                onClick={() => setSelectedMilestone(null)}
              >
              {/* Aurora Borealis Effect Layers */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Purple Aurora */}
                <div 
                  className="absolute top-0 left-0 w-full h-1/2 opacity-20"
                  style={{
                    background: 'radial-gradient(ellipse at 30% 20%, rgba(168, 85, 247, 0.4) 0%, transparent 50%)',
                    filter: 'blur(60px)',
                  }}
                />
                {/* Blue Aurora */}
                <div 
                  className="absolute top-0 right-0 w-full h-1/2 opacity-20"
                  style={{
                    background: 'radial-gradient(ellipse at 70% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
                    filter: 'blur(60px)',
                  }}
                />
                {/* Green Aurora */}
                <div 
                  className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 opacity-15"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.3) 0%, transparent 60%)',
                    filter: 'blur(80px)',
                  }}
                />
                {/* Cyan Glow */}
                <div 
                  className="absolute bottom-0 left-1/4 w-1/2 h-1/3 opacity-10"
                  style={{
                    background: 'radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                  }}
                />
              </div>

              {/* Milky Way Effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute top-0 left-1/4 w-1/2 h-full opacity-15 rotate-12"
                  style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(139, 92, 246, 0.2) 20%, rgba(167, 139, 250, 0.3) 50%, rgba(139, 92, 246, 0.2) 80%, transparent 100%)',
                    filter: 'blur(40px)',
                  }}
                />
              </div>

              {/* Layered Star Field - Reduced for mobile */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Large bright stars */}
                {Array.from({ length: isMobile ? 15 : 30 }).map((_, i) => (
                  <div
                    key={`large-${i}`}
                    className="absolute rounded-full animate-pulse"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      width: `${2 + Math.random() * 2}px`,
                      height: `${2 + Math.random() * 2}px`,
                      background: `radial-gradient(circle, ${
                        ['rgba(255, 255, 255, 0.9)', 'rgba(251, 191, 36, 0.8)', 'rgba(147, 197, 253, 0.8)', 'rgba(196, 181, 253, 0.8)'][Math.floor(Math.random() * 4)]
                      } 0%, transparent 70%)`,
                      boxShadow: `0 0 ${4 + Math.random() * 6}px ${
                        ['rgba(255, 255, 255, 0.5)', 'rgba(251, 191, 36, 0.5)', 'rgba(147, 197, 253, 0.5)', 'rgba(196, 181, 253, 0.5)'][Math.floor(Math.random() * 4)]
                      }`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 3}s`,
                    }}
                  />
                ))}
                {/* Medium stars */}
                {Array.from({ length: isMobile ? 40 : 80 }).map((_, i) => (
                  <div
                    key={`medium-${i}`}
                    className="absolute bg-white rounded-full animate-pulse"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      width: `${1 + Math.random()}px`,
                      height: `${1 + Math.random()}px`,
                      opacity: 0.3 + Math.random() * 0.4,
                      animationDelay: `${Math.random() * 4}s`,
                      animationDuration: `${3 + Math.random() * 2}s`,
                    }}
                  />
                ))}
                {/* Small twinkling stars */}
                {Array.from({ length: isMobile ? 75 : 150 }).map((_, i) => (
                  <div
                    key={`small-${i}`}
                    className="absolute bg-white rounded-full"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      width: '0.5px',
                      height: '0.5px',
                      opacity: 0.2 + Math.random() * 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Scrollable constellation container */}
              <div className={`relative ${isMobile ? 'w-[500px] h-[500px] p-6' : 'w-[1200px] h-[1000px] p-20'}`}>
              {/* Milestone constellation */}
              {(() => {
                // Use database milestones if available, otherwise use default
                const milestones = selectedSkill.constellationMilestones && selectedSkill.constellationMilestones.length > 0
                  ? selectedSkill.constellationMilestones
                  : skillMilestones[selectedSkill.skillName] || skillMilestones.Explorer;
                
                return (
                  <>
                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                      {milestones.map((milestone) => {
                        // Draw lines from this milestone to all its parents
                        if (!milestone.parents || milestone.parents.length === 0) return null;
                        
                        return milestone.parents.map((parentId) => {
                          const parent = milestones.find(m => m.id === parentId);
                          if (!parent) return null;
                          
                          const completedMilestones = (selectedSkill.completedMilestones as string[]) || [];
                          const isCompleted = completedMilestones.includes(milestone.id);
                          const isParentCompleted = completedMilestones.includes(parent.id);
                          const bothCompleted = isCompleted && isParentCompleted;
                          
                          return (
                            <line
                              key={`line-${parent.id}-${milestone.id}`}
                              x1={`${parent.x}%`}
                              y1={`${parent.y}%`}
                              x2={`${milestone.x}%`}
                              y2={`${milestone.y}%`}
                              stroke={bothCompleted ? "rgba(250, 204, 21, 0.8)" : "rgba(250, 204, 21, 0.2)"}
                              strokeWidth={bothCompleted ? "3" : "2"}
                              className="transition-all duration-500"
                              style={{
                                filter: bothCompleted ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.6))' : 'none',
                              }}
                            />
                          );
                        });
                      })}
                    </svg>

                    {/* Milestone nodes */}
                    <div className="relative w-full h-full" style={{ zIndex: 2 }}>
                      {milestones.map((milestone, index) => {
                        const completedMilestones = (selectedSkill.completedMilestones as string[]) || [];
                        const isCompleted = completedMilestones.includes(milestone.id);
                        const isStartingNode = milestone.id === 'start'; // Starting node always has id 'start'
                        const isCurrentGoal = !isCompleted && !isStartingNode;
                        
                        return (
                          <div
                            key={milestone.id}
                            className="absolute group transition-all duration-500 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open submenu instead of immediately toggling
                              setSelectedMilestone({
                                id: milestone.id,
                                title: milestone.title,
                                x: milestone.x,
                                y: milestone.y
                              });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              left: `${milestone.x}%`,
                              top: `${milestone.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {/* Glow for current goal (not for starting node or completed) */}
                            {isCurrentGoal && (
                              <div className="absolute inset-0 -m-6 bg-blue-400/20 rounded-full blur-xl animate-pulse-slow" />
                            )}
                            
                            {/* Node circle */}
                            <div className={`relative w-14 h-14 rounded-full border-4 transition-all duration-300 group-hover:scale-110 overflow-hidden ${
                              isCompleted 
                                ? 'border-yellow-400 bg-yellow-600 shadow-lg shadow-yellow-600/50' 
                                : isStartingNode
                                ? 'border-yellow-400 bg-yellow-600 shadow-lg shadow-yellow-600/50' // Starting node is yellow like completed
                                : isCurrentGoal
                                ? 'border-blue-400 bg-slate-800/80 shadow-lg shadow-blue-400/50 animate-pulse-slow'
                                : 'border-yellow-600/30 bg-slate-800/60'
                            }`}>
                              {/* Filled background for completed or starting node */}
                              {(isCompleted || isStartingNode) && (
                                <div className="absolute inset-0 bg-gradient-to-t from-yellow-600 to-yellow-400" />
                              )}
                              
                              {/* Icon based on milestone title */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                {(() => {
                                  const IconComponent = getMilestoneIcon(milestone.title);
                                  return (
                                    <IconComponent 
                                      className={`w-6 h-6 ${
                                        (isCompleted || isStartingNode) ? 'text-slate-900' : 'text-yellow-200/80'
                                      }`}
                                      strokeWidth={2.5}
                                    />
                                  );
                                })()}
                              </div>
                            </div>
                            
                            {/* Tooltip with milestone title */}
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                              <div className={`px-4 py-2 rounded-lg border-2 shadow-xl ${
                                (isCompleted || isStartingNode) 
                                  ? 'bg-yellow-900/95 border-yellow-500/60 backdrop-blur-md'
                                  : isCurrentGoal
                                  ? 'bg-blue-900/95 border-blue-500/60 backdrop-blur-md'
                                  : 'bg-slate-900/95 border-yellow-600/40 backdrop-blur-md'
                              }`}>
                                <p className={`font-serif font-bold text-sm ${
                                  (isCompleted || isStartingNode) ? 'text-yellow-100' : isCurrentGoal ? 'text-blue-100' : 'text-yellow-200/80'
                                }`}>
                                  {milestone.title}
                                </p>
                                <p className="text-xs text-yellow-400/70 mt-1">
                                  {isCompleted ? '✓ Achieved' : isStartingNode ? '⚡ Starting Point' : 'Click to view details'}
                                </p>
                              </div>
                              {/* Arrow */}
                              <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${
                                (isCompleted || isStartingNode) 
                                  ? 'bg-yellow-900 border-l-2 border-t-2 border-yellow-500/60'
                                  : isCurrentGoal
                                  ? 'bg-blue-900 border-l-2 border-t-2 border-blue-500/60'
                                  : 'bg-slate-900 border-l-2 border-t-2 border-yellow-600/40'
                              }`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Milestone Submenu Modal */}
                    {selectedMilestone && selectedSkill && (
                      <div 
                        className="absolute z-50 bg-slate-900/98 backdrop-blur-md rounded-xl border-2 border-yellow-600/40 p-6 shadow-2xl"
                        style={{
                          left: `${selectedMilestone.x}%`,
                          top: `${selectedMilestone.y}%`,
                          transform: 'translate(-50%, calc(-50% - 80px))',
                          minWidth: '280px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Close button */}
                        <button
                          onClick={() => setSelectedMilestone(null)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded-full border border-yellow-600/40 flex items-center justify-center text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          ✕
                        </button>

                        {/* Milestone info */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const IconComponent = getMilestoneIcon(selectedMilestone.title);
                              return <IconComponent className="w-8 h-8 text-yellow-400" strokeWidth={2.5} />;
                            })()}
                            <h3 className="font-serif text-xl text-yellow-100 font-bold">{selectedMilestone.title}</h3>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {(() => {
                              const completedMilestones = (selectedSkill.completedMilestones as string[]) || [];
                              const isCompleted = completedMilestones.includes(selectedMilestone.id);
                              return isCompleted ? (
                                <Badge className="bg-green-600 text-white border-green-400">
                                  ✓ Achieved
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-600 text-white border-blue-400">
                                  In Progress
                                </Badge>
                              );
                            })()}
                          </div>

                          {/* Complete/Uncomplete button */}
                          {(() => {
                            const completedMilestones = (selectedSkill.completedMilestones as string[]) || [];
                            const isCompleted = completedMilestones.includes(selectedMilestone.id);
                            const milestones = selectedSkill.constellationMilestones && selectedSkill.constellationMilestones.length > 0
                              ? selectedSkill.constellationMilestones
                              : skillMilestones[selectedSkill.skillName] || skillMilestones.Explorer;
                            const milestoneIndex = milestones.findIndex(m => m.id === selectedMilestone.id);
                            const isStartingNode = milestones[milestoneIndex]?.level === 1 || milestoneIndex === 0;

                            if (isStartingNode) {
                              return (
                                <p className="text-yellow-400/70 text-sm italic">
                                  Starting point - automatically unlocked
                                </p>
                              );
                            }

                            return (
                              <Button
                                onClick={() => {
                                  toggleMilestoneMutation.mutate({ 
                                    skillId: selectedSkill.id, 
                                    milestoneId: selectedMilestone.id 
                                  }, {
                                    onSuccess: () => {
                                      // Close the submenu after successful toggle
                                      setSelectedMilestone(null);
                                    }
                                  });
                                }}
                                className={`w-full ${
                                  isCompleted 
                                    ? 'bg-slate-700 hover:bg-slate-600 text-yellow-200 border-yellow-600/40'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-slate-900 border-yellow-400'
                                }`}
                              >
                                {isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
                              </Button>
                            );
                          })()}
                        </div>

                        {/* Arrow pointing to milestone */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 bg-slate-900 border-r-2 border-b-2 border-yellow-600/40" />
                      </div>
                    )}

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-lg border border-yellow-600/30 text-xs z-10">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-yellow-400"></div>
                          <span className="text-yellow-200/80">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-700 border-2 border-blue-400 animate-pulse"></div>
                          <span className="text-yellow-200/80">In Progress</span>
                        </div>
                        <p className="text-yellow-400/60 italic">Click nodes to toggle completion • Hover for details</p>
                      </div>
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Custom Skill Modal */}
      <AddSkillModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={async (skillData) => {
          await createSkillMutation.mutateAsync(skillData);
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{skillToDelete?.skillName}" and remove it from all tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSkill}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Skill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Skill Icon Modal */}
      {skillToEdit && (
        <EditSkillIconModal
          open={showEditIconModal}
          onOpenChange={setShowEditIconModal}
          skillName={skillToEdit.skillName}
          currentIcon={skillToEdit.skillIcon || 'Star'}
          currentLevel={skillToEdit.level}
          currentXp={skillToEdit.xp}
          currentMaxXp={skillToEdit.maxXp}
          onSubmit={async (data) => {
            await updateSkillIconMutation.mutateAsync({ 
              skillId: skillToEdit.id, 
              icon: data.icon,
              level: data.level,
              xp: data.xp
            });
          }}
        />
      )}

      {skillToEditMilestones && (
        <EditMilestonesModal
          open={showEditMilestonesModal}
          onOpenChange={setShowEditMilestonesModal}
          skillName={skillToEditMilestones.skillName}
          currentMilestones={skillToEditMilestones.constellationMilestones || 
            skillMilestones[skillToEditMilestones.skillName] || 
            skillMilestones.Explorer}
          onSubmit={async (milestones) => {
            await updateMilestonesMutation.mutateAsync({
              skillId: skillToEditMilestones.id,
              milestones
            });
          }}
        />
      )}

      {/* Why Skills Modal */}
      <WhySkillsModal 
        open={showWhySkillsModal}
        onClose={() => setShowWhySkillsModal(false)}
      />
    </div>
  );
}

