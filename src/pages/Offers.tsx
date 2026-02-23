/**
 * Offers & Rules Page
 * Manage general and personal promotions
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Ticket,
  Gift,
  Users,
  TrendingUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleRight,
  ToggleLeft,
  Calendar,
  Target,
  Tag,
  Megaphone,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/classnames';
import { useOfferStore, type GeneralPromotion, type PersonalPromotion } from '../stores/useOfferStore';

// ============================================
// TYPES & CONSTANTS
// ============================================

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_shipping: 'Free Shipping',
  free_gift: 'Free Gift',
  points_bonus: 'Points Bonus',
  tier_upgrade: 'Tier Upgrade',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  paused: { label: 'Paused', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  expired: { label: 'Expired', color: 'text-red-600', bgColor: 'bg-red-50' },
  disabled: { label: 'Disabled', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDiscount(type: string, value?: number): string {
  if (!value) return DISCOUNT_TYPE_LABELS[type] || type;
  if (type === 'percentage') return `${value}% off`;
  if (type === 'fixed_amount') return `฿${value.toLocaleString()} off`;
  return DISCOUNT_TYPE_LABELS[type] || type;
}

// ============================================
// GENERAL PROMOTION CARD
// ============================================

interface GeneralPromotionCardProps {
  promotion: GeneralPromotion;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const GeneralPromotionCard: React.FC<GeneralPromotionCardProps> = ({
  promotion,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const statusStyle = STATUS_LABELS[promotion.status] || STATUS_LABELS.draft;
  const isActive = promotion.status === 'active';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isActive ? 'bg-emerald-50' : 'bg-gray-50'
          )}>
            <Megaphone size={20} className={isActive ? 'text-emerald-600' : 'text-gray-500'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
              {promotion.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDiscount(promotion.discount_type, promotion.discount_value)}
            </p>
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusStyle.bgColor, statusStyle.color)}>
          {statusStyle.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        {promotion.promo_code && (
          <div className="flex items-center gap-2 text-xs">
            <Tag size={12} className="text-gray-400" />
            <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
              {promotion.promo_code}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={12} className="text-gray-400" />
          <span>{formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">
            {promotion.usage_count} used
          </span>
        </div>
        {promotion.usage_limit_per_user > 0 && (
          <div className="flex items-center gap-1.5">
            <Ticket size={12} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {promotion.usage_limit_per_user}/user
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 mt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={isActive ? 'Deactivate' : 'Activate'}
        >
          {isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// PERSONAL PROMOTION CARD
// ============================================

interface PersonalPromotionCardProps {
  promotion: PersonalPromotion;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const PersonalPromotionCard: React.FC<PersonalPromotionCardProps> = ({
  promotion,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const statusStyle = STATUS_LABELS[promotion.status] || STATUS_LABELS.draft;
  const isActive = promotion.status === 'active';

  const triggerLabel = {
    manual: 'Manual',
    auto_escalation: 'Auto-Escalation',
    auto_churn_risk: 'Churn Risk',
    auto_birthday: 'Birthday',
    auto_anniversary: 'Anniversary',
    auto_inactive: 'Inactive',
  }[promotion.trigger_type] || promotion.trigger_type;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isActive ? 'bg-indigo-50' : 'bg-gray-50'
          )}>
            <Gift size={20} className={isActive ? 'text-indigo-600' : 'text-gray-500'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
              {promotion.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDiscount(promotion.discount_type, promotion.discount_value)}
            </p>
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusStyle.bgColor, statusStyle.color)}>
          {statusStyle.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <Target size={12} className="text-gray-400" />
          <span className="text-gray-600">{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={12} className="text-gray-400" />
          <span>
            {promotion.target_tiers?.join(', ') || 'All tiers'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Ticket size={12} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">
            {promotion.usage_count} used
          </span>
        </div>
        {promotion.auto_apply && (
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            <span className="text-xs font-medium text-gray-600">Auto-apply</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 mt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={isActive ? 'Deactivate' : 'Activate'}
        >
          {isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// DETAIL VIEW COMPONENT
// ============================================

interface DetailViewProps {
  generalPromotions: GeneralPromotion[];
  personalPromotions: PersonalPromotion[];
  selectedGeneralId: string | null;
  selectedPersonalId: string | null;
  onEdit: (id: string, type: 'general' | 'personal') => void;
  onDelete: (id: string, type: 'general' | 'personal') => void;
  onToggleStatus: (id: string, type: 'general' | 'personal') => void;
  onClose: () => void;
}

const PromotionDetailView: React.FC<DetailViewProps> = ({
  generalPromotions,
  personalPromotions,
  selectedGeneralId,
  selectedPersonalId,
  onEdit,
  onDelete,
  onToggleStatus,
  onClose,
}) => {
  const promotion = useMemo(() => {
    if (selectedGeneralId) {
      return { type: 'general' as const, data: generalPromotions.find(p => p.id === selectedGeneralId) };
    }
    if (selectedPersonalId) {
      return { type: 'personal' as const, data: personalPromotions.find(p => p.id === selectedPersonalId) };
    }
    return null;
  }, [generalPromotions, personalPromotions, selectedGeneralId, selectedPersonalId]);

  if (!promotion?.data) return null;

  const { type, data } = promotion;
  const statusStyle = STATUS_LABELS[data.status] || STATUS_LABELS.draft;
  const isActive = data.status === 'active';

  return (
    <div className="bg-white border border-gray-200 rounded-xl h-fit sticky top-6">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              type === 'general' 
                ? (isActive ? 'bg-emerald-50' : 'bg-gray-50')
                : (isActive ? 'bg-indigo-50' : 'bg-gray-50')
            )}>
              {type === 'general' ? (
                <Megaphone size={24} className={isActive ? 'text-emerald-600' : 'text-gray-500'} />
              ) : (
                <Gift size={24} className={isActive ? 'text-indigo-600' : 'text-gray-500'} />
              )}
            </div>
            <div>
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusStyle.bgColor, statusStyle.color)}>
                {statusStyle.label}
              </span>
              <h2 className="text-lg font-semibold text-gray-900 mt-1">{data.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">{data.description}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => onToggleStatus(data.id, type)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            )}
          >
            {isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onEdit(data.id, type)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            <Pencil size={16} />
            Edit
          </button>
          <button
            onClick={() => onDelete(data.id, type)}
            className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-6">
        {/* Discount Info */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Discount</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Tag size={20} className="text-indigo-500" />
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDiscount(data.discount_type, 'discount_value' in data ? data.discount_value : undefined)}
                </p>
                <p className="text-xs text-gray-500">{DISCOUNT_TYPE_LABELS[data.discount_type]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Validity Period</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Start Date</span>
              <span className="font-medium text-gray-900">{formatDate(data.start_date)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">End Date</span>
              <span className="font-medium text-gray-900">
                {'end_date' in data && data.end_date ? formatDate(data.end_date) : 'No expiry'}
              </span>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Usage Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.usage_count}</p>
              <p className="text-xs text-gray-500">Times Used</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.usage_limit_per_user}</p>
              <p className="text-xs text-gray-500">Limit Per User</p>
            </div>
          </div>
        </div>

        {/* Type-specific details */}
        {type === 'general' && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">General Promotion</h3>
            <div className="space-y-2">
              {(data as GeneralPromotion).promo_code && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Promo Code</span>
                  <code className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {(data as GeneralPromotion).promo_code}
                  </code>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Min Order</span>
                <span className="font-medium text-gray-900">
                  ฿{(data as GeneralPromotion).min_order_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Copilot Suggestions</span>
                <span className="font-medium text-gray-900">
                  {(data as GeneralPromotion).copilot_suggestion_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        )}

        {type === 'personal' && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Promotion</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Trigger</span>
                <span className="font-medium text-gray-900 capitalize">
                  {(data as PersonalPromotion).trigger_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Target Tiers</span>
                <span className="font-medium text-gray-900">
                  {(data as PersonalPromotion).target_tiers?.join(', ') || 'All tiers'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Auto-apply</span>
                <span className="font-medium text-gray-900">
                  {(data as PersonalPromotion).auto_apply ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

interface Props {
  className?: string;
}

const Offers: React.FC<Props> = ({ className }) => {
  const navigate = useNavigate();
  const {
    generalPromotions,
    personalPromotions,
    selectedGeneralPromotion,
    selectedPersonalPromotion,
    isLoading,
    error,
    fetchGeneralPromotions,
    fetchPersonalPromotions,
    selectGeneralPromotion,
    selectPersonalPromotion,
    deleteGeneralPromotion,
    deletePersonalPromotion,
    togglePromotionStatus,
    clearError,
  } = useOfferStore();

  const [activeTab, setActiveTab] = useState<'general' | 'personal'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load data on mount
  useEffect(() => {
    fetchGeneralPromotions();
    fetchPersonalPromotions();
  }, [fetchGeneralPromotions, fetchPersonalPromotions]);

  // Filter promotions
  const filteredGeneralPromotions = useMemo(() => {
    if (!searchQuery) return generalPromotions;
    const query = searchQuery.toLowerCase();
    return generalPromotions.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.promo_code?.toLowerCase().includes(query)
    );
  }, [generalPromotions, searchQuery]);

  const filteredPersonalPromotions = useMemo(() => {
    if (!searchQuery) return personalPromotions;
    const query = searchQuery.toLowerCase();
    return personalPromotions.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }, [personalPromotions, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const generalActive = generalPromotions.filter(p => p.status === 'active').length;
    const personalActive = personalPromotions.filter(p => p.status === 'active').length;
    const totalUsage = [...generalPromotions, ...personalPromotions].reduce((sum, p) => sum + p.usage_count, 0);

    return {
      totalGeneral: generalPromotions.length,
      totalPersonal: personalPromotions.length,
      activeGeneral: generalActive,
      activePersonal: personalActive,
      totalUsage,
    };
  }, [generalPromotions, personalPromotions]);

  // Handlers
  const handleDelete = async (id: string, type: 'general' | 'personal') => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;

    if (type === 'general') {
      await deleteGeneralPromotion(id);
    } else {
      await deletePersonalPromotion(id);
    }
  };

  const handleEdit = (id: string, type: 'general' | 'personal') => {
    if (type === 'general') {
      navigate(`/offers/general/${id}/edit`);
    } else {
      navigate(`/offers/personal/${id}/edit`);
    }
  };

  const handleCreate = () => {
    // Navigate to create based on active tab
    if (activeTab === 'general') {
      navigate('/offers/general/new');
    } else {
      navigate('/offers/personal/new');
    }
  };

  const handleSelectGeneral = (promo: GeneralPromotion) => {
    if (selectedGeneralPromotion?.id === promo.id) {
      selectGeneralPromotion(null);
    } else {
      selectGeneralPromotion(promo);
      selectPersonalPromotion(null);
    }
  };

  const handleSelectPersonal = (promo: PersonalPromotion) => {
    if (selectedPersonalPromotion?.id === promo.id) {
      selectPersonalPromotion(null);
    } else {
      selectPersonalPromotion(promo);
      selectGeneralPromotion(null);
    }
  };

  // Loading state
  if (isLoading && !generalPromotions.length && !personalPromotions.length) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('max-w-[1400px] mx-auto', className)}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load promotions</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => { clearError(); fetchGeneralPromotions(); fetchPersonalPromotions(); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasSelection = selectedGeneralPromotion || selectedPersonalPromotion;

  return (
    <div className={cn('max-w-[1400px] mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Offers & Rules</h1>
            <p className="text-sm text-gray-500 mt-2">
              Manage promotions, discounts, and copilot suggestion rules
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Create Promotion
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Megaphone size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeGeneral}</p>
                <p className="text-sm text-gray-500">Active General</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Gift size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.activePersonal}</p>
                <p className="text-sm text-gray-500">Active Personal</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Ticket size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsage.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Redemptions</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalGeneral + stats.totalPersonal}
                </p>
                <p className="text-sm text-gray-500">Total Promotions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'pb-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'general'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          General Promotions
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {filteredGeneralPromotions.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={cn(
            'pb-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'personal'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Personal Promotions
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {filteredPersonalPromotions.length}
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Promotion List */}
        <div className={cn(
          'space-y-4',
          hasSelection ? 'col-span-7' : 'col-span-12'
        )}>
          {activeTab === 'general' && (
            <>
              {filteredGeneralPromotions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <Megaphone size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No general promotions</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'Try adjusting your search' : 'Create your first promotion'}
                  </p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                    Create Promotion
                  </button>
                </div>
              ) : (
                <div className={cn(
                  viewMode === 'grid' && !hasSelection
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                )}>
                  {filteredGeneralPromotions.map((promotion) => (
                    <GeneralPromotionCard
                      key={promotion.id}
                      promotion={promotion}
                      isSelected={selectedGeneralPromotion?.id === promotion.id}
                      onClick={() => handleSelectGeneral(promotion)}
                      onEdit={() => handleEdit(promotion.id, 'general')}
                      onDelete={() => handleDelete(promotion.id, 'general')}
                      onToggleStatus={() => togglePromotionStatus(promotion.id, 'general')}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'personal' && (
            <>
              {filteredPersonalPromotions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <Gift size={48} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No personal promotions</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'Try adjusting your search' : 'Create your first personal promotion'}
                  </p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                    Create Promotion
                  </button>
                </div>
              ) : (
                <div className={cn(
                  viewMode === 'grid' && !hasSelection
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                )}>
                  {filteredPersonalPromotions.map((promotion) => (
                    <PersonalPromotionCard
                      key={promotion.id}
                      promotion={promotion}
                      isSelected={selectedPersonalPromotion?.id === promotion.id}
                      onClick={() => handleSelectPersonal(promotion)}
                      onEdit={() => handleEdit(promotion.id, 'personal')}
                      onDelete={() => handleDelete(promotion.id, 'personal')}
                      onToggleStatus={() => togglePromotionStatus(promotion.id, 'personal')}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail View */}
        {hasSelection && (
          <div className="col-span-5">
            <PromotionDetailView
              generalPromotions={generalPromotions}
              personalPromotions={personalPromotions}
              selectedGeneralId={selectedGeneralPromotion?.id || null}
              selectedPersonalId={selectedPersonalPromotion?.id || null}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={togglePromotionStatus}
              onClose={() => {
                selectGeneralPromotion(null);
                selectPersonalPromotion(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Offers;
