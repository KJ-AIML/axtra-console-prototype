import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

// ============================================
// TYPES
// ============================================

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

export interface PersonaContextOverride {
  specificIssue?: string;
  initialMood?: 'calm' | 'happy' | 'frustrated' | 'angry' | 'panicked';
  previousAttempts?: number;
  expectedOutcome?: string;
}

export interface CallHistoryEntry {
  id: string;
  date: string;
  duration: string;
  type: string;
  outcome: 'Resolved' | 'Escalated' | 'Pending';
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
}

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
  // For display in simulations
  satisfaction?: number;
  totalCalls?: number;
  callHistory?: CallHistoryEntry[];
}

export interface PersonaScenarioLink {
  scenarioId: string;
  scenarioTitle: string;
  scenarioCategory: string;
  contextOverride: PersonaContextOverride | null;
  displayOrder: number;
}

export interface PersonaWithScenarios extends Persona {
  scenarios: PersonaScenarioLink[];
  callHistory: CallHistoryEntry[];
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category: string;
  rating: number;
  completions: number;
  isRecommended: boolean;
  status?: 'not_started' | 'in_progress' | 'completed';
  userScore?: number;
}

// ============================================
// STORE STATE
// ============================================

interface PersonaState {
  // Data
  personas: Persona[];
  selectedPersona: PersonaWithScenarios | null;
  scenarioPersonas: Map<string, Persona[]>; // scenarioId -> personas
  
  // Loading states
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  
  // Actions
  fetchPersonas: () => Promise<void>;
  fetchPersonaById: (id: string) => Promise<void>;
  fetchPersonasForScenario: (scenarioId: string) => Promise<Persona[]>;
  fetchPrimaryPersonaForScenario: (scenarioId: string) => Promise<(Persona & { contextOverride: PersonaContextOverride | null; callHistory: CallHistoryEntry[] }) | null>;
  selectPersona: (persona: PersonaWithScenarios | null) => void;
  clearError: () => void;
  
  // CRUD operations
  createPersona: (data: Partial<Persona>) => Promise<Persona | null>;
  updatePersona: (id: string, data: Partial<Persona>) => Promise<boolean>;
  deletePersona: (id: string) => Promise<boolean>;
  
  // Assignment operations
  assignPersonaToScenario: (
    personaId: string, 
    scenarioId: string, 
    contextOverride?: PersonaContextOverride,
    displayOrder?: number
  ) => Promise<boolean>;
  removePersonaFromScenario: (personaId: string, scenarioId: string) => Promise<boolean>;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const usePersonaStore = create<PersonaState>((set, get) => ({
  // Initial state
  personas: [],
  selectedPersona: null,
  scenarioPersonas: new Map(),
  isLoading: false,
  isLoadingDetails: false,
  error: null,

  // Fetch all personas
  fetchPersonas: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { personas: Persona[] };
      }>('/personas');
      
      // Add computed display fields
      const personasWithStats = response.data.personas.map(persona => ({
        ...persona,
        satisfaction: generateSatisfaction(persona.behaviorProfile?.initialMood),
        totalCalls: Math.floor(Math.random() * 30) + 5
      }));
      
      set({ 
        personas: personasWithStats,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch personas';
      set({ isLoading: false, error: message });
    }
  },

  // Fetch persona details with scenarios
  fetchPersonaById: async (id: string) => {
    set({ isLoadingDetails: true, error: null });
    
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { persona: PersonaWithScenarios };
      }>(`/personas/${id}`);
      
      const persona = response.data.persona;
      
      // Add computed display fields (callHistory comes from API)
      const personaWithExtras = {
        ...persona,
        satisfaction: generateSatisfaction(persona.behaviorProfile?.initialMood),
        totalCalls: Math.floor(Math.random() * 30) + 5
      };
      
      set({ 
        selectedPersona: personaWithExtras,
        isLoadingDetails: false,
        error: null 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch persona details';
      set({ isLoadingDetails: false, error: message });
    }
  },

  // Fetch personas for a specific scenario
  fetchPersonasForScenario: async (scenarioId: string) => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { personas: Persona[] };
      }>(`/scenarios/${scenarioId}/personas`);
      
      const personas = response.data.personas;
      
      // Update the cache
      const scenarioPersonas = new Map(get().scenarioPersonas);
      scenarioPersonas.set(scenarioId, personas);
      set({ scenarioPersonas });
      
      return personas;
    } catch (error) {
      console.error('Failed to fetch personas for scenario:', error);
      return [];
    }
  },

  // Fetch primary persona for a scenario
  fetchPrimaryPersonaForScenario: async (scenarioId: string) => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { 
          persona: Persona & { contextOverride: PersonaContextOverride | null; callHistory: CallHistoryEntry[] } 
        };
      }>(`/scenarios/${scenarioId}/primary-persona`);
      
      return response.data.persona;
    } catch (error) {
      console.error('Failed to fetch primary persona:', error);
      return null;
    }
  },

  // Select a persona (for UI state)
  selectPersona: (persona) => set({ selectedPersona: persona }),

  // Clear error
  clearError: () => set({ error: null }),

  // Create new persona
  createPersona: async (data: Partial<Persona>) => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { persona: Persona };
      }>('/personas', data);
      
      // Refresh the list
      await get().fetchPersonas();
      
      return response.data.persona;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create persona';
      set({ error: message });
      return null;
    }
  },

  // Update persona
  updatePersona: async (id: string, data: Partial<Persona>) => {
    try {
      await apiClient.put(`/personas/${id}`, data);
      
      // Refresh the list and selected persona
      await get().fetchPersonas();
      if (get().selectedPersona?.id === id) {
        await get().fetchPersonaById(id);
      }
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update persona';
      set({ error: message });
      return false;
    }
  },

  // Delete persona
  deletePersona: async (id: string) => {
    try {
      await apiClient.delete(`/personas/${id}`);
      
      // Remove from state
      set({ 
        personas: get().personas.filter(p => p.id !== id),
        selectedPersona: get().selectedPersona?.id === id ? null : get().selectedPersona
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete persona';
      set({ error: message });
      return false;
    }
  },

  // Assign persona to scenario
  assignPersonaToScenario: async (
    personaId: string,
    scenarioId: string,
    contextOverride?: PersonaContextOverride,
    displayOrder?: number
  ) => {
    try {
      await apiClient.post(`/personas/${personaId}/scenarios/${scenarioId}`, {
        contextOverride,
        displayOrder
      });
      
      // Refresh scenario personas
      await get().fetchPersonasForScenario(scenarioId);
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign persona';
      set({ error: message });
      return false;
    }
  },

  // Remove persona from scenario
  removePersonaFromScenario: async (personaId: string, scenarioId: string) => {
    try {
      await apiClient.delete(`/personas/${personaId}/scenarios/${scenarioId}`);
      
      // Refresh scenario personas
      await get().fetchPersonasForScenario(scenarioId);
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove persona';
      set({ error: message });
      return false;
    }
  }
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSatisfaction(mood?: string): number {
  switch (mood) {
    case 'happy':
      return 4.5 + Math.random() * 0.5;
    case 'calm':
      return 4.0 + Math.random() * 0.8;
    case 'frustrated':
      return 3.0 + Math.random() * 1.0;
    case 'angry':
    case 'panicked':
      return 2.0 + Math.random() * 1.5;
    default:
      return 3.5 + Math.random() * 1.0;
  }
}

export default usePersonaStore;
