/**
 * LiveKit Transcript Component
 * Displays real-time call transcription from LiveKit
 */

import { memo, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../utils/classnames';
import type { TranscriptEntry } from '../../stores';

interface LiveKitTranscriptProps {
  transcripts: TranscriptEntry[];
  isCallActive: boolean;
  isPaused: boolean;
  className?: string;
}

export const LiveKitTranscript = memo<LiveKitTranscriptProps>(
  ({ transcripts, isCallActive, isPaused, className }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new transcripts arrive
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [transcripts]);

    return (
      <div
        ref={scrollRef}
        className={cn('flex-1 overflow-y-auto p-4 space-y-4', className)}
      >
        {transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User size={24} />
            </div>
            <p className="text-sm">Waiting for conversation...</p>
            <p className="text-xs mt-1">Transcription will appear here</p>
          </div>
        ) : (
          <>
            {/* Call started indicator */}
            <div className="text-center">
              <span className="text-xs text-gray-400">
                Call started at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Transcript messages */}
            {transcripts.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'flex gap-3',
                  line.speaker === 'operator' && 'flex-row-reverse'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    line.speaker === 'customer'
                      ? 'bg-indigo-100'
                      : 'bg-emerald-100'
                  )}
                >
                  {line.speaker === 'customer' ? (
                    <User size={14} className="text-indigo-600" />
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">OP</span>
                  )}
                </div>

                {/* Message */}
                <div
                  className={cn(
                    'max-w-[75%]',
                    line.speaker === 'operator' && 'text-right'
                  )}
                >
                  <div
                    className={cn(
                      'inline-block px-4 py-2 rounded-2xl text-sm',
                      line.speaker === 'customer'
                        ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    )}
                  >
                    {line.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {line.timestamp}
                    </span>
                    {line.speaker === 'customer' && line.emotion && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          line.emotion === 'angry' &&
                            'bg-rose-100 text-rose-600',
                          line.emotion === 'frustrated' &&
                            'bg-amber-100 text-amber-600',
                          line.emotion === 'disappointed' &&
                            'bg-gray-100 text-gray-600',
                          line.emotion === 'neutral' &&
                            'bg-gray-100 text-gray-500',
                          line.emotion === 'satisfied' &&
                            'bg-emerald-100 text-emerald-600',
                          line.emotion === 'happy' &&
                            'bg-emerald-100 text-emerald-600'
                        )}
                      >
                        {line.emotion}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isCallActive && !isPaused && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={14} className="text-indigo-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

LiveKitTranscript.displayName = 'LiveKitTranscript';
