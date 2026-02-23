/**
 * Human QA Form Component
 * Form for human QA reviewers to input their scores
 */

import React, { useState } from 'react';
import { Star, Save, RotateCcw, Send, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/classnames';
import Button from '../ui/Button';
import type { QACriteria, AIQACriteriaScore, ScoringType } from '../../stores/useQAStore';

interface HumanQAFormProps {
  criteria: QACriteria[];
  aiScores: AIQACriteriaScore[];
  humanScores: Record<string, number>;
  humanComments: Record<string, string>;
  generalFeedback: string;
  onScoreChange: (criteriaId: string, score: number) => void;
  onCommentChange: (criteriaId: string, comment: string) => void;
  onGeneralFeedbackChange: (feedback: string) => void;
  onSubmit: (status: 'draft' | 'submitted') => void;
  onReset: () => void;
  isSubmitting?: boolean;
  existingReview?: {
    overall_score: number;
    status: 'draft' | 'submitted';
  } | null;
}

// Normalize any score to 0-100 for comparison
const normalizeScore = (score: number, maxScore: number): number => {
  return (score / maxScore) * 100;
};

// Get score label based on normalized score
const getScoreLabel = (normalizedScore: number): string => {
  if (normalizedScore >= 90) return 'Excellent';
  if (normalizedScore >= 80) return 'Good';
  if (normalizedScore >= 70) return 'Average';
  if (normalizedScore >= 60) return 'Below Average';
  return 'Poor';
};

// Get score color based on normalized score
const getScoreColor = (normalizedScore: number): string => {
  if (normalizedScore >= 80) return 'text-emerald-600';
  if (normalizedScore >= 60) return 'text-amber-600';
  return 'text-rose-600';
};

// Binary score toggle component
const BinaryScoreInput: React.FC<{
  score: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}> = ({ score, onChange, disabled }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onChange(1)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors',
        score === 1
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <CheckCircle className="w-4 h-4" />
      Yes / Pass
    </button>
    <button
      type="button"
      onClick={() => onChange(0)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors',
        score === 0
          ? 'bg-rose-100 text-rose-700 border border-rose-300'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <XCircle className="w-4 h-4" />
      No / Fail
    </button>
  </div>
);

// Scale score input (1 to maxScore)
const ScaleScoreInput: React.FC<{
  score: number;
  maxScore: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}> = ({ score, maxScore, onChange, disabled }) => {
  // For large scales (e.g., 100), use input + slider
  if (maxScore > 10) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            min={1}
            max={maxScore}
            value={score}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              onChange(Math.min(maxScore, Math.max(1, val)));
            }}
            disabled={disabled}
            className={cn(
              'w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-center font-medium',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              disabled && 'bg-gray-50'
            )}
          />
        </div>
        <input
          type="range"
          min={1}
          max={maxScore}
          value={score}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-32 accent-indigo-600"
        />
        <span className="text-sm text-gray-500">/ {maxScore}</span>
      </div>
    );
  }

  // For small scales, use buttons
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxScore }, (_, i) => i + 1).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          disabled={disabled}
          className={cn(
            'w-8 h-8 rounded-lg font-medium text-sm transition-colors',
            value <= score
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
};

export const HumanQAForm: React.FC<HumanQAFormProps> = ({
  criteria,
  aiScores,
  humanScores,
  humanComments,
  generalFeedback,
  onScoreChange,
  onCommentChange,
  onGeneralFeedbackChange,
  onSubmit,
  onReset,
  isSubmitting = false,
  existingReview,
}) => {
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Auto scoring: equal weight across all criteria.
  const normalizedHumanScores = criteria.map((c) => {
    const maxScore = c.scoring_type === 'binary' ? 1 : c.max_score;
    const defaultScore = c.scoring_type === 'binary' ? 1 : Math.round(maxScore / 2);
    const currentScore = humanScores[c.id] ?? aiScores.find((s) => s.criteria_id === c.id)?.score ?? defaultScore;
    if (c.scoring_type === 'binary') {
      return currentScore >= 1 ? 100 : 0;
    }
    return normalizeScore(currentScore, maxScore);
  });
  const overallScore = normalizedHumanScores.length > 0
    ? Math.round(normalizedHumanScores.reduce((sum, score) => sum + score, 0) / normalizedHumanScores.length)
    : 0;

  const normalizedAIScores = criteria
    .map((c) => {
      const aiScore = aiScores.find((s) => s.criteria_id === c.id);
      if (!aiScore) return null;
      const maxScore = c.scoring_type === 'binary' ? 1 : c.max_score;
      if (c.scoring_type === 'binary') {
        return aiScore.score >= 1 ? 100 : 0;
      }
      return normalizeScore(aiScore.score, maxScore);
    })
    .filter((score): score is number => score !== null);
  const aiOverallScore = normalizedAIScores.length > 0
    ? Math.round(normalizedAIScores.reduce((sum, score) => sum + score, 0) / normalizedAIScores.length)
    : 0;

  const difference = overallScore - aiOverallScore;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Star className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your QA Assessment</h3>
            <p className="text-sm text-gray-500">
              {existingReview?.status === 'submitted' 
                ? 'Review submitted' 
                : 'Score this call based on your evaluation'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-3xl font-bold',
            overallScore >= 80 ? 'text-emerald-600' :
            overallScore >= 60 ? 'text-amber-600' :
            'text-rose-600'
          )}>
            {overallScore}
          </div>
          <div className="text-sm text-gray-500">Overall Score (Auto)</div>
          {normalizedAIScores.length > 0 && difference !== 0 && (
            <div className={cn(
              'text-xs font-medium',
              difference > 0 ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {difference > 0 ? '+' : ''}{difference} vs AI
            </div>
          )}
        </div>
      </div>

      {/* Criteria Scoring */}
      <div className="space-y-6 mb-6">
        {criteria.map((c) => {
          const aiScore = aiScores.find(s => s.criteria_id === c.id);
          const maxScore = c.scoring_type === 'binary' ? 1 : c.max_score;
          const defaultScore = c.scoring_type === 'binary' ? 1 : Math.round(maxScore / 2);
          const currentScore = humanScores[c.id] ?? aiScore?.score ?? defaultScore;
          const currentComment = humanComments[c.id] || '';
          const normalizedCurrentScore = normalizeScore(currentScore, maxScore);
          const normalizedAiScore = aiScore ? normalizeScore(aiScore.score, maxScore) : null;

          return (
            <div key={c.id} className="border border-gray-100 rounded-lg p-4">
              {/* Criteria Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-900">{c.name}</h4>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {c.scoring_type === 'binary' ? 'Yes/No' : `1-${c.max_score}`}
                    </span>
                    {c.is_required && (
                      <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-600 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {/* AI Score Badge */}
                  {aiScore && normalizedAiScore !== null && (
                    <div className="text-right mr-4">
                      <div className="text-xs text-gray-400">AI Score</div>
                      <div className="text-sm font-medium text-indigo-600">
                        {c.scoring_type === 'binary' 
                          ? (aiScore.score === 1 ? 'Pass' : 'Fail')
                          : `${Math.round(normalizedAiScore)}%`
                        }
                      </div>
                    </div>
                  )}
                  
                  {/* Current Score Display */}
                  <div className={cn(
                    'text-lg font-bold',
                    getScoreColor(normalizedCurrentScore)
                  )}>
                    {c.scoring_type === 'binary' 
                      ? (currentScore === 1 ? 'Pass' : 'Fail')
                      : `${Math.round(normalizedCurrentScore)}%`
                    }
                  </div>
                </div>
              </div>

              {/* Score Input Based on Type */}
              <div className="mb-3">
                {c.scoring_type === 'binary' ? (
                  <BinaryScoreInput
                    score={currentScore}
                    onChange={(score) => onScoreChange(c.id, score)}
                    disabled={existingReview?.status === 'submitted'}
                  />
                ) : (
                  <ScaleScoreInput
                    score={currentScore}
                    maxScore={maxScore}
                    onChange={(score) => onScoreChange(c.id, score)}
                    disabled={existingReview?.status === 'submitted'}
                  />
                )}
                <span className={cn('text-sm font-medium ml-3', getScoreColor(normalizedCurrentScore))}>
                  {getScoreLabel(normalizedCurrentScore)}
                </span>
              </div>

              {/* Comment Field */}
              <div>
                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Your Comment (optional)
                </label>
                <input
                  type="text"
                  value={currentComment}
                  onChange={(e) => onCommentChange(c.id, e.target.value)}
                  placeholder={`Add your notes about ${c.name}...`}
                  disabled={existingReview?.status === 'submitted'}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                    'placeholder:text-gray-400',
                    existingReview?.status === 'submitted' && 'bg-gray-50'
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* General Feedback */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">
          General Feedback
        </label>
        <textarea
          value={generalFeedback}
          onChange={(e) => onGeneralFeedbackChange(e.target.value)}
          placeholder="Provide your overall assessment of this call..."
          rows={4}
          disabled={existingReview?.status === 'submitted'}
          className={cn(
            'w-full px-3 py-2 border border-gray-200 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'placeholder:text-gray-400 resize-none',
            existingReview?.status === 'submitted' && 'bg-gray-50'
          )}
        />
      </div>

      {/* Actions */}
      {existingReview?.status !== 'submitted' && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={onReset}
            disabled={isSubmitting}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => onSubmit('draft')}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Submit QA Review?</h3>
            <p className="text-gray-600 mb-6">
              You are about to submit your QA review with an overall score of{' '}
              <span className={cn('font-bold', getScoreColor(overallScore))}>
                {overallScore}/100
              </span>
              . This will finalize your assessment.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmSubmit(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  onSubmit('submitted');
                }}
              >
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumanQAForm;
