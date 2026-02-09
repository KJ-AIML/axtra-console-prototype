import { memo } from 'react';
import { cn } from '../utils/classnames';
import AxtraCopilot from '../components/livekit/AxtraCopilot';

interface CopilotPageProps {
  className?: string;
}

const CopilotPage: React.FC<CopilotPageProps> = ({ className }) => {
  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Realtime Copilot</h1>
        <p className="text-sm text-gray-500 mt-2">
          AI-powered real-time coaching during live customer calls
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Copilot Panel */}
        <div className="lg:col-span-2">
          <AxtraCopilot className="h-full" />
        </div>
        
        {/* Right: Info Panel */}
        <div className="space-y-4">
          {/* How it works */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">How it works</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-indigo-600">
                  1
                </div>
                <p>Start a voice call from the <strong>Active Simulation</strong> page</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-indigo-600">
                  2
                </div>
                <p>Speak naturally with the AI customer</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-indigo-600">
                  3
                </div>
                <p>Receive real-time coaching every 3 turns</p>
              </div>
            </div>
          </div>
          
          {/* Cards explained */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Coaching Cards</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-rose-500 text-xs">💝</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Emotion</p>
                  <p className="text-xs text-gray-500">Customer emotional state & empathy tips</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-amber-500 text-xs">⚖️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Leverage</p>
                  <p className="text-xs text-gray-500">Negotiation position & deal dynamics</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-indigo-500 text-xs">🎯</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Strategy</p>
                  <p className="text-xs text-gray-500">Recommended approach & next steps</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CopilotPage);
