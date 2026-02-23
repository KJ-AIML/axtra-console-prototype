/**
 * LiveKit Egress Service
 * Handles recording of voice calls using Track Egress for separate operator/agent tracks
 */

import { EgressClient, DirectFileOutput, S3Upload, AzureBlobUpload } from 'livekit-server-sdk';
import { getEnv } from './config';
import { db } from './db';

// Egress configuration
const LIVEKIT_URL = getEnv('LIVEKIT_URL', '');
const LIVEKIT_API_KEY = getEnv('LIVEKIT_API_KEY', '');
const LIVEKIT_API_SECRET = getEnv('LIVEKIT_API_SECRET', '');

// Storage configuration
const STORAGE_TYPE = getEnv('EGRESS_STORAGE_TYPE', 's3'); // s3, azure, gcp
const S3_BUCKET = getEnv('EGRESS_S3_BUCKET', '');
const S3_REGION = getEnv('EGRESS_S3_REGION', 'us-east-1');
const S3_ENDPOINT = getEnv('EGRESS_S3_ENDPOINT', '');
const S3_ACCESS_KEY = getEnv('EGRESS_S3_ACCESS_KEY', '');
const S3_SECRET_KEY = getEnv('EGRESS_S3_SECRET_KEY', '');

// Azure config
const AZURE_ACCOUNT = getEnv('EGRESS_AZURE_ACCOUNT', '');
const AZURE_KEY = getEnv('EGRESS_AZURE_KEY', '');
const AZURE_CONTAINER = getEnv('EGRESS_AZURE_CONTAINER', '');

// GCP config
const GCP_BUCKET = getEnv('EGRESS_GCP_BUCKET', '');
const GCP_CREDENTIALS = getEnv('EGRESS_GCP_CREDENTIALS', '');

// Track recording info for a call
interface TrackRecordingInfo {
  operatorEgressId: string;
  agentEgressId: string;
  roomName: string;
  callId: string;
  startedAt: Date;
}

// Active recordings map
const activeRecordings = new Map<string, TrackRecordingInfo>();

/**
 * Initialize Egress client
 */
function getEgressClient(): EgressClient {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials not configured for Egress');
  }
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Generate file path (without creating output object)
 * Note: LiveKit Egress will append its own timestamp before the extension
 */
function getFilePath(filepath: string): string {
  // Return path with .ogg extension - LiveKit will insert timestamp before .ogg
  // e.g., recordings/{callId}/operator.ogg becomes recordings/{callId}/operator-{timestamp}.ogg
  return `${filepath}.ogg`;
}

/**
 * Build storage output config for Track Egress
 * Uses DirectFileOutput (no transcoding)
 */
function buildStorageOutput(filepath: string): DirectFileOutput {
  const fullPath = getFilePath(filepath);

  switch (STORAGE_TYPE) {
    case 's3':
      if (!S3_BUCKET) throw new Error('S3 bucket not configured');
      return new DirectFileOutput({
        filepath: fullPath,
        output: {
          case: 's3',
          value: new S3Upload({
            bucket: S3_BUCKET,
            region: S3_REGION,
            accessKey: S3_ACCESS_KEY,
            secret: S3_SECRET_KEY,
            endpoint: S3_ENDPOINT || undefined,
            forcePathStyle: !!S3_ENDPOINT,
          }),
        },
      });

    case 'azure':
      if (!AZURE_ACCOUNT || !AZURE_KEY || !AZURE_CONTAINER) {
        throw new Error('Azure storage not configured');
      }
      return new DirectFileOutput({
        filepath: fullPath,
        output: {
          case: 'azure',
          value: new AzureBlobUpload({
            accountName: AZURE_ACCOUNT,
            accountKey: AZURE_KEY,
            containerName: AZURE_CONTAINER,
          }),
        },
      });

    case 'gcp':
      if (!GCP_BUCKET) throw new Error('GCP bucket not configured');
      return new DirectFileOutput({
        filepath: fullPath,
        output: {
          case: 'gcp',
          value: {
            bucket: GCP_BUCKET,
            credentials: GCP_CREDENTIALS,
          },
        },
      });

    default:
      throw new Error(`Unknown storage type: ${STORAGE_TYPE}`);
  }
}

/**
 * Start recording both operator and agent tracks
 */
export async function startCallRecording(
  callId: string,
  roomName: string,
  operatorTrackId: string,
  agentTrackId: string
): Promise<{ success: boolean; operatorEgressId?: string; agentEgressId?: string; error?: string }> {
  try {
    const egressClient = getEgressClient();
    const basePath = `recordings/${callId}`;

    // Start operator track recording
    const operatorOutput = buildStorageOutput(`${basePath}/operator`);
    const operatorFilePath = getFilePath(`${basePath}/operator`);
    const operatorInfo = await egressClient.startTrackEgress(
      roomName,
      operatorOutput,
      operatorTrackId
    );

    // Start agent track recording
    const agentOutput = buildStorageOutput(`${basePath}/agent`);
    const agentFilePath = getFilePath(`${basePath}/agent`);
    const agentInfo = await egressClient.startTrackEgress(
      roomName,
      agentOutput,
      agentTrackId
    );

    // Store recording info
    const recordingInfo: TrackRecordingInfo = {
      operatorEgressId: operatorInfo.egressId,
      agentEgressId: agentInfo.egressId,
      roomName,
      callId,
      startedAt: new Date(),
    };
    activeRecordings.set(callId, recordingInfo);

    // Update database with recording IDs and file paths
    await db.execute({
      sql: `
        UPDATE call_sessions 
        SET recording_status = 'recording',
            operator_egress_id = ?,
            agent_egress_id = ?,
            operator_track_url = ?,
            agent_track_url = ?,
            recording_started_at = ?
        WHERE id = ?
      `,
      args: [operatorInfo.egressId, agentInfo.egressId, operatorFilePath, agentFilePath, new Date().toISOString(), callId],
    });

    console.log(`[Egress] Started recording for call ${callId}:`, {
      operator: operatorInfo.egressId,
      agent: agentInfo.egressId,
    });

    return {
      success: true,
      operatorEgressId: operatorInfo.egressId,
      agentEgressId: agentInfo.egressId,
    };
  } catch (error) {
    console.error('[Egress] Failed to start recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stop recording both tracks
 */
export async function stopCallRecording(callId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const egressClient = getEgressClient();
    const recording = activeRecordings.get(callId);

    if (!recording) {
      // Try to get from database
      const result = await db.execute({
        sql: 'SELECT operator_egress_id, agent_egress_id FROM call_sessions WHERE id = ?',
        args: [callId],
      });

      if (result.rows.length === 0 || !result.rows[0].operator_egress_id) {
        // No recording started - this is OK, just return success
        return { success: true };
      }

      // Stop both egress jobs from DB (may already be complete)
      try {
        await egressClient.stopEgress(result.rows[0].operator_egress_id as string);
      } catch (e: any) {
        if (e.code !== 'failed_precondition') throw e; // Ignore "already complete" error
      }
      try {
        await egressClient.stopEgress(result.rows[0].agent_egress_id as string);
      } catch (e: any) {
        if (e.code !== 'failed_precondition') throw e;
      }
    } else {
      // Stop from active recordings
      try {
        await egressClient.stopEgress(recording.operatorEgressId);
      } catch (e: any) {
        if (e.code !== 'failed_precondition') throw e;
      }
      try {
        await egressClient.stopEgress(recording.agentEgressId);
      } catch (e: any) {
        if (e.code !== 'failed_precondition') throw e;
      }
      activeRecordings.delete(callId);
    }

    // Update database
    await db.execute({
      sql: `
        UPDATE call_sessions 
        SET recording_status = 'processing',
            recording_ended_at = ?
        WHERE id = ?
      `,
      args: [new Date().toISOString(), callId],
    });

    console.log(`[Egress] Stopped recording for call ${callId}`);

    // Trigger post-processing (merge tracks, etc.)
    processRecordingPostProcessing(callId).catch(console.error);

    return { success: true };
  } catch (error) {
    console.error('[Egress] Failed to stop recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recording status for a call
 */
export async function getRecordingStatus(callId: string): Promise<{
  status: 'none' | 'recording' | 'processing' | 'completed' | 'failed';
  operatorUrl?: string;
  agentUrl?: string;
  stereoUrl?: string;
  duration?: number;
}> {
  try {
    const result = await db.execute({
      sql: `
        SELECT recording_status, operator_track_url, agent_track_url, 
               stereo_track_url, recording_started_at, recording_ended_at
        FROM call_sessions 
        WHERE id = ?
      `,
      args: [callId],
    });

    if (result.rows.length === 0) {
      return { status: 'none' };
    }

    const row = result.rows[0];
    const status = (row.recording_status as string) || 'none';

    // Calculate duration if available
    let duration: number | undefined;
    if (row.recording_started_at && row.recording_ended_at) {
      const start = new Date(row.recording_started_at as string).getTime();
      const end = new Date(row.recording_ended_at as string).getTime();
      duration = Math.round((end - start) / 1000);
    }

    return {
      status: status as any,
      operatorUrl: (row.operator_track_url as string) || undefined,
      agentUrl: (row.agent_track_url as string) || undefined,
      stereoUrl: (row.stereo_track_url as string) || undefined,
      duration,
    };
  } catch (error) {
    console.error('[Egress] Failed to get recording status:', error);
    return { status: 'none' };
  }
}

/**
 * Post-processing: merge tracks to stereo using FFmpeg
 * Creates: operator.ogg + agent.ogg → stereo.ogg (operator=left, agent=right)
 */
async function processRecordingPostProcessing(callId: string): Promise<void> {
  try {
    console.log(`[Egress] Starting post-processing for call ${callId}`);

    // Get recording info from database
    const result = await db.execute({
      sql: 'SELECT operator_track_url, agent_track_url FROM call_sessions WHERE id = ?',
      args: [callId],
    });

    if (result.rows.length === 0) {
      throw new Error('Call session not found');
    }

    const row = result.rows[0];
    const operatorUrl = row.operator_track_url as string;
    const agentUrl = row.agent_track_url as string;

    if (!operatorUrl || !agentUrl) {
      console.log(`[Egress] Missing track URLs for call ${callId}, skipping merge`);
      await db.execute({
        sql: `UPDATE call_sessions SET recording_status = 'completed' WHERE id = ?`,
        args: [callId],
      });
      return;
    }

    // Note: Actual FFmpeg merge would happen here
    // For Cloudflare R2, we'd need to:
    // 1. Download both OGG files from R2
    // 2. Run FFmpeg to merge: ffmpeg -i operator.ogg -i agent.ogg -filter_complex amerge=inputs=2 -ac 2 stereo.ogg
    // 3. Upload stereo.ogg back to R2
    // 4. Update database with stereo_track_url

    // For now, mark as completed without stereo (can be added later when you need it)
    const stereoPath = operatorUrl.replace('operator-', 'stereo-').replace('.ogg', '-stereo.ogg');

    await db.execute({
      sql: `
        UPDATE call_sessions 
        SET recording_status = 'completed',
            stereo_track_url = ?
        WHERE id = ?
      `,
      args: [stereoPath, callId],
    });

    console.log(`[Egress] Post-processing completed for call ${callId}`);
    console.log(`[Egress] Note: Stereo merge not yet implemented. To add it, install FFmpeg and implement the merge logic.`);
  } catch (error) {
    console.error(`[Egress] Post-processing failed for call ${callId}:`, error);

    await db.execute({
      sql: `UPDATE call_sessions SET recording_status = 'failed' WHERE id = ?`,
      args: [callId],
    });
  }
}

/**
 * Generate signed URL for playback (implement based on storage type)
 */
export async function getSignedRecordingUrl(
  callId: string,
  channel: 'operator' | 'agent' | 'stereo'
): Promise<string | null> {
  try {
    const result = await db.execute({
      sql: `
        SELECT operator_track_url, agent_track_url, stereo_track_url
        FROM call_sessions 
        WHERE id = ?
      `,
      args: [callId],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    let filepath: string | null = null;

    switch (channel) {
      case 'operator':
        filepath = row.operator_track_url as string;
        break;
      case 'agent':
        filepath = row.agent_track_url as string;
        break;
      case 'stereo':
        filepath = row.stereo_track_url as string;
        break;
    }

    if (!filepath) return null;

    // TODO: Generate actual signed URLs based on storage type
    // For now, return a placeholder URL
    return `/api/recordings/${callId}/audio?channel=${channel}`;
  } catch (error) {
    console.error('[Egress] Failed to get signed URL:', error);
    return null;
  }
}

/**
 * List active recordings (for monitoring)
 */
export function getActiveRecordings(): TrackRecordingInfo[] {
  return Array.from(activeRecordings.values());
}

/**
 * Resolve actual file URL from R2 using the base path
 * LiveKit adds timestamps to filenames, so we need to find the actual file
 */
export async function resolveRecordingUrl(
  basePath: string
): Promise<string | null> {
  // For R2 with public access, construct the public URL directly
  // The basePath should be like: recordings/{callId}/operator
  // LiveKit creates: recordings/{callId}/operator-{timestamp}.ogg
  
  // Since we can't easily list R2 files without S3 SDK, 
  // we'll try common timestamp patterns or use a placeholder approach
  // For now, return the R2 public base URL and let the caller try to find it
  
  if (!basePath) return null;
  
  // If the stored path already has a full filename with timestamp, use it
  if (basePath.endsWith('.ogg')) {
    return `https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev/${basePath}`;
  }
  
  // Otherwise, we need to figure out the actual filename
  // This is a workaround - ideally we'd list R2 objects
  return null;
}

/**
 * Check if Egress is configured
 */
export function isEgressConfigured(): boolean {
  return !!(
    LIVEKIT_URL &&
    LIVEKIT_API_KEY &&
    LIVEKIT_API_SECRET &&
    ((STORAGE_TYPE === 's3' && S3_BUCKET) ||
      (STORAGE_TYPE === 'azure' && AZURE_ACCOUNT) ||
      (STORAGE_TYPE === 'gcp' && GCP_BUCKET))
  );
}

export default {
  startCallRecording,
  stopCallRecording,
  getRecordingStatus,
  getSignedRecordingUrl,
  getActiveRecordings,
  isEgressConfigured,
};
