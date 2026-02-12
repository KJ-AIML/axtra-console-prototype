/**
 * Recording Detail Page
 * View full recording with transcript, coaching history, and summary
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Clock,
  MessageSquare,
  Star,
  Calendar,
  Download,
  Share2,
  Loader2,
  AlertCircle,
  FileText,
  Heart,
  Scale,
  Target,
  Headphones,
  Volume2,
  Mic,
  Bot,
  User,
} from 'lucide-react';
import { useRecordingsStore } from '../stores';
import Button from '../components/ui/Button';
import { cn } from '../utils/classnames';
import type { CoachingCard, TranscriptEntry } from '../lib/api-types';

type AudioChannel = 'both' | 'operator' | 'agent';

const RecordingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'coaching'>('overview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioChannel, setAudioChannel] = useState<AudioChannel>('both');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string>('');
  const [agentAudioUrl, setAgentAudioUrl] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const agentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const audioObjectUrlRef = useRef('');
  const agentAudioUrlRef = useRef('');
  
  const {
    selectedRecording,
    isLoadingDetail,
    error,
    fetchRecordingDetail,
    selectRecording,
    clearError,
  } = useRecordingsStore();

  // Load recording detail
  useEffect(() => {
    if (id) {
      fetchRecordingDetail(id);
    }
    
    // Cleanup on unmount
    return () => {
      selectRecording(null);
    };
  }, [id]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string): string => {
    const colors: Record<string, string> = {
      happy: 'text-emerald-600 bg-emerald-50',
      satisfied: 'text-emerald-600 bg-emerald-50',
      neutral: 'text-gray-600 bg-gray-50',
      frustrated: 'text-amber-600 bg-amber-50',
      angry: 'text-rose-600 bg-rose-50',
    };
    return colors[sentiment] || 'text-gray-600 bg-gray-50';
  };

  // Fetch audio with auth and create object URL
  const [audioError, setAudioError] = useState<string>('');
  
  const loadAudio = useCallback(async () => {
    if (!id) return;
    
    setIsLoadingAudio(true);
    setAudioError('');
    try {
      // Revoke old URLs to prevent memory leak
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
      }
      if (agentAudioUrlRef.current) {
        URL.revokeObjectURL(agentAudioUrlRef.current);
      }
      
      const token = localStorage.getItem('axtra_token');
      
      // For 'both' mode, we need to load both tracks
      // For individual channels, load only that track
      const channelsToLoad = audioChannel === 'both' 
        ? ['operator', 'agent'] 
        : [audioChannel];
      
      // Load operator track (primary)
      if (channelsToLoad.includes('operator')) {
        const opResponse = await fetch(`/api/recordings/${id}/audio?channel=operator`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!opResponse.ok) {
          if (opResponse.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          } else if (opResponse.status === 404) {
            setAudioError('Operator recording file not found. It may have been deleted or failed to upload.');
            return;
          }
          throw new Error(`Failed to load operator audio: ${opResponse.status}`);
        }
        
        const opBlob = await opResponse.blob();
        const opUrl = URL.createObjectURL(opBlob);
        audioObjectUrlRef.current = opUrl;
        setAudioObjectUrl(opUrl);
      }
      
      // Load agent track (secondary, for 'both' mode or 'agent' mode)
      if (channelsToLoad.includes('agent')) {
        const agentResponse = await fetch(`/api/recordings/${id}/audio?channel=agent`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!agentResponse.ok) {
          if (agentResponse.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          } else if (agentResponse.status === 404) {
            // Agent track might not exist, that's ok
            console.warn('Agent recording file not found');
          } else {
            throw new Error(`Failed to load agent audio: ${agentResponse.status}`);
          }
        } else {
          const agentBlob = await agentResponse.blob();
          const agentUrl = URL.createObjectURL(agentBlob);
          agentAudioUrlRef.current = agentUrl;
          setAgentAudioUrl(agentUrl);
        }
      }
      
      // Auto-play if was playing (use ref to avoid dependency)
      if (isPlayingRef.current) {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
        if (agentAudioRef.current && audioChannel === 'both') {
          agentAudioRef.current.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to load audio:', error);
      setAudioError('Failed to load recording. Please try again.');
    } finally {
      setIsLoadingAudio(false);
    }
  }, [id, audioChannel]);

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      // Pause both tracks
      audioRef.current.pause();
      if (agentAudioRef.current && audioChannel === 'both') {
        agentAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      try {
        // Play operator track
        await audioRef.current.play();
        
        // Play agent track if in 'both' mode
        if (agentAudioRef.current && audioChannel === 'both') {
          // Sync the time
          agentAudioRef.current.currentTime = audioRef.current.currentTime;
          await agentAudioRef.current.play();
        }
        
        setIsPlaying(true);
      } catch (e) {
        console.error('Failed to play audio:', e);
      }
    }
  };

  // Handle channel change - reload audio with new channel
  useEffect(() => {
    if (selectedRecording) {
      loadAudio();
    }
    
    // Cleanup object URLs on unmount
    return () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
      }
      if (agentAudioUrlRef.current) {
        URL.revokeObjectURL(agentAudioUrlRef.current);
      }
    };
  }, [audioChannel, selectedRecording, loadAudio]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoadingAudio(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    // Also sync agent track if in 'both' mode
    if (agentAudioRef.current && audioChannel === 'both') {
      agentAudioRef.current.currentTime = time;
    }
  };

  // Note: Channel toggle is visual-only for now
  // Full stereo channel manipulation requires more complex Web Audio setup
  // The audio files play both channels (stereo) by default

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!selectedRecording && !isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Recording Not Found</h2>
        <p className="text-gray-600 mb-4">The recording you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/recordings')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Recordings
        </Button>
      </div>
    );
  }

  if (!selectedRecording) return null;

  const recording = selectedRecording;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/recordings')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Recordings
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {recording.scenario_title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                recording.scenario_difficulty === 'Easy' && 'bg-emerald-100 text-emerald-700',
                recording.scenario_difficulty === 'Medium' && 'bg-amber-100 text-amber-700',
                recording.scenario_difficulty === 'Hard' && 'bg-rose-100 text-rose-700',
              )}>
                {recording.scenario_difficulty}
              </span>
              <span>{recording.scenario_category}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(recording.started_at)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="text-sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="secondary" className="text-sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-rose-700">{error}</p>
          <button onClick={clearError} className="ml-auto text-rose-400 hover:text-rose-600">
            ×
          </button>
        </div>
      )}

      {/* Recording Info */}
      {selectedRecording?.has_recording && (
        <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-900">Voice Recording</h3>
            <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              {selectedRecording.recording_status === 'completed' ? 'Ready' : 'Processing'}
            </span>
          </div>
          
          {/* File Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded p-3 border border-indigo-100">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <User className="w-4 h-4" />
                <span>Operator (You)</span>
              </div>
              <div className="text-xs text-gray-400 font-mono truncate">
                {selectedRecording.operator_track_url?.split('/').pop() || 'operator.ogg'}
              </div>
            </div>
            <div className="bg-white rounded p-3 border border-indigo-100">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Bot className="w-4 h-4" />
                <span>Customer (AI)</span>
              </div>
              <div className="text-xs text-gray-400 font-mono truncate">
                {selectedRecording.agent_track_url?.split('/').pop() || 'agent.ogg'}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-indigo-600 mt-3">
            Format: OGG (Opus codec) • Two separate tracks • Use channel toggle below to listen
          </p>
        </div>
      )}

      {/* Audio Player */}
      {selectedRecording?.has_recording && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          {/* Hidden audio elements - only render when URLs are ready */}
          {audioObjectUrl && (
            <audio
              ref={audioRef}
              src={audioObjectUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => {
                setIsPlaying(false);
                // Also pause agent track if in 'both' mode
                if (agentAudioRef.current && audioChannel === 'both') {
                  agentAudioRef.current.pause();
                }
              }}
            />
          )}
          {agentAudioUrl && audioChannel === 'both' && (
            <audio
              ref={agentAudioRef}
              src={agentAudioUrl}
              onEnded={() => {
                // Sync play state - if one ends, consider both ended
                setIsPlaying(false);
              }}
            />
          )}

          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={isLoadingAudio}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                isPlaying
                  ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700',
                isLoadingAudio && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Progress Bar */}
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>{formatDuration(Math.floor(duration))}</span>
              </div>
            </div>

            {/* Channel Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAudioChannel('both')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                  audioChannel === 'both'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
                title="Listen to both channels"
              >
                <Headphones className="w-4 h-4" />
                Both
              </button>
              <button
                onClick={() => setAudioChannel('operator')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                  audioChannel === 'operator'
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
                title="Listen to operator only"
              >
                <User className="w-4 h-4" />
                You
              </button>
              <button
                onClick={() => setAudioChannel('agent')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                  audioChannel === 'agent'
                    ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
                title="Listen to customer/agent only"
              >
                <Bot className="w-4 h-4" />
                Customer
              </button>
            </div>
          </div>

          {/* Error Message */}
          {audioError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <p className="text-sm text-rose-700">{audioError}</p>
            </div>
          )}

          {/* File Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Playing:</strong> {audioChannel === 'operator' ? 'Operator (You)' : audioChannel === 'agent' ? 'Customer (AI)' : 'Both tracks (Operator + Customer)'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {audioChannel === 'both' 
                ? 'Both tracks are playing simultaneously. You can switch to individual channels to hear them separately.'
                : 'Switch to "Both" to hear operator and customer together.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Duration
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {formatDuration(recording.duration_seconds)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <MessageSquare className="w-4 h-4" />
            Exchanges
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {recording.total_turns}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Star className="w-4 h-4" />
            Score
          </div>
          <div className={cn('text-xl font-semibold', getScoreColor(recording.final_score || 0))}>
            {recording.final_score ?? '-'}/100
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Heart className="w-4 h-4" />
            Sentiment
          </div>
          <div className={cn(
            'text-sm font-medium px-2 py-1 rounded-full inline-block',
            getSentimentColor(recording.customer_sentiment)
          )}>
            {recording.customer_sentiment.charAt(0).toUpperCase() + recording.customer_sentiment.slice(1)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(['overview', 'transcript', 'coaching'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && recording.summary && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-indigo-900">AI Summary</h3>
              </div>
              <p className="text-indigo-800 leading-relaxed">
                {recording.summary.summary}
              </p>
            </div>

            {/* Key Points */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Key Points</h3>
              <ul className="space-y-2">
                {recording.summary.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-4">Strengths</h3>
                <ul className="space-y-2">
                  {recording.summary.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span className="text-emerald-800">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 rounded-lg p-6">
                <h3 className="font-semibold text-amber-900 mb-4">Areas for Improvement</h3>
                <ul className="space-y-2">
                  {recording.summary.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">→</span>
                      <span className="text-amber-800">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Scores */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Scores</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {recording.summary.customer_satisfaction}/5
                  </div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {recording.summary.coaching_effectiveness}/5
                  </div>
                  <div className="text-sm text-gray-600">Coaching Effectiveness</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1 capitalize">
                    {recording.summary.resolution_status}
                  </div>
                  <div className="text-sm text-gray-600">Resolution Status</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Conversation Transcript</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {recording.transcripts.length} messages
                </span>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-4 space-y-4">
              {recording.transcripts.map((entry, i) => (
                <TranscriptMessage key={i} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Coaching Tab */}
        {activeTab === 'coaching' && (
          <div className="space-y-4">
            {recording.coaching.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No coaching data available for this recording.</p>
              </div>
            ) : (
              recording.coaching.map((coaching, i) => (
                <CoachingUpdate key={i} coaching={coaching} index={i} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Transcript Message Component
const TranscriptMessage: React.FC<{ entry: TranscriptEntry }> = ({ entry }) => {
  const isCustomer = entry.speaker === 'customer';
  
  return (
    <div className={cn(
      'flex gap-3',
      isCustomer ? 'flex-row' : 'flex-row-reverse'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isCustomer ? 'bg-rose-100' : 'bg-indigo-100'
      )}>
        <span className={cn(
          'text-xs font-medium',
          isCustomer ? 'text-rose-600' : 'text-indigo-600'
        )}>
          {isCustomer ? 'C' : 'O'}
        </span>
      </div>
      <div className={cn(
        'max-w-[80%] rounded-lg p-3',
        isCustomer ? 'bg-gray-100' : 'bg-indigo-50'
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-xs font-medium',
            isCustomer ? 'text-gray-600' : 'text-indigo-600'
          )}>
            {isCustomer ? 'Customer' : 'Operator'}
          </span>
          <span className="text-xs text-gray-400">{entry.timestamp}</span>
        </div>
        <p className={cn(
          'text-sm',
          isCustomer ? 'text-gray-800' : 'text-indigo-900'
        )}>
          {entry.text}
        </p>
      </div>
    </div>
  );
};

// Coaching Update Component
const CoachingUpdate: React.FC<{ coaching: { analysis_id: number; cards: CoachingCard[]; script: { summary: string; suggestion: string } }; index: number }> = ({ coaching, index }) => {
  const cardIcons = [Heart, Scale, Target];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
          Update #{coaching.analysis_id}
        </span>
      </div>
      
      {/* Coaching Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {coaching.cards.map((card, i) => {
          const Icon = cardIcons[i] || Heart;
          return (
            <div
              key={i}
              className={cn(
                'p-4 rounded-lg border',
                card.status === 'danger' && 'bg-rose-50 border-rose-200',
                card.status === 'warning' && 'bg-amber-50 border-amber-200',
                card.status === 'success' && 'bg-emerald-50 border-emerald-200',
                card.status === 'info' && 'bg-blue-50 border-blue-200',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn(
                  'w-4 h-4',
                  card.status === 'danger' && 'text-rose-600',
                  card.status === 'warning' && 'text-amber-600',
                  card.status === 'success' && 'text-emerald-600',
                  card.status === 'info' && 'text-blue-600',
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  card.status === 'danger' && 'text-rose-900',
                  card.status === 'warning' && 'text-amber-900',
                  card.status === 'success' && 'text-emerald-900',
                  card.status === 'info' && 'text-blue-900',
                )}>
                  {card.title}
                </span>
              </div>
              <p className={cn(
                'text-xs mb-2',
                card.status === 'danger' && 'text-rose-700',
                card.status === 'warning' && 'text-amber-700',
                card.status === 'success' && 'text-emerald-700',
                card.status === 'info' && 'text-blue-700',
              )}>
                {card.detail}
              </p>
              <p className={cn(
                'text-xs font-medium',
                card.status === 'danger' && 'text-rose-800',
                card.status === 'warning' && 'text-amber-800',
                card.status === 'success' && 'text-emerald-800',
                card.status === 'info' && 'text-blue-800',
              )}>
                Action: {card.action}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* Suggested Script */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Response</h4>
        <p className="text-sm text-gray-600 italic">
          "{coaching.script.suggestion}"
        </p>
      </div>
    </div>
  );
};

export default RecordingDetail;
