/**
 * QA Score Form Component
 * Simplified scoring interface with mock functionality
 */

import React, { useState } from 'react';
import { Star, Save, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/classnames';
import Button from '../ui/Button';

interface ScoreCategory {
  name: string;
  label: string;
  score: number;
}

interface QAScoreFormProps {
  callId: string;
  onSave?: (scores: { categories: ScoreCategory[]; overall: number; notes: string }) => void;
  initialScores?: ScoreCategory[];
}

const DEFAULT_CATEGORIES: ScoreCategory[] = [
  { name: 'professionalism', label: 'Professionalism', score: 3 },
  { name: 'empathy', label: 'Empathy', score: 3 },
  { name: 'problem_solving', label: 'Problem Solving', score: 3 },
  { name: 'script_adherence', label: 'Script Adherence', score: 3 },
  { name: 'tone_manner', label: 'Tone & Manner', score: 3 },
];

export const QAScoreForm: React.FC<QAScoreFormProps> = ({
  callId,
  onSave,
  initialScores,
}) => {
  const [categories, setCategories] = useState<ScoreCategory[]>(initialScores || DEFAULT_CATEGORIES);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Calculate overall score (average of categories * 20 to get 0-100)
  const overallScore = Math.round(
    (categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length) * 20
  );

  const handleScoreChange = (categoryName: string, score: number) => {
    setCategories(prev =>
      prev.map(cat => (cat.name === categoryName ? { ...cat, score } : cat))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Mock save - simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave?.({ categories, overall: overallScore, notes });
    setIsSaving(false);
  };

  const handleReset = () => {
    setCategories(DEFAULT_CATEGORIES);
    setNotes('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">QA Scoring</h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Overall Score</div>
            <div className={cn(
              'text-2xl font-bold',
              overallScore >= 80 ? 'text-emerald-600' :
              overallScore >= 60 ? 'text-amber-600' :
              'text-rose-600'
            )}>
              {overallScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* Score Categories */}
      <div className="space-y-4 mb-6">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex-1">
              <label className="font-medium text-gray-700">{category.label}</label>
              <p className="text-sm text-gray-500">
                Rate 1-5: {category.score === 1 && 'Poor'}
                {category.score === 2 && 'Below Average'}
                {category.score === 3 && 'Average'}
                {category.score === 4 && 'Good'}
                {category.score === 5 && 'Excellent'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => handleScoreChange(category.name, score)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={cn(
                      'w-6 h-6 transition-colors',
                      score <= category.score
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">Notes & Feedback</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter your feedback and observations..."
          rows={4}
          className={cn(
            'w-full px-3 py-2 border border-gray-200 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'placeholder:text-gray-400 resize-none'
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={handleReset} disabled={isSaving}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Score
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default QAScoreForm;
