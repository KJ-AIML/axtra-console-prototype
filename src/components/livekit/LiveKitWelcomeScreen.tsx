/**
 * LiveKit Welcome Screen
 * Shows before call starts - handles user gesture for audio
 */

import { memo } from 'react';
import { Phone, Wifi, Loader2, AlertCircle, Volume2 } from 'lucide-react';
import { cn } from '../../utils/classnames';

interface LiveKitWelcomeScreenProps {
  scenarioTitle: string;
  personaName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isConnecting: boolean;
  connectionError: string | null;
  needsAudioPermission: boolean;
  onStartCall: () => void;
  onEnableAudio: () => void;
  className?: string;
}

export const LiveKitWelcomeScreen = memo<LiveKitWelcomeScreenProps>(
  ({ 
    scenarioTitle, 
    personaName, 
    difficulty, 
    isConnecting, 
    connectionError,
    needsAudioPermission,
    onStartCall,
    onEnableAudio,
    className 
  }) => {
    const getDifficultyStyle = () => {
      switch (difficulty) {
        case 'Easy': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-200';
        case 'Hard': return 'bg-rose-50 text-rose-600 border-rose-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
      }
    };

    return (
      <div className={cn('h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white', className)}>
        {/* Icon */}
        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100">
          <Phone size={36} className="text-indigo-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Ready to Practice?</h2>
        <p className="text-gray-500 text-center mb-6 max-w-md">
          {needsAudioPermission 
            ? "Click 'Enable Audio' to allow microphone access, then start the call."
            : "You'll connect to an AI training agent for a voice simulation."}
        </p>

        {/* Scenario Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Wifi size={18} className="text-emerald-500" />
            <span className="text-sm font-medium text-gray-700">Voice Connection Ready</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Scenario</span>
              <span className="font-medium text-gray-900 truncate max-w-[150px]">{scenarioTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Persona</span>
              <span className="font-medium text-gray-900">{personaName}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Difficulty</span>
              <span className={cn('px-2 py-0.5 text-[10px] font-bold uppercase rounded border', getDifficultyStyle())}>
                {difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {connectionError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 max-w-sm">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span className="text-sm text-rose-700">{connectionError}</span>
          </div>
        )}

        {/* Buttons */}
        {needsAudioPermission ? (
          <button
            onClick={onEnableAudio}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-500/30"
          >
            <Volume2 size={20} />
            <span>Enable Audio</span>
          </button>
        ) : (
          <button
            onClick={onStartCall}
            disabled={isConnecting}
            className={cn(
              'flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200',
              isConnecting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-lg shadow-indigo-500/30'
            )}
          >
            {isConnecting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Phone size={20} />
                <span>Start Voice Call</span>
              </>
            )}
          </button>
        )}

        {/* Note */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          The AI agent will join automatically after you connect
        </p>
      </div>
    );
  }
);

LiveKitWelcomeScreen.displayName = 'LiveKitWelcomeScreen';
