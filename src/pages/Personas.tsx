import React, { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { usePersonaStore } from '../stores';
import type { Persona } from '../stores';
// Components are defined inline in this file
import { useSimulationStore } from '../stores';
import { 
  Users, 
  Plus, 
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Grid3X3,
  List,
  User,
  Clock,
  Star,
  Target,
  TrendingUp,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';

interface PersonasPageProps {
  className?: string;
}

const PersonasPage: React.FC<PersonasPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { 
    personas, 
    isLoading: storeLoading, 
    isLoadingDetails,
    error, 
    selectedPersona: selectedStorePersona,
    fetchPersonas, 
    fetchPersonaById,
    selectPersona: selectStorePersona,
    deletePersona,
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
    persona.behaviorProfile?.initialMood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.tier?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalSimulations = scenarios.length;
  const totalCompletions = personas.reduce((sum, p) => sum + (p.totalCalls || 0), 0);
  const avgSatisfaction = personas.length > 0
    ? (personas.reduce((sum, p) => sum + (p.satisfaction || 0), 0) / personas.length).toFixed(1)
    : '0.0';

  const handleStartSimulation = (simulationId: string) => {
    window.location.href = `/simulations/${simulationId}`;
  };

  // Selected persona from store
  const selectedPersona = selectedStorePersona;

  const isLoading = storeLoading;

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
              AI Customer Personas for training simulations
            </p>
          </div>
          <button 
            onClick={() => navigate('/personas/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Create Persona
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
                <p className="text-sm text-gray-500">AI Personas</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Target size={20} className="text-emerald-600" />
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
                <TrendingUp size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCompletions.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Completions</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                <Star size={20} className="text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {avgSatisfaction}
                </p>
                <p className="text-sm text-gray-500">Avg CSAT</p>
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
            placeholder="Search personas by name, type, or mood..."
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
                <PersonaDetailCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersona?.id === persona.id}
                  onClick={() => {
                    if (selectedStorePersona?.id === persona.id) {
                      selectStorePersona(null);
                    } else {
                      // Fetch full persona details including call history
                      fetchPersonaById(persona.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Persona Details */}
        {(selectedPersona || isLoadingDetails) && (
          <div className="col-span-7">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-6">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading details...</span>
                </div>
              ) : (
                <PersonaDetailView 
                  persona={selectedPersona!}
                  onClose={() => selectStorePersona(null)}
                  onEdit={(id) => navigate(`/personas/${id}/edit`)}
                  onDelete={async (id) => {
                    if (confirm('Are you sure you want to delete this persona?')) {
                      await deletePersona(id);
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PERSONA DETAIL CARD COMPONENT
// ============================================

interface PersonaDetailCardProps {
  persona: Persona;
  isSelected?: boolean;
  onClick?: () => void;
}

const PersonaDetailCard: React.FC<PersonaDetailCardProps> = ({ persona, isSelected, onClick }) => {
  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      'calm': 'bg-blue-100 text-blue-700',
      'happy': 'bg-emerald-100 text-emerald-700',
      'frustrated': 'bg-amber-100 text-amber-700',
      'angry': 'bg-rose-100 text-rose-700',
      'panicked': 'bg-purple-100 text-purple-700',
    };
    return colors[mood] || 'bg-gray-100 text-gray-700';
  };
  
  const bp = persona.behaviorProfile;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-white border rounded-xl p-5 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-indigo-300',
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
          : 'border-gray-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isSelected ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-50'
          )}>
            <User size={24} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{persona.name}</h3>
            <p className="text-sm text-gray-500">{persona.tier} Tier Customer</p>
          </div>
        </div>
        <ChevronRight 
          size={20} 
          className={cn(
            'text-gray-400 transition-transform',
            isSelected && 'rotate-90'
          )} 
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={cn(
          'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
          getMoodColor(bp?.initialMood || 'calm')
        )}>
          {bp?.initialMood || 'calm'}
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 capitalize">
          {persona.tier} Tier
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-lg font-semibold text-gray-900">{persona.totalCalls || 0}</p>
          <p className="text-xs text-gray-500">Total Calls</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{persona.satisfaction?.toFixed(1) || '0.0'}</p>
          <p className="text-xs text-gray-500">CSAT</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900 capitalize">{bp?.patienceLevel || 'medium'}</p>
          <p className="text-xs text-gray-500">Patience</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PERSONA DETAIL VIEW COMPONENT
// ============================================

interface PersonaDetailViewProps {
  persona: Persona;
  onClose: () => void;
  onEdit?: (personaId: string) => void;
  onDelete?: (personaId: string) => void;
}

const PersonaDetailView: React.FC<PersonaDetailViewProps> = ({ persona, onClose, onEdit, onDelete }) => {
  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      'calm': 'bg-blue-100 text-blue-700 border-blue-200',
      'happy': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'frustrated': 'bg-amber-100 text-amber-700 border-amber-200',
      'angry': 'bg-rose-100 text-rose-700 border-rose-200',
      'panicked': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[mood] || 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  const bp = persona.behaviorProfile;
  const ci = persona.contractInfo;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <User size={32} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{persona.name}</h2>
            <p className="text-sm text-gray-500">{persona.id} • {persona.tier} Tier Customer</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full border capitalize',
                getMoodColor(bp?.initialMood || 'calm')
              )}>
                {bp?.initialMood || 'calm'}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {persona.tier} Tier
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(persona.id)}
              className="inline-flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(persona.id)}
              className="inline-flex items-center gap-2 px-3 py-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Phone size={18} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">{persona.phone}</p>
            <p className="text-xs text-gray-500">Phone</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Mail size={18} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">{persona.email}</p>
            <p className="text-xs text-gray-500">Email</p>
          </div>
        </div>
      </div>

      {/* AI System Prompt */}
      {persona.systemPrompt && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">AI System Prompt</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 line-clamp-4">{persona.systemPrompt}</p>
          </div>
        </div>
      )}

      {/* AI Behavior */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">AI Behavior Profile</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-gray-900 capitalize">{bp?.initialMood || 'calm'}</p>
            <p className="text-xs text-gray-500">Initial Mood</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-gray-900 capitalize">{bp?.patienceLevel || 'medium'}</p>
            <p className="text-xs text-gray-500">Patience</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-semibold text-gray-900 capitalize">{bp?.cooperationLevel || 'medium'}</p>
            <p className="text-xs text-gray-500">Cooperation</p>
          </div>
        </div>
      </div>

      {/* Triggers */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Escalation Triggers</h3>
          <div className="flex flex-wrap gap-1.5">
            {(bp?.escalationTriggers || []).map((trigger, idx) => (
              <span key={idx} className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">
                {trigger}
              </span>
            ))}
            {(bp?.escalationTriggers || []).length === 0 && (
              <span className="text-xs text-gray-500">No triggers defined</span>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">De-escalation Triggers</h3>
          <div className="flex flex-wrap gap-1.5">
            {(bp?.deescalationTriggers || []).map((trigger, idx) => (
              <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {trigger}
              </span>
            ))}
            {(bp?.deescalationTriggers || []).length === 0 && (
              <span className="text-xs text-gray-500">No triggers defined</span>
            )}
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Contract Details</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium text-gray-900">{ci?.plan || 'Standard'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Monthly Value</span>
            <span className="font-medium text-gray-900">${ci?.monthlyValue || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Renewal Date</span>
            <span className="font-medium text-gray-900">{ci?.renewalDate || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              {ci?.status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Call History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Recent Call History</h3>
        {(persona.callHistory || []).length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            <p>No call history available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(persona.callHistory || []).slice(0, 3).map((call) => (
              <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{call.type}</p>
                  <p className="text-xs text-gray-500">{call.date} • {call.duration}</p>
                </div>
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  call.outcome === 'Resolved' && 'bg-emerald-100 text-emerald-700',
                  call.outcome === 'Escalated' && 'bg-rose-100 text-rose-700',
                  call.outcome === 'Pending' && 'bg-amber-100 text-amber-700',
                )}>
                  {call.outcome}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default memo(PersonasPage);
