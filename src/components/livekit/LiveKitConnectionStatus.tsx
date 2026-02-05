/**
 * LiveKit Connection Status Component
 * Shows connection state and call duration
 */

import { memo } from 'react';
import { cn } from '../../utils/classnames';
import { formatDuration } from '../../lib/livekit';

interface LiveKitConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  className?: string;
}

export const LiveKitConnectionStatus = memo<LiveKitConnectionStatusProps>(
  ({ isConnected, isConnecting, callDuration, className }) => {
    const getStatusText = () => {
      if (isConnecting) return 'Connecting...';
      if (isConnected) return 'Call in Progress';
      return 'Call Ended';
    };

    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isConnected
                ? 'bg-emerald-500 animate-pulse'
                : isConnecting
                ? 'bg-amber-500 animate-pulse'
                : 'bg-gray-400'
            )}
          />
          
          {/* Status text */}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
        </div>

        {/* Call duration */}
        <div className="text-lg font-mono font-semibold text-gray-900">
          {formatDuration(callDuration)}
        </div>
      </div>
    );
  }
);

LiveKitConnectionStatus.displayName = 'LiveKitConnectionStatus';
