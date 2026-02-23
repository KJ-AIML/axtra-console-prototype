/**
 * Score Comparison Component
 * Compare AI-generated scores with human QA scores
 */

import React from 'react';
import { Bot, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/classnames';

interface ScoreComparisonProps {
  aiScore?: {
    customer_satisfaction: number; // 1-5
    coaching_effectiveness: number; // 1-5
  };
  qaScore?: {
    overall: number; // 0-100
    professionalism: number;
    empathy: number;
    problem_solving: number;
  };
}

export const ScoreComparison: React.FC<ScoreComparisonProps> = ({ aiScore, qaScore }) => {
  // Convert AI scores (1-5) to percentage (0-100) for comparison
  const aiOverall = aiScore ? Math.round(((aiScore.customer_satisfaction + aiScore.coaching_effectiveness) / 10) * 100) : null;
  const qaOverall = qaScore?.overall || null;

  const difference = aiOverall !== null && qaOverall !== null ? qaOverall - aiOverall : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Comparison</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AI Score */}
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-indigo-900">AI Score</span>
          </div>
          <div className="text-3xl font-bold text-indigo-700 mb-1">
            {aiOverall !== null ? `${aiOverall}%` : 'N/A'}
          </div>
          {aiScore && (
            <div className="text-sm text-indigo-600">
              <div>Satisfaction: {aiScore.customer_satisfaction}/5</div>
              <div>Coaching: {aiScore.coaching_effectiveness}/5</div>
            </div>
          )}
        </div>

        {/* QA Score */}
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-emerald-900">QA Score</span>
          </div>
          <div className="text-3xl font-bold text-emerald-700 mb-1">
            {qaOverall !== null ? `${qaOverall}%` : 'Not scored'}
          </div>
          {qaScore && (
            <div className="text-sm text-emerald-600">
              <div>Professionalism: {qaScore.professionalism}/5</div>
              <div>Empathy: {qaScore.empathy}/5</div>
            </div>
          )}
        </div>

        {/* Difference */}
        <div className={cn(
          'rounded-lg p-4',
          difference === null ? 'bg-gray-50' :
          difference > 0 ? 'bg-emerald-50' :
          difference < 0 ? 'bg-rose-50' :
          'bg-gray-50'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {difference === null ? (
              <Minus className="w-5 h-5 text-gray-600" />
            ) : difference > 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : difference < 0 ? (
              <TrendingDown className="w-5 h-5 text-rose-600" />
            ) : (
              <Minus className="w-5 h-5 text-gray-600" />
            )}
            <span className={cn(
              'font-medium',
              difference === null ? 'text-gray-700' :
              difference > 0 ? 'text-emerald-900' :
              difference < 0 ? 'text-rose-900' :
              'text-gray-700'
            )}>
              Difference
            </span>
          </div>
          <div className={cn(
            'text-3xl font-bold mb-1',
            difference === null ? 'text-gray-700' :
            difference > 0 ? 'text-emerald-700' :
            difference < 0 ? 'text-rose-700' :
            'text-gray-700'
          )}>
            {difference !== null ? `${difference > 0 ? '+' : ''}${difference}%` : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            {difference === null ? 'No comparison available' :
             difference > 10 ? 'QA score significantly higher' :
             difference > 0 ? 'QA score slightly higher' :
             difference === 0 ? 'Scores match' :
             difference > -10 ? 'AI score slightly higher' :
             'AI score significantly higher'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-500">
        <p>Note: AI scores are automatically generated. QA scores are manually reviewed by supervisors.</p>
      </div>
    </div>
  );
};

export default ScoreComparison;
