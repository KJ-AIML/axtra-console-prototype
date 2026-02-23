import React, { memo } from 'react';
import { cn } from '../../utils/classnames';
import { Simulation } from '../../stores/usePersonaStore';
import { 
  Clock, 
  Star, 
  TrendingUp,
  Play,
  CheckCircle2,
  Circle,
  Target
} from 'lucide-react';

interface SimulationListProps {
  simulations: Simulation[];
  className?: string;
  onStartSimulation?: (simulationId: string) => void;
}

const difficultyConfig = {
  'Easy': { 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  'Medium': { 
    color: 'text-amber-600', 
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700'
  },
  'Hard': { 
    color: 'text-rose-600', 
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700'
  },
};

const statusConfig = {
  'not_started': { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50' },
  'in_progress': { icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
  'completed': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
};

const SimulationList: React.FC<SimulationListProps> = ({ 
  simulations, 
  className,
  onStartSimulation
}) => {
  if (simulations.length === 0) {
    return (
      <div className={cn('bg-gray-50 border border-gray-200 rounded-xl p-8 text-center', className)}>
        <Target size={32} className="text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No simulations available</p>
        <p className="text-sm text-gray-500 mt-1">This persona has no training scenarios yet.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {simulations.map((simulation) => {
        const difficulty = difficultyConfig[simulation.difficulty];
        const status = statusConfig[simulation.status || 'not_started'];
        const StatusIcon = status.icon;

        return (
          <div
            key={simulation.id}
            className={cn(
              'bg-white border rounded-xl p-4 transition-all duration-200',
              'hover:shadow-sm hover:border-indigo-200',
              'border-gray-200'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {simulation.title}
                  </h4>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                    difficulty.badge
                  )}>
                    {simulation.difficulty}
                  </span>
                  {simulation.isRecommended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 shrink-0">
                      Recommended
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {simulation.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock size={14} />
                    <span>{simulation.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Star size={14} className="text-amber-500" />
                    <span>{simulation.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <TrendingUp size={14} />
                    <span>{simulation.completions.toLocaleString()} completions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={14} className={status.color} />
                    <span className={cn('capitalize', status.color)}>
                      {simulation.status?.replace('_', ' ') || 'Not started'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Action */}
              <button
                onClick={() => onStartSimulation?.(simulation.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
                  'transition-colors duration-200',
                  simulation.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                <Play size={16} />
                {simulation.status === 'completed' 
                  ? 'Practice Again' 
                  : simulation.status === 'in_progress'
                    ? 'Continue'
                    : 'Start'
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(SimulationList);
