/**
 * Realtime Copilot - Settings & Configuration
 * Enable/disable AI suggestions and configure features
 */

import { memo, useState } from 'react';
import { cn } from '../utils/classnames';
import { 
  Zap, ToggleRight, ToggleLeft, Brain, MessageSquare, 
  Target, BookOpen, Tag, Shield, Settings2, ChevronRight,
  CheckCircle2, AlertCircle, Info, BarChart3, Users,
  Headphones, Sparkles, Wand2, SlidersHorizontal,
  RefreshCw, Save, PlayCircle, PauseCircle
} from 'lucide-react';

interface CopilotPageProps {
  className?: string;
}

// Feature toggle type
interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
  category: 'suggestions' | 'search' | 'analysis' | 'automation';
  requires?: string[];
}

const CopilotPage: React.FC<CopilotPageProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'cards' | 'advanced'>('features');
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Feature toggles state
  const [features, setFeatures] = useState<FeatureToggle[]>([
    {
      id: 'emotion_analysis',
      name: 'Emotion Detection',
      description: 'Analyze customer emotion and suggest appropriate responses',
      enabled: true,
      icon: Brain,
      category: 'analysis',
    },
    {
      id: 'leverage_suggestions',
      name: 'Leverage & Benefits',
      description: 'Identify customer tier benefits and perks to offer',
      enabled: true,
      icon: Target,
      category: 'suggestions',
    },
    {
      id: 'strategy_guidance',
      name: 'Strategic Guidance',
      description: 'Detect churn risk and suggest escalation prevention strategies',
      enabled: true,
      icon: Shield,
      category: 'suggestions',
    },
    {
      id: 'personal_promotions',
      name: 'Personal Promotion Suggestions',
      description: 'Suggest targeted promotions based on customer tier and behavior',
      enabled: true,
      icon: Tag,
      category: 'suggestions',
      requires: ['leverage_suggestions'],
    },
    {
      id: 'knowledge_base_search',
      name: 'Knowledge Base Search',
      description: 'Automatically search and surface relevant articles during calls',
      enabled: true,
      icon: BookOpen,
      category: 'search',
    },
    {
      id: 'smart_responses',
      name: 'Smart Response Generation',
      description: 'Generate contextual response suggestions based on conversation',
      enabled: true,
      icon: MessageSquare,
      category: 'suggestions',
      requires: ['emotion_analysis'],
    },
    {
      id: 'escalation_detection',
      name: 'Escalation Detection',
      description: 'Monitor for escalation triggers and alert operator',
      enabled: true,
      icon: AlertCircle,
      category: 'analysis',
    },
    {
      id: 'auto_coaching',
      name: 'Auto-Coaching Mode',
      description: 'Provide proactive suggestions without waiting for triggers',
      enabled: false,
      icon: Sparkles,
      category: 'automation',
    },
  ]);

  // Card-specific settings
  const [cardSettings, setCardSettings] = useState({
    card1_emotion: {
      enabled: true,
      showConfidence: true,
      autoExpand: false,
    },
    card2_leverage: {
      enabled: true,
      showTierBadge: true,
      showBenefitsList: true,
    },
    card3_strategy: {
      enabled: true,
      showRiskMeter: true,
      showActionButtons: true,
    },
  });

  // Analysis trigger settings
  const [triggerSettings, setTriggerSettings] = useState({
    turnsThreshold: 3,
    charThreshold: 300,
    timeThreshold: 30,
    autoAnalyze: true,
  });

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const getEnabledCount = (category: string) => {
    return features.filter(f => f.category === category && f.enabled).length;
  };

  return (
    <div className={cn('max-w-[1400px] mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Realtime Copilot</h1>
            <p className="text-sm text-gray-500 mt-2">
              Configure AI-powered real-time coaching during customer calls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">System Active</span>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Features</span>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {features.filter(f => f.enabled).length} <span className="text-sm font-normal text-gray-500">/ {features.length}</span>
          </div>
          <div className="text-xs text-emerald-600 mt-1">{getEnabledCount('suggestions')} suggestion features active</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Coaching Sessions</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Headphones size={16} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">1,247</div>
          <div className="text-xs text-gray-500 mt-1">This month</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Avg. Response Time</span>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <RefreshCw size={16} className="text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">2.4s</div>
          <div className="text-xs text-emerald-600 mt-1">-0.3s from last week</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Operator Satisfaction</span>
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">94%</div>
          <div className="text-xs text-emerald-600 mt-1">+5% this month</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('features')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'features' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Settings2 size={16} />
          Features & Suggestions
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'cards' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <LayoutIcon size={16} />
          Coaching Cards
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'advanced' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <SlidersHorizontal size={16} />
          Advanced Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Category: Suggestions */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <MessageSquare size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Suggestion Features</h3>
                <p className="text-sm text-gray-500">AI-generated suggestions to help operators during calls</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {features.filter(f => f.category === 'suggestions').map((feature) => (
                <FeatureToggleCard 
                  key={feature.id} 
                  feature={feature} 
                  onToggle={() => toggleFeature(feature.id)} 
                />
              ))}
            </div>
          </div>

          {/* Category: Search & Knowledge */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Search & Knowledge</h3>
                <p className="text-sm text-gray-500">Knowledge base integration and search capabilities</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {features.filter(f => f.category === 'search').map((feature) => (
                <FeatureToggleCard 
                  key={feature.id} 
                  feature={feature} 
                  onToggle={() => toggleFeature(feature.id)} 
                />
              ))}
            </div>
          </div>

          {/* Category: Analysis */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Brain size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analysis Features</h3>
                <p className="text-sm text-gray-500">Real-time analysis and detection capabilities</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {features.filter(f => f.category === 'analysis').map((feature) => (
                <FeatureToggleCard 
                  key={feature.id} 
                  feature={feature} 
                  onToggle={() => toggleFeature(feature.id)} 
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Card 1: Emotion */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <Brain size={20} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Card 1: Emotion</h3>
                  <p className="text-xs text-gray-500">Emotional intelligence analysis</p>
                </div>
              </div>
              <button
                onClick={() => setCardSettings(prev => ({
                  ...prev,
                  card1_emotion: { ...prev.card1_emotion, enabled: !prev.card1_emotion.enabled }
                }))}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  cardSettings.card1_emotion.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                )}
              >
                {cardSettings.card1_emotion.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card1_emotion.showConfidence}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card1_emotion: { ...prev.card1_emotion, showConfidence: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Show confidence score</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card1_emotion.autoExpand}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card1_emotion: { ...prev.card1_emotion, autoExpand: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Auto-expand on danger</span>
              </label>
            </div>
          </div>

          {/* Card 2: Leverage */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Target size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Card 2: Leverage</h3>
                  <p className="text-xs text-gray-500">Benefits & perks identification</p>
                </div>
              </div>
              <button
                onClick={() => setCardSettings(prev => ({
                  ...prev,
                  card2_leverage: { ...prev.card2_leverage, enabled: !prev.card2_leverage.enabled }
                }))}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  cardSettings.card2_leverage.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                )}
              >
                {cardSettings.card2_leverage.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card2_leverage.showTierBadge}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card2_leverage: { ...prev.card2_leverage, showTierBadge: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Show customer tier badge</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card2_leverage.showBenefitsList}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card2_leverage: { ...prev.card2_leverage, showBenefitsList: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Show all available benefits</span>
              </label>
            </div>
          </div>

          {/* Card 3: Strategy */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Card 3: Strategy</h3>
                  <p className="text-xs text-gray-500">Risk detection & next actions</p>
                </div>
              </div>
              <button
                onClick={() => setCardSettings(prev => ({
                  ...prev,
                  card3_strategy: { ...prev.card3_strategy, enabled: !prev.card3_strategy.enabled }
                }))}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  cardSettings.card3_strategy.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                )}
              >
                {cardSettings.card3_strategy.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card3_strategy.showRiskMeter}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card3_strategy: { ...prev.card3_strategy, showRiskMeter: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Show churn risk meter</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={cardSettings.card3_strategy.showActionButtons}
                  onChange={(e) => setCardSettings(prev => ({
                    ...prev,
                    card3_strategy: { ...prev.card3_strategy, showActionButtons: e.target.checked }
                  }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Show quick action buttons</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Analysis Triggers */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <RefreshCw size={20} className="text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analysis Trigger Settings</h3>
                <p className="text-sm text-gray-500">Configure when Copilot analyzes the conversation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turn Threshold
                </label>
                <input
                  type="number"
                  value={triggerSettings.turnsThreshold}
                  onChange={(e) => setTriggerSettings(prev => ({ ...prev, turnsThreshold: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Analyze every N turns</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Character Threshold
                </label>
                <input
                  type="number"
                  value={triggerSettings.charThreshold}
                  onChange={(e) => setTriggerSettings(prev => ({ ...prev, charThreshold: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Or after N characters</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Threshold (seconds)
                </label>
                <input
                  type="number"
                  value={triggerSettings.timeThreshold}
                  onChange={(e) => setTriggerSettings(prev => ({ ...prev, timeThreshold: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Or after N seconds</p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} className="text-indigo-600" />
                <h4 className="font-medium text-indigo-900">How It Works</h4>
              </div>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Copilot monitors conversation in real-time
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Analysis triggers based on your settings above
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  AI generates contextual suggestions
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Operator can accept, modify, or ignore suggestions
                </li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-amber-600" />
                <h4 className="font-medium text-amber-900">Important Notes</h4>
              </div>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Personal promotions require Leverage card to be enabled
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Knowledge base search requires articles to be indexed
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-0.5 shrink-0" />
                  Changes take effect immediately for new calls
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for feature toggle cards
const FeatureToggleCard = ({ 
  feature, 
  onToggle 
}: { 
  feature: FeatureToggle; 
  onToggle: () => void;
}) => {
  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all',
      feature.enabled 
        ? 'bg-white border-gray-200' 
        : 'bg-gray-50 border-gray-200 opacity-75'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            feature.enabled ? 'bg-indigo-50' : 'bg-gray-100'
          )}>
            <feature.icon size={20} className={feature.enabled ? 'text-indigo-600' : 'text-gray-400'} />
          </div>
          <div>
            <h4 className={cn(
              'font-medium',
              feature.enabled ? 'text-gray-900' : 'text-gray-500'
            )}>
              {feature.name}
            </h4>
            <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
            {feature.requires && (
              <p className="text-xs text-amber-600 mt-2">
                Requires: {feature.requires.join(', ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'p-1 rounded-lg transition-colors',
            feature.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'
          )}
        >
          {feature.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </button>
      </div>
    </div>
  );
};

// Layout icon for tabs
const LayoutIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export default memo(CopilotPage);
