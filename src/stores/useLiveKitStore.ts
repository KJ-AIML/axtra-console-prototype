/**
 * LiveKit session store for voice calls
 * Uses standard livekit-client (browser SDK)
 */

import { create } from 'zustand';
import { Room, RoomEvent, ConnectionState } from 'livekit-client';
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

export interface CoachingCard {
  title: string;
  detail: string;
  action: string;
  status: 'danger' | 'warning' | 'success' | 'info';
}

export interface CoachingScript {
  summary: string;
  suggestion: string;
}

export interface CoachingData {
  analysisId: number;
  timestamp: number;
  cards: CoachingCard[];
  script: CoachingScript;
}

export interface CallSummaryData {
  summary: string;
  keyPoints: string[];
  strengths: string[];
  improvements: string[];
  customerSatisfaction: number;
  resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coachingEffectiveness: number;
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
  callSessionId: string | null;
  scenarioId: string | null;
  
  // Transcripts
  transcripts: TranscriptEntry[];
  
  // Coaching data (from AXTRA Copilot)
  coachingData: CoachingData | null;
  coachingHistory: CoachingData[]; // All coaching updates
  
  // Recording state (LiveKit Egress)
  recordingStatus: 'none' | 'starting' | 'recording' | 'stopping' | 'completed' | 'failed';
  recordingError: string | null;
  operatorTrackId: string | null;
  agentTrackId: string | null;
  
  // Actions
  connect: (scenarioId: string, connectionData?: { token: string; url: string; roomName: string; callSessionId?: string }) => Promise<void>;
  disconnect: () => void;
  endCallAndSave: () => Promise<{
    session: any;
    transcripts: TranscriptEntry[];
    coachingHistory: CoachingData[];
    summary: CallSummaryData;
  } | null>;
  toggleMute: () => Promise<void>;
  togglePause: () => void;
  startAudio: () => Promise<void>;
  addTranscript: (entry: Omit<TranscriptEntry, 'id'>) => void;
  updateTranscript: (index: number, text: string) => void;
  resetState: () => void;
  
  // Recording actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
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
  callSessionId: null,
  scenarioId: null,
  transcripts: [],
  coachingData: null,
  coachingHistory: [],
  recordingStatus: 'none',
  recordingError: null,
  operatorTrackId: null,
  agentTrackId: null,

  // Connect to room (creates room, agent will auto-join from server)
  connect: async (scenarioId: string, connectionData?: { token: string; url: string; roomName: string; callSessionId?: string }) => {
    set({ isConnecting: true, connectionError: null });
    
    try {
      // 1. Get connection data (from params or fetch from server)
      const { token, url, roomName, callSessionId: providedSessionId } = connectionData || await fetchLiveKitToken(scenarioId);
      
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
      
      // Listen for data messages (transcription from agent)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: any) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log('[LiveKit] Data received:', data);
          
          if (data.type === 'transcript') {
            const { transcripts } = get();
            const newEntry: TranscriptEntry = {
              id: `${Date.now()}-${transcripts.length}`,
              speaker: data.speaker as 'customer' | 'operator',
              text: data.text,
              timestamp: formatDuration(get().callDuration),
              emotion: data.emotion,
            };
            set({ transcripts: [...transcripts, newEntry] });
          } else if (data.type === 'coaching_update') {
            // AXTRA Copilot real-time coaching data
            console.log('🎯 AXTRA Copilot Update received:', data);
            
            // Validate script format
            let script = data.script || { summary: '', suggestion: '' };
            if (typeof script === 'object' && !script.suggestion && script.summary) {
              // Handle case where script might have different field names
              script = { 
                summary: script.summary || '', 
                suggestion: script.suggested_script || script.suggestion || '' 
              };
            }
            
            const coachingData: CoachingData = {
              analysisId: data.analysis_id || 0,
              timestamp: data.timestamp || Date.now(),
              cards: data.cards || [],
              script: script
            };
            
            console.log('✅ Setting coaching data:', coachingData);
            
            // Add to coaching history and update current
            const { coachingHistory } = get();
            const updatedHistory = [...coachingHistory, coachingData];
            set({ 
              coachingData,
              coachingHistory: updatedHistory
            });
            
            // Also log to console for debugging
            console.log('%c[AXTRA Copilot]', 'color: #4F46E5; font-weight: bold; font-size: 14px;', {
              analysisId: coachingData.analysisId,
              cardsCount: coachingData.cards.length,
              script: coachingData.script
            });
          }
        } catch (e) {
          console.error('[LiveKit] Failed to parse data message:', e);
        }
      });
      
      // Listen for transcription metadata on tracks (if available)
      room.on(RoomEvent.TrackTranscriptionStarted, (track, participant) => {
        console.log('[LiveKit] Transcription started for track:', track.kind);
      });
      
      room.on(RoomEvent.TrackTranscriptionFailed, (track, error) => {
        console.error('[LiveKit] Transcription failed:', error);
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
      
      // Use provided session ID or create new call session (legacy flow)
      if (providedSessionId) {
        // New explicit dispatch flow: session already created by /api/simulations/start
        set({ callSessionId: providedSessionId });
        console.log('[LiveKit] Using existing call session:', providedSessionId);
      } else {
        // Legacy flow: create call session in backend
        try {
          const token = localStorage.getItem('axtra_token');
          const sessionResponse = await fetch('/api/calls', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              scenarioId,
              roomName,
            }),
          });
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            set({ callSessionId: sessionData.data.session.id });
            console.log('[LiveKit] Call session created:', sessionData.data.session.id);
          } else {
            const errorData = await sessionResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[LiveKit] Failed to create call session:', errorData);
          }
        } catch (e) {
          console.error('[LiveKit] Failed to create call session:', e);
        }
      }
      
      set({ 
        room, 
        roomName,
        scenarioId,
        isConnected: true, 
        isConnecting: false,
        isMuted: false,
      });
      
      console.log('[LiveKit] Connected! Waiting for agent to join...');
      
      // Auto-start recording when agent joins (via track subscription)
      const checkAndStartRecording = () => {
        const { room, callSessionId } = get();
        if (!room || !callSessionId) return;
        
        // Find operator's own audio track and agent's audio track
        const localParticipant = room.localParticipant;
        const agentParticipant = Array.from(room.remoteParticipants.values()).find(
          p => p.identity === 'agent' || p.identity.startsWith('agent-')
        );
        
        if (localParticipant && agentParticipant) {
          const operatorTrack = Array.from(localParticipant.audioTrackPublications.values())[0]?.trackSid;
          const agentTrack = Array.from(agentParticipant.audioTrackPublications.values())[0]?.trackSid;
          
          if (operatorTrack && agentTrack) {
            set({ 
              operatorTrackId: operatorTrack, 
              agentTrackId: agentTrack 
            });
            
            // Auto-start recording
            get().startRecording();
          }
        }
      };
      
      // Check for tracks after a short delay to allow agent to join
      setTimeout(checkAndStartRecording, 2000);
      // Also check periodically
      const checkInterval = setInterval(() => {
        const { recordingStatus } = get();
        if (recordingStatus === 'none' || recordingStatus === 'failed') {
          checkAndStartRecording();
        } else {
          clearInterval(checkInterval);
        }
      }, 3000);
      
    } catch (error) {
      console.error('[LiveKit] Connection error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to connect';
      if (error instanceof Error) {
        if (error.message.includes('Microphone permission')) {
          errorMessage = error.message; // Use the specific message from enableMicrophone
        } else if (error.message.includes('token') || error.message.includes('Token')) {
          errorMessage = 'Failed to get call token. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ 
        isConnecting: false, 
        isConnected: false,
        connectionError: errorMessage
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
      coachingData: null,
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

  // Update transcript at index (for streaming)
  updateTranscript: (index, text) => {
    const { transcripts } = get();
    if (index < 0 || index >= transcripts.length) return;
    
    const updated = [...transcripts];
    updated[index] = { ...updated[index], text };
    set({ transcripts: updated });
  },
  
  // End call and save all data to backend
  endCallAndSave: async () => {
    const state = get();
    const { room, callSessionId, callDuration, transcripts, coachingHistory, recordingStatus } = state;
    
    if (!callSessionId) {
      console.error('[LiveKit] No call session to save');
      get().disconnect();
      return null;
    }
    
    // Stop recording if active
    if (recordingStatus === 'recording') {
      await get().stopRecording();
    }
    
    // Disconnect from room first
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
    
    // Get final sentiment from coaching history
    let customerSentiment = 'neutral';
    if (coachingHistory.length > 0) {
      const lastCoaching = coachingHistory[coachingHistory.length - 1];
      const emotionCard = lastCoaching.cards[0];
      if (emotionCard) {
        switch (emotionCard.status) {
          case 'danger': customerSentiment = 'angry'; break;
          case 'warning': customerSentiment = 'frustrated'; break;
          case 'success': customerSentiment = 'happy'; break;
          default: customerSentiment = 'neutral';
        }
      }
    }
    
    try {
      console.log('[LiveKit] Saving call session...');
      
      // Save to backend
      const token = localStorage.getItem('axtra_token');
      const response = await fetch('/api/calls/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          callId: callSessionId,
          durationSeconds: callDuration,
          totalTurns: transcripts.length,
          customerSentiment,
          transcripts: transcripts.map(t => ({
            speaker: t.speaker,
            text: t.text,
            timestamp: t.timestamp,
          })),
          coachingHistory: coachingHistory.map(c => ({
            analysis_id: c.analysisId,
            cards: c.cards,
            script: c.script,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LiveKit] Save failed:', response.status, errorText);
        throw new Error(`Failed to save call session: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[LiveKit] Call saved successfully:', result);
      
      // Clear local state but keep the data for the summary modal
      set({
        room: null,
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isAgentSpeaking: false,
        canPlaybackAudio: false,
        isPaused: false,
        connectionError: null,
      });
      
      return {
        session: result.data.session,
        transcripts,
        coachingHistory,
        summary: result.data.summary,
      };
      
    } catch (error) {
      console.error('[LiveKit] Failed to save call:', error);
      
      // Still disconnect even if save failed
      set({
        room: null,
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isAgentSpeaking: false,
        canPlaybackAudio: false,
        isPaused: false,
        callDuration: 0,
        callSessionId: null,
        scenarioId: null,
        transcripts: [],
        coachingData: null,
        coachingHistory: [],
        connectionError: null,
      });
      
      return null;
    }
  },
  
  // Reset state completely (after viewing summary)
  resetState: () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    
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
      callSessionId: null,
      scenarioId: null,
      transcripts: [],
      coachingData: null,
      coachingHistory: [],
      connectionError: null,
      recordingStatus: 'none',
      recordingError: null,
      operatorTrackId: null,
      agentTrackId: null,
    });
  },
  
  // Start recording (Track Egress)
  startRecording: async () => {
    const { callSessionId, operatorTrackId, agentTrackId } = get();
    
    if (!callSessionId || !operatorTrackId || !agentTrackId) {
      console.log('[LiveKit] Cannot start recording: missing session or track IDs');
      return;
    }
    
    set({ recordingStatus: 'starting', recordingError: null });
    
    try {
      const token = localStorage.getItem('axtra_token');
      const response = await fetch(`/api/calls/${callSessionId}/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          operatorTrackId,
          agentTrackId,
        }),
      });
      
      if (response.ok) {
        set({ recordingStatus: 'recording' });
        console.log('[LiveKit] Recording started successfully');
      } else if (response.status === 503) {
        // Recording not configured - silently ignore
        set({ recordingStatus: 'none' });
        console.log('[LiveKit] Recording not configured');
      } else {
        const error = await response.text();
        set({ recordingStatus: 'failed', recordingError: error });
        console.error('[LiveKit] Failed to start recording:', error);
      }
    } catch (error) {
      set({ recordingStatus: 'failed', recordingError: String(error) });
      console.error('[LiveKit] Failed to start recording:', error);
    }
  },
  
  // Stop recording
  stopRecording: async () => {
    const { callSessionId, recordingStatus } = get();
    
    if (!callSessionId || recordingStatus !== 'recording') {
      return;
    }
    
    set({ recordingStatus: 'stopping' });
    
    try {
      const token = localStorage.getItem('axtra_token');
      const response = await fetch(`/api/calls/${callSessionId}/recording`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.ok) {
        set({ recordingStatus: 'completed' });
        console.log('[LiveKit] Recording stopped successfully');
      } else {
        const error = await response.text();
        set({ recordingStatus: 'failed', recordingError: error });
        console.error('[LiveKit] Failed to stop recording:', error);
      }
    } catch (error) {
      set({ recordingStatus: 'failed', recordingError: String(error) });
      console.error('[LiveKit] Failed to stop recording:', error);
    }
  },
}));
