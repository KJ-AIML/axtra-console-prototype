/**
 * AXTRA Copilot - Real-time AI Coaching Component
 * Uses coaching data from useLiveKitStore
 * 
 * This version matches the original UI design with:
 * - Emotion monitor with cycling moods
 * - Live suggestions cards
 * - Suggested response with copy button
 * - Knowledge base links
 */

import { memo, useState, useEffect } from 'react';
import { cn } from '../../utils/classnames';
import { useLiveKitStore } from '../../stores';
import { 
  AlertCircle, CheckCircle, Lightbulb, Zap, Smile, Meh, Frown,
  ChevronRight, Copy, Check
} from 'lucide-react';

// ============================================
// COMPONENT: AXTRA Copilot (Matches Original UI)
// ============================================

interface AxtraCopilotProps {
  className?: string;
}

export const AxtraCopilot = memo<AxtraCopilotProps>(({ className }) => {
  const { coachingData, isConnected } = useLiveKitStore();
  const [copied, setCopied] = useState(false);
  
  // Get the latest card statuses for emotion display
  const emotionCard = coachingData?.cards?.[0];
  const leverageCard = coachingData?.cards?.[1];
  const strategyCard = coachingData?.cards?.[2];
  
  // Determine mood based on emotion card status
  const getCurrentMood = () => {
    if (!emotionCard) return 'neutral';
    switch (emotionCard.status) {
      case 'danger': return 'angry';
      case 'warning': return 'frustrated';
      case 'success': return 'happy';
      default: return 'neutral';
    }
  };
  
  const currentMood = getCurrentMood();
  
  // Copy to clipboard
  const handleCopy = () => {
    if (coachingData?.script?.suggestion) {
      navigator.clipboard.writeText(coachingData.script.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Map card data to suggestion format
  const suggestions = coachingData?.cards ? [
    {
      id: 1,
      type: emotionCard?.status === 'danger' ? 'warning' : emotionCard?.status === 'success' ? 'insight' : 'suggestion',
      priority: emotionCard?.status === 'danger' ? 'high' : 'medium',
      message: emotionCard?.detail || 'Analyzing customer emotion...',
      action: emotionCard?.action || 'Wait for analysis to complete',
    },
    {
      id: 2,
      type: 'insight',
      priority: 'medium',
      message: leverageCard?.detail || 'Analyzing leverage points...',
      action: leverageCard?.action || 'Wait for analysis to complete',
    },
    {
      id: 3,
      type: strategyCard?.status === 'danger' ? 'warning' : 'suggestion',
      priority: strategyCard?.status === 'danger' ? 'high' : 'medium',
      message: strategyCard?.detail || 'Analyzing strategy...',
      action: strategyCard?.action || 'Wait for analysis to complete',
    },
  ] : [];

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

  const getMoodText = (mood: string) => {
    switch (mood) {
      case 'angry': return 'Immediate de-escalation needed';
      case 'frustrated': return 'Show empathy and offer solutions';
      case 'neutral': return 'Maintain professional tone';
      case 'satisfied': return 'Good progress, keep it up';
      case 'happy': return 'Positive engagement, opportunity for upsell';
      default: return 'Analyzing customer mood...';
    }
  };

  const getMoodLabel = (mood: string) => {
    switch (mood) {
      case 'angry': return 'Customer Angry';
      case 'frustrated': return 'Customer Frustrated';
      case 'neutral': return 'Customer Neutral';
      case 'satisfied': return 'Customer Satisfied';
      case 'happy': return 'Customer Happy';
      default: return 'Analyzing...';
    }
  };

  // Empty state when not connected or no data yet
  if (!isConnected) {
    return (
      <div className={cn('h-full flex flex-col bg-gray-50', className)}>
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Axtra Copilot</h3>
          </div>
          <p className="text-xs text-gray-500">Real-time AI guidance</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Start a voice call to see real-time coaching</p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for first analysis
  if (!coachingData) {
    return (
      <div className={cn('h-full flex flex-col bg-gray-50', className)}>
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Axtra Copilot</h3>
          </div>
          <p className="text-xs text-gray-500">Real-time AI guidance</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Zap size={20} className="text-indigo-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Analyzing conversation...</p>
            <p className="text-xs text-gray-400 mt-1">Coaching will appear after a few exchanges</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col bg-gray-50', className)}>
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
            <div className="font-semibold">{getMoodLabel(currentMood)}</div>
            <div className="text-xs opacity-75">{getMoodText(currentMood)}</div>
          </div>
        </div>

        {/* Analysis ID */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            Analysis #{coachingData.analysis_id}
          </span>
          <span className="text-[10px] text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Live Suggestions</h4>
        
        {suggestions.length > 0 ? suggestions.map((suggestion) => (
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
        )) : (
          <div className="p-4 text-center text-sm text-gray-400">
            Waiting for suggestions...
          </div>
        )}

        {/* Real-time Script Guide */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Response</h4>
          <p className="text-sm text-gray-700 italic">
            {coachingData.script?.suggestion || 'Waiting for script suggestion...'}
          </p>
          {coachingData.script?.suggestion && (
            <button 
              onClick={handleCopy}
              className="mt-3 text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy to clipboard
                </>
              )}
            </button>
          )}
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

AxtraCopilot.displayName = 'AxtraCopilot';
