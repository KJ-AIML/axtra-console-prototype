import React, { memo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { useSimulationStore, type Scenario } from '../stores';
import { usePersonaStore, type Persona } from '../stores';
import { 
  ArrowLeft, 
  Save, 
  BookOpen,
  Clock,
  Target,
  Tag,
  Star,
  AlertCircle,
  Loader2,
  CheckCircle2,
  User,
  Users
} from 'lucide-react';

interface ScenarioBuilderProps {
  className?: string;
}

const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ className }) => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const { 
    scenarios,
    fetchScenarios, 
    createScenario, 
    updateScenario,
    isLoading: simLoading,
    error: simError,
  } = useSimulationStore();
  
  const {
    personas,
    selectedPersona,
    fetchPersonas,
    fetchPersonaById,
    assignPersonaToScenario,
    fetchPersonasForScenario,
    isLoading: personaLoading,
    error: personaError,
  } = usePersonaStore();

  const isEditing = Boolean(scenarioId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkedPersonas, setLinkedPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Scenario>>({
    title: '',
    description: '',
    difficulty: 'Medium',
    duration: '10 mins',
    type: 'Voice Simulation',
    category: 'Customer Service',
    persona: 'Customer',
    isRecommended: true,
    rating: 4.5,
    sortOrder: 0
  });

  // Load personas and scenario data
  useEffect(() => {
    fetchPersonas();
    fetchScenarios();
  }, [fetchPersonas, fetchScenarios]);

  // Load existing scenario and linked personas
  useEffect(() => {
    if (isEditing && scenarioId) {
      const existing = scenarios.find(s => s.id === scenarioId);
      if (existing) {
        setFormData(existing);
        // Load linked personas for this scenario
        loadLinkedPersonas(scenarioId);
      }
    }
  }, [isEditing, scenarioId, scenarios]);

  const loadLinkedPersonas = async (sid: string) => {
    try {
      const personas = await fetchPersonasForScenario(sid);
      setLinkedPersonas(personas);
      if (personas.length > 0) {
        setSelectedPersonaId(personas[0].id);
      }
    } catch (err) {
      console.error('Failed to load linked personas:', err);
    }
  };

  const handleChange = (field: keyof Scenario, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      setSaveError('Title is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      let savedScenarioId = scenarioId;
      
      if (isEditing && savedScenarioId) {
        await updateScenario(savedScenarioId, formData);
      } else {
        const newScenario = await createScenario(formData);
        if (newScenario) {
          savedScenarioId = newScenario.id;
        }
      }
      
      // Link selected persona to scenario
      if (savedScenarioId && selectedPersonaId) {
        await assignPersonaToScenario(selectedPersonaId, savedScenarioId);
      }
      
      navigate('/scenarios');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save scenario');
    } finally {
      setIsSaving(false);
    }
  };

  const difficultyOptions = [
    { value: 'Easy' as const, label: 'Easy', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'Medium' as const, label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'Hard' as const, label: 'Hard', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  const typeOptions = ['Voice Simulation', 'Knowledge Check', 'Objection Handling', 'Compliance Training'];
  const categoryOptions = ['Customer Service', 'Sales', 'Technical Support', 'Billing', 'Compliance', 'Retention'];
  const durationOptions = ['5 mins', '10 mins', '15 mins', '20 mins', '30 mins'];

  const isLoading = simLoading || personaLoading;
  const error = simError || personaError;

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/scenarios')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Scenario' : 'Create Scenario'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEditing ? 'Update training scenario settings' : 'Create a new training scenario'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/scenarios')} className="px-4 py-2 text-sm font-medium text-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
              (isSaving || isLoading) ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
          >
            {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {isEditing ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </div>

      {(error || saveError) && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-rose-900">Error</h3>
            <p className="text-sm text-rose-700">{saveError || error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Billing Dispute - Aggressive Customer"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what the trainee will practice..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <div className="flex gap-2">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleChange('difficulty', option.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                      formData.difficulty === option.value ? option.color : 'bg-gray-50 text-gray-600 border-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Clock size={14} className="inline mr-1" />Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {durationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Tag size={14} className="inline mr-1" />Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Star size={14} className="inline mr-1" />Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* AI Persona Selection - NEW */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Persona</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select AI Persona for This Scenario</label>
              {personas.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">No AI personas available. <button onClick={() => navigate('/personas/new')} className="underline font-medium">Create a persona first</button>.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 border rounded-lg text-left transition-all',
                        selectedPersonaId === persona.id
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <User size={18} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{persona.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {persona.tier} • {persona.behaviorProfile?.initialMood} • {persona.behaviorProfile?.patienceLevel} patience
                        </p>
                      </div>
                      {selectedPersonaId === persona.id && (
                        <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                This AI persona will play the customer role when trainees run this simulation.
              </p>
            </div>

            {/* Linked Personas (for edit mode) */}
            {isEditing && linkedPersonas.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Currently Linked Personas</label>
                <div className="flex flex-wrap gap-2">
                  {linkedPersonas.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                      <User size={12} />
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <User size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Persona Display Name</label>
              <input
                type="text"
                value={formData.persona}
                onChange={(e) => handleChange('persona', e.target.value)}
                placeholder="e.g., Angry Customer"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">How the persona will be labeled in the simulation UI.</p>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <label className="text-sm font-medium text-gray-900">Recommended</label>
                <p className="text-xs text-gray-500">Show in recommended list</p>
              </div>
              <button
                onClick={() => handleChange('isRecommended', !formData.isRecommended)}
                className={cn('w-11 h-6 rounded-full transition-colors relative', formData.isRecommended ? 'bg-indigo-600' : 'bg-gray-200')}
              >
                <span className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform', formData.isRecommended ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-indigo-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-indigo-900">How It All Works Together</h3>
              <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                <li>• <strong>Scenario</strong> defines the training situation and difficulty</li>
                <li>• <strong>AI Persona</strong> plays the customer with specific behavior traits</li>
                <li>• <strong>Simulation</strong> combines them for realistic voice training</li>
                <li>• Trainees practice by talking to the AI persona in the scenario context</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ScenarioBuilder);
