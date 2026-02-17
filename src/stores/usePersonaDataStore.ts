import { create } from 'zustand';

// ============================================
// AI PERSONA DATA TYPES
// ============================================

export interface CallHistoryEntry {
  id: string;
  date: string;
  duration: string;
  type: string;
  outcome: 'Resolved' | 'Escalated' | 'Pending';
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
}

export interface CustomerContract {
  plan: string;
  monthlyValue: number;
  renewalDate: string;
  status: 'Active' | 'Suspended' | 'Cancelled';
}

export interface CustomerPreferences {
  communication: string;
  language: string;
  timezone: string;
}

export interface PersonaData {
  id: string;
  name: string;
  avatar: string | null;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  tierColor: string;
  phone: string;
  email: string;
  accountSince: string;
  contract: CustomerContract;
  preferences: CustomerPreferences;
  satisfaction: number;
  totalCalls: number;
  avgCallDuration: string;
  callHistory: CallHistoryEntry[];
  // AI Behavior Configuration
  behavior: {
    initialMood: 'calm' | 'frustrated' | 'angry' | 'happy' | 'panicked';
    patienceLevel: 'low' | 'medium' | 'high';
    cooperationLevel: 'low' | 'medium' | 'high';
    escalationTriggers: string[];
    deescalationTriggers: string[];
  };
  // Context for the call
  context: {
    issueType: string;
    issueDescription: string;
    expectedOutcome: string;
    previousAttempts: number;
  };
}

// ============================================
// MOCK PERSONA DATABASE
// ============================================

export const MOCK_PERSONAS: Record<string, PersonaData> = {
  // Billing scenarios
  'angry-customer': {
    id: 'CUST-2847',
    name: 'Sarah Thompson',
    avatar: null,
    tier: 'Gold',
    tierColor: 'amber',
    phone: '+1 (555) 234-5678',
    email: 'sarah.thompson@email.com',
    accountSince: '2019-03-15',
    contract: {
      plan: 'Premium Plus',
      monthlyValue: 149.99,
      renewalDate: '2025-03-15',
      status: 'Active',
    },
    preferences: {
      communication: 'Phone preferred',
      language: 'English',
      timezone: 'EST (UTC-5)',
    },
    satisfaction: 4.2,
    totalCalls: 23,
    avgCallDuration: '8m 32s',
    callHistory: [
      {
        id: 'CALL-4521',
        date: '2024-01-28',
        duration: '12m 45s',
        type: 'Billing Inquiry',
        outcome: 'Resolved',
        sentiment: 'neutral',
        summary: 'Customer questioned charges on invoice. Provided breakdown and applied loyalty discount.',
      },
      {
        id: 'CALL-4398',
        date: '2024-01-15',
        duration: '18m 22s',
        type: 'Technical Support',
        outcome: 'Escalated',
        sentiment: 'negative',
        summary: 'Internet connectivity issues. Tried troubleshooting but required technician visit.',
      },
      {
        id: 'CALL-4211',
        date: '2024-01-02',
        duration: '6m 10s',
        type: 'Service Upgrade',
        outcome: 'Resolved',
        sentiment: 'positive',
        summary: 'Customer upgraded to Premium Plus plan. Successfully processed upgrade.',
      },
    ],
    behavior: {
      initialMood: 'angry',
      patienceLevel: 'low',
      cooperationLevel: 'medium',
      escalationTriggers: ['long hold times', 'repeating information', 'no resolution'],
      deescalationTriggers: ['empathy', 'discounts', 'quick resolution'],
    },
    context: {
      issueType: 'Billing Dispute',
      issueDescription: 'Unexpected charges on latest bill, believes she was overcharged by $45',
      expectedOutcome: 'Refund or credit applied',
      previousAttempts: 1,
    },
  },

  // Technical support scenarios
  'frustrated-senior': {
    id: 'CUST-5531',
    name: 'Robert Chen',
    avatar: null,
    tier: 'Silver',
    tierColor: 'gray',
    phone: '+1 (555) 876-1234',
    email: 'r.chen@email.com',
    accountSince: '2021-07-22',
    contract: {
      plan: 'Standard Internet',
      monthlyValue: 59.99,
      renewalDate: '2025-07-22',
      status: 'Active',
    },
    preferences: {
      communication: 'Phone only',
      language: 'English',
      timezone: 'PST (UTC-8)',
    },
    satisfaction: 3.1,
    totalCalls: 12,
    avgCallDuration: '15m 20s',
    callHistory: [
      {
        id: 'CALL-4501',
        date: '2024-01-25',
        duration: '22m 10s',
        type: 'Technical Support',
        outcome: 'Resolved',
        sentiment: 'neutral',
        summary: 'Router configuration issue. Walked through reset process step by step.',
      },
      {
        id: 'CALL-4412',
        date: '2024-01-10',
        duration: '8m 45s',
        type: 'Account Access',
        outcome: 'Resolved',
        sentiment: 'positive',
        summary: 'Helped reset password and set up auto-pay.',
      },
    ],
    behavior: {
      initialMood: 'frustrated',
      patienceLevel: 'medium',
      cooperationLevel: 'high',
      escalationTriggers: ['technical jargon', 'rushed instructions', 'assumptions about tech knowledge'],
      deescalationTriggers: ['patient explanation', 'step-by-step guidance', 'confirmation of understanding'],
    },
    context: {
      issueType: 'Internet Connectivity',
      issueDescription: 'Internet keeps dropping every few hours, affecting work from home',
      expectedOutcome: 'Stable connection or technician visit scheduled',
      previousAttempts: 2,
    },
  },

  // Sales scenarios
  'interested-customer': {
    id: 'CUST-8823',
    name: 'Emily Martinez',
    avatar: null,
    tier: 'Bronze',
    tierColor: 'orange',
    phone: '+1 (555) 443-7890',
    email: 'emily.m@email.com',
    accountSince: '2023-11-05',
    contract: {
      plan: 'Basic Bundle',
      monthlyValue: 39.99,
      renewalDate: '2024-11-05',
      status: 'Active',
    },
    preferences: {
      communication: 'Email preferred',
      language: 'English',
      timezone: 'CST (UTC-6)',
    },
    satisfaction: 4.5,
    totalCalls: 3,
    avgCallDuration: '5m 45s',
    callHistory: [
      {
        id: 'CALL-4489',
        date: '2024-01-20',
        duration: '4m 30s',
        type: 'Sales Inquiry',
        outcome: 'Pending',
        sentiment: 'positive',
        summary: 'Inquired about premium channels. Sent pricing information.',
      },
    ],
    behavior: {
      initialMood: 'happy',
      patienceLevel: 'high',
      cooperationLevel: 'high',
      escalationTriggers: ['pushy sales tactics', 'hidden fees', 'long contracts'],
      deescalationTriggers: ['transparent pricing', 'flexible options', 'free trials'],
    },
    context: {
      issueType: 'Upgrade Opportunity',
      issueDescription: 'Current basic plan is too limited, interested in premium features but price-sensitive',
      expectedOutcome: 'Upgrade to mid-tier plan with promotional pricing',
      previousAttempts: 0,
    },
  },

  // Compliance scenarios
  'suspicious-caller': {
    id: 'CUST-1192',
    name: 'David Park',
    avatar: null,
    tier: 'Platinum',
    tierColor: 'indigo',
    phone: '+1 (555) 667-3344',
    email: 'david.park@email.com',
    accountSince: '2018-02-14',
    contract: {
      plan: 'Enterprise Business',
      monthlyValue: 299.99,
      renewalDate: '2025-02-14',
      status: 'Active',
    },
    preferences: {
      communication: 'Secure portal preferred',
      language: 'English',
      timezone: 'EST (UTC-5)',
    },
    satisfaction: 4.8,
    totalCalls: 8,
    avgCallDuration: '10m 15s',
    callHistory: [
      {
        id: 'CALL-4455',
        date: '2024-01-18',
        duration: '15m 30s',
        type: 'Privacy Request',
        outcome: 'Resolved',
        sentiment: 'positive',
        summary: 'Data export request for GDPR compliance. Completed within 24 hours.',
      },
    ],
    behavior: {
      initialMood: 'calm',
      patienceLevel: 'medium',
      cooperationLevel: 'medium',
      escalationTriggers: ['insufficient verification', 'data privacy concerns ignored', 'transfers without explanation'],
      deescalationTriggers: ['clear security protocols', 'transparency about data usage', 'direct answers'],
    },
    context: {
      issueType: 'Privacy Verification',
      issueDescription: 'Received suspicious email claiming to be from company, wants to verify if legitimate',
      expectedOutcome: 'Confirmation of email authenticity or fraud report',
      previousAttempts: 0,
    },
  },

  // Retention scenarios
  'disappointed-customer': {
    id: 'CUST-3367',
    name: 'Lisa Wong',
    avatar: null,
    tier: 'Gold',
    tierColor: 'amber',
    phone: '+1 (555) 112-5566',
    email: 'lisa.wong@email.com',
    accountSince: '2020-09-30',
    contract: {
      plan: 'Premium Plus',
      monthlyValue: 149.99,
      renewalDate: '2024-09-30',
      status: 'Active',
    },
    preferences: {
      communication: 'Phone preferred',
      language: 'English',
      timezone: 'PST (UTC-8)',
    },
    satisfaction: 2.8,
    totalCalls: 18,
    avgCallDuration: '11m 40s',
    callHistory: [
      {
        id: 'CALL-4421',
        date: '2024-01-22',
        duration: '14m 20s',
        type: 'Service Complaint',
        outcome: 'Escalated',
        sentiment: 'negative',
        summary: 'Recurring billing issue not resolved after 3 calls. Very frustrated.',
      },
      {
        id: 'CALL-4356',
        date: '2024-01-08',
        duration: '9m 15s',
        type: 'Cancellation Request',
        outcome: 'Pending',
        sentiment: 'negative',
        summary: 'Customer requested cancellation but was offered retention deal. Thinking about it.',
      },
    ],
    behavior: {
      initialMood: 'frustrated',
      patienceLevel: 'low',
      cooperationLevel: 'low',
      escalationTriggers: ['repeating same issue', 'no compensation offered', 'long hold times'],
      deescalationTriggers: ['acknowledgment of failures', 'significant discount', 'manager escalation'],
    },
    context: {
      issueType: 'Service Cancellation',
      issueDescription: 'Multiple service issues unresolved, competitor offering better deal, wants to cancel',
      expectedOutcome: 'Retention offer accepted or smooth cancellation process',
      previousAttempts: 3,
    },
  },

  // Returns scenarios
  'upset-customer': {
    id: 'CUST-7744',
    name: 'Michael Johnson',
    avatar: null,
    tier: 'Silver',
    tierColor: 'gray',
    phone: '+1 (555) 998-1122',
    email: 'm.johnson@email.com',
    accountSince: '2022-04-12',
    contract: {
      plan: 'Equipment Lease',
      monthlyValue: 25.99,
      renewalDate: '2025-04-12',
      status: 'Active',
    },
    preferences: {
      communication: 'Phone or email',
      language: 'English',
      timezone: 'CST (UTC-6)',
    },
    satisfaction: 2.5,
    totalCalls: 6,
    avgCallDuration: '7m 30s',
    callHistory: [
      {
        id: 'CALL-4401',
        date: '2024-01-16',
        duration: '5m 45s',
        type: 'Return Request',
        outcome: 'Resolved',
        sentiment: 'neutral',
        summary: 'Previous return processed successfully. Customer satisfied with outcome.',
      },
    ],
    behavior: {
      initialMood: 'frustrated',
      patienceLevel: 'medium',
      cooperationLevel: 'medium',
      escalationTriggers: ['complex return process', 'restocking fees', 'delayed refunds'],
      deescalationTriggers: ['easy return process', 'free return shipping', 'immediate refund'],
    },
    context: {
      issueType: 'Damaged Product Return',
      issueDescription: 'Received damaged equipment, wants return and full refund, has photos of damage',
      expectedOutcome: 'Return authorization and full refund processed',
      previousAttempts: 0,
    },
  },

  // VIP scenarios
  'vip-customer': {
    id: 'CUST-9911',
    name: 'Alexandra Sterling',
    avatar: null,
    tier: 'Platinum',
    tierColor: 'indigo',
    phone: '+1 (555) 223-8899',
    email: 'a.sterling@email.com',
    accountSince: '2017-06-18',
    contract: {
      plan: 'Enterprise Elite',
      monthlyValue: 499.99,
      renewalDate: '2025-06-18',
      status: 'Active',
    },
    preferences: {
      communication: 'Dedicated account manager',
      language: 'English',
      timezone: 'EST (UTC-5)',
    },
    satisfaction: 4.9,
    totalCalls: 5,
    avgCallDuration: '6m 20s',
    callHistory: [
      {
        id: 'CALL-4387',
        date: '2024-01-12',
        duration: '8m 10s',
        type: 'Upgrade Request',
        outcome: 'Resolved',
        sentiment: 'positive',
        summary: 'Requested priority installation for new office location. Expedited successfully.',
      },
    ],
    behavior: {
      initialMood: 'calm',
      patienceLevel: 'high',
      cooperationLevel: 'high',
      escalationTriggers: ['treated as regular customer', 'standard wait times', 'lack of priority handling'],
      deescalationTriggers: ['white glove service', 'immediate attention', 'proactive solutions'],
    },
    context: {
      issueType: 'Premium Upgrade',
      issueDescription: 'Expanding business needs, wants to upgrade to highest tier with custom features',
      expectedOutcome: 'Custom enterprise solution with dedicated support',
      previousAttempts: 0,
    },
  },

  // Security/Fraud scenarios
  'panicked-customer': {
    id: 'CUST-2255',
    name: 'James Wilson',
    avatar: null,
    tier: 'Gold',
    tierColor: 'amber',
    phone: '+1 (555) 334-7766',
    email: 'j.wilson@email.com',
    accountSince: '2020-01-10',
    contract: {
      plan: 'Premium Plus',
      monthlyValue: 149.99,
      renewalDate: '2025-01-10',
      status: 'Active',
    },
    preferences: {
      communication: 'Phone preferred',
      language: 'English',
      timezone: 'MST (UTC-7)',
    },
    satisfaction: 4.0,
    totalCalls: 9,
    avgCallDuration: '9m 45s',
    callHistory: [
      {
        id: 'CALL-4367',
        date: '2024-01-14',
        duration: '12m 30s',
        type: 'Security Alert',
        outcome: 'Resolved',
        sentiment: 'neutral',
        summary: 'Suspicious login detected. Helped secure account and set up 2FA.',
      },
    ],
    behavior: {
      initialMood: 'panicked',
      patienceLevel: 'low',
      cooperationLevel: 'high',
      escalationTriggers: ['delays in securing account', 'transfers between departments', 'technical jargon'],
      deescalationTriggers: ['immediate action', 'clear security steps', 'reassurance'],
    },
    context: {
      issueType: 'Fraud Alert',
      issueDescription: 'Received fraud alert about suspicious transaction, did not make the charge, worried about account security',
      expectedOutcome: 'Account secured, fraudulent charge reversed, new cards issued',
      previousAttempts: 0,
    },
  },
};

// ============================================
// SCENARIO TO PERSONA MAPPING
// ============================================

export interface ScenarioPersonaMapping {
  scenarioKeywords: string[];
  personaId: string;
}

export const SCENARIO_PERSONA_MAPPINGS: ScenarioPersonaMapping[] = [
  { scenarioKeywords: ['billing', 'dispute', 'charges'], personaId: 'angry-customer' },
  { scenarioKeywords: ['technical', 'internet', 'connectivity', 'broadband'], personaId: 'frustrated-senior' },
  { scenarioKeywords: ['sales', 'upsell', 'promotion', 'upgrade'], personaId: 'interested-customer' },
  { scenarioKeywords: ['privacy', 'compliance', 'data', 'verification'], personaId: 'suspicious-caller' },
  { scenarioKeywords: ['retention', 'cancellation'], personaId: 'disappointed-customer' },
  { scenarioKeywords: ['return', 'refund', 'damaged'], personaId: 'upset-customer' },
  { scenarioKeywords: ['vip', 'premium', 'white-glove'], personaId: 'vip-customer' },
  { scenarioKeywords: ['fraud', 'security', 'alert'], personaId: 'panicked-customer' },
];

// ============================================
// STORE
// ============================================

interface PersonaDataState {
  // Get persona by ID
  getPersonaById: (personaId: string) => PersonaData | undefined;
  // Get persona for a scenario
  getPersonaForScenario: (scenarioTitle: string, scenarioCategory: string, scenarioPersona?: string) => PersonaData;
  // Get all personas
  getAllPersonas: () => PersonaData[];
  // Get unique persona categories
  getPersonaCategories: () => string[];
}

export const usePersonaDataStore = create<PersonaDataState>(() => ({
  getPersonaById: (personaId: string) => {
    return MOCK_PERSONAS[personaId];
  },

  getPersonaForScenario: (scenarioTitle: string, scenarioCategory: string, scenarioPersona?: string) => {
    // Try to find matching persona based on scenario keywords
    const searchText = `${scenarioTitle} ${scenarioCategory} ${scenarioPersona || ''}`.toLowerCase();
    
    for (const mapping of SCENARIO_PERSONA_MAPPINGS) {
      if (mapping.scenarioKeywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        const persona = MOCK_PERSONAS[mapping.personaId];
        if (persona) return persona;
      }
    }
    
    // Fallback: return angry-customer as default
    return MOCK_PERSONAS['angry-customer'];
  },

  getAllPersonas: () => {
    return Object.values(MOCK_PERSONAS);
  },

  getPersonaCategories: () => {
    const categories = new Set<string>();
    Object.values(MOCK_PERSONAS).forEach(persona => {
      categories.add(persona.context.issueType);
    });
    return Array.from(categories).sort();
  },
}));

export default usePersonaDataStore;
