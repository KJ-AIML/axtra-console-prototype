/**
 * Web Speech API wrapper for local speech-to-text
 * Used for transcribing user's speech during LiveKit calls
 */

export interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
  resultIndex: number;
}

export type SpeechRecognitionCallback = (transcript: string, isFinal: boolean) => void;
export type SpeechStateCallback = (state: 'starting' | 'listening' | 'error' | 'stopped') => void;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string; message?: string }) => void;
  onend: () => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export class SpeechRecognitionManager {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private onTranscript: SpeechRecognitionCallback;
  private onStateChange?: SpeechStateCallback;
  private errorCount = 0;
  private maxRetries = 3;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    onTranscript: SpeechRecognitionCallback,
    onStateChange?: SpeechStateCallback
  ) {
    this.onTranscript = onTranscript;
    this.onStateChange = onStateChange;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'network':
        return 'Speech recognition service unavailable. Please check your internet connection.';
      case 'not-allowed':
        return 'Microphone access denied. Please allow microphone permission.';
      case 'no-speech':
        return 'No speech detected. Please try speaking louder.';
      case 'aborted':
        return 'Speech recognition was aborted.';
      case 'audio-capture':
        return 'No microphone found. Please check your audio devices.';
      default:
        return `Speech recognition error: ${error}`;
    }
  }

  start(): boolean {
    if (!this.isSupported()) {
      console.warn('[Speech] Web Speech API not supported in this browser');
      this.onStateChange?.('error');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    // Reset error count on fresh start
    this.errorCount = 0;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log('[Speech] Recognition started');
        this.isListening = true;
        this.errorCount = 0;
        this.onStateChange?.('listening');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          this.onTranscript(finalTranscript, true);
        } else if (interimTranscript) {
          this.onTranscript(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('[Speech] Recognition error:', event.error, event.message);
        
        // Don't count 'aborted' or 'no-speech' as serious errors
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          this.errorCount++;
        }

        // Only show error state for permission issues
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          this.onStateChange?.('error');
          this.isListening = false;
          return;
        }

        // For network errors, stop trying after max retries
        if (event.error === 'network' && this.errorCount >= this.maxRetries) {
          console.warn('[Speech] Max retries reached, giving up on speech recognition');
          this.onStateChange?.('error');
          this.isListening = false;
          return;
        }
      };

      this.recognition.onend = () => {
        console.log('[Speech] Recognition ended');
        
        // Only restart if we're supposed to be listening AND haven't hit max errors
        if (this.isListening && this.errorCount < this.maxRetries) {
          const delay = Math.min(1000 * (this.errorCount + 1), 5000); // Exponential backoff
          console.log(`[Speech] Restarting in ${delay}ms...`);
          
          this.restartTimeout = setTimeout(() => {
            if (this.isListening) {
              this.onStateChange?.('starting');
              this.recognition?.start();
            }
          }, delay);
        } else if (this.errorCount >= this.maxRetries) {
          this.onStateChange?.('error');
          this.isListening = false;
        }
      };

      this.onStateChange?.('starting');
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('[Speech] Failed to start recognition:', error);
      this.onStateChange?.('error');
      return false;
    }
  }

  stop(): void {
    this.isListening = false;
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore abort errors
      }
      this.recognition = null;
    }
    
    this.onStateChange?.('stopped');
  }

  isActive(): boolean {
    return this.isListening;
  }

  getErrorCount(): number {
    return this.errorCount;
  }
}
