import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { useSimulationStore, type Scenario } from '../stores';
import { 
  BookOpen, 
  Plus, 
  Search,
  Grid3X3,
  List,
  Clock,
  Target,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Play
} from 'lucide-react';

interface ScenariosPageProps {
  className?: string;
}

const difficultyColors = {
  Easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  Hard: 'text-rose-600 bg-rose-50 border-rose-200',
};

const ScenariosPage: React.FC<ScenariosPageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { 
    scenarios, 
    fetchScenarios, 
    deleteScenario,
    isLoading,
    error 
  } = useSimulationStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const filteredScenarios = scenarios.filter(scenario =>
    scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    
    setDeletingId(id);
    await deleteScenario(id);
    setDeletingId(null);
  };

  const handleStartSimulation = (scenarioId: string) => {
    navigate(`/simulations/${scenarioId}`);
  };

  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Scenarios</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage training scenarios for your team</p>
        </div>
        <button
          onClick={() => navigate('/scenarios/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Create Scenario
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-600 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scenarios..."
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredScenarios.length === 0 && (
        <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No scenarios found' : 'No scenarios yet'}
            </h2>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Create your first training scenario to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/scenarios/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                <Plus size={18} />
                Create Scenario
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && filteredScenarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard 
              key={scenario.id} 
              scenario={scenario} 
              onEdit={() => navigate(`/scenarios/${scenario.id}/edit`)}
              onDelete={() => handleDelete(scenario.id)}
              onStart={() => handleStartSimulation(scenario.id)}
              isDeleting={deletingId === scenario.id}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && filteredScenarios.length > 0 && (
        <div className="space-y-3">
          {filteredScenarios.map((scenario) => (
            <ScenarioListItem 
              key={scenario.id} 
              scenario={scenario}
              onEdit={() => navigate(`/scenarios/${scenario.id}/edit`)}
              onDelete={() => handleDelete(scenario.id)}
              onStart={() => handleStartSimulation(scenario.id)}
              isDeleting={deletingId === scenario.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Scenario Card Component
interface ScenarioCardProps {
  scenario: Scenario;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  isDeleting: boolean;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ 
  scenario, 
  onEdit, 
  onDelete, 
  onStart,
  isDeleting 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'px-2 py-1 text-[10px] font-bold uppercase tracking-tight rounded border',
          difficultyColors[scenario.difficulty]
        )}>
          {scenario.difficulty}
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} className="text-gray-400" />}
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{scenario.title}</h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{scenario.description || 'No description'}</p>

      <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1"><Clock size={12} /> {scenario.duration}</span>
        <span className="flex items-center gap-1"><Target size={12} /> {scenario.type}</span>
        <span className="flex items-center gap-1"><Star size={12} /> {scenario.rating?.toFixed(1) || '-'}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{scenario.completions || 0} completions</span>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Play size={14} fill="currentColor" />
          Start
        </button>
      </div>
    </div>
  );
};

// Scenario List Item Component
interface ScenarioListItemProps extends ScenarioCardProps {}

const ScenarioListItem: React.FC<ScenarioListItemProps> = ({ 
  scenario, 
  onEdit, 
  onDelete, 
  onStart,
  isDeleting 
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-all flex items-center gap-4">
      <div className={cn(
        'px-2 py-1 text-[10px] font-bold uppercase tracking-tight rounded border shrink-0',
        difficultyColors[scenario.difficulty]
      )}>
        {scenario.difficulty}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{scenario.title}</h3>
        <p className="text-sm text-gray-500 truncate">{scenario.description || 'No description'}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
        <span className="flex items-center gap-1"><Clock size={12} /> {scenario.duration}</span>
        <span className="flex items-center gap-1"><Target size={12} /> {scenario.category}</span>
        <span className="flex items-center gap-1"><Star size={12} /> {scenario.rating?.toFixed(1) || '-'}</span>
        <span className="text-gray-300">|</span>
        <span>{scenario.completions || 0} completions</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Play size={14} fill="currentColor" />
          Start
        </button>
      </div>
    </div>
  );
};

export default memo(ScenariosPage);
