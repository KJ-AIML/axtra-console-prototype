import React, { useState } from 'react';
import { ClipboardCheck, BarChart3, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '../utils/classnames';
import QAScoreForm from '../components/qa/QAScoreForm';
import ScoreComparison from '../components/qa/ScoreComparison';

// Mock data for calls needing QA review
const mockCallsForReview = [
  {
    id: 'call-1',
    scenario_title: 'Billing Dispute - Angry Customer',
    scenario_difficulty: 'hard',
    duration_seconds: 420,
    total_turns: 24,
    ai_score: {
      customer_satisfaction: 4,
      coaching_effectiveness: 3,
    },
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'call-2',
    scenario_title: 'Technical Support - Login Issues',
    scenario_difficulty: 'medium',
    duration_seconds: 315,
    total_turns: 18,
    ai_score: {
      customer_satisfaction: 3,
      coaching_effectiveness: 4,
    },
    created_at: '2024-01-14T14:15:00Z',
  },
  {
    id: 'call-3',
    scenario_title: 'Sales Upsell - Premium Plan',
    scenario_difficulty: 'easy',
    duration_seconds: 180,
    total_turns: 12,
    ai_score: {
      customer_satisfaction: 5,
      coaching_effectiveness: 4,
    },
    created_at: '2024-01-14T09:00:00Z',
  },
];

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const QAScoring: React.FC = () => {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'completed'>('review');

  const selectedCall = mockCallsForReview.find(c => c.id === selectedCallId);

  // Mock QA score for demonstration
  const mockQAScore = {
    overall: 85,
    professionalism: 4,
    empathy: 5,
    problem_solving: 4,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Scoring</h1>
          <p className="text-gray-500 mt-1">
            Review call recordings and evaluate performance against quality standards
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveTab('review')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'review'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            To Review ({mockCallsForReview.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'completed'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Call List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Calls Awaiting Review</h2>
            </div>

            <div className="space-y-3">
              {mockCallsForReview.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCallId(call.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    selectedCallId === call.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {call.scenario_title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDuration(call.duration_seconds)} • {call.total_turns} turns
                      </p>
                    </div>
                    <ArrowRight
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        selectedCallId === call.id ? 'text-indigo-600' : 'text-gray-400'
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        call.scenario_difficulty === 'easy'
                          ? 'bg-emerald-100 text-emerald-700'
                          : call.scenario_difficulty === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {call.scenario_difficulty}
                    </span>
                    <span className="text-xs text-gray-400">
                      AI: {Math.round(((call.ai_score.customer_satisfaction + call.ai_score.coaching_effectiveness) / 10) * 100)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-medium">Your Review Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-indigo-200 text-sm">Reviews Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold">4.2</div>
                <div className="text-indigo-200 text-sm">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Scoring Interface */}
        <div className="lg:col-span-2">
          {selectedCall ? (
            <div className="space-y-6">
              {/* Call Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedCall.scenario_title}
                    </h2>
                    <p className="text-gray-500 mt-1">
                      Duration: {formatDuration(selectedCall.duration_seconds)} •{' '}
                      {selectedCall.total_turns} conversation turns
                    </p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    View Recording
                  </button>
                </div>
              </div>

              {/* Score Comparison */}
              <ScoreComparison
                aiScore={selectedCall.ai_score}
                qaScore={mockQAScore}
              />

              {/* QA Score Form */}
              <QAScoreForm
                callId={selectedCall.id}
                onSave={(scores) => {
                  console.log('Saved scores:', scores);
                  // Mock: show success message
                  alert('QA scores saved successfully! (Mock)');
                }}
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a call to review
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose a call from the list on the left to begin your QA review. 
                Compare AI-generated scores with your own assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAScoring;
