/**
 * QA Criteria Configuration Page
 * Admin interface to configure QA criteria
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Loader2,
  AlertCircle,
  Settings,
  CheckCircle2
} from 'lucide-react';
import { useQAStore, showSuccess, showError, type ScoringType } from '../stores';
import Button from '../components/ui/Button';
import { cn } from '../utils/classnames';
import { apiClient } from '../lib/api-client';

interface CriteriaFormData {
  id: string;
  name: string;
  description: string;
  ai_prompt: string;
  scoring_type: ScoringType;
  max_score: number;
  weight: number;
  is_required: boolean;
  sort_order: number;
}

const DEFAULT_CRITERIA: CriteriaFormData = {
  id: '',
  name: '',
  description: '',
  ai_prompt: '',
  scoring_type: 'scale',
  max_score: 5,
  weight: 0,
  is_required: false,
  sort_order: 0,
};

const SCORING_TYPE_OPTIONS: { value: ScoringType; label: string; description: string }[] = [
  { value: 'scale', label: 'Point Scale', description: 'Configurable point scale (e.g., 1-5, 1-10, 0-100)' },
  { value: 'binary', label: 'Yes/No (Pass/Fail)', description: 'Simple binary check' },
];

const QA_CRITERIA_EXAMPLES = [
  {
    name: 'Opening & Greeting',
    description: 'First impression and proper greeting',
    prompt: 'Did the operator properly greet the customer, introduce themselves, and set a positive tone in the first 30 seconds? Evaluate warmth, professionalism, and clarity of the opening.'
  },
  {
    name: 'Empathy & Understanding',
    description: 'Emotional intelligence and customer understanding',
    prompt: 'Did the operator show genuine empathy, acknowledge the customer\'s feelings, and demonstrate understanding of their issue? Look for phrases like "I understand", "That must be frustrating", active listening, and emotional validation.'
  },
  {
    name: 'Problem Resolution',
    description: 'Effectiveness in solving the issue',
    prompt: 'Did the operator effectively identify the problem, provide accurate information, and resolve the issue efficiently? Evaluate problem diagnosis, solution quality, and resolution completeness.'
  },
  {
    name: 'Professionalism',
    description: 'Professional conduct throughout the call',
    prompt: 'Did the operator maintain a professional demeanor, use appropriate language, and stay calm throughout the call? Consider tone, language choice, patience, and handling of difficult moments.'
  },
  {
    name: 'Closing & Next Steps',
    description: 'Proper conclusion and follow-up',
    prompt: 'Did the operator properly summarize the resolution, confirm customer satisfaction, and provide clear next steps if needed? Evaluate if the customer was left with a positive final impression and clear understanding of what happens next.'
  }
];

const QACriteriaConfig: React.FC = () => {
  const navigate = useNavigate();
  const { criteria, fetchCriteria } = useQAStore();
  
  const [formData, setFormData] = useState<CriteriaFormData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCriteria, setNewCriteria] = useState<CriteriaFormData>(DEFAULT_CRITERIA);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  // Load criteria on mount
  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    setIsLoading(true);
    await fetchCriteria();
    setIsLoading(false);
  };

  // Sync form data with store data
  useEffect(() => {
    if (criteria.length > 0) {
      setFormData(criteria.map((c, index) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        ai_prompt: c.ai_prompt,
        scoring_type: c.scoring_type || 'scale',
        max_score: c.max_score || 5,
        weight: c.weight || 0,
        is_required: c.is_required || false,
        sort_order: c.sort_order || index,
      })));
    }
  }, [criteria]);

  const handleUpdateCriteria = (index: number, field: keyof CriteriaFormData, value: string | number) => {
    const updated = [...formData];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(updated);
  };

  const handleDeleteCriteria = (index: number) => {
    if (confirm('Are you sure you want to delete this criteria?')) {
      const updated = formData.filter((_, i) => i !== index);
      // Recalculate sort_order
      updated.forEach((c, i) => c.sort_order = i);
      setFormData(updated);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...formData];
    const dragged = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, dragged);
    
    // Recalculate sort_order
    updated.forEach((c, i) => c.sort_order = i);
    
    setFormData(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate - only check weights if there are weighted criteria
      const weightedCriteria = formData.filter(c => c.weight > 0);
      const totalWeight = weightedCriteria.reduce((sum, c) => sum + c.weight, 0);
      
      if (weightedCriteria.length > 0 && totalWeight !== 100) {
        showError(`Weighted criteria total must equal 100%. Current: ${totalWeight}%`);
        setIsSaving(false);
        return;
      }

      // Save each criteria
      for (const criteria of formData) {
        await apiClient.post('/qa/criteria', criteria);
      }

      showSuccess('QA criteria saved successfully');
      await fetchCriteria();
    } catch (error: any) {
      showError(error.message || 'Failed to save criteria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCriteria = () => {
    if (!newCriteria.name || !newCriteria.ai_prompt) {
      showError('Name and AI Prompt are required');
      return;
    }

    const criteriaToAdd = {
      ...newCriteria,
      id: `qc_${Date.now()}`,
      sort_order: formData.length,
    };

    setFormData([...formData, criteriaToAdd]);
    setNewCriteria(DEFAULT_CRITERIA);
    setShowAddForm(false);
    setSelectedExample(null);
    showSuccess('Criteria added');
  };

  const applyExample = (index: number) => {
    const example = QA_CRITERIA_EXAMPLES[index];
    setNewCriteria({
      ...newCriteria,
      name: example.name,
      description: example.description,
      ai_prompt: example.prompt,
    });
    setSelectedExample(index);
  };

  const totalWeight = formData.reduce((sum, c) => sum + c.weight, 0);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Criteria Configuration</h1>
            <p className="text-gray-500">
              Configure the criteria used for AI and human QA scoring
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(() => {
            const weightedCriteria = formData.filter(c => c.weight > 0);
            const weightedTotal = weightedCriteria.reduce((sum, c) => sum + c.weight, 0);
            const hasWeighted = weightedCriteria.length > 0;
            if (!hasWeighted) {
              return (
                <div className="px-4 py-2 rounded-lg font-medium bg-gray-50 text-gray-600">
                  No Weighted Criteria
                </div>
              );
            }
            return (
              <div className={cn(
                'px-4 py-2 rounded-lg font-medium',
                weightedTotal === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              )}>
                Weighted Total: {weightedTotal}%
                {weightedTotal !== 100 && ' (Must be 100%)'}
              </div>
            );
          })()}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">How QA Criteria Work</h3>
            <p className="text-sm text-blue-700 mt-1">
              These criteria are used by both the AI QA Agent and human reviewers.
              The AI Prompt guides the AI on how to evaluate each criteria.
              <strong>Scoring Type:</strong> Use &quot;Point Scale&quot; for subjective ratings (set any max: 5, 10, 100, etc.) or &quot;Yes/No&quot; for binary checks.
              <strong>Weight:</strong> Set to 0 for criteria that don&apos;t affect the overall score (informational only). Weighted criteria must total 100%.
              <strong>Required:</strong> Mark criteria that must be passed for the call to be considered successful.
            </p>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-4 mb-6">
        {formData.map((criteria, index) => (
          <div
            key={criteria.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'bg-white rounded-lg border p-4 transition-all',
              draggedIndex === index ? 'border-indigo-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div 
                className="p-2 cursor-move text-gray-400 hover:text-gray-600"
                title="Drag to reorder"
              >
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  {/* Name */}
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Criteria Name *
                    </label>
                    <input
                      type="text"
                      value={criteria.name}
                      onChange={(e) => handleUpdateCriteria(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Empathy"
                    />
                  </div>

                  {/* Scoring Type */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Type
                    </label>
                    <select
                      value={criteria.scoring_type}
                      onChange={(e) => handleUpdateCriteria(index, 'scoring_type', e.target.value as ScoringType)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {SCORING_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Score (only for scale type) */}
                  {criteria.scoring_type === 'scale' && (
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={criteria.max_score}
                        onChange={(e) => handleUpdateCriteria(index, 'max_score', parseInt(e.target.value) || 5)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Weight */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Weight (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={criteria.weight}
                      onChange={(e) => handleUpdateCriteria(index, 'weight', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Required */}
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Required
                    </label>
                    <input
                      type="checkbox"
                      checked={criteria.is_required}
                      onChange={(e) => handleUpdateCriteria(index, 'is_required', e.target.checked)}
                      className="w-5 h-5 mt-2 accent-indigo-600"
                    />
                  </div>

                  {/* Description */}
                  <div className={criteria.scoring_type === 'scale' ? "col-span-3" : "col-span-4"}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={criteria.description}
                      onChange={(e) => handleUpdateCriteria(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Brief description"
                    />
                  </div>
                </div>

                {/* AI Prompt */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    AI Prompt *
                  </label>
                  <textarea
                    value={criteria.ai_prompt}
                    onChange={(e) => handleUpdateCriteria(index, 'ai_prompt', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Instructions for the AI on how to evaluate this criteria..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This prompt guides the AI QA Agent when scoring calls.
                  </p>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteCriteria(index)}
                className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                title="Delete criteria"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Criteria */}
      {!showAddForm ? (
        <Button
          variant="secondary"
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-dashed"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Criteria
        </Button>
      ) : (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Criteria</h3>

          {/* Quick Examples */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Quick Start (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {QA_CRITERIA_EXAMPLES.map((example, index) => (
                <button
                  key={index}
                  onClick={() => applyExample(index)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    selectedExample === index
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {example.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCriteria.name}
                  onChange={(e) => setNewCriteria({ ...newCriteria, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Upselling Technique"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newCriteria.scoring_type}
                  onChange={(e) => setNewCriteria({ ...newCriteria, scoring_type: e.target.value as ScoringType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {SCORING_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {newCriteria.scoring_type === 'scale' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={newCriteria.max_score}
                    onChange={(e) => setNewCriteria({ ...newCriteria, max_score: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newCriteria.weight}
                  onChange={(e) => setNewCriteria({ ...newCriteria, weight: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required
                </label>
                <input
                  type="checkbox"
                  checked={newCriteria.is_required}
                  onChange={(e) => setNewCriteria({ ...newCriteria, is_required: e.target.checked })}
                  className="w-5 h-5 mt-2 accent-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newCriteria.description}
                onChange={(e) => setNewCriteria({ ...newCriteria, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Prompt *
              </label>
              <textarea
                value={newCriteria.ai_prompt}
                onChange={(e) => setNewCriteria({ ...newCriteria, ai_prompt: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="How should the AI evaluate this criteria?"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCriteria(DEFAULT_CRITERIA);
                  setSelectedExample(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCriteria}>
                <Plus className="w-4 h-4 mr-2" />
                Add Criteria
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Warning */}
      {(() => {
        const weightedTotal = formData.filter(c => c.weight > 0).reduce((sum, c) => sum + c.weight, 0);
        const hasWeighted = formData.some(c => c.weight > 0);
        if (!hasWeighted) return null;
        if (weightedTotal === 100) return null;
        return (
          <div className="mt-6 flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <span>
              Weighted criteria total is {weightedTotal}%, but must equal 100%.
              Please adjust weights or set unused criteria to 0.
            </span>
          </div>
        );
      })()}
    </div>
  );
};

export default QACriteriaConfig;
