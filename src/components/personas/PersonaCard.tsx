import React, { memo } from 'react';
import { cn } from '../../utils/classnames';
import { Persona } from '../../stores/usePersonaStore';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  BarChart3
} from 'lucide-react';

interface PersonaCardProps {
  persona: Persona;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const difficultyColors = {
  'Easy': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
  'Hard': 'bg-rose-100 text-rose-700 border-rose-200',
};

const PersonaCard: React.FC<PersonaCardProps> = ({ 
  persona, 
  isSelected = false,
  onClick,
  className 
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-white border rounded-xl p-5 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-indigo-300',
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
          : 'border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isSelected ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-50'
          )}>
            <Users 
              size={24} 
              className={cn(
                'transition-colors',
                isSelected ? 'text-indigo-600' : 'text-gray-500 group-hover:text-indigo-500'
              )} 
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{persona.name}</h3>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1',
              difficultyColors[persona.difficulty]
            )}>
              {persona.difficulty}
            </span>
          </div>
        </div>
        <ChevronRight 
          size={20} 
          className={cn(
            'text-gray-400 transition-transform duration-200',
            isSelected && 'rotate-90 text-indigo-500',
            'group-hover:text-indigo-400'
          )} 
        />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {persona.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-gray-400" />
          <div>
            <p className="text-lg font-semibold text-gray-900">{persona.simulationCount}</p>
            <p className="text-xs text-gray-500">Scenarios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {persona.completions.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Completions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-500" />
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {persona.simulationCount > 0 
                ? Math.round(persona.completions / persona.simulationCount)
                : 0
              }
            </p>
            <p className="text-xs text-gray-500">Avg/Scenario</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(PersonaCard);
