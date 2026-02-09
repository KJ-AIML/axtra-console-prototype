/**
 * AXTRA Copilot - Real-time Coaching UI
 * Displays 3 cards (Emotion, Leverage, Strategy) + Suggested Script
 */

import { memo, useState } from 'react';
import { cn } from '../../utils/classnames';
import { 
  BrainCircuit, 
  Heart, 
  Scale, 
  Target, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useLiveKitStore, CoachingCard, CoachingScript } from '../../stores/useLiveKitStore';

interface AxtraCopilotProps {
  className?: string;
}

// Status icon mapping
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'danger':
      return <AlertCircle size={16} className="text-rose-500" />;
    case 'warning':
      return <AlertCircle size={16} className="text-amber-500" />;
    case 'success':
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    case 'info':
    default:
      return <Info size={16} className="text-blue-500" />;
  }
};

// Status color mapping
const statusColors = {
  danger: 'bg-rose-50 border-rose-200 text-rose-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const statusBadgeColors = {
  danger: 'bg-rose-100 text-rose-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-blue-100 text-blue-700',
};

// Individual Coaching Card Component
const CoachingCardItem = ({ 
  card, 
  index,
  isExpanded,
  onToggle 
}: { 
  card: CoachingCard; 
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const icons = [Heart, Scale, Target];
  const titles = ['Emotion', 'Leverage', 'Strategy'];
  const colors = ['text-rose-500', 'text-amber-500', 'text-indigo-500'];
  const bgColors = ['bg-rose-50', 'bg-amber-50', 'bg-indigo-50'];
  
  const Icon = icons[index] || Info;
  const title = titles[index] || card.title;
  const colorClass = colors[index] || 'text-gray-500';
  const bgColorClass = bgColors[index] || 'bg-gray-50';
  
  return (
    <div 
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        statusColors[card.status as keyof typeof statusColors] || statusColors.info,
        isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
      )}
    >
      {/* Card Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bgColorClass)}>
          <Icon size={20} className={colorClass} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {title}
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              statusBadgeColors[card.status as keyof typeof statusBadgeColors] || statusBadgeColors.info
            )}>
              {card.status}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate mt-0.5">
            {card.title}
          </h3>
        </div>
        
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 shrink-0" />
        )}
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {card.detail}
              </p>
            </div>
            
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Recommended Action:</p>
              <p className="text-sm text-gray-800">{card.action}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Suggested Script Component
const SuggestedScript = ({ script, isVisible }: { script: CoachingScript; isVisible: boolean }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(script.suggestion);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
          <MessageSquare size={16} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Suggested Response</h3>
          <p className="text-xs text-gray-500">AI-generated script based on conversation</p>
        </div>
      </div>
      
      {script.summary && (
        <div className="mb-3 text-sm text-gray-600 bg-white/50 rounded-lg p-2">
          <span className="font-medium">Context:</span> {script.summary}
        </div>
      )}
      
      <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
        <p className="text-sm text-gray-800 leading-relaxed">
          {script.suggestion}
        </p>
      </div>
      
      <button
        onClick={handleCopy}
        className={cn(
          'mt-3 w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors',
          isCopied 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        )}
      >
        {isCopied ? 'Copied!' : 'Copy to Clipboard'}
      </button>
    </div>
  );
};

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
      <BrainCircuit size={32} className="text-indigo-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">AXTRA Copilot Ready</h3>
    <p className="text-sm text-gray-500 max-w-xs">
      Start a voice call to receive real-time coaching and suggested responses
    </p>
  </div>
);

// Main Component
const AxtraCopilot: React.FC<AxtraCopilotProps> = ({ className }) => {
  const coachingData = useLiveKitStore((state) => state.coachingData);
  const isConnected = useLiveKitStore((state) => state.isConnected);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  
  // Toggle card expansion
  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };
  
  // No data yet
  if (!coachingData) {
    return (
      <div className={cn('bg-white border border-gray-200 rounded-2xl', className)}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-900">AXTRA Copilot</h2>
            {isConnected && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }
  
  const { cards, script, analysisId, timestamp } = coachingData;
  const analysisTime = new Date(timestamp).toLocaleTimeString();
  
  return (
    <div className={cn('bg-white border border-gray-200 rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AXTRA Copilot</h2>
              <p className="text-xs text-gray-500">
                Analysis #{analysisId} • {analysisTime}
              </p>
            </div>
          </div>
          
          {isConnected && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Analyzing
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Coaching Cards */}
        <div className="space-y-3">
          {cards.map((card, index) => (
            <CoachingCardItem
              key={`${analysisId}-${index}`}
              card={card}
              index={index}
              isExpanded={expandedCard === index}
              onToggle={() => toggleCard(index)}
            />
          ))}
        </div>
        
        {/* Suggested Script */}
        <SuggestedScript 
          script={script} 
          isVisible={!!script.suggestion} 
        />
      </div>
    </div>
  );
};

export default memo(AxtraCopilot);
