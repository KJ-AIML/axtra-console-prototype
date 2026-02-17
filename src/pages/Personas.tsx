import React, { memo, useEffect } from 'react';
import { cn } from '../utils/classnames';
import { usePersonaStore } from '../stores/usePersonaStore';
import { PersonaCard, SimulationList } from '../components/personas';
import { useSimulationStore } from '../stores/useSimulationStore';
import { 
  Users, 
  Plus, 
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Grid3X3,
  List
} from 'lucide-react';
import { useState } from 'react';

interface PersonasPageProps {
  className?: string;
}

const PersonasPage: React.FC<PersonasPageProps> = ({ className }) => {
  const { 
    personas, 
    isLoading, 
    error, 
    selectedPersona,
    fetchPersonas, 
    selectPersona,
    clearError 
  } = usePersonaStore();
  
  const { scenarios } = useSimulationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  // Filter personas by search query
  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalSimulations = personas.reduce((sum, p) => sum + p.simulationCount, 0);
  const totalCompletions = personas.reduce((sum, p) => sum + p.completions, 0);

  const handleStartSimulation = (simulationId: string) => {
    // Navigate to simulation or start it
    window.location.href = `/simulations/${simulationId}`;
  };

  if (isLoading) {
    return (
      <div className={cn('max-w-[1400px] mx-auto', className)}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading personas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('max-w-[1400px] mx-auto', className)}>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-rose-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load personas</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => { clearError(); fetchPersonas(); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-[1400px] mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Personas</h1>
            <p className="text-sm text-gray-500 mt-2">
              Manage customer personas and their training simulations
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
            <Plus size={16} />
            Create Persona
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
                <p className="text-sm text-gray-500">Total Personas</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalSimulations}</p>
                <p className="text-sm text-gray-500">Simulations</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCompletions.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Completions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Persona List */}
        <div className={cn(
          'space-y-4',
          selectedPersona ? 'col-span-5' : 'col-span-12'
        )}>
          {filteredPersonas.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No personas found</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search query' 
                  : 'Create your first persona to get started'}
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' && !selectedPersona 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'space-y-3'
            )}>
              {filteredPersonas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersona?.id === persona.id}
                  onClick={() => selectPersona(
                    selectedPersona?.id === persona.id ? null : persona
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Persona Details */}
        {selectedPersona && (
          <div className="col-span-7">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPersona.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedPersona.description}</p>
                </div>
                <button
                  onClick={() => selectPersona(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedPersona.simulationCount}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Simulations</p>
                </div>
                <div className="text-center border-l border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">{selectedPersona.completions.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Completions</p>
                </div>
                <div className="text-center border-l border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedPersona.simulationCount > 0 
                      ? Math.round(selectedPersona.completions / selectedPersona.simulationCount)
                      : 0
                    }
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Avg/Scenario</p>
                </div>
              </div>

              {/* Simulations List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Training Simulations
                </h3>
                <SimulationList 
                  simulations={selectedPersona.simulations}
                  onStartSimulation={handleStartSimulation}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(PersonasPage);
