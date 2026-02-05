/**
 * LiveKit client utilities for voice calls
 * Uses standard livekit-client (NOT agents SDK)
 */

import { Room, RoomOptions, RoomEvent, ConnectionState } from 'livekit-client';
import { apiClient } from './api-client';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

export interface CallTranscript {
  id: string;
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
  emotion?: string;
}

/**
 * Fetch LiveKit token from server
 */
export async function fetchLiveKitToken(scenarioId: string): Promise<LiveKitTokenResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: LiveKitTokenResponse;
  }>('/livekit/token', { scenarioId });
  
  return response.data;
}

/**
 * Create and configure a LiveKit room for voice
 */
export function createLiveKitRoom(options?: Partial<RoomOptions>): Room {
  const roomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    // Enable audio for voice calls
    publishDefaults: {
      simulcast: false,
      audioBitrate: 24000, // 24kHz for voice
    },
    ...options,
  };
  
  return new Room(roomOptions);
}

/**
 * Connect to a LiveKit room
 */
export async function connectToRoom(
  room: Room,
  url: string,
  token: string
): Promise<void> {
  await room.connect(url, token, {
    autoSubscribe: true, // Subscribe to agent's audio
  });
}

/**
 * Enable microphone in the room
 */
export async function enableMicrophone(room: Room): Promise<void> {
  await room.localParticipant.setMicrophoneEnabled(true);
}

/**
 * Disable microphone
 */
export async function disableMicrophone(room: Room): Promise<void> {
  await room.localParticipant.setMicrophoneEnabled(false);
}

/**
 * Mute/unmute microphone
 */
export async function toggleMicrophone(room: Room): Promise<boolean> {
  const isEnabled = room.localParticipant.isMicrophoneEnabled;
  await room.localParticipant.setMicrophoneEnabled(!isEnabled);
  return !isEnabled;
}

/**
 * Disconnect from room
 */
export function disconnectFromRoom(room: Room): void {
  room.disconnect();
}

/**
 * Format call duration
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Setup room event listeners
 */
export function setupRoomListeners(
  room: Room,
  callbacks: {
    onConnectionStateChanged?: (state: ConnectionState) => void;
    onTrackSubscribed?: (track: any, publication: any, participant: any) => void;
    onTrackUnsubscribed?: (track: any, publication: any, participant: any) => void;
    onAudioPlaybackStatusChanged?: (canPlayback: boolean) => void;
  }
): void {
  if (callbacks.onConnectionStateChanged) {
    room.on(RoomEvent.ConnectionStateChanged, callbacks.onConnectionStateChanged);
  }
  
  if (callbacks.onTrackSubscribed) {
    room.on(RoomEvent.TrackSubscribed, callbacks.onTrackSubscribed);
  }
  
  if (callbacks.onTrackUnsubscribed) {
    room.on(RoomEvent.TrackUnsubscribed, callbacks.onTrackUnsubscribed);
  }
  
  if (callbacks.onAudioPlaybackStatusChanged) {
    room.on(RoomEvent.AudioPlaybackStatusChanged, callbacks.onAudioPlaybackStatusChanged);
  }
}
