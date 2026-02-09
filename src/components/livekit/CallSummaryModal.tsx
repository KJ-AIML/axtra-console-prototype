/**
 * Call Summary Modal
 * Shows post-call analysis, transcript, coaching history, and summary
 */

import { memo, useState } from 'react';
import { cn } from '../../utils/classnames';
import { 
  X, Clock, MessageSquare, Headphones, 
  TrendingUp, Award, AlertCircle, CheckCircle, 
  ChevronDown, ChevronUp, Download, RotateCcw
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface TranscriptEntry {
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
}

export interface CoachingCard {
  title: string;
  detail: string;
  action: string;
  status: 'danger' | 'warning' | 'success' | 'info';
}

export interface CoachingData {
  analysis_id: number;
  cards: CoachingCard[];
  script: {
    summary: string;
    suggestion: string;
  };
}

export interface CallSummary {
  summary: string;
  key_points: string[];
  strengths: string[];
  improvements: string[];
  customer_satisfaction: number;
  resolution_status: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coaching_effectiveness: number;
}

export interface CallSession {
  id: string;
  scenario_id: string;
  room_name: string;
  status: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  total_turns: number;
  customer_sentiment: string;
  final_score?: number;
}

interface CallSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  session: CallSession | null;
  transcripts: TranscriptEntry[];
  coachingHistory: CoachingData[];
  summary: CallSummary | null;
  isLoading?: boolean;
}

// ============================================
// COMPONENT: Call Summary Modal
// ============================================

export const CallSummaryModal = memo<CallSummaryModalProps>(function CallSummaryModal({
  isOpen,
  onClose,
  onRetry,
  session,
  transcripts,
  coachingHistory,
  summary,
  isLoading,
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'coaching'>('overview');
  const [expandedCoaching, setExpandedCoaching] = useState<number | null>(null);

  if (!isOpen) return null;

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'happy':
      case 'satisfied': return 'text-emerald-600 bg-emerald-50';
      case 'neutral': return 'text-gray-600 bg-gray-50';
      case 'frustrated': return 'text-amber-600 bg-amber-50';
      case 'angry': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get resolution badge
  const getResolutionBadge = (status: string) => {
    switch (status) {
      case 'resolved': return { text: 'Resolved', class: 'bg-emerald-100 text-emerald-700' };
      case 'escalated': return { text: 'Escalated', class: 'bg-amber-100 text-amber-700' };
      case 'unresolved': return { text: 'Unresolved', class: 'bg-rose-100 text-rose-700' };
      default: return { text: 'Pending', class: 'bg-gray-100 text-gray-700' };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Generating Call Summary...</h3>
            <p className="text-sm text-gray-500 mt-1">Analyzing conversation and coaching data</p>
          </div>
        </div>
      </div>
    );
  }

  const resolutionBadge = summary ? getResolutionBadge(summary.resolution_status) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Call Summary</h2>
            <p className="text-sm text-gray-500 mt-1">
              {session ? (
                <>Completed {new Date(session.ended_at || session.started_at).toLocaleString()}</>
              ) : 'Call completed'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Try Again
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm">
              <span className="text-gray-500">Duration:</span>{' '}
              <span className="font-medium text-gray-900">
                {session ? formatDuration(session.duration_seconds) : '--:--'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            <span className="text-sm">
              <span className="text-gray-500">Exchanges:</span>{' '}
              <span className="font-medium text-gray-900">
                {session?.total_turns || transcripts.length}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-gray-400" />
            <span className="text-sm">
              <span className="text-gray-500">Coaching:</span>{' '}
              <span className="font-medium text-gray-900">{coachingHistory.length} suggestions</span>
            </span>
          </div>
          {resolutionBadge && (
            <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full ml-auto', resolutionBadge.class)}>
              {resolutionBadge.text}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'transcript'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Transcript
          </button>
          <button
            onClick={() => setActiveTab('coaching')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'coaching'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Coaching History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && summary && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Summary
                </h3>
                <p className="text-sm text-indigo-800 leading-relaxed">{summary.summary}</p>
              </div>

              {/* Satisfaction & Score */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {summary.customer_satisfaction}/5
                  </div>
                  <div className="text-xs text-gray-500">Customer Satisfaction</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {summary.coaching_effectiveness}/5
                  </div>
                  <div className="text-xs text-gray-500">Coaching Effectiveness</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {session?.final_score || '--'}
                  </div>
                  <div className="text-xs text-gray-500">Final Score</div>
                </div>
              </div>

              {/* Key Points */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {summary.key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <Award size={16} />
                  Strengths
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.strengths.map((strength, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Areas for Improvement
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.improvements.map((improvement, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full"
                    >
                      {improvement}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {transcripts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No transcript available</p>
                </div>
              ) : (
                transcripts.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-3',
                      entry.speaker === 'operator' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        entry.speaker === 'operator'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      )}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {entry.speaker === 'operator' ? 'You' : 'Customer'} • {entry.timestamp}
                      </div>
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Coaching History Tab */}
          {activeTab === 'coaching' && (
            <div className="space-y-4">
              {coachingHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Headphones size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No coaching data available</p>
                </div>
              ) : (
                coachingHistory.map((coaching) => (
                  <div
                    key={coaching.analysis_id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedCoaching(
                        expandedCoaching === coaching.analysis_id ? null : coaching.analysis_id
                      )}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          {coaching.analysis_id}
                        </span>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">
                            Coaching Update #{coaching.analysis_id}
                          </div>
                          <div className="text-xs text-gray-500">
                            {coaching.cards.length} cards • {coaching.script.suggestion ? 'Script provided' : 'No script'}
                          </div>
                        </div>
                      </div>
                      {expandedCoaching === coaching.analysis_id ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </button>
                    
                    {expandedCoaching === coaching.analysis_id && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Cards */}
                        {coaching.cards.map((card, i) => (
                          <div
                            key={i}
                            className={cn(
                              'p-3 rounded-lg text-sm',
                              card.status === 'danger' && 'bg-rose-50 text-rose-800',
                              card.status === 'warning' && 'bg-amber-50 text-amber-800',
                              card.status === 'success' && 'bg-emerald-50 text-emerald-800',
                              card.status === 'info' && 'bg-blue-50 text-blue-800'
                            )}
                          >
                            <div className="font-medium mb-1">{card.title}</div>
                            <div className="text-xs opacity-80">{card.detail}</div>
                            <div className="text-xs mt-2 font-medium">→ {card.action}</div>
                          </div>
                        ))}
                        
                        {/* Suggested Script */}
                        {coaching.script.suggestion && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Suggested Response:</div>
                            <p className="text-sm text-gray-700 italic">"{coaching.script.suggestion}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {/* Export functionality */}}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Download size={16} />
            Export Report
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});

CallSummaryModal.displayName = 'CallSummaryModal';
