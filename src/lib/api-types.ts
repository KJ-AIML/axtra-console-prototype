/**
 * Common API response types
 */

/**
 * Standard paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  message: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * User-related types
 */
export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth-related types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

/**
 * Scenario-related types
 */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  duration: number;
  persona: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioRequest {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  duration: number;
  persona: string;
  tags?: string[];
}

export interface UpdateScenarioRequest extends Partial<CreateScenarioRequest> {
  id: string;
}

/**
 * Simulation-related types
 */
export interface Simulation {
  id: string;
  scenarioId: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  startedAt?: string;
  completedAt?: string;
  feedback?: string;
}

export interface CreateSimulationRequest {
  scenarioId: string;
}

export interface SimulationResponse {
  id: string;
  scenarioId: string;
  status: string;
  score?: number;
  feedback?: string;
}

/**
 * Dashboard metrics types
 */
export interface DashboardMetrics {
  avgHandleTime: string;
  firstCallResolution: number;
  avgQaScore: number;
  complianceRate: number;
  escalationRate: number;
}

export interface SkillVelocity {
  level: number;
  currentXp: number;
  maxXp: number;
  progress: number;
}

export interface QaHighlight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'improvement';
  createdAt: string;
}

/**
 * Active Call types
 */
export interface ActiveCall {
  id: string;
  agent: string;
  customer: string;
  duration: number;
  status: 'active' | 'on_hold' | 'wrapping_up';
  sentiment?: 'positive' | 'neutral' | 'negative';
  startTime: string;
}

/**
 * Insights types
 */
export interface Insight {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
}

/**
 * File upload types
 */
export interface FileUploadRequest {
  file: File;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

/**
 * Search and filter types
 */
export interface SearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
