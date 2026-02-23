/**
 * Knowledge Base - Support Articles & Resources
 * For Realtime Copilot to search during calls
 */

import { memo, useState } from 'react';
import { cn } from '../utils/classnames';
import { 
  Puzzle, Search, Plus, Folder, FileText, Link2, Tag,
  ChevronRight, Star, Clock, Eye, Edit2, Trash2, MoreHorizontal,
  Filter, ArrowUpRight, BookOpen, HelpCircle, AlertCircle,
  CheckCircle2, MessageSquare, Headphones, Shield, Zap
} from 'lucide-react';

interface KnowledgeBasePageProps {
  className?: string;
}

// Mock categories
const CATEGORIES = [
  { id: 'billing', name: 'Billing & Payments', count: 24, icon: FileText },
  { id: 'technical', name: 'Technical Support', count: 18, icon: Zap },
  { id: 'account', name: 'Account Management', count: 15, icon: Shield },
  { id: 'promotions', name: 'Promotions & Offers', count: 12, icon: Tag },
  { id: 'returns', name: 'Returns & Refunds', count: 9, icon: ArrowUpRight },
  { id: 'vip', name: 'VIP & Loyalty', count: 8, icon: Star },
];

// Mock articles
const MOCK_ARTICLES = [
  {
    id: 'art-001',
    title: 'How to Handle Billing Disputes - Gold Tier Customers',
    category: 'billing',
    tags: ['billing', 'dispute', 'gold-tier', 'escalation'],
    views: 1245,
    helpful: 98,
    lastUpdated: '2026-02-10',
    author: 'Sarah Johnson',
    isPinned: true,
    excerpt: 'Step-by-step guide for resolving billing disputes with high-value Gold tier customers, including authorized discounts and escalation procedures.',
  },
  {
    id: 'art-002',
    title: 'VIP Customer Retention Strategies',
    category: 'vip',
    tags: ['retention', 'vip', 'escalation', 'offers'],
    views: 892,
    helpful: 94,
    lastUpdated: '2026-02-08',
    author: 'Mike Chen',
    isPinned: true,
    excerpt: 'Proven strategies for retaining at-risk VIP customers, including personalized offers and manager escalation protocols.',
  },
  {
    id: 'art-003',
    title: 'Technical Issue Escalation Matrix',
    category: 'technical',
    tags: ['technical', 'escalation', 'matrix', 'routing'],
    views: 756,
    helpful: 87,
    lastUpdated: '2026-02-05',
    author: 'Tech Team',
    isPinned: false,
    excerpt: 'Quick reference guide for routing technical issues to appropriate teams based on severity and customer tier.',
  },
  {
    id: 'art-004',
    title: 'Current Active Promotions - Quick Reference',
    category: 'promotions',
    tags: ['promotions', 'coupons', 'active', 'reference'],
    views: 2103,
    helpful: 96,
    lastUpdated: '2026-02-17',
    author: 'Marketing Team',
    isPinned: true,
    excerpt: 'Complete list of all active promotions, discount codes, and eligibility criteria for real-time reference during calls.',
  },
  {
    id: 'art-005',
    title: 'Refund Processing Guidelines',
    category: 'returns',
    tags: ['refund', 'returns', 'processing', 'timeline'],
    views: 634,
    helpful: 91,
    lastUpdated: '2026-01-28',
    author: 'Finance Team',
    isPinned: false,
    excerpt: 'Standard operating procedures for processing refunds, including timeline expectations and exception handling.',
  },
  {
    id: 'art-006',
    title: 'Account Security Verification Steps',
    category: 'account',
    tags: ['security', 'verification', 'account', 'fraud'],
    views: 445,
    helpful: 88,
    lastUpdated: '2026-02-12',
    author: 'Security Team',
    isPinned: false,
    excerpt: 'Required verification steps for sensitive account changes and security-related inquiries.',
  },
  {
    id: 'art-007',
    title: 'De-escalation Techniques for Angry Customers',
    category: 'billing',
    tags: ['de-escalation', 'angry-customer', 'communication', 'empathy'],
    views: 1567,
    helpful: 99,
    lastUpdated: '2026-02-15',
    author: 'Training Team',
    isPinned: true,
    excerpt: 'Proven de-escalation techniques and scripts for handling frustrated or angry customers effectively.',
  },
  {
    id: 'art-008',
    title: 'Silver to Gold Tier Upgrade Criteria',
    category: 'vip',
    tags: ['tier-upgrade', 'silver', 'gold', 'loyalty'],
    views: 523,
    helpful: 85,
    lastUpdated: '2026-01-20',
    author: 'Loyalty Team',
    isPinned: false,
    excerpt: 'Criteria and procedures for upgrading Silver tier customers to Gold, including exceptions and overrides.',
  },
];

const ArticleCard = ({ article }: { article: typeof MOCK_ARTICLES[0] }) => {
  const category = CATEGORIES.find(c => c.id === article.category);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {article.isPinned && (
            <Star size={14} className="text-amber-500 fill-amber-500" />
          )}
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            {category?.name}
          </span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            <Edit2 size={14} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
        {article.title}
      </h3>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {article.excerpt}
      </p>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {article.tags.map((tag) => (
          <span 
            key={tag}
            className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {article.views}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            {article.helpful}%
          </span>
        </div>
        <span>Updated {article.lastUpdated}</span>
      </div>
    </div>
  );
};

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ className }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredArticles = selectedCategory
    ? MOCK_ARTICLES.filter(a => a.category === selectedCategory)
    : MOCK_ARTICLES;

  return (
    <div className={cn('max-w-[1400px] mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Knowledge Base</h1>
            <p className="text-sm text-gray-500 mt-2">
              Support articles and resources for real-time assistance during customer calls
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={18} />
            New Article
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge base articles... (e.g., 'billing dispute', 'gold tier')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 ml-1">
          💡 Tip: Use keywords like tier names, issue types, or promotion codes for quick results
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Categories */}
        <div className="col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Categories</h3>
              <Folder size={16} className="text-gray-400" />
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedCategory === null 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  All Articles
                </span>
                <span className="text-xs text-gray-400">{MOCK_ARTICLES.length}</span>
              </button>
              
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedCategory === category.id 
                      ? 'bg-indigo-50 text-indigo-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <category.icon size={16} />
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-400">{category.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-300" />
              <span className="font-medium text-sm">Copilot Integration</span>
            </div>
            <p className="text-xs text-indigo-100 mb-3">
              Knowledge base is searchable by Realtime Copilot during active calls
            </p>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 size={12} className="text-emerald-300" />
              <span>Auto-search enabled</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">
                {selectedCategory 
                  ? CATEGORIES.find(c => c.id === selectedCategory)?.name 
                  : 'All Articles'
                }
              </h2>
              <span className="text-sm text-gray-500">({filteredArticles.length})</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Filter size={16} />
                Filter
              </button>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm transition-colors',
                    viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  )}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm transition-colors',
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  )}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-2 gap-4">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Empty State */}
          {filteredArticles.length === 0 && (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <HelpCircle size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Recently Viewed / Quick Access */}
      <div className="mt-8">
        <h3 className="font-semibold text-gray-900 mb-4">Recently Accessed During Calls</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {MOCK_ARTICLES.slice(0, 4).map((article) => (
            <div 
              key={`recent-${article.id}`}
              className="flex-shrink-0 w-72 bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{article.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">Accessed 2 hours ago</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(KnowledgeBasePage);
