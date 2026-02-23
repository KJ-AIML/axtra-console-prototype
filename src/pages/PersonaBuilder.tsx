import React, { memo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { usePersonaStore, type Persona, type PersonaBehaviorProfile, type PersonaContractInfo } from '../stores';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign,
  Award,
  Globe,
  MapPin,
  Hash,
  Mic,
  MessageSquare,
  Brain,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Copy
} from 'lucide-react';

interface PersonaBuilderProps {
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

const PersonaBuilder: React.FC<PersonaBuilderProps> = ({ className }) => {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const { 
    selectedPersona, 
    fetchPersonaById, 
    createPersona, 
    updatePersona,
    isLoading,
    isLoadingDetails,
    error,
    clearError
  } = usePersonaStore();

  const isEditing = Boolean(personaId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'behavior' | 'voice' | 'contract'>('basic');

  // Form state
  const [formData, setFormData] = useState<Partial<Persona>>({
    name: '',
    tier: 'Silver',
    email: '',
    phone: '',
    accountSince: '',
    ageGroup: '',
    region: '',
    language: 'en',
    avatarUrl: null,
    voiceId: 'shimmer',
    voiceSpeed: 'normal',
    systemPrompt: '',
    greetingTemplate: '',
    isActive: true,
    isTemplate: false,
    contractInfo: {
      plan: 'Standard',
      monthlyValue: 0,
      renewalDate: '',
      status: 'Active'
    },
    behaviorProfile: {
      initialMood: 'calm',
      patienceLevel: 'medium',
      cooperationLevel: 'medium',
      communicationStyle: 'casual',
      escalationTriggers: [],
      deescalationTriggers: []
    }
  });

  // Temp state for trigger inputs
  const [newEscalationTrigger, setNewEscalationTrigger] = useState('');
  const [newDeescalationTrigger, setNewDeescalationTrigger] = useState('');

  // Load existing persona data
  useEffect(() => {
    if (isEditing && personaId) {
      fetchPersonaById(personaId);
    }
  }, [isEditing, personaId, fetchPersonaById]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedPersona) {
      setFormData({
        name: selectedPersona.name,
        tier: selectedPersona.tier,
        email: selectedPersona.email || '',
        phone: selectedPersona.phone || '',
        accountSince: selectedPersona.accountSince || '',
        ageGroup: selectedPersona.ageGroup || '',
        region: selectedPersona.region || '',
        language: selectedPersona.language,
        avatarUrl: selectedPersona.avatarUrl,
        voiceId: selectedPersona.voiceId || 'shimmer',
        voiceSpeed: selectedPersona.voiceSpeed,
        systemPrompt: selectedPersona.systemPrompt || '',
        greetingTemplate: selectedPersona.greetingTemplate || '',
        isActive: selectedPersona.isActive,
        isTemplate: selectedPersona.isTemplate,
        contractInfo: selectedPersona.contractInfo,
        behaviorProfile: selectedPersona.behaviorProfile
      });
    }
  }, [isEditing, selectedPersona]);

  // Handle form field changes
  const handleChange = useCallback(<K extends keyof Persona>(
    field: K, 
    value: Persona[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle contract info changes
  const handleContractChange = useCallback(<K extends keyof PersonaContractInfo>(
    field: K,
    value: PersonaContractInfo[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      contractInfo: {
        ...prev.contractInfo!,
        [field]: value
      }
    }));
  }, []);

  // Handle behavior profile changes
  const handleBehaviorChange = useCallback(<K extends keyof PersonaBehaviorProfile>(
    field: K,
    value: PersonaBehaviorProfile[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      behaviorProfile: {
        ...prev.behaviorProfile!,
        [field]: value
      }
    }));
  }, []);

  // Add escalation trigger
  const addEscalationTrigger = useCallback(() => {
    if (!newEscalationTrigger.trim()) return;
    setFormData(prev => ({
      ...prev,
      behaviorProfile: {
        ...prev.behaviorProfile!,
        escalationTriggers: [...prev.behaviorProfile!.escalationTriggers, newEscalationTrigger.trim()]
      }
    }));
    setNewEscalationTrigger('');
  }, [newEscalationTrigger]);

  // Add de-escalation trigger
  const addDeescalationTrigger = useCallback(() => {
    if (!newDeescalationTrigger.trim()) return;
    setFormData(prev => ({
      ...prev,
      behaviorProfile: {
        ...prev.behaviorProfile!,
        deescalationTriggers: [...prev.behaviorProfile!.deescalationTriggers, newDeescalationTrigger.trim()]
      }
    }));
    setNewDeescalationTrigger('');
  }, [newDeescalationTrigger]);

  // Remove trigger
  const removeTrigger = useCallback((type: 'escalation' | 'deescalation', index: number) => {
    setFormData(prev => ({
      ...prev,
      behaviorProfile: {
        ...prev.behaviorProfile!,
        [type === 'escalation' ? 'escalationTriggers' : 'deescalationTriggers']: 
          prev.behaviorProfile![type === 'escalation' ? 'escalationTriggers' : 'deescalationTriggers']
            .filter((_, i) => i !== index)
      }
    }));
  }, []);

  // Generate AI prompt from profile
  const generateSystemPrompt = useCallback(() => {
    const bp = formData.behaviorProfile;
    const name = formData.name || 'the customer';
    const tier = formData.tier || 'Standard';
    
    const prompt = `You are ${name}, a ${tier} tier customer. ` +
      `You are currently feeling ${bp?.initialMood}. ` +
      `Your patience level is ${bp?.patienceLevel} and you tend to be ${bp?.cooperationLevel} in cooperation. ` +
      `You communicate in a ${bp?.communicationStyle} style.\n\n` +
      `Things that will upset you: ${bp?.escalationTriggers.join(', ') || 'none specified'}.\n` +
      `Things that will calm you down: ${bp?.deescalationTriggers.join(', ') || 'none specified'}.`;
    
    handleChange('systemPrompt', prompt);
  }, [formData, handleChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error('Persona name is required');
      }

      if (isEditing && personaId) {
        await updatePersona(personaId, formData);
      } else {
        await createPersona(formData);
      }

      navigate('/personas');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save persona');
    } finally {
      setIsSaving(false);
    }
  }, [formData, isEditing, personaId, createPersona, updatePersona, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    navigate('/personas');
  }, [navigate]);

  if (isEditing && isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading persona...</span>
        </div>
      </div>
    );
  }

  const bp = formData.behaviorProfile!;
  const ci = formData.contractInfo!;

  return (
    <div className={cn('min-h-screen bg-gray-50 pb-20', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Persona' : 'Create New Persona'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing 
                    ? 'Update AI customer profile and behavior' 
                    : 'Design a new AI customer for training simulations'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isEditing ? 'Update Persona' : 'Create Persona'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {(error || saveError) && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-rose-500 shrink-0" size={20} />
              <p className="text-sm text-rose-700">{error || saveError}</p>
              <button 
                onClick={() => { clearError(); setSaveError(null); }}
                className="ml-auto text-rose-500 hover:text-rose-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-gray-200">
            {[
              { id: 'basic', label: 'Basic Info', icon: User },
              { id: 'behavior', label: 'Behavior Profile', icon: Brain },
              { id: 'voice', label: 'Voice & AI', icon: Mic },
              { id: 'contract', label: 'Contract', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Name & Tier */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-indigo-500" />
                Identity
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Sarah Thompson"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => handleChange('tier', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail size={20} className="text-indigo-500" />
                Contact Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={20} className="text-indigo-500" />
                Demographics
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => handleChange('ageGroup', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45-54">45-54</option>
                    <option value="55+">55+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => handleChange('region', e.target.value)}
                      placeholder="Northeast"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="en">English</option>
                    <option value="th">Thai</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Since
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={formData.accountSince}
                    onChange={(e) => handleChange('accountSince', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Behavior Profile Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            {/* Mood & Demeanor */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Brain size={20} className="text-indigo-500" />
                Mood & Demeanor
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Mood
                  </label>
                  <select
                    value={bp.initialMood}
                    onChange={(e) => handleBehaviorChange('initialMood', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="calm">😊 Calm</option>
                    <option value="happy">😄 Happy</option>
                    <option value="frustrated">😤 Frustrated</option>
                    <option value="angry">😠 Angry</option>
                    <option value="panicked">😰 Panicked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patience Level
                  </label>
                  <select
                    value={bp.patienceLevel}
                    onChange={(e) => handleBehaviorChange('patienceLevel', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="high">High - Very patient</option>
                    <option value="medium">Medium - Average</option>
                    <option value="low">Low - Easily frustrated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cooperation Level
                  </label>
                  <select
                    value={bp.cooperationLevel}
                    onChange={(e) => handleBehaviorChange('cooperationLevel', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="high">High - Helpful</option>
                    <option value="medium">Medium - Neutral</option>
                    <option value="low">Low - Resistant</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication Style
                </label>
                <select
                  value={bp.communicationStyle}
                  onChange={(e) => handleBehaviorChange('communicationStyle', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="formal">Formal - Professional, polite</option>
                  <option value="casual">Casual - Friendly, relaxed</option>
                  <option value="aggressive">Aggressive - Demanding, confrontational</option>
                  <option value="passive">Passive - Quiet, hesitant</option>
                </select>
              </div>
            </div>

            {/* Escalation Triggers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-rose-500" />
                Escalation Triggers
                <span className="text-sm font-normal text-gray-500">(Things that upset the customer)</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {bp.escalationTriggers.map((trigger, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm"
                  >
                    {trigger}
                    <button
                      onClick={() => removeTrigger('escalation', idx)}
                      className="hover:text-rose-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEscalationTrigger}
                  onChange={(e) => setNewEscalationTrigger(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEscalationTrigger())}
                  placeholder="e.g., Long hold times"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={addEscalationTrigger}
                  className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* De-escalation Triggers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                De-escalation Triggers
                <span className="text-sm font-normal text-gray-500">(Things that calm the customer)</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {bp.deescalationTriggers.map((trigger, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                  >
                    {trigger}
                    <button
                      onClick={() => removeTrigger('deescalation', idx)}
                      className="hover:text-emerald-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeescalationTrigger}
                  onChange={(e) => setNewDeescalationTrigger(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeescalationTrigger())}
                  placeholder="e.g., Empathy and apology"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={addDeescalationTrigger}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voice & AI Tab */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            {/* Voice Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mic size={20} className="text-indigo-500" />
                Voice Configuration
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voice
                  </label>
                  <select
                    value={formData.voiceId}
                    onChange={(e) => handleChange('voiceId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="shimmer">Shimmer (Female, Warm)</option>
                    <option value="nova">Nova (Female, Professional)</option>
                    <option value="echo">Echo (Male, Calm)</option>
                    <option value="onyx">Onyx (Male, Authoritative)</option>
                    <option value="fable">Fable (British, Neutral)</option>
                    <option value="alloy">Alloy (Neutral)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speaking Speed
                  </label>
                  <select
                    value={formData.voiceSpeed}
                    onChange={(e) => handleChange('voiceSpeed', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="slow">Slow - Deliberate</option>
                    <option value="normal">Normal - Average pace</option>
                    <option value="fast">Fast - Quick speaking</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI System Prompt */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-500" />
                  AI System Prompt
                </h2>
                <button
                  onClick={generateSystemPrompt}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Sparkles size={14} />
                  Auto-generate from profile
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                This prompt guides the AI's behavior and personality during conversations.
              </p>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                rows={8}
                placeholder="You are [name], a [tier] customer who..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            {/* Greeting Template */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-indigo-500" />
                Opening Greeting
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                The first thing the AI says when the call starts.
              </p>
              <textarea
                value={formData.greetingTemplate}
                onChange={(e) => handleChange('greetingTemplate', e.target.value)}
                rows={3}
                placeholder="Hello, I'm calling about..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Template Option */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTemplate}
                  onChange={(e) => handleChange('isTemplate', e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Save as Template</span>
                  <p className="text-sm text-gray-500">Allow this persona to be used as a template for creating new personas</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Contract Tab */}
        {activeTab === 'contract' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award size={20} className="text-indigo-500" />
                Contract Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={ci.plan}
                    onChange={(e) => handleContractChange('plan', e.target.value)}
                    placeholder="Premium Plus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Value ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="number"
                      value={ci.monthlyValue}
                      onChange={(e) => handleContractChange('monthlyValue', parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={ci.renewalDate}
                    onChange={(e) => handleContractChange('renewalDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={ci.status}
                    onChange={(e) => handleContractChange('status', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Value ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    value={formData.accountValue}
                    onChange={(e) => handleChange('accountValue', parseInt(e.target.value) || 0)}
                    placeholder="Lifetime customer value"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(PersonaBuilder);
