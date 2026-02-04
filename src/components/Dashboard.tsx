
import { memo } from 'react';
import {
  ChevronDown,
  Settings,
  LayoutGrid,
  Clock,
  CheckCircle2,
  Play,
  ArrowRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import { cn } from '../utils/classnames';
import type { MetricCardProps, ScenarioItemProps } from '../types';
import { useDashboardStore } from '../stores';

// Static data moved outside component to prevent re-creation
const TABS = ['Overview', 'My Training', 'Team Performance', 'Live Assist', 'QA Archive', 'Compliance'] as const;

const METRICS: MetricCardProps[] = [
  { label: 'Avg Handle Time (AHT)', value: '4m 22s', subtext: '-12% from target', isFirst: true },
  { label: 'First Call Resolution', value: '84.2%', subtext: '+2.1% this week' },
  { label: 'Avg QA Score', value: '92/100', subtext: 'Top 5% of team' },
  { label: 'Compliance Rate', value: '100%', subtext: 'No violations detected' },
  { label: 'Escalation Rate', value: '4.1%', subtext: 'Below industry avg' },
] as const;

const SCENARIOS: ScenarioItemProps[] = [
  { title: 'Billing Dispute - Aggressive Persona', diff: 'Hard', duration: '8-12 mins', type: 'Voice Simulation' },
  { title: 'Technical Support - Broadband Connectivity', diff: 'Medium', duration: '15 mins', type: 'Knowledge Check' },
  { title: 'New Promotion - Upsell Opportunity', diff: 'Easy', duration: '5 mins', type: 'Objection Handling' },
  { title: 'Privacy & Data Protection Verification', diff: 'Hard', duration: '10 mins', type: 'Compliance Training' },
] as const;

// Difficulty badge styles
const getDifficultyBadgeClass = (diff: ScenarioItemProps['diff']) => ({
  'Easy': 'text-emerald-600 bg-emerald-50 border-emerald-100',
  'Medium': 'text-amber-600 bg-amber-50 border-amber-100',
  'Hard': 'text-rose-600 bg-rose-50 border-rose-100',
}[diff]);

// Memoized MetricCard component
const MetricCard = memo<MetricCardProps>(({ label, value, subtext, isFirst }) => (
  <div className={cn('flex-1 p-5', !isFirst && 'border-l border-gray-100')}>
    <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-tight mb-2 truncate">{label}</h4>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-[10px] text-gray-400 mt-1 font-medium">{subtext}</p>}
  </div>
));
MetricCard.displayName = 'MetricCard';

// Memoized ScenarioItem component
const ScenarioItem = memo<ScenarioItemProps>(({ title, diff, duration, type }) => (
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
          <span className={cn('text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border', getDifficultyBadgeClass(diff))}>
            {diff}
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

interface DashboardProps {
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ className }) => {
  const activeTab = useDashboardStore((state) => state.activeTab);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);

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
          <h2 className="text-sm text-gray-500 font-normal mb-1">Welcome back, Operator Kj</h2>
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
          {METRICS.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
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
            {SCENARIOS.map((scenario, index) => (
              <ScenarioItem key={`${scenario.title}-${index}`} {...scenario} />
            ))}
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
              <h3 className="text-xl font-bold mb-2 text-gray-900">Proficiency Level 8</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">You've completed 4 scenarios this week. You're ready for more complex billing disputes.</p>
              <div className="w-full bg-gray-100 h-2 rounded-full mb-2 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full w-[75%] transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                <span>Level 7</span>
                <span>75% to Level 9</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Recent QA Highlights
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-semibold text-emerald-800">Excellent Empathy</p>
                <p className="text-[10px] text-emerald-600 mt-0.5 font-medium leading-relaxed">Detected in call #4829 - "You handled the customer frustration perfectly."</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-semibold text-amber-800">Closing Script Gap</p>
                <p className="text-[10px] text-amber-600 mt-0.5 font-medium leading-relaxed">Missed required disclosure in call #4811. Reviewing recommended.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
