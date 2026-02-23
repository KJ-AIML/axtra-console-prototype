/**
 * Recording Card Component
 * Displays a single recording in the list view
 */

import React from 'react';
import { Play, Clock, MessageSquare, Star, Calendar, Trash2, FileText } from 'lucide-react';
import { cn } from '../../utils/classnames';
import type { RecordingListItem } from '../../lib/api-types';

interface RecordingCardProps {
  recording: RecordingListItem;
  onClick: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const difficultyColors: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-rose-100 text-rose-700',
};

const sentimentColors: Record<string, string> = {
  happy: 'text-emerald-600',
  satisfied: 'text-emerald-600',
  neutral: 'text-gray-600',
  frustrated: 'text-amber-600',
  angry: 'text-rose-600',
};

const sentimentLabels: Record<string, string> = {
  happy: 'Happy',
  satisfied: 'Satisfied',
  neutral: 'Neutral',
  frustrated: 'Frustrated',
  angry: 'Angry',
};

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording,
  onClick,
  onDelete,
  isDeleting,
}) => {
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 p-4',
        'hover:shadow-md hover:border-indigo-300',
        'transition-all duration-200 cursor-pointer',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate pr-4">
            {recording.scenario_title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                difficultyColors[recording.scenario_difficulty] || 'bg-gray-100 text-gray-700'
              )}
            >
              {recording.scenario_difficulty}
            </span>
            <span className="text-xs text-gray-500">
              {recording.scenario_category}
            </span>
          </div>
        </div>
        
        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all z-20 relative"
            title="Delete recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{formatDuration(recording.duration_seconds)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span>{recording.total_turns} turns</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{formatDate(recording.started_at)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {/* Score */}
        <div className="flex items-center gap-2">
          {recording.final_score !== undefined && recording.final_score !== null ? (
            <div className="flex items-center gap-1.5">
              <Star className={cn(
                'w-4 h-4',
                recording.final_score >= 80 ? 'text-amber-500 fill-amber-500' :
                recording.final_score >= 60 ? 'text-amber-400 fill-amber-400' :
                'text-gray-400'
              )} />
              <span className={cn(
                'font-semibold',
                recording.final_score >= 80 ? 'text-emerald-600' :
                recording.final_score >= 60 ? 'text-amber-600' :
                'text-rose-600'
              )}>
                {recording.final_score}/100
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">No score</span>
          )}
        </div>

        {/* Sentiment & Summary Badge */}
        <div className="flex items-center gap-2">
          {recording.has_summary && (
            <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              <FileText className="w-3 h-3" />
              AI Summary
            </span>
          )}
          <span className={cn(
            'text-xs font-medium',
            sentimentColors[recording.customer_sentiment] || 'text-gray-600'
          )}>
            {sentimentLabels[recording.customer_sentiment] || recording.customer_sentiment}
          </span>
        </div>
      </div>

      {/* Play Overlay - excludes the top-right area where delete button is */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-lg pointer-events-none">
        <div className="bg-white shadow-lg rounded-full p-3 pointer-events-auto">
          <Play className="w-6 h-6 text-indigo-600 fill-indigo-600" />
        </div>
      </div>
    </div>
  );
};
