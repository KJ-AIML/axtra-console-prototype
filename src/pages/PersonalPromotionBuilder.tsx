/**
 * Personal Promotion Builder
 * Create and edit personal (targeted) promotions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { useOfferStore, type PersonalPromotion, type DiscountType, type TriggerType } from '../stores';
import {
  ArrowLeft,
  Save,
  Gift,
  Target,
  Users,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Percent,
  DollarSign,
  Crown,
  Clock,
  Calendar,
  MessageSquare,
  Megaphone,
  GiftIcon,
  Coins,
  Truck,
} from 'lucide-react';

interface Props {
  className?: string;
}

const DISCOUNT_TYPES: { value: DiscountType | 'tier_upgrade'; label: string; icon: React.ElementType }[] = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'free_shipping', label: 'Free Shipping', icon: Truck },
  { value: 'points_bonus', label: 'Points Bonus', icon: Coins },
  { value: 'tier_upgrade', label: 'Tier Upgrade', icon: Crown },
];

const TRIGGER_TYPES: { value: TriggerType; label: string; description: string }[] = [
  { value: 'manual', label: 'Manual', description: 'Operator manually applies' },
  { value: 'auto_escalation', label: 'Auto-Escalation', description: 'Triggered when customer escalates' },
  { value: 'auto_churn_risk', label: 'Churn Risk', description: 'Triggered for at-risk customers' },
  { value: 'auto_birthday', label: 'Birthday', description: 'Triggered on customer birthday' },
  { value: 'auto_anniversary', label: 'Anniversary', description: 'Triggered on membership anniversary' },
  { value: 'auto_inactive', label: 'Inactive', description: 'Triggered for inactive customers' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Disabled' },
];

const TIER_OPTIONS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const PersonalPromotionBuilder: React.FC<Props> = ({ className }) => {
  const { promotionId } = useParams<{ promotionId: string }>();
  const navigate = useNavigate();
  const {
    selectedPersonalPromotion,
    fetchPromotionById,
    createPersonalPromotion,
    updatePersonalPromotion,
    isLoading,
    isLoadingDetails,
    error,
    clearError,
  } = useOfferStore();

  const isEditing = Boolean(promotionId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'targeting' | 'benefits' | 'copilot'>('basic');

  // Form state
  const [formData, setFormData] = useState<Partial<PersonalPromotion>>({
    name: '',
    name_th: '',
    description: '',
    description_th: '',
    discount_type: 'percentage',
    discount_value: undefined,
    max_discount_amount: undefined,
    benefits_summary: {
      discount_percent: undefined,
      discount_amount: undefined,
      extra_points: undefined,
      free_shipping_months: false,
      tier_extension_months: undefined,
      welcome_gift: false,
    },
    target_tiers: [],
    target_min_tenure_months: undefined,
    target_max_tenure_months: undefined,
    trigger_type: 'manual',
    auto_apply: false,
    require_operator_approval: true,
    usage_limit_total: undefined,
    usage_limit_per_user: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: undefined,
    status: 'draft',
    display_priority: 0,
    notification_message: '',
    notification_message_th: '',
    copilot_card_title: '',
    copilot_card_title_th: '',
    copilot_suggestion_script: '',
    copilot_suggestion_script_th: '',
  });

  // Load existing promotion data
  useEffect(() => {
    if (isEditing && promotionId) {
      fetchPromotionById(promotionId, 'personal');
    }
  }, [isEditing, promotionId, fetchPromotionById]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedPersonalPromotion) {
      setFormData({
        name: selectedPersonalPromotion.name,
        name_th: selectedPersonalPromotion.name_th || '',
        description: selectedPersonalPromotion.description,
        description_th: selectedPersonalPromotion.description_th || '',
        discount_type: selectedPersonalPromotion.discount_type,
        discount_value: selectedPersonalPromotion.discount_value,
        max_discount_amount: selectedPersonalPromotion.max_discount_amount,
        benefits_summary: selectedPersonalPromotion.benefits_summary || {
          discount_percent: undefined,
          discount_amount: undefined,
          extra_points: undefined,
          free_shipping_months: false,
          tier_extension_months: undefined,
          welcome_gift: false,
        },
        target_tiers: selectedPersonalPromotion.target_tiers || [],
        target_min_tenure_months: selectedPersonalPromotion.target_min_tenure_months,
        target_max_tenure_months: selectedPersonalPromotion.target_max_tenure_months,
        trigger_type: selectedPersonalPromotion.trigger_type,
        auto_apply: selectedPersonalPromotion.auto_apply,
        require_operator_approval: selectedPersonalPromotion.require_operator_approval,
        usage_limit_total: selectedPersonalPromotion.usage_limit_total,
        usage_limit_per_user: selectedPersonalPromotion.usage_limit_per_user,
        start_date: selectedPersonalPromotion.start_date?.split('T')[0],
        end_date: selectedPersonalPromotion.end_date?.split('T')[0],
        status: selectedPersonalPromotion.status,
        display_priority: selectedPersonalPromotion.display_priority,
        notification_message: selectedPersonalPromotion.notification_message || '',
        notification_message_th: selectedPersonalPromotion.notification_message_th || '',
        copilot_card_title: selectedPersonalPromotion.copilot_card_title || '',
        copilot_card_title_th: selectedPersonalPromotion.copilot_card_title_th || '',
        copilot_suggestion_script: selectedPersonalPromotion.copilot_suggestion_script || '',
        copilot_suggestion_script_th: selectedPersonalPromotion.copilot_suggestion_script_th || '',
      });
    }
  }, [isEditing, selectedPersonalPromotion]);

  // Handle form field changes
  const handleChange = useCallback(<K extends keyof PersonalPromotion>(
    field: K,
    value: PersonalPromotion[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle benefits summary changes
  const handleBenefitsChange = useCallback(<K extends keyof PersonalPromotion['benefits_summary']>(
    field: K,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      benefits_summary: {
        ...prev.benefits_summary!,
        [field]: value,
      },
    }));
  }, []);

  // Toggle tier selection
  const toggleTier = useCallback((tier: string) => {
    const current = formData.target_tiers || [];
    if (current.includes(tier)) {
      handleChange('target_tiers', current.filter(t => t !== tier));
    } else {
      handleChange('target_tiers', [...current, tier]);
    }
  }, [formData.target_tiers, handleChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error('Promotion name is required');
      }
      if (!formData.description?.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.start_date) {
        throw new Error('Start date is required');
      }

      const dataToSave = {
        ...formData,
        start_date: new Date(formData.start_date!).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      };

      if (isEditing && promotionId) {
        await updatePersonalPromotion(promotionId, dataToSave);
      } else {
        await createPersonalPromotion(dataToSave);
      }

      navigate('/offers');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save promotion');
    } finally {
      setIsSaving(false);
    }
  }, [formData, isEditing, promotionId, createPersonalPromotion, updatePersonalPromotion, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    navigate('/offers');
  }, [navigate]);

  if (isEditing && isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading promotion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 pb-20', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Personal Promotion' : 'Create Personal Promotion'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing
                    ? 'Update targeted promotion details'
                    : 'Create a personalized offer for specific customers'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isEditing ? 'Update Promotion' : 'Create Promotion'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {(error || saveError) && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-rose-500 shrink-0" size={20} />
              <p className="text-sm text-rose-700">{error || saveError}</p>
              <button
                onClick={() => { clearError(); setSaveError(null); }}
                className="ml-auto text-rose-500 hover:text-rose-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-gray-200">
            {[
              { id: 'basic', label: 'Basic Info', icon: Gift },
              { id: 'targeting', label: 'Targeting', icon: Target },
              { id: 'benefits', label: 'Benefits', icon: Zap },
              { id: 'copilot', label: 'Copilot', icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-indigo-500" />
                Status
              </h2>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleChange('status', status.value as any)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      formData.status === status.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Gift size={20} className="text-indigo-500" />
                Promotion Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (English) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g., Gold Member Retention Offer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (Thai)
                    </label>
                    <input
                      type="text"
                      value={formData.name_th}
                      onChange={(e) => handleChange('name_th', e.target.value)}
                      placeholder="e.g., ข้อเสนอรักษาสมาชิก Gold"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (English) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Describe who this promotion is for..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Thai)
                    </label>
                    <textarea
                      value={formData.description_th}
                      onChange={(e) => handleChange('description_th', e.target.value)}
                      placeholder="อธิบายว่าโปรโมชั่นนี้เหมาะกับใคร..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trigger Type */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-indigo-500" />
                Trigger Type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {TRIGGER_TYPES.map((trigger) => (
                  <button
                    key={trigger.value}
                    onClick={() => handleChange('trigger_type', trigger.value)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      formData.trigger_type === trigger.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="font-medium text-gray-900">{trigger.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{trigger.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500" />
                Validity Period
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => handleChange('end_date', e.target.value || undefined)}
                    placeholder="No expiry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Auto-apply & Approval */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap size={20} className="text-indigo-500" />
                Automation Settings
              </h2>
              
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-900">Auto-apply</div>
                  <div className="text-sm text-gray-500">Automatically apply to eligible customers</div>
                </div>
                <button
                  onClick={() => handleChange('auto_apply', !formData.auto_apply)}
                  className={cn(
                    'w-14 h-8 rounded-full transition-colors relative',
                    formData.auto_apply ? 'bg-indigo-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-6 h-6 bg-white rounded-full transition-transform',
                      formData.auto_apply ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-gray-900">Require Operator Approval</div>
                  <div className="text-sm text-gray-500">Operator must confirm before applying</div>
                </div>
                <button
                  onClick={() => handleChange('require_operator_approval', !formData.require_operator_approval)}
                  className={cn(
                    'w-14 h-8 rounded-full transition-colors relative',
                    formData.require_operator_approval ? 'bg-indigo-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-6 h-6 bg-white rounded-full transition-transform',
                      formData.require_operator_approval ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Targeting Tab */}
        {activeTab === 'targeting' && (
          <div className="space-y-6">
            {/* Target Tiers */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Crown size={20} className="text-indigo-500" />
                Target Tiers
              </h2>
              <div className="flex flex-wrap gap-2">
                {TIER_OPTIONS.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-colors',
                      formData.target_tiers?.includes(tier)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Select which membership tiers are eligible for this promotion
              </p>
            </div>

            {/* Tenure Requirements */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-indigo-500" />
                Membership Tenure
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Tenure (months)
                  </label>
                  <input
                    type="number"
                    value={formData.target_min_tenure_months || ''}
                    onChange={(e) => handleChange('target_min_tenure_months', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No minimum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Tenure (months)
                  </label>
                  <input
                    type="number"
                    value={formData.target_max_tenure_months || ''}
                    onChange={(e) => handleChange('target_max_tenure_months', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No maximum"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                Usage Limits
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Usage Limit (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit_total || ''}
                    onChange={(e) => handleChange('usage_limit_total', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit_per_user}
                    onChange={(e) => handleChange('usage_limit_per_user', parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Display Priority */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Priority</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (higher = shown first)
                </label>
                <input
                  type="number"
                  value={formData.display_priority}
                  onChange={(e) => handleChange('display_priority', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-6">
            {/* Discount Type */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefit Type</h2>
              <div className="grid grid-cols-3 gap-3">
                {DISCOUNT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleChange('discount_type', type.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      formData.discount_type === type.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    )}
                  >
                    <type.icon size={24} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Benefits Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GiftIcon size={20} className="text-indigo-500" />
                Benefits Package
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.benefits_summary?.discount_percent || ''}
                      onChange={(e) => handleBenefitsChange('discount_percent', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.benefits_summary?.discount_amount || ''}
                      onChange={(e) => handleBenefitsChange('discount_amount', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extra Points
                  </label>
                  <input
                    type="number"
                    value={formData.benefits_summary?.extra_points || ''}
                    onChange={(e) => handleBenefitsChange('extra_points', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tier Extension (months)
                  </label>
                  <input
                    type="number"
                    value={formData.benefits_summary?.tier_extension_months || ''}
                    onChange={(e) => handleBenefitsChange('tier_extension_months', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.benefits_summary?.free_shipping_months}
                    onChange={(e) => handleBenefitsChange('free_shipping_months', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Free shipping for 1 month</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.benefits_summary?.welcome_gift}
                    onChange={(e) => handleBenefitsChange('welcome_gift', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Include welcome gift</span>
                </label>
              </div>
            </div>

            {/* Notification Message */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-500" />
                Notification Message
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (English)
                  </label>
                  <textarea
                    value={formData.notification_message}
                    onChange={(e) => handleChange('notification_message', e.target.value)}
                    placeholder="Message shown to customer when promotion is applied..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Thai)
                  </label>
                  <textarea
                    value={formData.notification_message_th}
                    onChange={(e) => handleChange('notification_message_th', e.target.value)}
                    placeholder="ข้อความที่แสดงให้ลูกค้าเมื่อใช้โปรโมชั่น..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copilot Tab */}
        {activeTab === 'copilot' && (
          <div className="space-y-6">
            {/* Copilot Card Title */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-500" />
                Copilot Card Title
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                This title appears in the AXTRA Copilot card when suggesting this promotion
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    value={formData.copilot_card_title}
                    onChange={(e) => handleChange('copilot_card_title', e.target.value)}
                    placeholder="e.g., Retention Offer Available"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (Thai)
                  </label>
                  <input
                    type="text"
                    value={formData.copilot_card_title_th}
                    onChange={(e) => handleChange('copilot_card_title_th', e.target.value)}
                    placeholder="e.g., มีข้อเสนอรักษาสมาชิก"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Suggestion Script */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} className="text-indigo-500" />
                Suggested Script
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                This script is shown to operators as a suggestion for how to present this promotion
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Script (English)
                  </label>
                  <textarea
                    value={formData.copilot_suggestion_script}
                    onChange={(e) => handleChange('copilot_suggestion_script', e.target.value)}
                    placeholder="I see you're a valued member. I'd like to offer you a special discount..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Script (Thai)
                  </label>
                  <textarea
                    value={formData.copilot_suggestion_script_th}
                    onChange={(e) => handleChange('copilot_suggestion_script_th', e.target.value)}
                    placeholder="ฉันเห็นว่าคุณเป็นสมาชิกที่มีค่า ฉันขอเสนอส่วนลดพิเศษ..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalPromotionBuilder;
