import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

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

export interface Persona {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  simulationCount: number;
  completions: number;
  simulations: Simulation[];
}

interface PersonaState {
  personas: Persona[];
  isLoading: boolean;
  error: string | null;
  selectedPersona: Persona | null;
  
  // Actions
  fetchPersonas: () => Promise<void>;
  selectPersona: (persona: Persona | null) => void;
  clearError: () => void;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  personas: [],
  isLoading: false,
  error: null,
  selectedPersona: null,

  fetchPersonas: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Fetch all scenarios and group by persona
      const response = await apiClient.get<{
        success: boolean;
        data: { scenarios: Simulation[] };
      }>('/scenarios');
      
      const scenarios = response.data.scenarios;
      
      // Group scenarios by persona
      const personaMap = new Map<string, Persona>();
      
      scenarios.forEach((scenario) => {
        const personaName = scenario.category || 'General';
        const personaKey = personaName.toLowerCase().replace(/\s+/g, '-');
        
        if (!personaMap.has(personaKey)) {
          personaMap.set(personaKey, {
            id: personaKey,
            name: personaName,
            description: getPersonaDescription(personaName),
            category: scenario.category || 'General',
            difficulty: scenario.difficulty,
            simulationCount: 0,
            completions: 0,
            simulations: [],
          });
        }
        
        const persona = personaMap.get(personaKey)!;
        persona.simulations.push(scenario);
        persona.simulationCount = persona.simulations.length;
        persona.completions += scenario.completions || 0;
      });
      
      const personas = Array.from(personaMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      set({ 
        personas,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch personas';
      set({ isLoading: false, error: message });
    }
  },

  selectPersona: (persona) => set({ selectedPersona: persona }),
  clearError: () => set({ error: null }),
}));

// Helper function to get persona descriptions
function getPersonaDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Billing': 'Customers with billing-related inquiries and disputes',
    'Technical': 'Customers seeking technical support and troubleshooting',
    'Sales': 'Customers interested in products, upgrades, and promotions',
    'Compliance': 'Sensitive cases requiring careful handling and verification',
    'Retention': 'Customers considering cancellation or service changes',
    'Returns': 'Customers requesting returns, refunds, or exchanges',
    'Security': 'Security-related cases including fraud alerts',
    'General': 'General customer service scenarios',
  };
  
  return descriptions[category] || `${category} customer scenarios`;
}
