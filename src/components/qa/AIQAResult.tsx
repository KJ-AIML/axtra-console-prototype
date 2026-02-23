/**
 * AI QA Result Component
 * Displays AI-generated QA analysis results
 */

import React from 'react';
import { Star, Clock, Quote, FileText } from 'lucide-react';
import { cn } from '../../utils/classnames';
import type { AIQAResult as AIQAResultType } from '../../stores/useQAStore';

interface AIQAResultProps {
  aiQA: AIQAResultType;
  className?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 4) return 'text-emerald-600';
  if (score >= 3) return 'text-amber-600';
  return 'text-rose-600';
};

const getScoreBg = (score: number): string => {
  if (score >= 4) return 'bg-emerald-50';
  if (score >= 3) return 'bg-amber-50';
  return 'bg-rose-50';
};

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AIQAResult: React.FC<AIQAResultProps> = ({ aiQA, className }) => {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI QA Analysis</h3>
            <p className="text-sm text-gray-500">Reference only - AI-generated assessment</p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-3xl font-bold',
            aiQA.overall_score >= 80 ? 'text-emerald-600' :
            aiQA.overall_score >= 60 ? 'text-amber-600' :
            'text-rose-600'
          )}>
            {aiQA.overall_score}
          </div>
          <div className="text-sm text-gray-500">Overall Score</div>
        </div>
      </div>

      {/* Summary Feedback */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700 text-sm leading-relaxed">
          {aiQA.summary_feedback}
        </p>
      </div>

      {/* Criteria Scores */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Criteria Scores
        </h4>
        
        {aiQA.criteria_scores.map((criteria) => (
          <div 
            key={criteria.criteria_id}
            className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
          >
            {/* Criteria Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                {criteria.criteria_name}
              </span>
              <div className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                getScoreBg(criteria.score),
                getScoreColor(criteria.score)
              )}>
                <span>{criteria.score}</span>
                <span className="text-gray-400">/5</span>
              </div>
            </div>

            {/* Score Stars */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-4 h-4',
                    star <= criteria.score
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200'
                  )}
                />
              ))}
            </div>

            {/* Reasoning */}
            <p className="text-sm text-gray-600 mb-3">
              {criteria.reasoning}
            </p>

            {/* Evidence */}
            {criteria.evidence_quote && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Quote className="w-3 h-3" />
                  <span>Evidence from transcript</span>
                  {criteria.evidence_timestamp > 0 && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(criteria.evidence_timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 italic">
                  "{criteria.evidence_quote}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generated At */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
        Generated: {new Date(aiQA.created_at).toLocaleString()}
      </div>
    </div>
  );
};

export default AIQAResult;
