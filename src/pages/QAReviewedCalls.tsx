/**
 * QA Reviewed Calls Page
 * Shows list of calls that have been reviewed by QA
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  User,
  Filter,
  ChevronRight,
  BarChart3,
  Headphones
} from 'lucide-react';
import { useQAStore } from '../stores';
import { cn } from '../utils/classnames';
import Button from '../components/ui/Button';

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const QAReviewedCalls: React.FC = () => {
  const navigate = useNavigate();
  const { 
    reviewedCalls, 
    isLoadingReviewed, 
    reviewedError, 
    fetchReviewedCalls 
  } = useQAStore();
  
  const [myReviewsOnly, setMyReviewsOnly] = useState(false);

  useEffect(() => {
    fetchReviewedCalls(myReviewsOnly);
  }, [fetchReviewedCalls, myReviewsOnly]);

  // Calculate stats
  const totalReviewed = reviewedCalls.length;
  const avgHumanScore = totalReviewed > 0
    ? Math.round(reviewedCalls.reduce((sum, c) => sum + c.human_overall_score, 0) / totalReviewed)
    : 0;
  const avgAIScore = totalReviewed > 0
    ? Math.round(reviewedCalls.reduce((sum, c) => sum + c.ai_overall_score, 0) / totalReviewed)
    : 0;
  const avgDifference = totalReviewed > 0
    ? Math.round(reviewedCalls.reduce((sum, c) => sum + (c.human_overall_score - c.ai_overall_score), 0) / totalReviewed)
    : 0;

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/qa-scoring')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviewed Calls</h1>
            <p className="text-gray-500">
              Calls that have been reviewed by QA
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={myReviewsOnly ? 'primary' : 'secondary'}
            onClick={() => setMyReviewsOnly(!myReviewsOnly)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {myReviewsOnly ? 'My Reviews Only' : 'All Reviews'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {totalReviewed > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Total Reviewed</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalReviewed}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Avg Human Score</span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              avgHumanScore >= 80 ? 'text-emerald-600' :
              avgHumanScore >= 60 ? 'text-amber-600' :
              'text-rose-600'
            )}>
              {avgHumanScore}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Avg AI Score</span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              avgAIScore >= 80 ? 'text-emerald-600' :
              avgAIScore >= 60 ? 'text-amber-600' :
              'text-rose-600'
            )}>
              {avgAIScore}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Headphones className="w-4 h-4" />
              <span className="text-sm">Human vs AI</span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              avgDifference > 0 ? 'text-emerald-600' :
              avgDifference < 0 ? 'text-rose-600' :
              'text-gray-600'
            )}>
              {avgDifference > 0 ? '+' : ''}{avgDifference}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingReviewed && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Error State */}
      {reviewedError && !isLoadingReviewed && (
        <div className="text-center py-12">
          <p className="text-rose-600 mb-4">{reviewedError}</p>
          <Button onClick={() => fetchReviewedCalls(myReviewsOnly)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingReviewed && !reviewedError && reviewedCalls.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No reviewed calls yet
          </h3>
          <p className="text-gray-500">
            {myReviewsOnly 
              ? "You haven't reviewed any calls yet. Go to QA Scoring to start reviewing."
              : "No calls have been reviewed yet. Reviews will appear here after QA submission."
            }
          </p>
          <Button 
            className="mt-4"
            onClick={() => navigate('/qa-scoring')}
          >
            Go to QA Scoring
          </Button>
        </div>
      )}

      {/* Reviewed Calls List */}
      {!isLoadingReviewed && !reviewedError && reviewedCalls.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Call Details
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Operator
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                  Duration
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                  AI Score
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                  Human Score
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                  Variance
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Reviewed By
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Date
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviewedCalls.map((call) => {
                const difference = call.human_overall_score - call.ai_overall_score;
                const variance = Math.abs(difference) <= 10 ? 'aligned' :
                                Math.abs(difference) <= 20 ? 'minor' : 'significant';
                
                return (
                  <tr 
                    key={call.call_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/qa-review/${call.call_id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {call.scenario_title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                          {call.operator_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{call.operator_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(call.duration_seconds)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
                        call.ai_overall_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        call.ai_overall_score >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      )}>
                        {call.ai_overall_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
                        call.human_overall_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        call.human_overall_score >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      )}>
                        {call.human_overall_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-sm font-medium',
                        variance === 'aligned' ? 'text-emerald-600' :
                        variance === 'minor' ? 'text-amber-600' :
                        'text-rose-600'
                      )}>
                        {difference > 0 ? '+' : ''}{difference}
                        <span className="text-gray-400 text-xs ml-1">
                          ({variance})
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{call.reviewer_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {formatDate(call.reviewed_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QAReviewedCalls;
