/**
 * QA Criteria Configuration Page
 * Admin interface to configure QA criteria with weighted scoring
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
  Settings,
  ChevronDown,
  ChevronRight,
  Scale,
  ListTree,
  Info,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  X,
  ChevronLeft
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
  parent_criteria_id?: string;
  is_scorable?: boolean;
  rollup_mode?: 'children' | 'self' | 'both';
}

const DEFAULT_CRITERIA: CriteriaFormData = {
  id: '',
  name: '',
  description: '',
  ai_prompt: '',
  scoring_type: 'scale',
  max_score: 10,
  weight: 0,
  is_required: false,
  sort_order: 0,
  parent_criteria_id: undefined,
  is_scorable: true,
  rollup_mode: 'children',
};

const QA_CRITERIA_EXAMPLES = [
  {
    name: 'Opening Section',
    description: 'Opening and greeting evaluation',
    prompt: 'Evaluate if the operator properly greeted the customer, introduced themselves with name and position, and set a positive tone within the first 30 seconds.',
    max_score: 10,
  },
  {
    name: 'Problem Resolution',
    description: 'Effectiveness in solving the issue',
    prompt: 'Did the operator effectively identify the problem, provide accurate information, and resolve the issue efficiently?',
    max_score: 10,
  },
  {
    name: 'Closing Section',
    description: 'Closing and next steps',
    prompt: 'Did the operator properly summarize, confirm satisfaction, and provide clear next steps with a polite closing?',
    max_score: 10,
  },
];

const QACriteriaConfig: React.FC = () => {
  const navigate = useNavigate();
  const { 
    criteria, 
    criteriaHierarchy,
    fetchCriteria, 
    fetchCriteriaHierarchy,
  } = useQAStore();
  
  const [formData, setFormData] = useState<CriteriaFormData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCriteria, setNewCriteria] = useState<CriteriaFormData>(DEFAULT_CRITERIA);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);
  const [originalCriteriaIds, setOriginalCriteriaIds] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [showWeightInfo, setShowWeightInfo] = useState(true);

  // Load criteria on mount
  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    setIsLoading(true);
    await Promise.all([fetchCriteria(), fetchCriteriaHierarchy()]);
    setIsLoading(false);
  };

  // Sync form data with store data
  useEffect(() => {
    const normalized = criteria.map((c, index) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      ai_prompt: c.ai_prompt,
      scoring_type: c.scoring_type === 'binary' ? 'binary' : 'scale',
      max_score: c.max_score || (c.scoring_type === 'binary' ? 1 : 10),
      weight: c.weight || 0,
      is_required: c.is_required || false,
      sort_order: c.sort_order || index,
      parent_criteria_id: c.parent_criteria_id,
      is_scorable: c.is_scorable ?? (c.level === 1),
      rollup_mode: (c as any).rollup_mode || 'children',
    }));
    setFormData(normalized);
    setOriginalCriteriaIds(normalized.map((c) => c.id));
    
    // Auto-expand all parents initially
    const parents = normalized.filter(c => !c.parent_criteria_id);
    if (expandedItems.size === 0 && parents.length > 0) {
      setExpandedItems(new Set(parents.map(p => p.id)));
    }
  }, [criteria]);

  const handleUpdateCriteria = (index: number, field: keyof CriteriaFormData, value: string | number | boolean) => {
    const updated = [...formData];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-adjust max_score for binary type
    if (field === 'scoring_type' && value === 'binary') {
      updated[index].max_score = 1;
    }
    
    setFormData(updated);
  };

  const handleDeleteCriteria = (index: number) => {
    const criteriaToDelete = formData[index];
    
    // Check if it's a parent with children
    const hasChildren = formData.some(c => c.parent_criteria_id === criteriaToDelete.id);
    
    if (hasChildren) {
      if (!confirm(`"${criteriaToDelete.name}" has sub-criteria. Deleting it will also delete all sub-criteria. Are you sure?`)) {
        return;
      }
      // Remove parent and all its children
      const updated = formData.filter((c, i) => 
        i !== index && c.parent_criteria_id !== criteriaToDelete.id
      );
      updated.forEach((c, i) => c.sort_order = i);
      setFormData(updated);
    } else {
      if (confirm('Are you sure you want to delete this criteria?')) {
        const updated = formData.filter((_, i) => i !== index);
        updated.forEach((c, i) => c.sort_order = i);
        setFormData(updated);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate parent weights sum to 100
      const parents = formData.filter(c => !c.parent_criteria_id);
      const parentWeightSum = parents.reduce((sum, p) => sum + (p.weight || 0), 0);
      
      if (parentWeightSum !== 100 && parents.length > 0) {
        // Auto-adjust weights to sum to 100
        const equalWeight = Math.floor(100 / parents.length);
        const remainder = 100 - (equalWeight * parents.length);
        
        const updated = [...formData];
        parents.forEach((p, i) => {
          const idx = updated.findIndex(c => c.id === p.id);
          if (idx >= 0) {
            updated[idx].weight = i === parents.length - 1 ? equalWeight + remainder : equalWeight;
          }
        });
        setFormData(updated);
      }
      
      const currentIds = new Set(formData.map((c) => c.id));
      const removedIds = originalCriteriaIds.filter((id) => !currentIds.has(id));

      await apiClient.post('/qa/criteria/bulk', {
        criteria: formData,
        removed_ids: removedIds,
      });

      showSuccess('QA criteria saved successfully');
      await loadCriteria();
      setOriginalCriteriaIds(formData.map((c) => c.id));
    } catch (error: any) {
      showError(error.message || 'Failed to save criteria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCriteria = (asChild: boolean = false) => {
    if (!newCriteria.name || !newCriteria.ai_prompt) {
      showError('Name and AI Prompt are required');
      return;
    }

    const parents = formData.filter(c => !c.parent_criteria_id);
    
    if (asChild && parents.length === 0) {
      showError('Create a parent criteria first');
      return;
    }

    const criteriaToAdd: CriteriaFormData = {
      ...newCriteria,
      id: `qc_${Date.now()}`,
      sort_order: formData.length,
      parent_criteria_id: asChild ? (selectedParentId || parents[0]?.id) : undefined,
      is_scorable: true,
      rollup_mode: asChild ? 'self' : 'children',
    };

    setFormData([...formData, criteriaToAdd]);
    setNewCriteria(DEFAULT_CRITERIA);
    setShowAddForm(false);
    setSelectedExample(null);
    
    // Auto-expand parent when adding child
    if (asChild && criteriaToAdd.parent_criteria_id) {
      setExpandedItems(prev => new Set([...prev, criteriaToAdd.parent_criteria_id!]));
    }
    
    showSuccess(asChild ? 'Sub-criteria added' : 'Criteria added');
  };

  const applyExample = (index: number) => {
    const example = QA_CRITERIA_EXAMPLES[index];
    setNewCriteria({
      ...newCriteria,
      name: example.name,
      description: example.description,
      ai_prompt: example.prompt,
      max_score: example.max_score,
    });
    setSelectedExample(index);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate parent weight statistics
  const parentWeightStats = () => {
    const parents = formData.filter(c => !c.parent_criteria_id);
    const sum = parents.reduce((acc, p) => acc + (p.weight || 0), 0);
    return { sum, count: parents.length, isValid: sum === 100 };
  };

  // Calculate child weight statistics for a parent
  const childWeightStats = (parentId: string) => {
    const children = formData.filter(c => c.parent_criteria_id === parentId);
    const sum = children.reduce((acc, c) => acc + (c.weight || 0), 0);
    return { sum, count: children.length, isValid: sum === 100 };
  };

  const parents = formData.filter(c => !c.parent_criteria_id);
  const weightStats = parentWeightStats();

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Loading criteria...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QA Criteria Configuration</h1>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Configure weighted criteria for AI and human QA scoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Parent Weight Summary */}
            <div className={cn(
              "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium",
              weightStats.isValid 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              <Scale className="w-4 h-4" />
              <span>Parent Weights: {weightStats.sum}%</span>
              {weightStats.isValid && <CheckCircle2 className="w-4 h-4" />}
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      {showWeightInfo && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">How Weighted Scoring Works</h3>
                <button 
                  onClick={() => setShowWeightInfo(false)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">Main Criteria (Parent)</p>
                  <p className="text-blue-700">
                    Top-level categories like "Opening" or "Closing". 
                    <strong> Overall Weight</strong> determines contribution to final score.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Sub-criteria (Children)</p>
                  <p className="text-blue-700">
                    Specific behaviors to evaluate. 
                    <strong> Within Parent %</strong> determines how they roll up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {!weightStats.isValid && parents.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-800">
              <strong>Parent weights must sum to 100%</strong> for overall calculation. 
              Current total is {weightStats.sum}%. 
              Weights will be auto-adjusted when you save.
            </p>
          </div>
        </div>
      )}

      {/* Criteria List */}
      <div className="space-y-4 mb-6">
        {parents.length > 0 ? (
          parents.map((parent) => {
            const parentIndex = formData.findIndex(c => c.id === parent.id);
            const isExpanded = expandedItems.has(parent.id);
            const childStats = childWeightStats(parent.id);
            const children = formData.filter(c => c.parent_criteria_id === parent.id);
            
            return (
              <div key={parent.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Parent Header */}
                <div className="p-4 bg-gray-50/50 border-b border-gray-200">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors mt-0.5",
                        isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg">
                          Main Criteria
                        </span>
                        {!childStats.isValid && children.length > 0 && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Child weights: {childStats.sum}%
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-12 gap-4">
                        {/* Name */}
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Criteria Name
                          </label>
                          <input
                            type="text"
                            value={parent.name}
                            onChange={(e) => handleUpdateCriteria(parentIndex, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            placeholder="e.g., Opening Section"
                          />
                        </div>
                        
                        {/* Max Points */}
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Max Points
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={parent.max_score}
                            onChange={(e) => handleUpdateCriteria(parentIndex, 'max_score', parseInt(e.target.value) || 10)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        
                        {/* Overall Weight */}
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Overall Weight %
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={parent.weight}
                              onChange={(e) => handleUpdateCriteria(parentIndex, 'weight', parseInt(e.target.value) || 0)}
                              className={cn(
                                "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors",
                                parent.weight === 0 ? "border-amber-300 bg-amber-50/50" : "border-gray-200 bg-white"
                              )}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                        
                        {/* Rollup Mode */}
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            Rollup From
                          </label>
                          <select
                            value={parent.rollup_mode}
                            onChange={(e) => handleUpdateCriteria(parentIndex, 'rollup_mode', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                          >
                            <option value="children">Sub-criteria</option>
                            <option value="self">Direct score</option>
                            <option value="both">Combined</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* AI Prompt */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          AI Evaluation Prompt
                        </label>
                        <textarea
                          value={parent.ai_prompt}
                          onChange={(e) => handleUpdateCriteria(parentIndex, 'ai_prompt', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                          placeholder="Instructions for AI on how to evaluate this criteria..."
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteCriteria(parentIndex)}
                      className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Children Section */}
                {isExpanded && (
                  <div className="p-4 bg-white">
                    <div className="space-y-3">
                      {children.map((child) => {
                        const childIndex = formData.findIndex(c => c.id === child.id);
                        return (
                          <div 
                            key={child.id} 
                            className="flex items-start gap-4 p-4 bg-gray-50/50 border border-gray-200 rounded-xl"
                          >
                            <div className="p-1.5 text-gray-400 mt-0.5">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-medium text-indigo-600">
                                  Sub-criteria of {parent.name}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-12 gap-4">
                                {/* Name */}
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    value={child.name}
                                    onChange={(e) => handleUpdateCriteria(childIndex, 'name', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                    placeholder="e.g., Say Hello"
                                  />
                                </div>
                                
                                {/* Type */}
                                <div className="col-span-2">
                                  <select
                                    value={child.scoring_type}
                                    onChange={(e) => handleUpdateCriteria(childIndex, 'scoring_type', e.target.value as ScoringType)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                  >
                                    <option value="scale">Scale</option>
                                    <option value="binary">Yes/No</option>
                                  </select>
                                </div>
                                
                                {/* Max Score */}
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={child.scoring_type === 'binary' ? 1 : 100}
                                    value={child.max_score}
                                    onChange={(e) => handleUpdateCriteria(childIndex, 'max_score', parseInt(e.target.value) || (child.scoring_type === 'binary' ? 1 : 5))}
                                    disabled={child.scoring_type === 'binary'}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                                  />
                                </div>
                                
                                {/* Weight within parent */}
                                <div className="col-span-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={child.weight}
                                      onChange={(e) => handleUpdateCriteria(childIndex, 'weight', parseInt(e.target.value) || 0)}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                    />
                                    <span className="text-sm text-gray-500">%</span>
                                  </div>
                                </div>
                                
                                {/* Required */}
                                <div className="col-span-2 flex items-center">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={child.is_required}
                                      onChange={(e) => handleUpdateCriteria(childIndex, 'is_required', e.target.checked)}
                                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-600">Required</span>
                                  </label>
                                </div>
                              </div>
                              
                              {/* AI Prompt */}
                              <div className="mt-3">
                                <textarea
                                  value={child.ai_prompt}
                                  onChange={(e) => handleUpdateCriteria(childIndex, 'ai_prompt', e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                                  placeholder="AI evaluation prompt..."
                                />
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleDeleteCriteria(childIndex)}
                              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Add Sub-criteria Button */}
                      <button
                        onClick={() => {
                          setSelectedParentId(parent.id);
                          setNewCriteria({ ...DEFAULT_CRITERIA, parent_criteria_id: parent.id });
                          setShowAddForm(true);
                        }}
                        className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Sub-criteria to "{parent.name}"
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ListTree className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No criteria yet</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create your first main criteria to get started with weighted QA scoring
            </p>
          </div>
        )}
      </div>

      {/* Add New Criteria */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Main Criteria
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Add New Criteria</h3>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setNewCriteria(DEFAULT_CRITERIA);
                setSelectedExample(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Quick Examples */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Start (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {QA_CRITERIA_EXAMPLES.map((example, index) => (
                <button
                  key={index}
                  onClick={() => applyExample(index)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-all',
                    selectedExample === index
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {example.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Criteria Name
                </label>
                <input
                  type="text"
                  value={newCriteria.name}
                  onChange={(e) => setNewCriteria({ ...newCriteria, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Opening Section"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max Points
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newCriteria.max_score}
                  onChange={(e) => setNewCriteria({ ...newCriteria, max_score: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Overall Weight %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newCriteria.weight}
                  onChange={(e) => setNewCriteria({ ...newCriteria, weight: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                AI Evaluation Prompt
              </label>
              <textarea
                value={newCriteria.ai_prompt}
                onChange={(e) => setNewCriteria({ ...newCriteria, ai_prompt: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                placeholder="How should the AI evaluate this criteria?"
              />
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => handleAddCriteria(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Main Criteria
              </button>
              {parents.length > 0 && (
                <button 
                  onClick={() => handleAddCriteria(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add as Sub-criteria
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QACriteriaConfig;
