/**
 * Active Simulation Page
 * 3-panel layout: Customer Data | Live Call | AXTRA Copilot
 */

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { apiClient } from '../lib/api-client';
import { useLiveKitStore, showError, showSuccess } from '../stores';
import { usePersonaStore, type Persona, type PersonaContextOverride } from '../stores';
import { useSimulationStore } from '../stores';
import {
  LiveKitCallControls,
  LiveKitTranscript,
  LiveKitConnectionStatus,
  LiveKitWelcomeScreen,
  AxtraCopilot,
  CallSummaryModal,
} from '../components/livekit';
import { formatDuration } from '../lib/livekit';
import { useTranscriptions } from '@livekit/components-react';
import type { Room } from 'livekit-client';
import { 
  ArrowLeft, User, Clock, Calendar, 
  ChevronRight, MoreHorizontal, Loader2, Wifi, WifiOff
} from 'lucide-react';

// ============================================
// COMPONENT: Customer Data Panel (Left)
// ============================================

interface CustomerDataPanelProps {
  persona: Persona;
  contextOverride?: PersonaContextOverride | null;
}

const CustomerDataPanel = memo<CustomerDataPanelProps>(({ persona, contextOverride }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'context'>('overview');

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Gold': 'bg-amber-100 text-amber-700',
      'Silver': 'bg-gray-100 text-gray-700',
      'Bronze': 'bg-orange-100 text-orange-700',
      'Platinum': 'bg-indigo-100 text-indigo-700',
    };
    return colors[tier] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-emerald-100 text-emerald-700',
      'Suspended': 'bg-amber-100 text-amber-700',
      'Cancelled': 'bg-rose-100 text-rose-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User size={24} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{persona.name}</h3>
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 text-[10px] font-bold uppercase rounded-full',
                getTierColor(persona.tierColor)
              )}>
                {persona.tier} Tier
              </span>
              <span className="text-xs text-gray-500">{persona.id}</span>
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
            History
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'context' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Context
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
                  <span className="text-gray-400">📞</span>
                  <span className="text-gray-700">{persona.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">✉️</span>
                  <span className="text-gray-700">{persona.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">💬</span>
                  <span className="text-gray-700">{persona.behaviorProfile?.communicationStyle || 'Phone preferred'}</span>
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contract</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium text-gray-900">{persona.contractInfo?.plan || 'Standard'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly</span>
                  <span className="font-medium text-gray-900">${persona.contractInfo?.monthlyValue || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Renewal</span>
                  <span className="font-medium text-gray-900">{persona.contractInfo?.renewalDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded-full',
                    getStatusColor(persona.contractInfo?.status || 'Active')
                  )}>
                    {persona.contractInfo?.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-indigo-700">{persona.totalCalls}</div>
                  <div className="text-[10px] text-indigo-600">Total Calls</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-indigo-700">{persona.satisfaction}</div>
                  <div className="text-[10px] text-indigo-600">CSAT Score</div>
                </div>
              </div>
            </div>

            {/* Account Since */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar size={14} />
              <span>Customer since {persona.accountSince}</span>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-3">
            {(persona.callHistory || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No call history available</p>
              </div>
            ) : (
              (persona.callHistory || []).map((call) => (
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
            ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Issue Context */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Issue</h4>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                <div className="text-sm font-medium text-rose-900 mb-1">{contextOverride?.specificIssue || 'Support inquiry'}</div>
                <div className="text-xs text-rose-700">Customer requires assistance with their inquiry</div>
              </div>
            </div>

            {/* Expected Outcome */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Outcome</h4>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <div className="text-xs text-emerald-800">{contextOverride?.expectedOutcome || 'Resolution of customer inquiry'}</div>
              </div>
            </div>

            {/* Previous Attempts */}
            {(contextOverride?.previousAttempts || 0) > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Previous Attempts</h4>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="text-xs text-amber-800">
                    Customer has contacted support {contextOverride?.previousAttempts} time{(contextOverride?.previousAttempts || 0) > 1 ? 's' : ''} about this issue
                  </div>
                </div>
              </div>
            )}

            {/* AI Behavior */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Behavior</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Initial Mood</span>
                  <span className="font-medium text-gray-900 capitalize">{contextOverride?.initialMood || persona.behaviorProfile?.initialMood || 'neutral'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Patience Level</span>
                  <span className="font-medium text-gray-900 capitalize">{persona.behaviorProfile?.patienceLevel || 'medium'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cooperation</span>
                  <span className="font-medium text-gray-900 capitalize">{persona.behaviorProfile?.cooperationLevel || 'medium'}</span>
                </div>
              </div>
            </div>

            {/* Escalation Triggers */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Escalation Triggers</h4>
              <div className="flex flex-wrap gap-1.5">
                {(persona.behaviorProfile?.escalationTriggers || []).map((trigger, idx) => (
                  <span key={idx} className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">
                    {trigger}
                  </span>
                ))}
              </div>
            </div>

            {/* De-escalation Triggers */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">De-escalation Triggers</h4>
              <div className="flex flex-wrap gap-1.5">
                {(persona.behaviorProfile?.deescalationTriggers || []).map((trigger, idx) => (
                  <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
CustomerDataPanel.displayName = 'CustomerDataPanel';

// ============================================
// COMPONENT: Live Call Panel (Center)
// ============================================

interface LiveCallPanelProps {
  scenarioId: string;
  scenario: Scenario;
}

const LiveCallPanel = memo<LiveCallPanelProps>(({ scenarioId, scenario }) => {
  const {
    room,
    isConnected,
    isConnecting,
    isMuted,
    isPaused,
    callDuration,
    connectionError,
    canPlaybackAudio,
    transcripts,
    coachingHistory,
    connect,
    disconnect,
    endCallAndSave,
    toggleMute,
    togglePause,
    startAudio,
    resetState,
  } = useLiveKitStore();
  
  const { startSimulation } = useSimulationStore();

  const [showWelcome, setShowWelcome] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    session: any;
    transcripts: any[];
    coachingHistory: any[];
    summary: any;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Handle start call with agent dispatch
  const handleStartCall = useCallback(async () => {
    setIsStarting(true);
    
    try {
      // 1. Start simulation - this dispatches the AI agent
      const simData = await startSimulation(scenarioId);
      
      if (!simData) {
        throw new Error('Failed to start simulation');
      }
      
      console.log('[Simulation] Started with dispatch:', simData.dispatchId);
      console.log('[Simulation] AI Agent:', simData.agentName);
      console.log('[Simulation] Persona:', simData.persona.name);
      
      // 2. Connect to LiveKit room with the token from dispatch
      await connect(scenarioId, {
        token: simData.token,
        url: simData.url,
        roomName: simData.roomName,
        callSessionId: simData.callSessionId,
      });
      
      setShowWelcome(false);
      showSuccess(
        'Connected', 
        `Voice call started with ${simData.persona.name}. The AI agent will join shortly.`
      );
    } catch (err) {
      console.error('Failed to start simulation:', err);
      showError(
        'Connection failed', 
        err instanceof Error ? err.message : 'Failed to start voice simulation'
      );
    } finally {
      setIsStarting(false);
    }
  }, [scenarioId, connect, startSimulation]);

  // Handle enable audio (browser requires user gesture)
  const handleEnableAudio = useCallback(async () => {
    await startAudio();
  }, [startAudio]);

  // Handle end call with summary
  const handleEndCall = useCallback(async () => {
    setIsSaving(true);
    
    const result = await endCallAndSave();
    
    if (result) {
      setSummaryData(result);
      setShowSummary(true);
      showSuccess('Call completed', 'Your practice session has been saved.');
    } else {
      showError('Error', 'Failed to save call session');
      disconnect();
      setShowWelcome(true);
    }
    
    setIsSaving(false);
  }, [endCallAndSave, disconnect]);

  // Handle close summary modal
  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
    setSummaryData(null);
    setShowWelcome(true);
    resetState();
  }, [resetState]);

  // Handle retry - restart same scenario
  const handleRetry = useCallback(() => {
    setShowSummary(false);
    setSummaryData(null);
    setShowWelcome(true);
    resetState();
  }, [resetState]);

  // Show summary modal
  if (showSummary) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-r border-gray-200">
        <CallSummaryModal
          isOpen={showSummary}
          onClose={handleCloseSummary}
          onRetry={handleRetry}
          session={summaryData?.session || null}
          transcripts={summaryData?.transcripts || []}
          coachingHistory={summaryData?.coachingHistory || []}
          summary={summaryData?.summary || null}
          isLoading={isSaving}
        />
      </div>
    );
  }

  // Show processing overlay when ending call
  if (isSaving) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-r border-gray-200 relative">
        {/* Processing Overlay */}
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col items-center max-w-md text-center px-6">
            {/* Animated Spinner */}
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-full opacity-20 animate-pulse" />
              </div>
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Your Call
            </h3>
            
            {/* Description */}
            <p className="text-sm text-gray-500 mb-6">
              We're analyzing your conversation and generating your personalized summary. This will only take a moment...
            </p>
            
            {/* Progress Steps */}
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-emerald-600 font-medium">Call ended successfully</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                </div>
                <span className="text-indigo-600 font-medium">Analyzing conversation...</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>
                <span className="text-gray-400">Generating summary</span>
              </div>
            </div>
            
            {/* Fun Fact / Tip */}
            <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">💡 Did you know?</span> Reviewing your call summaries helps identify patterns and improve your customer service skills over time.
              </p>
            </div>
          </div>
        </div>
        
        {/* Background content (dimmed) */}
        <div className="opacity-20 pointer-events-none">
          <LiveKitConnectionStatus
            isConnected={false}
            isConnecting={false}
            callDuration={callDuration}
            coachingCount={coachingHistory.length}
          />
          <div className="p-4">
            <LiveKitCallControls
              isMuted={isMuted}
              isPaused={isPaused}
              isConnecting={false}
              onToggleMute={toggleMute}
              onTogglePause={togglePause}
              onEndCall={handleEndCall}
            />
          </div>
          <LiveKitTranscript
            transcripts={transcripts}
            isCallActive={false}
            isPaused={false}
          />
        </div>
      </div>
    );
  }

  // Show welcome screen before call starts
  const isLoading = isStarting || isConnecting;
  
  if (showWelcome || (!isConnected && !isConnecting)) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-r border-gray-200">
        <LiveKitWelcomeScreen
          scenarioTitle={scenario.title}
          personaName={scenario.persona}
          difficulty={scenario.difficulty}
          isConnecting={isLoading}
          isStarting={isStarting}
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
      {/* Transcription Sync - only when room exists */}
      {room && <TranscriptionSync room={room} callDuration={callDuration} />}
      
      {/* Call Header */}
      <div className="p-4 border-b border-gray-200">
        <LiveKitConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
          callDuration={callDuration}
          coachingCount={coachingHistory.length}
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
// COMPONENT: Transcription Sync
// ============================================

interface TranscriptionSyncProps {
  room: Room | null;
  callDuration: number;
}

const TranscriptionSync = memo<TranscriptionSyncProps>(({ room, callDuration }) => {
  const { transcripts, addTranscript, updateTranscript } = useLiveKitStore();
  
  const livekitTranscriptions = useTranscriptions(room ? { room } : undefined);
  const segmentMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    segmentMap.current.clear();
  }, [room]);

  useEffect(() => {
    if (!livekitTranscriptions?.length || !room) return;
    
    const localIdentity = room.localParticipant.identity;
    
    livekitTranscriptions.forEach((transcription) => {
      const segmentId = transcription.streamInfo?.attributes?.['lk.segment_id'] || 
                        transcription.streamInfo?.id;
      const text = transcription.text || '';
      
      if (!segmentId) return;
      
      const participantIdentity = transcription.participantInfo?.identity;
      const isLocal = participantIdentity === localIdentity;
      const speaker: 'customer' | 'operator' = isLocal ? 'operator' : 'customer';
      
      const existingIndex = segmentMap.current.get(segmentId);
      
      if (existingIndex !== undefined) {
        updateTranscript(existingIndex, text);
      } else {
        const newIndex = transcripts.length;
        segmentMap.current.set(segmentId, newIndex);
        
        addTranscript({
          speaker,
          text,
          timestamp: formatDuration(callDuration),
        });
      }
    });
  }, [livekitTranscriptions, room, callDuration, transcripts.length, addTranscript, updateTranscript]);

  return null;
});
TranscriptionSync.displayName = 'TranscriptionSync';

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
  const { fetchPrimaryPersonaForScenario } = usePersonaStore();
  
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [contextOverride, setContextOverride] = useState<PersonaContextOverride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        const scenarioData = response.data.scenario;
        setScenario(scenarioData);
        
        // Get persona data for this scenario from API
        const personaData = await fetchPrimaryPersonaForScenario(scenarioId);
        if (personaData) {
          setPersona(personaData);
          setContextOverride(personaData.contextOverride || null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load scenario';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScenario();
  }, [scenarioId, fetchPrimaryPersonaForScenario]);

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
          {persona && <CustomerDataPanel persona={persona} contextOverride={contextOverride} />}
        </div>

        {/* Section 2: Live Call Panel (Center Panel - Flexible) */}
        <div className="flex-1 min-w-0">
          <LiveCallPanel scenarioId={scenarioId!} scenario={scenario} />
        </div>

        {/* Section 3: AXTRA Copilot (Right Panel - 320px) */}
        <div className="w-[320px] shrink-0 border-l border-gray-200">
          <AxtraCopilot />
        </div>
      </div>
    </div>
  );
};

export default memo(ActiveSimulation);
