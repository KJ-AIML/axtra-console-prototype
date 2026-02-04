
import { useEffect } from 'react';
import { memo } from 'react';
import {
  ChevronDown,
  Settings,
  Clock,
  CheckCircle2,
  Play,
  ArrowRight,
  TrendingUp,
  Brain,
  Loader2,
} from 'lucide-react';
import { cn } from '../utils/classnames';
import { useDashboardStore, useDashboardDataStore, useUserStore, useSimulationStore } from '../stores';

// Static tabs
const TABS = ['Overview', 'My Training', 'Team Performance', 'Live Assist', 'QA Archive', 'Compliance'] as const;

// Difficulty badge styles
const getDifficultyBadgeClass = (diff: 'Easy' | 'Medium' | 'Hard') => ({
  'Easy': 'text-emerald-600 bg-emerald-50 border-emerald-100',
  'Medium': 'text-amber-600 bg-amber-50 border-amber-100',
  'Hard': 'text-rose-600 bg-rose-50 border-rose-100',
}[diff]);

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  isFirst?: boolean;
}

const MetricCard = memo<MetricCardProps>(({ label, value, subtext, isFirst }) => (
  <div className={cn('flex-1 p-5', !isFirst && 'border-l border-gray-100')}>
    <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-tight mb-2 truncate">{label}</h4>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-[10px] text-gray-400 mt-1 font-medium">{subtext}</p>}
  </div>
));
MetricCard.displayName = 'MetricCard';

// Scenario Item Component
interface ScenarioItemProps {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
}

const ScenarioItem = memo<ScenarioItemProps>(({ title, difficulty, duration, type }) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
        <Play size={18} fill="currentColor" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> {duration}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className={cn('text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border', getDifficultyBadgeClass(difficulty))}>
            {difficulty}
          </span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">{type}</span>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
    </div>
  </div>
));
ScenarioItem.displayName = 'ScenarioItem';

// Loading State
const DashboardSkeleton = () => (
  <div className="max-w-[1200px] mx-auto animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-start justify-between mb-8">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
          <div className="h-6 w-32 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 w-40 bg-gray-200 rounded"></div>
        <div className="h-8 w-64 bg-gray-200 rounded"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    {/* Tabs Skeleton */}
    <div className="flex items-center justify-between border-b border-gray-200 mb-6">
      <div className="flex gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded mb-4"></div>
        ))}
      </div>
      <div className="h-8 w-32 bg-gray-200 rounded-lg mb-4"></div>
    </div>

    {/* Metrics Skeleton */}
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={cn('flex-1 p-5', i > 1 && 'border-l border-gray-100')}>
            <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 w-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="h-6 w-48 bg-gray-200 rounded"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
      <div className="space-y-6">
        <div className="h-48 bg-gray-200 rounded-2xl"></div>
        <div className="h-48 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

interface DashboardProps {
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ className }) => {
  const activeTab = useDashboardStore((state) => state.activeTab);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);
  
  const user = useUserStore((state) => state.user);
  
  const { 
    metrics, 
    skillVelocity, 
    qaHighlights, 
    isLoading, 
    fetchDashboardData 
  } = useDashboardDataStore();

  const {
    recommendedScenarios,
    fetchRecommendedScenarios,
  } = useSimulationStore();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
    fetchRecommendedScenarios();
  }, [fetchDashboardData, fetchRecommendedScenarios]);

  // Format metric label for display
  const formatMetricLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'aht': 'Avg Handle Time (AHT)',
      'fcr': 'First Call Resolution',
      'qa_score': 'Avg QA Score',
      'compliance': 'Compliance Rate',
      'escalation': 'Escalation Rate',
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return (
      <div className={cn('max-w-[1200px] mx-auto', className)}>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      {/* Upper Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Copilot Online
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-xs font-medium">
              <Brain size={12} className="text-indigo-600" />
              Axtra v4.2 Loaded
            </div>
          </div>
          <h2 className="text-sm text-gray-500 font-normal mb-1">
            Welcome back, {user?.name || 'Operator'}
          </h2>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Console Performance</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <Play size={14} fill="white" /> Start Simulation
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm text-gray-600"><Settings size={18} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-sm font-medium pb-4 transition-all whitespace-nowrap relative',
                activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-indigo-600"></div>}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm mb-4">
          All Campaigns <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8 relative">
        <div className="flex flex-wrap md:flex-nowrap">
          {metrics.length > 0 ? (
            metrics.map((metric, index) => (
              <MetricCard 
                key={metric.id} 
                label={formatMetricLabel(metric.metricKey)}
                value={metric.metricValue}
                subtext={metric.subtext}
                isFirst={index === 0}
              />
            ))
          ) : (
            // Fallback if no metrics
            <div className="p-5 text-gray-500">No metrics available</div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recommended Training */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Recommended Training</h3>
            <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View Scenario Library</button>
          </div>
          <div className="space-y-3">
            {recommendedScenarios.length > 0 ? (
              recommendedScenarios.slice(0, 4).map((scenario) => (
                <ScenarioItem 
                  key={scenario.id}
                  title={scenario.title}
                  difficulty={scenario.difficulty}
                  duration={scenario.duration}
                  type={scenario.type}
                />
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
                No training scenarios available
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Skill Radar / Trends */}
        <div className="space-y-6">
          {/* Skill Velocity card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden relative group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-indigo-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Skill Velocity</span>
              </div>
              {skillVelocity ? (
                <>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Proficiency Level {skillVelocity.level}</h3>
                  <p className="text-gray-500 text-sm mb-6 font-medium">
                    {skillVelocity.description || `You're making great progress! Keep up the good work.`}
                  </p>
                  <div className="w-full bg-gray-100 h-2 rounded-full mb-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                      style={{ width: `${skillVelocity.progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Level {skillVelocity.level}</span>
                    <span>{skillVelocity.progressPercentage}% to Level {skillVelocity.level + 1}</span>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                  Loading skill data...
                </div>
              )}
            </div>
          </div>

          {/* QA Highlights */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Recent QA Highlights
            </h3>
            <div className="space-y-4">
              {qaHighlights.length > 0 ? (
                qaHighlights.slice(0, 2).map((highlight) => (
                  <div 
                    key={highlight.id}
                    className={cn(
                      'p-3 rounded-xl border',
                      highlight.type === 'positive' 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-amber-50 border-amber-100'
                    )}
                  >
                    <p className={cn(
                      'text-xs font-semibold',
                      highlight.type === 'positive' ? 'text-emerald-800' : 'text-amber-800'
                    )}>
                      {highlight.title}
                    </p>
                    <p className={cn(
                      'text-[10px] mt-0.5 font-medium leading-relaxed',
                      highlight.type === 'positive' ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {highlight.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">
                  No QA highlights yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
