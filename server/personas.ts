/**
 * Personas Service
 * Manages AI customer personas and their scenario assignments
 */

import { db } from './db';
import { randomUUID } from 'crypto';

// ============================================
// TYPES
// ============================================

export interface Persona {
  id: string;
  name: string;
  avatarUrl: string | null;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  accountValue: number;
  ageGroup: string | null;
  region: string | null;
  language: string;
  email: string | null;
  phone: string | null;
  accountSince: string | null;
  contractInfo: PersonaContractInfo;
  behaviorProfile: PersonaBehaviorProfile;
  voiceId: string | null;
  voiceSpeed: string;
  systemPrompt: string | null;
  greetingTemplate: string | null;
  isActive: boolean;
  isTemplate: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaContractInfo {
  plan: string;
  monthlyValue: number;
  renewalDate: string;
  status: 'Active' | 'Suspended' | 'Cancelled';
}

export interface PersonaBehaviorProfile {
  initialMood: 'calm' | 'happy' | 'frustrated' | 'angry' | 'panicked';
  patienceLevel: 'low' | 'medium' | 'high';
  cooperationLevel: 'low' | 'medium' | 'high';
  communicationStyle: 'formal' | 'casual' | 'aggressive' | 'passive';
  escalationTriggers: string[];
  deescalationTriggers: string[];
}

export interface PersonaScenario {
  id: string;
  personaId: string;
  scenarioId: string;
  contextOverride: PersonaContextOverride | null;
  displayOrder: number;
  usageCount: number;
  avgScore: number | null;
  createdAt: string;
}

export interface PersonaContextOverride {
  specificIssue?: string;
  initialMood?: 'calm' | 'happy' | 'frustrated' | 'angry' | 'panicked';
  previousAttempts?: number;
  expectedOutcome?: string;
}

export interface CallHistoryEntry {
  id: string;
  personaId: string;
  date: string;
  duration: string;
  type: string;
  outcome: 'Resolved' | 'Escalated' | 'Pending';
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  createdAt: string;
}

export interface PersonaWithScenarios extends Persona {
  scenarios: Array<{
    scenarioId: string;
    scenarioTitle: string;
    scenarioCategory: string;
    contextOverride: PersonaContextOverride | null;
    displayOrder: number;
  }>;
  callHistory: CallHistoryEntry[];
}

export interface ScenarioWithPersonas {
  scenarioId: string;
  scenarioTitle: string;
  personas: Array<{
    personaId: string;
    personaName: string;
    personaTier: string;
    isPrimary: boolean;
    contextOverride: PersonaContextOverride | null;
  }>;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

export async function initializePersonaTables(): Promise<void> {
  try {
    // Check if personas table exists
    const checkResult = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='personas'"
    );
    
    const personasTableExists = checkResult.rows.length > 0;
    
    // Check if call_history table exists (for migration)
    const callHistoryCheck = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='persona_call_history'"
    );
    const callHistoryTableExists = callHistoryCheck.rows.length > 0;

    if (personasTableExists && callHistoryTableExists) {
      console.log('✅ Persona tables already exist');
      return;
    }

    // Create missing tables
    if (!personasTableExists) {
      console.log('🔄 Creating persona tables...');

      // Create personas table
      await db.execute(`
        CREATE TABLE personas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar_url TEXT,
          tier TEXT DEFAULT 'Silver' CHECK(tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
          account_value INTEGER DEFAULT 0,
          age_group TEXT,
          region TEXT,
          language TEXT DEFAULT 'en',
          email TEXT,
          phone TEXT,
          account_since TEXT,
          contract_info TEXT,  -- JSON
          behavior_profile TEXT,  -- JSON
          voice_id TEXT,
          voice_speed TEXT DEFAULT 'normal',
          system_prompt TEXT,
          greeting_template TEXT,
          is_active INTEGER DEFAULT 1,
          is_template INTEGER DEFAULT 0,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Create persona_scenarios junction table
      await db.execute(`
        CREATE TABLE persona_scenarios (
          id TEXT PRIMARY KEY,
          persona_id TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          context_override TEXT,  -- JSON
          display_order INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          avg_score REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
          FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
          UNIQUE(persona_id, scenario_id)
        )
      `);

      // Create indexes
      await db.execute(`CREATE INDEX idx_personas_tier ON personas(tier)`);
      await db.execute(`CREATE INDEX idx_personas_active ON personas(is_active)`);
      await db.execute(`CREATE INDEX idx_personas_template ON personas(is_template)`);
      await db.execute(`CREATE INDEX idx_ps_persona ON persona_scenarios(persona_id)`);
      await db.execute(`CREATE INDEX idx_ps_scenario ON persona_scenarios(scenario_id)`);
      await db.execute(`CREATE INDEX idx_ps_order ON persona_scenarios(scenario_id, display_order)`);

      console.log('✅ Persona tables created successfully');

      // Seed default personas
      await seedDefaultPersonas();
    }

    // Create call_history table if missing (migration)
    if (!callHistoryTableExists) {
      console.log('🔄 Creating persona_call_history table...');
      
      await db.execute(`
        CREATE TABLE persona_call_history (
          id TEXT PRIMARY KEY,
          persona_id TEXT NOT NULL,
          date TEXT NOT NULL,
          duration TEXT NOT NULL,
          type TEXT NOT NULL,
          outcome TEXT CHECK(outcome IN ('Resolved', 'Escalated', 'Pending')),
          sentiment TEXT CHECK(sentiment IN ('positive', 'negative', 'neutral')),
          summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
        )
      `);

      await db.execute(`CREATE INDEX idx_pch_persona ON persona_call_history(persona_id)`);
      
      console.log('✅ Call history table created');
      
      // Seed call history
      await seedCallHistory();
    }

  } catch (error) {
    console.error('❌ Error creating persona tables:', error);
    throw error;
  }
}

// ============================================
// SEED DEFAULT PERSONAS
// ============================================

async function seedDefaultPersonas(): Promise<void> {
  console.log('🌱 Seeding default personas...');

  const defaultPersonas: Array<Omit<Persona, 'id' | 'createdAt' | 'updatedAt'> & { id: string }> = [
    {
      id: 'pers-angry-gold',
      name: 'Sarah Thompson',
      avatarUrl: null,
      tier: 'Gold',
      accountValue: 15000,
      ageGroup: '35-44',
      region: 'Northeast',
      language: 'en',
      email: 'sarah.thompson@email.com',
      phone: '+1 (555) 234-5678',
      accountSince: '2019-03-15',
      contractInfo: {
        plan: 'Premium Plus',
        monthlyValue: 149.99,
        renewalDate: '2025-03-15',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'angry',
        patienceLevel: 'low',
        cooperationLevel: 'medium',
        communicationStyle: 'aggressive',
        escalationTriggers: ['long hold times', 'repeating information', 'no resolution', 'transfers'],
        deescalationTriggers: ['empathy', 'discounts', 'quick resolution', 'manager attention']
      },
      voiceId: 'shimmer',
      voiceSpeed: 'fast',
      systemPrompt: `You are Sarah Thompson, a Gold tier customer who is angry about a billing issue. You have been a loyal customer since 2019 and expect premium treatment. You are frustrated because you believe you were overcharged $45 on your latest bill. You value your time and become more agitated if put on hold or transferred. You respond well to empathy and discounts but will escalate if not treated with respect.`,
      greetingTemplate: "I've been overcharged on my bill and I want this fixed immediately. This is unacceptable for a Gold tier customer!",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-confused-senior',
      name: 'Robert Chen',
      avatarUrl: null,
      tier: 'Silver',
      accountValue: 5000,
      ageGroup: '55+',
      region: 'West',
      language: 'en',
      email: 'r.chen@email.com',
      phone: '+1 (555) 876-1234',
      accountSince: '2021-07-22',
      contractInfo: {
        plan: 'Standard Internet',
        monthlyValue: 59.99,
        renewalDate: '2025-07-22',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'frustrated',
        patienceLevel: 'medium',
        cooperationLevel: 'high',
        communicationStyle: 'formal',
        escalationTriggers: ['technical jargon', 'rushed instructions', 'assumptions about tech knowledge'],
        deescalationTriggers: ['patient explanation', 'step-by-step guidance', 'confirmation of understanding']
      },
      voiceId: 'echo',
      voiceSpeed: 'slow',
      systemPrompt: `You are Robert Chen, a senior customer who is having trouble with your internet connection. You are not very tech-savvy and need patient, clear explanations. You are frustrated because your internet keeps dropping and it's affecting your ability to work from home. You appreciate when agents speak slowly and clearly, without using technical jargon. You are polite but can become confused if instructions are too complex.`,
      greetingTemplate: "Hello, I'm having trouble with my internet. It keeps disconnecting and I really need it for work. Can you help me please?",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-interested-young',
      name: 'Emily Martinez',
      avatarUrl: null,
      tier: 'Bronze',
      accountValue: 2000,
      ageGroup: '25-34',
      region: 'South',
      language: 'en',
      email: 'emily.m@email.com',
      phone: '+1 (555) 443-7890',
      accountSince: '2023-11-05',
      contractInfo: {
        plan: 'Basic Bundle',
        monthlyValue: 39.99,
        renewalDate: '2024-11-05',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'happy',
        patienceLevel: 'high',
        cooperationLevel: 'high',
        communicationStyle: 'casual',
        escalationTriggers: ['pushy sales tactics', 'hidden fees', 'long contracts'],
        deescalationTriggers: ['transparent pricing', 'flexible options', 'free trials']
      },
      voiceId: 'nova',
      voiceSpeed: 'normal',
      systemPrompt: `You are Emily Martinez, a young professional interested in upgrading your service. You are currently on a basic plan but are interested in learning about premium features. You are price-conscious but value good service. You respond well to transparent pricing and flexible options. You dislike pushy sales tactics but appreciate honest recommendations.`,
      greetingTemplate: "Hi! I'm interested in learning about your premium plans. Can you tell me what options are available?",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-suspicious-compliance',
      name: 'David Park',
      avatarUrl: null,
      tier: 'Platinum',
      accountValue: 50000,
      ageGroup: '45-54',
      region: 'Northeast',
      language: 'en',
      email: 'david.park@email.com',
      phone: '+1 (555) 667-3344',
      accountSince: '2018-02-14',
      contractInfo: {
        plan: 'Enterprise Business',
        monthlyValue: 299.99,
        renewalDate: '2025-02-14',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'calm',
        patienceLevel: 'medium',
        cooperationLevel: 'medium',
        communicationStyle: 'formal',
        escalationTriggers: ['insufficient verification', 'data privacy concerns ignored', 'transfers without explanation'],
        deescalationTriggers: ['clear security protocols', 'transparency about data usage', 'direct answers']
      },
      voiceId: 'onyx',
      voiceSpeed: 'normal',
      systemPrompt: `You are David Park, a Platinum business customer with high security awareness. You received a suspicious email and want to verify its authenticity. You take data privacy very seriously and expect clear security protocols. You are calm but firm. You will ask verification questions and expect detailed, transparent answers. You do not tolerate having your privacy concerns dismissed.`,
      greetingTemplate: "I received an email claiming to be from your company asking for sensitive information. I need to verify if this is legitimate before I proceed with anything.",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-disappointed-retention',
      name: 'Lisa Wong',
      avatarUrl: null,
      tier: 'Gold',
      accountValue: 12000,
      ageGroup: '35-44',
      region: 'West',
      language: 'en',
      email: 'lisa.wong@email.com',
      phone: '+1 (555) 112-5566',
      accountSince: '2020-09-30',
      contractInfo: {
        plan: 'Premium Plus',
        monthlyValue: 149.99,
        renewalDate: '2024-09-30',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'frustrated',
        patienceLevel: 'low',
        cooperationLevel: 'low',
        communicationStyle: 'aggressive',
        escalationTriggers: ['repeating same issue', 'no compensation offered', 'long hold times', 'scripted responses'],
        deescalationTriggers: ['acknowledgment of failures', 'significant discount', 'manager escalation', 'immediate action']
      },
      voiceId: 'shimmer',
      voiceSpeed: 'fast',
      systemPrompt: `You are Lisa Wong, a Gold customer who has had multiple unresolved issues and is now considering cancellation. You are very frustrated with the service quality and are strongly considering a competitor. You have called multiple times about the same issue. You want acknowledgment of the company's failures and significant compensation to stay. You have low patience and will escalate quickly if not given serious attention.`,
      greetingTemplate: "I've had enough. I've called three times about the same issue and it's still not resolved. I'm canceling my service and switching to your competitor unless you can give me a very good reason not to.",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-upset-returns',
      name: 'Michael Johnson',
      avatarUrl: null,
      tier: 'Silver',
      accountValue: 4000,
      ageGroup: '45-54',
      region: 'Midwest',
      language: 'en',
      email: 'm.johnson@email.com',
      phone: '+1 (555) 998-1122',
      accountSince: '2022-04-12',
      contractInfo: {
        plan: 'Equipment Lease',
        monthlyValue: 25.99,
        renewalDate: '2025-04-12',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'frustrated',
        patienceLevel: 'medium',
        cooperationLevel: 'medium',
        communicationStyle: 'casual',
        escalationTriggers: ['complex return process', 'restocking fees', 'delayed refunds', 'requiring receipts'],
        deescalationTriggers: ['easy return process', 'free return shipping', 'immediate refund', 'no questions asked']
      },
      voiceId: 'echo',
      voiceSpeed: 'normal',
      systemPrompt: `You are Michael Johnson, a customer who received damaged equipment and wants to return it. You are frustrated because the product arrived broken and you need it for work. You have photos of the damage. You want a hassle-free return with a full refund. You will become more upset if the process is complicated or if you're charged fees for a damaged item that wasn't your fault.`,
      greetingTemplate: "I just received my order and it's completely damaged. The box was crushed and the equipment inside is broken. I need to return this and get a full refund immediately.",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-vip-premium',
      name: 'Alexandra Sterling',
      avatarUrl: null,
      tier: 'Platinum',
      accountValue: 75000,
      ageGroup: '35-44',
      region: 'Northeast',
      language: 'en',
      email: 'a.sterling@email.com',
      phone: '+1 (555) 223-8899',
      accountSince: '2017-06-18',
      contractInfo: {
        plan: 'Enterprise Elite',
        monthlyValue: 499.99,
        renewalDate: '2025-06-18',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'calm',
        patienceLevel: 'high',
        cooperationLevel: 'high',
        communicationStyle: 'formal',
        escalationTriggers: ['treated as regular customer', 'standard wait times', 'lack of priority handling', 'scripted responses'],
        deescalationTriggers: ['white glove service', 'immediate attention', 'proactive solutions', 'dedicated support']
      },
      voiceId: 'nova',
      voiceSpeed: 'normal',
      systemPrompt: `You are Alexandra Sterling, a VIP Platinum customer with the highest tier service. You expect and deserve white-glove treatment. You are polite but demanding. You expect immediate attention, proactive solutions, and dedicated support. You do not tolerate being treated as a regular customer or having to wait standard hold times. You are calling to upgrade your service for a business expansion and expect a custom enterprise solution.`,
      greetingTemplate: "This is Alexandra Sterling. I'm expanding my business and need to discuss a significant service upgrade. Please connect me with your enterprise team immediately.",
      isActive: true,
      isTemplate: false,
      createdBy: null
    },
    {
      id: 'pers-panicked-security',
      name: 'James Wilson',
      avatarUrl: null,
      tier: 'Gold',
      accountValue: 10000,
      ageGroup: '55+',
      region: 'South',
      language: 'en',
      email: 'j.wilson@email.com',
      phone: '+1 (555) 334-7766',
      accountSince: '2020-01-10',
      contractInfo: {
        plan: 'Premium Plus',
        monthlyValue: 149.99,
        renewalDate: '2025-01-10',
        status: 'Active'
      },
      behaviorProfile: {
        initialMood: 'panicked',
        patienceLevel: 'low',
        cooperationLevel: 'high',
        communicationStyle: 'casual',
        escalationTriggers: ['delays in securing account', 'transfers between departments', 'technical jargon', 'calm down suggestions'],
        deescalationTriggers: ['immediate action', 'clear security steps', 'reassurance', 'protection confirmation']
      },
      voiceId: 'echo',
      voiceSpeed: 'fast',
      systemPrompt: `You are James Wilson, a Gold customer who just received a fraud alert about a suspicious transaction on your account. You are panicked and worried about your financial security. You did not make the charge and are afraid someone has accessed your account. You need immediate reassurance and action to secure your account. You are cooperative but anxious. You want clear steps about what is being done to protect you.`,
      greetingTemplate: "I just got a text about a fraudulent charge on my account! I didn't make this purchase! Is my account safe? What do I need to do? Please help me!",
      isActive: true,
      isTemplate: false,
      createdBy: null
    }
  ];

  // Insert personas
  for (const persona of defaultPersonas) {
    await db.execute({
      sql: `
        INSERT INTO personas (
          id, name, avatar_url, tier, account_value, age_group, region, language,
          email, phone, account_since, contract_info, behavior_profile, voice_id,
          voice_speed, system_prompt, greeting_template, is_active, is_template, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        persona.id,
        persona.name,
        persona.avatarUrl,
        persona.tier,
        persona.accountValue,
        persona.ageGroup,
        persona.region,
        persona.language,
        persona.email,
        persona.phone,
        persona.accountSince,
        JSON.stringify(persona.contractInfo),
        JSON.stringify(persona.behaviorProfile),
        persona.voiceId,
        persona.voiceSpeed,
        persona.systemPrompt,
        persona.greetingTemplate,
        persona.isActive ? 1 : 0,
        persona.isTemplate ? 1 : 0,
        persona.createdBy
      ]
    });
  }

  console.log(`✅ Seeded ${defaultPersonas.length} default personas`);

  // Link personas to scenarios
  await linkPersonasToScenarios();

  // Seed call history
  await seedCallHistory();
}

async function linkPersonasToScenarios(): Promise<void> {
  console.log('🔗 Linking personas to scenarios...');

  // Get all scenarios
  const scenariosResult = await db.execute(
    'SELECT id, title, category, persona FROM scenarios'
  );

  // Get all personas
  const personasResult = await db.execute(
    'SELECT id, name, behavior_profile FROM personas'
  );

  const personaMap = new Map(
    personasResult.rows.map(row => [
      (row.name as string).toLowerCase(),
      { id: row.id as string, behavior: JSON.parse(row.behavior_profile as string) }
    ])
  );

  const links: Array<{ personaId: string; scenarioId: string; contextOverride: object }> = [];

  // Map scenarios to personas based on keywords
  for (const scenarioRow of scenariosResult.rows) {
    const scenarioId = scenarioRow.id as string;
    const title = (scenarioRow.title as string).toLowerCase();
    const category = (scenarioRow.category as string).toLowerCase();
    const personaName = (scenarioRow.persona as string || '').toLowerCase();

    // Determine best matching persona
    let matchedPersonaId: string | null = null;
    let contextOverride: PersonaContextOverride = {};

    // Match by category and keywords
    if (category.includes('billing') || title.includes('billing') || title.includes('dispute')) {
      matchedPersonaId = 'pers-angry-gold';
      contextOverride = {
        specificIssue: 'Unexpected $45 charge on latest bill',
        expectedOutcome: 'Refund or credit applied to account'
      };
    } else if (category.includes('technical') || title.includes('technical') || title.includes('internet')) {
      matchedPersonaId = 'pers-confused-senior';
      contextOverride = {
        specificIssue: 'Internet connectivity issues affecting work',
        expectedOutcome: 'Stable connection or technician visit'
      };
    } else if (category.includes('sales') || title.includes('promotion') || title.includes('upsell')) {
      matchedPersonaId = 'pers-interested-young';
      contextOverride = {
        specificIssue: 'Interested in upgrading but price-sensitive',
        expectedOutcome: 'Mid-tier plan with promotional pricing'
      };
    } else if (category.includes('compliance') || title.includes('privacy') || title.includes('verification')) {
      matchedPersonaId = 'pers-suspicious-compliance';
      contextOverride = {
        specificIssue: 'Suspicious email requesting sensitive information',
        expectedOutcome: 'Verification of email authenticity'
      };
    } else if (category.includes('retention') || title.includes('cancellation')) {
      matchedPersonaId = 'pers-disappointed-retention';
      contextOverride = {
        specificIssue: 'Multiple unresolved issues, considering competitor',
        expectedOutcome: 'Retention offer accepted or smooth cancellation'
      };
    } else if (category.includes('return') || title.includes('return') || title.includes('damaged')) {
      matchedPersonaId = 'pers-upset-returns';
      contextOverride = {
        specificIssue: 'Received damaged equipment, needs full refund',
        expectedOutcome: 'Return authorization and full refund processed'
      };
    } else if (category.includes('sales') && (title.includes('vip') || title.includes('premium'))) {
      matchedPersonaId = 'pers-vip-premium';
      contextOverride = {
        specificIssue: 'Business expansion requiring custom enterprise solution',
        expectedOutcome: 'Custom enterprise plan with dedicated support'
      };
    } else if (category.includes('security') || title.includes('fraud') || title.includes('alert')) {
      matchedPersonaId = 'pers-panicked-security';
      contextOverride = {
        specificIssue: 'Fraudulent transaction alert, account security concern',
        expectedOutcome: 'Account secured, fraudulent charge reversed'
      };
    }

    // If we found a match, create the link
    if (matchedPersonaId) {
      links.push({
        personaId: matchedPersonaId,
        scenarioId,
        contextOverride
      });
    }
  }

  // Insert junction records
  for (const link of links) {
    await db.execute({
      sql: `
        INSERT INTO persona_scenarios (id, persona_id, scenario_id, context_override, display_order)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        link.personaId,
        link.scenarioId,
        JSON.stringify(link.contextOverride),
        0
      ]
    });
  }

  console.log(`✅ Linked ${links.length} persona-scenario pairs`);
}

// ============================================
// CALL HISTORY
// ============================================

async function seedCallHistory(): Promise<void> {
  console.log('🌱 Seeding call history...');

  const callHistoryData: Array<Omit<CallHistoryEntry, 'id' | 'createdAt'>> = [
    // Sarah Thompson - Angry Gold
    {
      personaId: 'pers-angry-gold',
      date: '2024-01-28',
      duration: '12m 45s',
      type: 'Billing Inquiry',
      outcome: 'Resolved',
      sentiment: 'neutral',
      summary: 'Customer questioned charges on invoice. Provided breakdown and applied loyalty discount.'
    },
    {
      personaId: 'pers-angry-gold',
      date: '2024-01-15',
      duration: '18m 22s',
      type: 'Technical Support',
      outcome: 'Escalated',
      sentiment: 'negative',
      summary: 'Internet connectivity issues. Tried troubleshooting but required technician visit.'
    },
    {
      personaId: 'pers-angry-gold',
      date: '2024-01-02',
      duration: '6m 10s',
      type: 'Service Upgrade',
      outcome: 'Resolved',
      sentiment: 'positive',
      summary: 'Customer upgraded to Premium Plus plan. Successfully processed upgrade.'
    },
    // Robert Chen - Frustrated Senior
    {
      personaId: 'pers-confused-senior',
      date: '2024-01-25',
      duration: '22m 10s',
      type: 'Technical Support',
      outcome: 'Resolved',
      sentiment: 'neutral',
      summary: 'Router configuration issue. Walked through reset process step by step.'
    },
    {
      personaId: 'pers-confused-senior',
      date: '2024-01-10',
      duration: '8m 45s',
      type: 'Account Access',
      outcome: 'Resolved',
      sentiment: 'positive',
      summary: 'Helped reset password and set up auto-pay.'
    },
    // Emily Martinez - Interested Young
    {
      personaId: 'pers-interested-young',
      date: '2024-01-20',
      duration: '4m 30s',
      type: 'Sales Inquiry',
      outcome: 'Pending',
      sentiment: 'positive',
      summary: 'Inquired about premium channels. Sent pricing information.'
    },
    // David Park - Suspicious Compliance
    {
      personaId: 'pers-suspicious-compliance',
      date: '2024-01-18',
      duration: '15m 30s',
      type: 'Privacy Request',
      outcome: 'Resolved',
      sentiment: 'positive',
      summary: 'Data export request for GDPR compliance. Completed within 24 hours.'
    },
    // Lisa Wong - Disappointed Retention
    {
      personaId: 'pers-disappointed-retention',
      date: '2024-01-22',
      duration: '14m 20s',
      type: 'Service Complaint',
      outcome: 'Escalated',
      sentiment: 'negative',
      summary: 'Recurring billing issue not resolved after 3 calls. Very frustrated.'
    },
    {
      personaId: 'pers-disappointed-retention',
      date: '2024-01-08',
      duration: '9m 15s',
      type: 'Cancellation Request',
      outcome: 'Pending',
      sentiment: 'negative',
      summary: 'Customer requested cancellation but was offered retention deal. Thinking about it.'
    },
    // Michael Johnson - Upset Returns
    {
      personaId: 'pers-upset-returns',
      date: '2024-01-16',
      duration: '5m 45s',
      type: 'Return Request',
      outcome: 'Resolved',
      sentiment: 'neutral',
      summary: 'Previous return processed successfully. Customer satisfied with outcome.'
    },
    // Alexandra Sterling - VIP
    {
      personaId: 'pers-vip-premium',
      date: '2024-01-12',
      duration: '8m 10s',
      type: 'Upgrade Request',
      outcome: 'Resolved',
      sentiment: 'positive',
      summary: 'Requested priority installation for new office location. Expedited successfully.'
    },
    // James Wilson - Panicked Security
    {
      personaId: 'pers-panicked-security',
      date: '2024-01-14',
      duration: '12m 30s',
      type: 'Security Alert',
      outcome: 'Resolved',
      sentiment: 'neutral',
      summary: 'Suspicious login detected. Helped secure account and set up 2FA.'
    }
  ];

  // Check if call history already exists
  const existingResult = await db.execute('SELECT COUNT(*) as count FROM persona_call_history');
  const existingCount = (existingResult.rows[0].count as number) || 0;

  if (existingCount > 0) {
    console.log(`ℹ️ ${existingCount} call history records already exist, skipping seed`);
    return;
  }

  // Insert call history
  for (const call of callHistoryData) {
    await db.execute({
      sql: `
        INSERT INTO persona_call_history (id, persona_id, date, duration, type, outcome, sentiment, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        call.personaId,
        call.date,
        call.duration,
        call.type,
        call.outcome,
        call.sentiment,
        call.summary
      ]
    });
  }

  console.log(`✅ Seeded ${callHistoryData.length} call history records`);
}

export async function getCallHistoryForPersona(personaId: string): Promise<CallHistoryEntry[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM persona_call_history 
      WHERE persona_id = ? 
      ORDER BY date DESC
    `,
    args: [personaId]
  });

  return result.rows.map(row => ({
    id: row.id as string,
    personaId: row.persona_id as string,
    date: row.date as string,
    duration: row.duration as string,
    type: row.type as string,
    outcome: row.outcome as 'Resolved' | 'Escalated' | 'Pending',
    sentiment: row.sentiment as 'positive' | 'negative' | 'neutral',
    summary: row.summary as string,
    createdAt: row.created_at as string
  }));
}

export async function addCallHistoryEntry(
  personaId: string,
  entry: Omit<CallHistoryEntry, 'id' | 'personaId' | 'createdAt'>
): Promise<CallHistoryEntry> {
  const id = randomUUID();
  
  await db.execute({
    sql: `
      INSERT INTO persona_call_history (id, persona_id, date, duration, type, outcome, sentiment, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      personaId,
      entry.date,
      entry.duration,
      entry.type,
      entry.outcome,
      entry.sentiment,
      entry.summary
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM persona_call_history WHERE id = ?',
    args: [id]
  });

  const row = result.rows[0];
  return {
    id: row.id as string,
    personaId: row.persona_id as string,
    date: row.date as string,
    duration: row.duration as string,
    type: row.type as string,
    outcome: row.outcome as 'Resolved' | 'Escalated' | 'Pending',
    sentiment: row.sentiment as 'positive' | 'negative' | 'neutral',
    summary: row.summary as string,
    createdAt: row.created_at as string
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

export async function getAllPersonas(): Promise<Persona[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM personas 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `,
    args: []
  });

  return result.rows.map(parsePersonaRow);
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM personas WHERE id = ?',
    args: [id]
  });

  if (result.rows.length === 0) return null;
  return parsePersonaRow(result.rows[0]);
}

export async function getPersonaWithScenarios(id: string): Promise<PersonaWithScenarios | null> {
  const persona = await getPersonaById(id);
  if (!persona) return null;

  // Fetch scenarios
  const scenariosResult = await db.execute({
    sql: `
      SELECT 
        ps.scenario_id,
        s.title as scenario_title,
        s.category as scenario_category,
        ps.context_override,
        ps.display_order
      FROM persona_scenarios ps
      JOIN scenarios s ON ps.scenario_id = s.id
      WHERE ps.persona_id = ?
      ORDER BY ps.display_order
    `,
    args: [id]
  });

  // Fetch call history
  const callHistory = await getCallHistoryForPersona(id);

  return {
    ...persona,
    scenarios: scenariosResult.rows.map(row => ({
      scenarioId: row.scenario_id as string,
      scenarioTitle: row.scenario_title as string,
      scenarioCategory: row.scenario_category as string,
      contextOverride: row.context_override ? JSON.parse(row.context_override as string) : null,
      displayOrder: row.display_order as number
    })),
    callHistory
  };
}

export async function getPersonasForScenario(scenarioId: string): Promise<Persona[]> {
  const result = await db.execute({
    sql: `
      SELECT p.* FROM personas p
      JOIN persona_scenarios ps ON p.id = ps.persona_id
      WHERE ps.scenario_id = ? AND p.is_active = 1
      ORDER BY ps.display_order
    `,
    args: [scenarioId]
  });

  return result.rows.map(parsePersonaRow);
}

export async function getPrimaryPersonaForScenario(
  scenarioId: string
): Promise<(Persona & { contextOverride: PersonaContextOverride | null; callHistory: CallHistoryEntry[] }) | null> {
  const result = await db.execute({
    sql: `
      SELECT p.*, ps.context_override 
      FROM personas p
      JOIN persona_scenarios ps ON p.id = ps.persona_id
      WHERE ps.scenario_id = ? AND p.is_active = 1
      ORDER BY ps.display_order
      LIMIT 1
    `,
    args: [scenarioId]
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const persona = parsePersonaRow(row);
  const callHistory = await getCallHistoryForPersona(persona.id);
  
  return {
    ...persona,
    contextOverride: row.context_override ? JSON.parse(row.context_override as string) : null,
    callHistory
  };
}

export async function createPersona(data: Partial<Persona>): Promise<Persona> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO personas (
        id, name, avatar_url, tier, account_value, age_group, region, language,
        email, phone, account_since, contract_info, behavior_profile, voice_id,
        voice_speed, system_prompt, greeting_template, is_active, is_template, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.name,
      data.avatarUrl || null,
      data.tier || 'Silver',
      data.accountValue || 0,
      data.ageGroup || null,
      data.region || null,
      data.language || 'en',
      data.email || null,
      data.phone || null,
      data.accountSince || null,
      JSON.stringify(data.contractInfo || {}),
      JSON.stringify(data.behaviorProfile || {}),
      data.voiceId || null,
      data.voiceSpeed || 'normal',
      data.systemPrompt || null,
      data.greetingTemplate || null,
      data.isActive !== false ? 1 : 0,
      data.isTemplate ? 1 : 0,
      data.createdBy || null,
      now,
      now
    ]
  });

  return getPersonaById(id) as Promise<Persona>;
}

export async function updatePersona(id: string, data: Partial<Persona>): Promise<void> {
  const now = new Date().toISOString();

  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); args.push(data.name); }
  if (data.avatarUrl !== undefined) { updates.push('avatar_url = ?'); args.push(data.avatarUrl); }
  if (data.tier !== undefined) { updates.push('tier = ?'); args.push(data.tier); }
  if (data.accountValue !== undefined) { updates.push('account_value = ?'); args.push(data.accountValue); }
  if (data.ageGroup !== undefined) { updates.push('age_group = ?'); args.push(data.ageGroup); }
  if (data.region !== undefined) { updates.push('region = ?'); args.push(data.region); }
  if (data.language !== undefined) { updates.push('language = ?'); args.push(data.language); }
  if (data.email !== undefined) { updates.push('email = ?'); args.push(data.email); }
  if (data.phone !== undefined) { updates.push('phone = ?'); args.push(data.phone); }
  if (data.accountSince !== undefined) { updates.push('account_since = ?'); args.push(data.accountSince); }
  if (data.contractInfo !== undefined) { updates.push('contract_info = ?'); args.push(JSON.stringify(data.contractInfo)); }
  if (data.behaviorProfile !== undefined) { updates.push('behavior_profile = ?'); args.push(JSON.stringify(data.behaviorProfile)); }
  if (data.voiceId !== undefined) { updates.push('voice_id = ?'); args.push(data.voiceId); }
  if (data.voiceSpeed !== undefined) { updates.push('voice_speed = ?'); args.push(data.voiceSpeed); }
  if (data.systemPrompt !== undefined) { updates.push('system_prompt = ?'); args.push(data.systemPrompt); }
  if (data.greetingTemplate !== undefined) { updates.push('greeting_template = ?'); args.push(data.greetingTemplate); }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); args.push(data.isActive ? 1 : 0); }
  if (data.isTemplate !== undefined) { updates.push('is_template = ?'); args.push(data.isTemplate ? 1 : 0); }

  updates.push('updated_at = ?');
  args.push(now);
  args.push(id);

  await db.execute({
    sql: `UPDATE personas SET ${updates.join(', ')} WHERE id = ?`,
    args
  });
}

export async function deletePersona(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM personas WHERE id = ?',
    args: [id]
  });
}

// ============================================
// PERSONA-SCENARIO ASSIGNMENTS
// ============================================

export async function assignPersonaToScenario(
  personaId: string,
  scenarioId: string,
  contextOverride?: PersonaContextOverride,
  displayOrder: number = 0
): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO persona_scenarios (id, persona_id, scenario_id, context_override, display_order)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(persona_id, scenario_id) DO UPDATE SET
        context_override = excluded.context_override,
        display_order = excluded.display_order
    `,
    args: [
      randomUUID(),
      personaId,
      scenarioId,
      JSON.stringify(contextOverride || {}),
      displayOrder
    ]
  });
}

export async function removePersonaFromScenario(
  personaId: string,
  scenarioId: string
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM persona_scenarios WHERE persona_id = ? AND scenario_id = ?',
    args: [personaId, scenarioId]
  });
}

export async function updatePersonaScenarioContext(
  personaId: string,
  scenarioId: string,
  contextOverride: PersonaContextOverride
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE persona_scenarios 
      SET context_override = ? 
      WHERE persona_id = ? AND scenario_id = ?
    `,
    args: [JSON.stringify(contextOverride), personaId, scenarioId]
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePersonaRow(row: Record<string, unknown>): Persona {
  return {
    id: row.id as string,
    name: row.name as string,
    avatarUrl: row.avatar_url as string | null,
    tier: row.tier as 'Bronze' | 'Silver' | 'Gold' | 'Platinum',
    accountValue: row.account_value as number,
    ageGroup: row.age_group as string | null,
    region: row.region as string | null,
    language: row.language as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    accountSince: row.account_since as string | null,
    contractInfo: JSON.parse(row.contract_info as string || '{}'),
    behaviorProfile: JSON.parse(row.behavior_profile as string || '{}'),
    voiceId: row.voice_id as string | null,
    voiceSpeed: row.voice_speed as string,
    systemPrompt: row.system_prompt as string | null,
    greetingTemplate: row.greeting_template as string | null,
    isActive: (row.is_active as number) === 1,
    isTemplate: (row.is_template as number) === 1,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// ============================================
// DEFAULT PERSONA DATA (for export/import)
// ============================================

export const DEFAULT_PERSONA_TEMPLATES = [
  {
    name: 'Angry Customer Template',
    tier: 'Gold' as const,
    behaviorProfile: {
      initialMood: 'angry' as const,
      patienceLevel: 'low' as const,
      cooperationLevel: 'medium' as const,
      communicationStyle: 'aggressive' as const,
      escalationTriggers: ['long hold times', 'repeating information'],
      deescalationTriggers: ['empathy', 'discounts', 'quick resolution']
    }
  },
  {
    name: 'Confused Customer Template',
    tier: 'Silver' as const,
    behaviorProfile: {
      initialMood: 'frustrated' as const,
      patienceLevel: 'medium' as const,
      cooperationLevel: 'high' as const,
      communicationStyle: 'formal' as const,
      escalationTriggers: ['technical jargon', 'rushed instructions'],
      deescalationTriggers: ['patient explanation', 'step-by-step guidance']
    }
  },
  {
    name: 'VIP Customer Template',
    tier: 'Platinum' as const,
    behaviorProfile: {
      initialMood: 'calm' as const,
      patienceLevel: 'high' as const,
      cooperationLevel: 'high' as const,
      communicationStyle: 'formal' as const,
      escalationTriggers: ['standard wait times', 'generic service'],
      deescalationTriggers: ['white glove service', 'immediate attention']
    }
  }
];
