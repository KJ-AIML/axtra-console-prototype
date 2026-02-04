import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { Mic, Play, Clock, Zap, Users, Star, ArrowRight, Search, Filter, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useSimulationStore, showError, showSuccess } from '../stores';
import { ScenariosGridSkeleton, ErrorEmptyState, NoResultsEmptyState, Button } from '../components/ui';

// Difficulty badge styles
const getDifficultyStyle = (diff: 'Easy' | 'Medium' | 'Hard') => ({
  'Easy': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Medium': 'bg-amber-50 text-amber-600 border-amber-100',
  'Hard': 'bg-rose-50 text-rose-600 border-rose-100',
}[diff]);

// Status badge styles
const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'completed':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
          <CheckCircle2 size={10} />
          Completed
        </span>
      );
    case 'in_progress':
      return (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
          In Progress
        </span>
      );
    default:
      return null;
  }
};

interface ScenarioCardProps {
  scenario: {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    duration: string;
    type: string;
    category: string;
    persona: string;
    rating: number;
    completions: number;
    status?: 'not_started' | 'in_progress' | 'completed';
    userScore?: number;
  };
  onPractice: (id: string) => void;
  isLoading?: boolean;
}

const ScenarioCard = memo<ScenarioCardProps>(({ scenario, onPractice, isLoading }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className={cn(
          'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border',
          getDifficultyStyle(scenario.difficulty)
        )}>
          {scenario.difficulty}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">{scenario.category}</span>
      </div>
      <div className="flex items-center gap-1">
        {getStatusBadge(scenario.status)}
        {!scenario.status || scenario.status === 'not_started' ? (
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={12} fill="currentColor" />
            <span className="text-xs font-semibold">{scenario.rating.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
    </div>

    {/* Title & Description */}
    <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-200">
      {scenario.title}
    </h3>
    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{scenario.description}</p>

    {/* Persona Tag */}
    <div className="flex items-center gap-2 mb-4">
      <Users size={14} className="text-gray-400" />
      <span className="text-xs text-gray-600 font-medium">Persona: {scenario.persona}</span>
    </div>

    {/* Stats */}
    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
      <span className="flex items-center gap-1">
        <Clock size={12} />
        {scenario.duration}
      </span>
      <span className="flex items-center gap-1">
        <Zap size={12} />
        {scenario.completions.toLocaleString()} trained
      </span>
    </div>

    {/* Score Badge (if completed) */}
    {scenario.status === 'completed' && scenario.userScore && (
      <div className="mb-3 p-2 bg-emerald-50 rounded-lg">
        <span className="text-xs text-emerald-700 font-medium">
          Your Score: {scenario.userScore}/100
        </span>
      </div>
    )}

    {/* Action Button */}
    <Button
      onClick={() => onPractice(scenario.id)}
      isLoading={isLoading}
      loadingText="Starting..."
      variant={scenario.status === 'completed' ? 'secondary' : scenario.status === 'in_progress' ? 'primary' : 'primary'}
      fullWidth
      leftIcon={<Play size={14} fill="currentColor" />}
      className={cn(
        scenario.status === 'completed' && '!bg-emerald-600 !text-white hover:!bg-emerald-700',
        scenario.status === 'in_progress' && '!bg-amber-600 !text-white hover:!bg-amber-700'
      )}
    >
      {scenario.status === 'completed' ? 'Practice Again' : scenario.status === 'in_progress' ? 'Continue' : 'Start Practice'}
    </Button>
  </div>
));
ScenarioCard.displayName = 'ScenarioCard';

// Stats Skeleton Component
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

interface SimulationsPageProps {
  className?: string;
}

const SimulationsPage: React.FC<SimulationsPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { 
    scenarios, 
    stats,
    isLoading, 
    error,
    fetchScenarios,
    fetchStats,
    startSimulation 
  } = useSimulationStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [startingScenario, setStartingScenario] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchScenarios();
    fetchStats();
  }, [fetchScenarios, fetchStats]);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      showError('Failed to load scenarios', error);
    }
  }, [error]);

  // Filter scenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || scenario.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || scenario.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handlePractice = async (scenarioId: string) => {
    try {
      setStartingScenario(scenarioId);
      await startSimulation(scenarioId);
      showSuccess('Starting simulation', 'Good luck with your training!');
      navigate(`/simulations/${scenarioId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start simulation';
      showError('Failed to start simulation', message);
    } finally {
      setStartingScenario(null);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedDifficulty('All');
  };

  const handleRetry = () => {
    fetchScenarios();
    fetchStats();
  };

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(scenarios.map(s => s.category)))];

  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Training Simulations</h1>
          <p className="text-sm text-gray-500 mt-2">
            Choose a scenario to practice with AI-powered training agents
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg">
          <Mic size={18} />
          <span className="text-sm font-medium">Voice-Enabled Training</span>
        </div>
      </div>

      {/* Stats Overview */}
      {isLoading && !stats ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Scenarios</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-emerald-700">{stats.completed}</div>
            <div className="text-xs text-emerald-600">Completed</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-amber-700">{stats.inProgress}</div>
            <div className="text-xs text-amber-600">In Progress</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-indigo-700">{stats.averageScore}</div>
            <div className="text-xs text-indigo-600">Avg Score</div>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
          >
            <option value="All">All Levels</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Showing {filteredScenarios.length} of {scenarios.length} scenarios
          </p>
          {(searchTerm || selectedCategory !== 'All' || selectedDifficulty !== 'All') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              leftIcon={<RotateCcw size={14} />}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Scenarios Grid */}
      {isLoading ? (
        <ScenariosGridSkeleton count={8} />
      ) : error ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200">
          <ErrorEmptyState
            title="Failed to load scenarios"
            description={error}
            onRetry={handleRetry}
          />
        </div>
      ) : filteredScenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScenarios.map(scenario => (
            <ScenarioCard 
              key={scenario.id} 
              scenario={scenario} 
              onPractice={handlePractice}
              isLoading={startingScenario === scenario.id}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-200">
          <NoResultsEmptyState
            searchTerm={searchTerm}
            onClear={handleClearFilters}
          />
        </div>
      )}

      {/* Quick Stats */}
      {!isLoading && !error && scenarios.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-indigo-700">{scenarios.length}</div>
            <div className="text-sm text-indigo-600">Total Scenarios</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-emerald-700">
              {scenarios.filter(s => s.difficulty === 'Easy').length}
            </div>
            <div className="text-sm text-emerald-600">Beginner Friendly</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-amber-700">
              {scenarios.filter(s => s.difficulty === 'Medium').length}
            </div>
            <div className="text-sm text-amber-600">Intermediate</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="text-2xl font-bold text-rose-700">
              {scenarios.filter(s => s.difficulty === 'Hard').length}
            </div>
            <div className="text-sm text-rose-600">Advanced</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(SimulationsPage);
