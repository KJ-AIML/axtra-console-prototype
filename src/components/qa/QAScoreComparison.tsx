/**
 * QA Score Comparison Component
 * Compares AI vs Human QA scores
 */

import React from 'react';
import { BarChart3, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/classnames';

interface QAScoreComparisonProps {
  aiOverall: number;
  humanOverall: number;
  difference: number;
  variance: 'aligned' | 'minor' | 'significant';
  className?: string;
}

const getVarianceConfig = (variance: string) => {
  switch (variance) {
    case 'aligned':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        label: 'Aligned',
        description: 'AI and human scores are in agreement'
      };
    case 'minor':
      return {
        icon: AlertCircle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: 'Minor Variance',
        description: 'Small difference between AI and human'
      };
    case 'significant':
      return {
        icon: AlertTriangle,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        label: 'Significant Variance',
        description: 'Large difference - may need calibration'
      };
    default:
      return {
        icon: CheckCircle2,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Unknown',
        description: ''
      };
  }
};

export const QAScoreComparison: React.FC<QAScoreComparisonProps> = ({
  aiOverall,
  humanOverall,
  difference,
  variance,
  className
}) => {
  const config = getVarianceConfig(variance);
  const Icon = config.icon;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Score Comparison</h3>
          <p className="text-sm text-gray-500">AI vs Human assessment</p>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* AI Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">AI Score</div>
          <div className={cn(
            'text-2xl font-bold',
            aiOverall >= 80 ? 'text-emerald-600' :
            aiOverall >= 60 ? 'text-amber-600' :
            'text-rose-600'
          )}>
            {aiOverall}
          </div>
          <div className="text-xs text-gray-400">/100</div>
        </div>

        {/* Human Score */}
        <div className="text-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-100">
          <div className="text-sm text-gray-500 mb-1">Your Score</div>
          <div className={cn(
            'text-2xl font-bold',
            humanOverall >= 80 ? 'text-emerald-600' :
            humanOverall >= 60 ? 'text-amber-600' :
            'text-rose-600'
          )}>
            {humanOverall}
          </div>
          <div className="text-xs text-gray-400">/100</div>
        </div>

        {/* Difference */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Difference</div>
          <div className={cn(
            'text-2xl font-bold',
            difference > 0 ? 'text-emerald-600' :
            difference < 0 ? 'text-rose-600' :
            'text-gray-600'
          )}>
            {difference > 0 ? '+' : ''}{difference}
          </div>
          <div className="text-xs text-gray-400">points</div>
        </div>
      </div>

      {/* Variance Status */}
      <div className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        config.bgColor,
        config.borderColor
      )}>
        <Icon className={cn('w-5 h-5 mt-0.5', config.color)} />
        <div>
          <div className={cn('font-medium', config.color)}>
            {config.label}
          </div>
          <div className="text-sm text-gray-600">
            {config.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QAScoreComparison;
