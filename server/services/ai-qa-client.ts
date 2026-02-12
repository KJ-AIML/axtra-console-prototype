/**
 * AI QA Client
 * Bridges Node.js backend to Python AI QA API
 */

import type { TranscriptEntry, CoachingData } from '../call-sessions';

// AI QA API configuration
const AI_QA_URL = process.env.AI_QA_URL || 'http://localhost:8001';
const AI_QA_TIMEOUT = parseInt(process.env.AI_QA_TIMEOUT || '60000', 10);

interface QAAnalysisPayload {
  call_id: string;
  transcripts: TranscriptEntry[];
  coaching_history: CoachingData[];
  duration_seconds: number;
  total_turns: number;
  scenario_type: string;
}

interface QACriteriaScore {
  criteria_id: string;
  criteria_name: string;
  score: number;
  reasoning: string;
  evidence_quote: string;
  evidence_timestamp: number;
}

interface QAAnalysisResult {
  overall_score: number;
  summary_feedback: string;
  key_strengths: string[];
  key_improvements: string[];
  criteria_scores: QACriteriaScore[];
}

interface QAAnalysisResponse {
  success: boolean;
  data: QAAnalysisResult;
  processing_time_ms: number;
  error?: string;
}

/**
 * Analyze call quality using AI QA Agent
 */
export async function analyzeCallQuality(
  payload: QAAnalysisPayload
): Promise<{ result: QAAnalysisResult; source: 'ai' | 'fallback' }> {
  const startTime = Date.now();
  
  console.log(`[AIQAClient] Starting QA analysis for call: ${payload.call_id}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_QA_TIMEOUT);
    
    const response = await fetch(`${AI_QA_URL}/api/qa/analyze`, {
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
      throw new Error(`AI QA API error: ${response.status} - ${errorText}`);
    }
    
    const apiResponse: QAAnalysisResponse = await response.json();
    
    const totalTime = Date.now() - startTime;
    console.log(`[AIQAClient] QA analysis completed in ${totalTime}ms`);
    console.log(`[AIQAClient] Overall Score: ${apiResponse.data.overall_score}/100`);
    
    if (!apiResponse.success) {
      console.warn(`[AIQAClient] API reported failure: ${apiResponse.error}`);
    }
    
    return { result: apiResponse.data, source: 'ai' };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[AIQAClient] Request timeout after ${AI_QA_TIMEOUT}ms`);
    } else {
      console.error(`[AIQAClient] Error after ${totalTime}ms:`, error);
    }
    
    // Return fallback result
    const fallbackResult: QAAnalysisResult = {
      overall_score: 60,
      summary_feedback: 'AI QA analysis failed. Please review manually.',
      key_strengths: ['Analysis unavailable'],
      key_improvements: ['Please conduct manual review'],
      criteria_scores: []
    };
    
    return { result: fallbackResult, source: 'fallback' };
  }
}

/**
 * Check if AI QA service is healthy
 */
export async function checkAIQAHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${AI_QA_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
