/**
 * LiveKit session store for voice calls
 * Uses standard livekit-client (browser SDK)
 */

import { create } from 'zustand';
import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import {
  fetchLiveKitToken,
  createLiveKitRoom,
  connectToRoom,
  enableMicrophone,
  toggleMicrophone,
  disconnectFromRoom,
  formatDuration,
  setupRoomListeners,
} from '../lib/livekit';

export interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
  emotion?: string;
}

interface LiveKitState {
  // Room
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  roomName: string | null;
  
  // Audio state
  isMuted: boolean;
  isAgentSpeaking: boolean;
  canPlaybackAudio: boolean;
  
  // Call state
  isPaused: boolean;
  callDuration: number;
  
  // Transcripts
  transcripts: TranscriptEntry[];
  
  // Actions
  connect: (scenarioId: string) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  togglePause: () => void;
  startAudio: () => Promise<void>;
  addTranscript: (entry: Omit<TranscriptEntry, 'id'>) => void;
}

let durationInterval: NodeJS.Timeout | null = null;

export const useLiveKitStore = create<LiveKitState>((set, get) => ({
  // Initial state
  room: null,
  isConnecting: false,
  isConnected: false,
  connectionError: null,
  roomName: null,
  isMuted: false,
  isAgentSpeaking: false,
  canPlaybackAudio: false,
  isPaused: false,
  callDuration: 0,
  transcripts: [],

  // Connect to room (creates room, agent will auto-join from server)
  connect: async (scenarioId: string) => {
    set({ isConnecting: true, connectionError: null });
    
    try {
      // 1. Get token from our server
      const { token, url, roomName } = await fetchLiveKitToken(scenarioId);
      
      // 2. Create room
      const room = createLiveKitRoom();
      
      // 3. Setup listeners BEFORE connecting
      setupRoomListeners(room, {
        onConnectionStateChanged: (state: ConnectionState) => {
          console.log('[LiveKit] Connection state:', state);
          set({ 
            isConnected: state === ConnectionState.Connected,
            isConnecting: state === ConnectionState.Connecting,
          });
        },
        
        onTrackSubscribed: (track, publication, participant) => {
          console.log('[LiveKit] Track subscribed:', track.kind, 'from', participant.identity);
          
          // Agent joined - attach audio element
          if (track.kind === 'audio') {
            set({ isAgentSpeaking: true });
            
            // Create audio element for the agent's voice
            const audioElement = track.attach();
            audioElement.id = 'agent-audio';
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
            
            // Check if audio can play
            audioElement.play().catch((e) => {
              console.log('[LiveKit] Audio playback blocked (need user gesture):', e);
              set({ canPlaybackAudio: false });
            });
          }
        },
        
        onTrackUnsubscribed: (track, publication, participant) => {
          console.log('[LiveKit] Track unsubscribed:', track.kind);
          if (track.kind === 'audio') {
            set({ isAgentSpeaking: false });
            track.detach();
            // Remove audio element
            const el = document.getElementById('agent-audio');
            if (el) el.remove();
          }
        },
        
        onAudioPlaybackStatusChanged: (canPlayback) => {
          console.log('[LiveKit] Audio playback status:', canPlayback);
          set({ canPlaybackAudio: canPlayback });
        },
      });
      
      // 4. Connect to room
      await connectToRoom(room, url, token);
      
      // 5. Enable microphone (user audio to agent)
      await enableMicrophone(room);
      
      // 6. Start timer
      if (durationInterval) clearInterval(durationInterval);
      durationInterval = setInterval(() => {
        const state = get();
        if (state.isConnected && !state.isPaused) {
          set({ callDuration: state.callDuration + 1 });
        }
      }, 1000);
      
      set({ 
        room, 
        roomName,
        isConnected: true, 
        isConnecting: false,
        isMuted: false,
      });
      
      console.log('[LiveKit] Connected! Waiting for agent to join...');
      
    } catch (error) {
      console.error('[LiveKit] Connection error:', error);
      set({ 
        isConnecting: false, 
        isConnected: false,
        connectionError: error instanceof Error ? error.message : 'Failed to connect'
      });
      throw error;
    }
  },

  // Disconnect
  disconnect: () => {
    const { room } = get();
    
    if (room) {
      disconnectFromRoom(room);
    }
    
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    
    // Remove audio element
    const el = document.getElementById('agent-audio');
    if (el) el.remove();
    
    set({
      room: null,
      isConnected: false,
      isConnecting: false,
      roomName: null,
      isMuted: false,
      isAgentSpeaking: false,
      canPlaybackAudio: false,
      isPaused: false,
      callDuration: 0,
      transcripts: [],
      connectionError: null,
    });
  },

  // Toggle mute
  toggleMute: async () => {
    const { room } = get();
    if (!room) return;
    
    const newState = await toggleMicrophone(room);
    set({ isMuted: !newState }); // toggleMicrophone returns new enabled state
  },

  // Toggle pause
  togglePause: () => {
    const { isPaused } = get();
    set({ isPaused: !isPaused });
  },

  // Start audio (after user gesture)
  startAudio: async () => {
    const { room } = get();
    if (!room) return;
    
    try {
      await room.startAudio();
      set({ canPlaybackAudio: true });
    } catch (e) {
      console.error('[LiveKit] Failed to start audio:', e);
    }
  },

  // Add transcript
  addTranscript: (entry) => {
    const { transcripts } = get();
    const newEntry = {
      ...entry,
      id: `${Date.now()}-${transcripts.length}`,
    };
    set({ transcripts: [...transcripts, newEntry] });
  },
}));
