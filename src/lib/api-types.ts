/**
 * API Type Definitions
 * Shared types for API requests and responses
 */

// ============================================
// Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================
// Dashboard Types
// ============================================

export interface Metric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface SkillVelocity {
  id: string;
  user_id: string;
  skill_name: string;
  current_level: number;
  target_level: number;
  progress_percentage: number;
}

export interface QaHighlight {
  id: string;
  user_id: string;
  type: 'praise' | 'improvement';
  message: string;
  date: string;
}

// ============================================
// Scenario Types
// ============================================

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category?: string;
  persona?: string;
  rating: number;
  completions: number;
  is_recommended: boolean;
  progress?: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

// ============================================
// Recording Types
// ============================================

export interface RecordingListItem {
  id: string;
  scenario_title: string;
  scenario_difficulty: string;
  scenario_category: string;
  duration_seconds: number;
  total_turns: number;
  final_score?: number;
  customer_sentiment: string;
  started_at: string;
  status: string;
  has_summary: boolean;
}

export interface TranscriptEntry {
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
}

export interface CoachingCard {
  title: string;
  detail: string;
  action: string;
  status: 'danger' | 'warning' | 'success' | 'info';
}

export interface CoachingData {
  analysis_id: number;
  cards: CoachingCard[];
  script: {
    summary: string;
    suggestion: string;
  };
}

export interface CallSummary {
  summary: string;
  key_points: string[];
  strengths: string[];
  improvements: string[];
  customer_satisfaction: number;
  resolution_status: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coaching_effectiveness: number;
}

export interface RecordingDetail extends RecordingListItem {
  user_id: string;
  scenario_id: string;
  room_name: string;
  ended_at?: string;
  transcripts: TranscriptEntry[];
  coaching: CoachingData[];
  summary: CallSummary | null;
}

export interface RecordingFilters {
  scenario_id?: string;
  difficulty?: string;
  status?: 'completed' | 'abandoned';
  date_from?: string;
  date_to?: string;
  min_score?: number;
  max_score?: number;
  search?: string;
}

export interface RecordingStats {
  total_recordings: number;
  total_duration_seconds: number;
  average_score: number;
  by_scenario: { scenario_id: string; title: string; count: number }[];
  by_difficulty: { difficulty: string; count: number; avg_score: number }[];
}

export interface PaginatedRecordings {
  recordings: RecordingListItem[];
  total: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// LiveKit Types
// ============================================

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}
