/**
 * LiveKit Call Controls Component
 * Mute/pause/end call buttons for the active call interface
 */

import { memo } from 'react';
import { Mic, MicOff, Pause, Play, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '../../utils/classnames';

interface LiveKitCallControlsProps {
  isMuted: boolean;
  isPaused: boolean;
  isConnecting: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onEndCall: () => void;
  className?: string;
}

export const LiveKitCallControls = memo<LiveKitCallControlsProps>(
  ({ isMuted, isPaused, isConnecting, onToggleMute, onTogglePause, onEndCall, className }) => {
    if (isConnecting) {
      return (
        <div className={cn('flex items-center justify-center gap-3', className)}>
          <div className="p-3 bg-gray-100 rounded-full">
            <Loader2 size={20} className="animate-spin text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">Connecting...</span>
        </div>
      );
    }

    return (
      <div className={cn('flex items-center justify-center gap-3', className)}>
        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          className={cn(
            'p-3 rounded-full transition-all duration-200 hover:scale-105',
            isMuted
              ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Pause Button */}
        <button
          onClick={onTogglePause}
          className={cn(
            'p-3 rounded-full transition-all duration-200 hover:scale-105',
            isPaused
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="p-3 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all duration-200 hover:scale-105 shadow-lg shadow-rose-500/30"
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    );
  }
);

LiveKitCallControls.displayName = 'LiveKitCallControls';
