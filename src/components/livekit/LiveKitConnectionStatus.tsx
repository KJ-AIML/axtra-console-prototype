/**
 * LiveKit Connection Status Component
 * Shows connection state, call duration, and live indicator
 */

import { memo } from 'react';
import { cn } from '../../utils/classnames';
import { formatDuration } from '../../lib/livekit';
import { Radio, Loader2 } from 'lucide-react';

interface LiveKitConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  coachingCount?: number;
  className?: string;
}

export const LiveKitConnectionStatus = memo<LiveKitConnectionStatusProps>(
  ({ isConnected, isConnecting, callDuration, coachingCount = 0, className }) => {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="flex items-center gap-3">
          {/* Status indicator with pulse effect */}
          {isConnected && (
            <div className="relative flex items-center justify-center">
              {/* Outer pulse ring */}
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              {/* Inner dot */}
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
            </div>
          )}
          
          {isConnecting && (
            <Loader2 size={16} className="text-amber-500 animate-spin" />
          )}
          
          {!isConnected && !isConnecting && (
            <div className="w-3 h-3 rounded-full bg-gray-400" />
          )}
          
          {/* LIVE Badge */}
          {isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200">
              <Radio size={12} className="text-rose-500" />
              <span className="text-xs font-bold text-rose-600 tracking-wider">LIVE</span>
            </span>
          )}
          
          {/* Coaching count badge */}
          {isConnected && coachingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-full">
              {coachingCount} coaching{coachingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Call duration */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Duration</span>
          <div className="text-xl font-mono font-bold text-gray-900 tabular-nums">
            {formatDuration(callDuration)}
          </div>
        </div>
      </div>
    );
  }
);

LiveKitConnectionStatus.displayName = 'LiveKitConnectionStatus';
