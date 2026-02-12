/**
 * QA Review Queue Page
 * Lists calls waiting for QA review
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useQAStore } from '../stores';
import { cn } from '../utils/classnames';

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50';
  if (score >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-rose-600 bg-rose-50';
};

const QAReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const { 
    reviewQueue, 
    isLoadingQueue, 
    queueError, 
    fetchReviewQueue 
  } = useQAStore();

  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  if (isLoadingQueue) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-gray-500">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (queueError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to load queue</h3>
          <p className="text-gray-500 mb-4">{queueError}</p>
          <button
            onClick={() => fetchReviewQueue()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Review Queue</h1>
            <p className="text-gray-500">
              Review AI-analyzed calls and provide human assessment
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Pending Reviews</div>
          <div className="text-2xl font-bold text-gray-900">{reviewQueue.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Average AI Score</div>
          <div className="text-2xl font-bold text-indigo-600">
            {reviewQueue.length > 0
              ? Math.round(reviewQueue.reduce((sum, q) => sum + q.ai_overall_score, 0) / reviewQueue.length)
              : 0}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Total Duration</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(reviewQueue.reduce((sum, q) => sum + q.duration_seconds, 0))}
          </div>
        </div>
      </div>

      {/* Queue List */}
      {reviewQueue.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No calls waiting for review</h3>
          <p className="text-gray-500">
            Completed calls will appear here after AI QA analysis is finished.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map((item) => (
            <div
              key={item.call_id}
              onClick={() => navigate(`/qa-review/${item.call_id}`)}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Title & Scenario */}
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.scenario_title}
                  </h3>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {item.operator_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(item.duration_seconds)}
                    </div>
                    <div>
                      {item.total_turns} turns
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-400">
                    Analyzed: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>

                {/* AI Score */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">AI Score</div>
                    <div className={cn(
                      'text-2xl font-bold px-3 py-1 rounded-lg',
                      getScoreColor(item.ai_overall_score)
                    )}>
                      {item.ai_overall_score}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QAReviewQueue;
