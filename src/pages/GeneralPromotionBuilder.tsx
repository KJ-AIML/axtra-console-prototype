/**
 * General Promotion Builder
 * Create and edit general (public) promotions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { useOfferStore, type GeneralPromotion, type DiscountType } from '../stores';
import {
  ArrowLeft,
  Save,
  Megaphone,
  Tag,
  Calendar,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Percent,
  DollarSign,
  ShoppingBag,
  Gift,
  Coins,
  Truck,
} from 'lucide-react';

interface Props {
  className?: string;
}

const DISCOUNT_TYPES: { value: DiscountType; label: string; icon: React.ElementType }[] = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'free_shipping', label: 'Free Shipping', icon: Truck },
  { value: 'free_gift', label: 'Free Gift', icon: Gift },
  { value: 'points_bonus', label: 'Points Bonus', icon: Coins },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Disabled' },
];

const GeneralPromotionBuilder: React.FC<Props> = ({ className }) => {
  const { promotionId } = useParams<{ promotionId: string }>();
  const navigate = useNavigate();
  const {
    selectedGeneralPromotion,
    fetchPromotionById,
    createGeneralPromotion,
    updateGeneralPromotion,
    isLoading,
    isLoadingDetails,
    error,
    clearError,
  } = useOfferStore();

  const isEditing = Boolean(promotionId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'discount' | 'limits' | 'copilot'>('basic');

  // Form state
  const [formData, setFormData] = useState<Partial<GeneralPromotion>>({
    name: '',
    name_th: '',
    description: '',
    description_th: '',
    promo_code: '',
    discount_type: 'percentage',
    discount_value: undefined,
    max_discount_amount: undefined,
    min_order_amount: 0,
    usage_limit_total: undefined,
    usage_limit_per_user: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    display_priority: 0,
    terms_and_conditions: '',
    terms_and_conditions_th: '',
    copilot_suggestion_enabled: false,
    copilot_trigger_keywords: [],
  });

  const [newKeyword, setNewKeyword] = useState('');

  // Load existing promotion data
  useEffect(() => {
    if (isEditing && promotionId) {
      fetchPromotionById(promotionId, 'general');
    }
  }, [isEditing, promotionId, fetchPromotionById]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && selectedGeneralPromotion) {
      setFormData({
        name: selectedGeneralPromotion.name,
        name_th: selectedGeneralPromotion.name_th || '',
        description: selectedGeneralPromotion.description,
        description_th: selectedGeneralPromotion.description_th || '',
        promo_code: selectedGeneralPromotion.promo_code || '',
        discount_type: selectedGeneralPromotion.discount_type,
        discount_value: selectedGeneralPromotion.discount_value,
        max_discount_amount: selectedGeneralPromotion.max_discount_amount,
        min_order_amount: selectedGeneralPromotion.min_order_amount,
        usage_limit_total: selectedGeneralPromotion.usage_limit_total,
        usage_limit_per_user: selectedGeneralPromotion.usage_limit_per_user,
        start_date: selectedGeneralPromotion.start_date?.split('T')[0],
        end_date: selectedGeneralPromotion.end_date?.split('T')[0],
        status: selectedGeneralPromotion.status,
        display_priority: selectedGeneralPromotion.display_priority,
        terms_and_conditions: selectedGeneralPromotion.terms_and_conditions || '',
        terms_and_conditions_th: selectedGeneralPromotion.terms_and_conditions_th || '',
        copilot_suggestion_enabled: selectedGeneralPromotion.copilot_suggestion_enabled,
        copilot_trigger_keywords: selectedGeneralPromotion.copilot_trigger_keywords || [],
      });
    }
  }, [isEditing, selectedGeneralPromotion]);

  // Handle form field changes
  const handleChange = useCallback(<K extends keyof GeneralPromotion>(
    field: K,
    value: GeneralPromotion[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Add keyword
  const addKeyword = useCallback(() => {
    if (!newKeyword.trim()) return;
    const current = formData.copilot_trigger_keywords || [];
    if (!current.includes(newKeyword.trim())) {
      handleChange('copilot_trigger_keywords', [...current, newKeyword.trim()]);
    }
    setNewKeyword('');
  }, [newKeyword, formData.copilot_trigger_keywords, handleChange]);

  // Remove keyword
  const removeKeyword = useCallback((index: number) => {
    const current = formData.copilot_trigger_keywords || [];
    handleChange('copilot_trigger_keywords', current.filter((_, i) => i !== index));
  }, [formData.copilot_trigger_keywords, handleChange]);

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
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Start and end dates are required');
      }

      const dataToSave = {
        ...formData,
        // Ensure dates are in ISO format
        start_date: new Date(formData.start_date!).toISOString(),
        end_date: new Date(formData.end_date!).toISOString(),
      };

      if (isEditing && promotionId) {
        await updateGeneralPromotion(promotionId, dataToSave);
      } else {
        await createGeneralPromotion(dataToSave);
      }

      navigate('/offers');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save promotion');
    } finally {
      setIsSaving(false);
    }
  }, [formData, isEditing, promotionId, createGeneralPromotion, updateGeneralPromotion, navigate]);

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

  const SelectedIcon = DISCOUNT_TYPES.find(t => t.value === formData.discount_type)?.icon || Percent;

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
                  {isEditing ? 'Edit General Promotion' : 'Create General Promotion'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing
                    ? 'Update public promotion details and settings'
                    : 'Create a new public promotion for all customers'}
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
              { id: 'basic', label: 'Basic Info', icon: Megaphone },
              { id: 'discount', label: 'Discount', icon: Tag },
              { id: 'limits', label: 'Usage Limits', icon: Ticket },
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
                <Megaphone size={20} className="text-indigo-500" />
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
                      placeholder="e.g., The 1 5th Anniversary"
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
                      placeholder="e.g., ฉลองครบรอบ 5 ปี The 1"
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
                      placeholder="Describe the promotion..."
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
                      placeholder="อธิบายโปรโมชั่น..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
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
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Promo Code */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag size={20} className="text-indigo-500" />
                Promo Code
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code (optional)
                </label>
                <input
                  type="text"
                  value={formData.promo_code}
                  onChange={(e) => handleChange('promo_code', e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono uppercase"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for automatic promotions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Discount Tab */}
        {activeTab === 'discount' && (
          <div className="space-y-6">
            {/* Discount Type */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Discount Type</h2>
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

            {/* Discount Value */}
            {formData.discount_type !== 'free_shipping' && formData.discount_type !== 'free_gift' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Discount Value</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.discount_type === 'percentage' ? 'Percentage Off' : 'Amount Off'}
                      {formData.discount_type === 'points_bonus' && ' (Points)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.discount_value || ''}
                        onChange={(e) => handleChange('discount_value', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder={formData.discount_type === 'percentage' ? 'e.g., 15' : 'e.g., 500'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {formData.discount_type === 'percentage' ? '%' : '฿'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.max_discount_amount || ''}
                        onChange={(e) => handleChange('max_discount_amount', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="No limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Minimum Order */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-indigo-500" />
                Minimum Order
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => handleChange('min_order_amount', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum order value required to use this promotion
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            {/* Usage Limits */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Ticket size={20} className="text-indigo-500" />
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
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum total redemptions across all users
                  </p>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum redemptions per customer
                  </p>
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

            {/* Terms & Conditions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms (English)
                  </label>
                  <textarea
                    value={formData.terms_and_conditions}
                    onChange={(e) => handleChange('terms_and_conditions', e.target.value)}
                    placeholder="Enter terms and conditions..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms (Thai)
                  </label>
                  <textarea
                    value={formData.terms_and_conditions_th}
                    onChange={(e) => handleChange('terms_and_conditions_th', e.target.value)}
                    placeholder="ระบุข้อกำหนดและเงื่อนไข..."
                    rows={3}
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
            {/* Enable Copilot Suggestions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="text-indigo-500" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AXTRA Copilot Suggestions</h2>
                    <p className="text-sm text-gray-500">
                      Allow Copilot to suggest this promotion during conversations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleChange('copilot_suggestion_enabled', !formData.copilot_suggestion_enabled)}
                  className={cn(
                    'w-14 h-8 rounded-full transition-colors relative',
                    formData.copilot_suggestion_enabled ? 'bg-indigo-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-6 h-6 bg-white rounded-full transition-transform',
                      formData.copilot_suggestion_enabled ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Trigger Keywords */}
            {formData.copilot_suggestion_enabled && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Trigger Keywords</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Copilot will suggest this promotion when these keywords are mentioned
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!newKeyword.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.copilot_trigger_keywords || []).map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index)}
                        className="hover:text-indigo-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralPromotionBuilder;
