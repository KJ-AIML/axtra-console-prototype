/**
 * AI Agent HTTP Client
 * Bridges Node.js backend to Python AI Agent API for call summary generation
 */

import type { TranscriptEntry, CoachingData, CallSummary } from '../call-sessions';

// AI Agent API configuration
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001';
const AI_AGENT_TIMEOUT = parseInt(process.env.AI_AGENT_TIMEOUT || '30000', 10);

interface SummaryRequestPayload {
  call_id: string;
  duration_seconds: number;
  total_turns: number;
  customer_sentiment: string;
  scenario_type: string;
  transcripts: TranscriptEntry[];
  coaching_history: CoachingData[];
}

interface SummaryApiResponse {
  success: boolean;
  data: CallSummary;
  processing_time_ms: number;
  error?: string;
}

/**
 * Generate call summary using AI Agent API
 * 
 * @param payload - Call data including transcripts and coaching history
 * @returns CallSummary object
 * @throws Error if API call fails
 */
export async function generateCallSummary(
  payload: SummaryRequestPayload
): Promise<CallSummary> {
  const startTime = Date.now();
  
  console.log(`[AIAgentClient] Requesting summary for call: ${payload.call_id}`);
  console.log(`[AIAgentClient] Data: ${payload.total_turns} turns, ${payload.transcripts.length} transcripts`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_AGENT_TIMEOUT);
    
    const response = await fetch(`${AI_AGENT_URL}/api/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Agent API error: ${response.status} - ${errorText}`);
    }
    
    const result: SummaryApiResponse = await response.json();
    
    const totalTime = Date.now() - startTime;
    console.log(`[AIAgentClient] Summary received in ${totalTime}ms (API: ${result.processing_time_ms}ms)`);
    console.log(`[AIAgentClient] Success: ${result.success}, Satisfaction: ${result.data.customer_satisfaction}/5`);
    
    if (!result.success) {
      console.warn(`[AIAgentClient] API reported failure: ${result.error}`);
    }
    
    return result.data;
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[AIAgentClient] Request timeout after ${AI_AGENT_TIMEOUT}ms`);
      throw new Error('AI Agent API timeout - summary generation took too long');
    }
    
    console.error(`[AIAgentClient] Error after ${totalTime}ms:`, error);
    throw error;
  }
}

/**
 * Check if AI Agent API is healthy
 */
export async function checkAIAgentHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${AI_AGENT_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[AIAgentClient] Health check: ${data.status}`);
      return data.status === 'healthy';
    }
    
    return false;
  } catch (error) {
    console.warn('[AIAgentClient] Health check failed:', error);
    return false;
  }
}

/**
 * Generate summary with fallback to mock if AI fails
 * 
 * @param payload - Call data
 * @param mockGenerator - Fallback mock generator function
 * @returns CallSummary
 */
export async function generateCallSummaryWithFallback(
  payload: SummaryRequestPayload,
  mockGenerator: (transcripts: TranscriptEntry[], coachingHistory: CoachingData[]) => CallSummary
): Promise<{ summary: CallSummary; source: 'ai' | 'mock' }> {
  // First check if AI is available
  const isHealthy = await checkAIAgentHealth();
  
  if (!isHealthy) {
    console.log('[AIAgentClient] AI Agent not available, using mock summary');
    const mockSummary = mockGenerator(payload.transcripts, payload.coaching_history);
    return { summary: mockSummary, source: 'mock' };
  }
  
  try {
    const summary = await generateCallSummary(payload);
    return { summary, source: 'ai' };
  } catch (error) {
    console.warn('[AIAgentClient] AI summary failed, falling back to mock:', error);
    const mockSummary = mockGenerator(payload.transcripts, payload.coaching_history);
    return { summary: mockSummary, source: 'mock' };
  }
}
