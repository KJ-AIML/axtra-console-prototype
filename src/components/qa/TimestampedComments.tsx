/**
 * Timestamped Comments Component
 * Shows and adds comments at specific audio timestamps
 */

import React, { useState } from 'react';
import { Clock, MessageSquare, Plus, X, Play } from 'lucide-react';
import { cn } from '../../utils/classnames';
import Button from '../ui/Button';

export interface TimestampedComment {
  timestamp_seconds: number;
  comment: string;
}

interface TimestampedCommentsProps {
  comments: TimestampedComment[];
  currentTime: number;
  duration: number;
  onAddComment: (timestamp: number, comment: string) => void;
  onRemoveComment?: (index: number) => void;
  onSeekTo?: (timestamp: number) => void;
  readOnly?: boolean;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TimestampedComments: React.FC<TimestampedCommentsProps> = ({
  comments,
  currentTime,
  duration,
  onAddComment,
  onRemoveComment,
  onSeekTo,
  readOnly = false,
  className
}) => {
  const [newComment, setNewComment] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (newComment.trim()) {
      onAddComment(Math.floor(currentTime), newComment.trim());
      setNewComment('');
      setShowAddForm(false);
    }
  };

  // Sort comments by timestamp
  const sortedComments = [...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Timestamped Comments</h3>
            <p className="text-sm text-gray-500">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {!readOnly && !showAddForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add at {formatTime(currentTime)}
          </Button>
        )}
      </div>

      {/* Add Comment Form */}
      {showAddForm && !readOnly && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-sm text-purple-700">
            <Clock className="w-4 h-4" />
            <span>Adding comment at {formatTime(currentTime)}</span>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Enter your comment..."
            rows={2}
            className={cn(
              'w-full px-3 py-2 text-sm border border-purple-200 rounded-lg mb-3',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
              'placeholder:text-purple-300 resize-none'
            )}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Add Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {sortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {readOnly 
                ? 'No comments added' 
                : 'Click "Add" to add a comment at the current playback time'}
            </p>
          </div>
        ) : (
          sortedComments.map((comment, index) => {
            const isNearCurrentTime = Math.abs(comment.timestamp_seconds - currentTime) < 5;
            
            return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  isNearCurrentTime 
                    ? 'bg-purple-50 border-purple-200' 
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                )}
              >
                {/* Timestamp Button */}
                <button
                  onClick={() => onSeekTo?.(comment.timestamp_seconds)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shrink-0',
                    isNearCurrentTime
                      ? 'bg-purple-200 text-purple-700'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  )}
                >
                  <Play className="w-3 h-3" />
                  {formatTime(comment.timestamp_seconds)}
                </button>

                {/* Comment Text */}
                <p className="text-sm text-gray-700 flex-1">
                  {comment.comment}
                </p>

                {/* Remove Button */}
                {!readOnly && onRemoveComment && (
                  <button
                    onClick={() => onRemoveComment(index)}
                    className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Visual Timeline */}
      {sortedComments.length > 0 && duration > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            {/* Current Time Indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-10"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
            
            {/* Comment Markers */}
            {sortedComments.map((comment, index) => (
              <button
                key={index}
                onClick={() => onSeekTo?.(comment.timestamp_seconds)}
                className="absolute top-0 bottom-0 w-2 bg-purple-400 hover:bg-purple-600 rounded-full transition-colors"
                style={{ 
                  left: `${Math.min((comment.timestamp_seconds / duration) * 100, 99)}%`,
                  transform: 'translateX(-50%)'
                }}
                title={`${formatTime(comment.timestamp_seconds)}: ${comment.comment}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimestampedComments;
