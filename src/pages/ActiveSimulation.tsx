import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { apiClient } from '../lib/api-client';
import { useLiveKitStore, showError, showSuccess } from '../stores';
import {
  LiveKitCallControls,
  LiveKitTranscript,
  LiveKitConnectionStatus,
  LiveKitWelcomeScreen,
} from '../components/livekit';
import { formatDuration } from '../lib/livekit';
import { 
  Phone, PhoneOff, ArrowLeft, User, Clock, Calendar, 
  FileText, History, TrendingUp, AlertCircle, CheckCircle, 
  Lightbulb, MessageSquare, Smile, Frown, Meh, Zap, Shield, 
  ChevronRight, Volume2, MoreHorizontal, Loader2, Wifi, WifiOff
} from 'lucide-react';

// ============================================
// MOCK DATA (for customer and AI analysis)
// ============================================

const MOCK_CUSTOMER = {
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
};

const MOCK_CALL_HISTORY = [
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
];

const MOCK_AI_SUGGESTIONS = [
  {
    id: 1,
    type: 'suggestion',
    priority: 'high',
    message: 'Customer seems frustrated about recurring billing issues. Acknowledge previous calls and offer concrete solution.',
    action: 'Reference call history and offer account credit.',
  },
  {
    id: 2,
    type: 'insight',
    priority: 'medium',
    message: 'Gold tier customer - eligible for premium support and waived fees.',
    action: 'Offer fee waiver as goodwill gesture.',
  },
  {
    id: 3,
    type: 'warning',
    priority: 'high',
    message: 'Escalation risk detected. Customer mentioned "cancel service" twice.',
    action: 'Use retention script and offer loyalty discount.',
  },
];

// ============================================
// COMPONENT: Customer Data Panel (Left)
// ============================================

const CustomerDataPanel = memo(() => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{MOCK_CUSTOMER.name}</h3>
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 text-[10px] font-bold uppercase rounded-full',
                'bg-amber-100 text-amber-700'
              )}>
                {MOCK_CUSTOMER.tier} Tier
              </span>
              <span className="text-xs text-gray-500">{MOCK_CUSTOMER.id}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Call History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Contact Info */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-gray-700">{MOCK_CUSTOMER.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare size={14} className="text-gray-400" />
                  <span className="text-gray-700">{MOCK_CUSTOMER.email}</span>
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contract</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium text-gray-900">{MOCK_CUSTOMER.contract.plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly</span>
                  <span className="font-medium text-gray-900">${MOCK_CUSTOMER.contract.monthlyValue}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Renewal</span>
                  <span className="font-medium text-gray-900">{MOCK_CUSTOMER.contract.renewalDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                    {MOCK_CUSTOMER.contract.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-indigo-700">{MOCK_CUSTOMER.totalCalls}</div>
                  <div className="text-[10px] text-indigo-600">Total Calls</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-indigo-700">{MOCK_CUSTOMER.satisfaction}</div>
                  <div className="text-[10px] text-indigo-600">CSAT Score</div>
                </div>
              </div>
            </div>

            {/* Account Since */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar size={14} />
              <span>Customer since {MOCK_CUSTOMER.accountSince}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_CALL_HISTORY.map((call) => (
              <div key={call.id} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{call.date}</span>
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded-full',
                    call.outcome === 'Resolved' && 'bg-emerald-100 text-emerald-700',
                    call.outcome === 'Escalated' && 'bg-rose-100 text-rose-700',
                    call.outcome === 'Pending' && 'bg-amber-100 text-amber-700',
                  )}>
                    {call.outcome}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">{call.type}</div>
                <div className="text-xs text-gray-500 mb-2">{call.summary}</div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {call.duration}
                  </span>
                  <span className={cn(
                    'flex items-center gap-1',
                    call.sentiment === 'positive' && 'text-emerald-500',
                    call.sentiment === 'negative' && 'text-rose-500',
                    call.sentiment === 'neutral' && 'text-gray-400',
                  )}>
                    Sentiment: {call.sentiment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
CustomerDataPanel.displayName = 'CustomerDataPanel';

// ============================================
// COMPONENT: AI Analysis Panel (Right)
// ============================================

const AIAnalysisPanel = memo(() => {
  const [currentMood, setCurrentMood] = useState('frustrated');
  const moodOptions = ['angry', 'frustrated', 'neutral', 'satisfied', 'happy'];

  // Cycle through moods for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMood(prev => {
        const idx = moodOptions.indexOf(prev);
        return moodOptions[(idx + 1) % moodOptions.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'angry': return <Frown size={24} className="text-rose-500" />;
      case 'frustrated': return <Meh size={24} className="text-amber-500" />;
      case 'neutral': return <Meh size={24} className="text-gray-400" />;
      case 'satisfied': return <Smile size={24} className="text-emerald-400" />;
      case 'happy': return <Smile size={24} className="text-emerald-500" />;
      default: return <Meh size={24} className="text-gray-400" />;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'angry': return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'frustrated': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'neutral': return 'bg-gray-50 border-gray-200 text-gray-700';
      case 'satisfied': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'happy': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Axtra Copilot</h3>
        </div>
        <p className="text-xs text-gray-500">Real-time AI guidance</p>
      </div>

      {/* Emotion Monitor */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Customer Emotion</h4>
        <div className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all', getMoodColor(currentMood))}>
          {getMoodIcon(currentMood)}
          <div>
            <div className="font-semibold capitalize">{currentMood}</div>
            <div className="text-xs opacity-75">
              {currentMood === 'angry' && 'Immediate de-escalation needed'}
              {currentMood === 'frustrated' && 'Show empathy and offer solutions'}
              {currentMood === 'neutral' && 'Maintain professional tone'}
              {currentMood === 'satisfied' && 'Good progress, keep it up'}
              {currentMood === 'happy' && 'Positive engagement, opportunity for upsell'}
            </div>
          </div>
        </div>

        {/* Emotion Timeline */}
        <div className="mt-3 flex items-center gap-1">
          {moodOptions.map((mood) => (
            <div
              key={mood}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-all',
                mood === currentMood ? 'bg-indigo-500' : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Live Suggestions</h4>
        
        {MOCK_AI_SUGGESTIONS.map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              'p-3 rounded-xl border transition-all hover:shadow-md',
              suggestion.priority === 'high' && 'bg-rose-50 border-rose-200',
              suggestion.priority === 'medium' && 'bg-amber-50 border-amber-200',
              suggestion.type === 'insight' && 'bg-indigo-50 border-indigo-200',
            )}
          >
            <div className="flex items-start gap-2 mb-2">
              {suggestion.type === 'suggestion' && <Lightbulb size={16} className="text-amber-500 mt-0.5" />}
              {suggestion.type === 'warning' && <AlertCircle size={16} className="text-rose-500 mt-0.5" />}
              {suggestion.type === 'insight' && <CheckCircle size={16} className="text-indigo-500 mt-0.5" />}
              <div>
                <div className="text-sm font-medium text-gray-900">{suggestion.message}</div>
              </div>
            </div>
            <div className={cn(
              'text-xs ml-6 p-2 rounded-lg',
              suggestion.priority === 'high' && 'bg-rose-100 text-rose-700',
              suggestion.priority === 'medium' && 'bg-amber-100 text-amber-700',
              suggestion.type === 'insight' && 'bg-indigo-100 text-indigo-700',
            )}>
              <strong>Action:</strong> {suggestion.action}
            </div>
          </div>
        ))}

        {/* Real-time Script Guide */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Response</h4>
          <p className="text-sm text-gray-700 italic">
            "I understand your frustration, Sarah. As a valued Gold member, I'm going to apply a courtesy credit to your account and ensure this billing issue is permanently resolved. Let me process that for you now."
          </p>
          <button className="mt-2 text-xs text-indigo-600 font-medium hover:text-indigo-700">
            Copy to clipboard
          </button>
        </div>

        {/* Knowledge Base Quick Links */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Relevant Articles</h4>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <span>Billing Dispute Resolution</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <span>Gold Tier Benefits</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <span>Retention Strategies</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
AIAnalysisPanel.displayName = 'AIAnalysisPanel';

// ============================================
// COMPONENT: Live Call Panel (Center)
// ============================================

interface LiveCallPanelProps {
  scenarioId: string;
  scenario: Scenario;
}

const LiveCallPanel = memo<LiveCallPanelProps>(({ scenarioId, scenario }) => {
  const {
    isConnected,
    isConnecting,
    isMuted,
    isPaused,
    callDuration,
    connectionError,
    canPlaybackAudio,
    transcripts,
    connect,
    disconnect,
    toggleMute,
    togglePause,
    startAudio,
  } = useLiveKitStore();

  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState<'welcome' | 'connecting' | 'connected'>('welcome');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Handle start call
  const handleStartCall = useCallback(async () => {
    try {
      setStep('connecting');
      await connect(scenarioId);
      setStep('connected');
      setShowWelcome(false);
      showSuccess('Connected', 'Voice call started. The AI agent will join shortly.');
    } catch (err) {
      console.error('Failed to connect:', err);
      setStep('welcome');
      showError('Connection failed', err instanceof Error ? err.message : 'Failed to connect to voice server');
    }
  }, [scenarioId, connect]);

  // Handle enable audio (browser requires user gesture)
  const handleEnableAudio = useCallback(async () => {
    await startAudio();
  }, [startAudio]);

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect();
    setShowWelcome(true);
    setStep('welcome');
    showSuccess('Call ended', 'Your practice session has been saved.');
  }, [disconnect]);

  // Show welcome screen before call starts
  if (showWelcome || (!isConnected && !isConnecting)) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-r border-gray-200">
        <LiveKitWelcomeScreen
          scenarioTitle={scenario.title}
          personaName={scenario.persona}
          difficulty={scenario.difficulty}
          isConnecting={isConnecting}
          connectionError={connectionError}
          needsAudioPermission={isConnected && !canPlaybackAudio}
          onStartCall={handleStartCall}
          onEnableAudio={handleEnableAudio}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-r border-gray-200">
      {/* Call Header */}
      <div className="p-4 border-b border-gray-200">
        <LiveKitConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
          callDuration={callDuration}
        />

        {/* Error message */}
        {connectionError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
            <WifiOff size={16} className="text-rose-500" />
            <span className="text-sm text-rose-700">{connectionError}</span>
          </div>
        )}

        {/* Call Controls */}
        <div className="mt-4">
          <LiveKitCallControls
            isMuted={isMuted}
            isPaused={isPaused}
            isConnecting={isConnecting}
            onToggleMute={toggleMute}
            onTogglePause={togglePause}
            onEndCall={handleEndCall}
          />
        </div>
      </div>

      {/* Transcription */}
      <LiveKitTranscript
        transcripts={transcripts}
        isCallActive={isConnected}
        isPaused={isPaused}
      />

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 whitespace-nowrap">
            Transfer to Billing
          </button>
          <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 whitespace-nowrap">
            Escalate
          </button>
          <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 whitespace-nowrap">
            Schedule Callback
          </button>
          <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 whitespace-nowrap">
            Send Summary
          </button>
        </div>
      </div>
    </div>
  );
});
LiveCallPanel.displayName = 'LiveCallPanel';

// ============================================
// MAIN PAGE COMPONENT
// ============================================

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category: string;
  persona: string;
}

interface ActiveSimulationProps {
  className?: string;
}

const ActiveSimulation: React.FC<ActiveSimulationProps> = ({ className }) => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch scenario from API
  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<{
          success: boolean;
          data: { scenario: Scenario };
        }>(`/scenarios/${scenarioId}`);
        
        setScenario(response.data.scenario);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load scenario';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScenario();
  }, [scenarioId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading scenario...</span>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error ? 'Error loading scenario' : 'Scenario not found'}
          </h2>
          <p className="text-gray-500 mb-4">{error || 'The scenario you requested does not exist.'}</p>
          <button
            onClick={() => navigate('/simulations')}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Back to Simulations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen flex flex-col bg-gray-100', className)}>
      {/* Top Navigation Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/simulations')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Exit Practice</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-emerald-500" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{scenario.title}</h1>
              <p className="text-xs text-gray-500">Live Training • {scenario.persona}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            'px-2 py-1 text-[10px] font-bold uppercase rounded border',
            scenario.difficulty === 'Easy' && 'bg-emerald-50 text-emerald-600 border-emerald-100',
            scenario.difficulty === 'Medium' && 'bg-amber-50 text-amber-600 border-amber-100',
            scenario.difficulty === 'Hard' && 'bg-rose-50 text-rose-600 border-rose-100',
          )}>
            {scenario.difficulty}
          </span>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section 1: Customer Data (Left Panel - 280px) */}
        <div className="w-[280px] shrink-0 border-r border-gray-200">
          <CustomerDataPanel />
        </div>

        {/* Section 2: Live Call Panel (Center Panel - Flexible) */}
        <div className="flex-1 min-w-0">
          <LiveCallPanel scenarioId={scenarioId!} scenario={scenario} />
        </div>

        {/* Section 3: Axtra Copilot (Right Panel - 320px) */}
        <div className="w-[320px] shrink-0 border-l border-gray-200">
          <AIAnalysisPanel />
        </div>
      </div>
    </div>
  );
};

export default memo(ActiveSimulation);
