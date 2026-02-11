/**
 * Audio Merge Utility
 * Merges two mono OGG files into stereo OGG using FFmpeg
 * Operator on left channel, Agent on right channel
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

export interface MergeOptions {
  operatorPath: string;  // Local path to operator OGG
  agentPath: string;     // Local path to agent OGG
  outputPath: string;    // Local path for output stereo OGG
}

/**
 * Check if FFmpeg is installed
 */
export async function isFFmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge two mono OGG files into stereo OGG
 * Operator = Left channel, Agent = Right channel
 */
export async function mergeToStereo(options: MergeOptions): Promise<{ success: boolean; error?: string }> {
  const { operatorPath, agentPath, outputPath } = options;

  // Check if input files exist
  if (!existsSync(operatorPath)) {
    return { success: false, error: `Operator file not found: ${operatorPath}` };
  }
  if (!existsSync(agentPath)) {
    return { success: false, error: `Agent file not found: ${agentPath}` };
  }

  // Check FFmpeg
  const hasFFmpeg = await isFFmpegInstalled();
  if (!hasFFmpeg) {
    return { success: false, error: 'FFmpeg not installed. Install it to enable stereo merging.' };
  }

  return new Promise((resolve) => {
    // FFmpeg command to merge two mono files into stereo
    // -i operator.ogg -i agent.ogg = input files
    // -filter_complex amerge=inputs=2 = merge audio streams
    // -ac 2 = output 2 channels (stereo)
    // -c:a libopus = use Opus codec
    // -b:a 128k = bitrate 128kbps
    const args = [
      '-i', operatorPath,
      '-i', agentPath,
      '-filter_complex', 'amerge=inputs=2',
      '-ac', '2',
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-y', // Overwrite output
      outputPath,
    ];

    console.log(`[AudioMerge] Running: ffmpeg ${args.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`[AudioMerge] Successfully created: ${outputPath}`);
        resolve({ success: true });
      } else {
        console.error(`[AudioMerge] FFmpeg failed with code ${code}`);
        console.error(`[AudioMerge] stderr: ${stderr}`);
        resolve({ success: false, error: `FFmpeg failed: ${stderr}` });
      }
    });

    ffmpeg.on('error', (err) => {
      console.error(`[AudioMerge] FFmpeg error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Alternative merge using pan filter (operator left, agent right)
 * This gives more control over channel placement
 */
export async function mergeToStereoPan(options: MergeOptions): Promise<{ success: boolean; error?: string }> {
  const { operatorPath, agentPath, outputPath } = options;

  if (!existsSync(operatorPath) || !existsSync(agentPath)) {
    return { success: false, error: 'Input files not found' };
  }

  const hasFFmpeg = await isFFmpegInstalled();
  if (!hasFFmpeg) {
    return { success: false, error: 'FFmpeg not installed' };
  }

  return new Promise((resolve) => {
    // Use pan filter to place each input on specific channel
    // pan=stereo|c0=input1|c1=input2
    // c0 = left channel (operator)
    // c1 = right channel (agent)
    const args = [
      '-i', operatorPath,
      '-i', agentPath,
      '-filter_complex', '[0:a][1:a]pan=stereo|c0=c0|c1=c1[aout]',
      '-map', '[aout]',
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-y',
      outputPath,
    ];

    console.log(`[AudioMerge] Running: ffmpeg ${args.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`[AudioMerge] Successfully created: ${outputPath}`);
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `FFmpeg failed: ${stderr}` });
      }
    });

    ffmpeg.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

export default {
  isFFmpegInstalled,
  mergeToStereo,
  mergeToStereoPan,
};
