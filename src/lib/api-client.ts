/**
 * Centralized API client for making HTTP requests
 * Handles authentication, error handling, and response transformation
 */

// API configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Types for API requests
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number>;
  signal?: AbortSignal;
  timeout?: number;
}

// Auth token storage (can be replaced with proper auth store)
let authToken: string | null = null;

/**
 * Set the authentication token for API requests
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number>): string {
  const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.baseURL}${endpoint}`;

  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Request interceptor - runs before the request is sent
 */
async function requestInterceptor(
  url: string,
  config: RequestInit & { timeout?: number }
): Promise<{ url: string; config: RequestInit }> {
  // Add auth token if available
  const headers = new Headers(config.headers);

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Set default content type if not present and body exists
  if (config.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    url,
    config: {
      ...config,
      headers,
    },
  };
}

/**
 * Response interceptor - runs after response is received
 */
async function responseInterceptor<T>(response: Response): Promise<T> {
  // Handle empty responses (e.g., 204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType || response.status === 204) {
    return undefined as T;
  }

  // Parse JSON response
  if (contentType.includes('application/json')) {
    const data = await response.json();

    // Handle API error responses
    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  }

  // Handle text responses
  if (contentType.includes('text/')) {
    const text = await response.text();

    if (!response.ok) {
      throw new ApiError(text, response.status);
    }

    return text as T;
  }

  // Handle other response types
  if (!response.ok) {
    throw new ApiError('Request failed', response.status);
  }

  return (await response.blob()) as T;
}

/**
 * Error handler for API requests
 */
function handleRequestError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiError('Network error. Please check your connection.', 0);
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new ApiError('Request timeout', 408);
  }

  throw new ApiError('An unexpected error occurred', 500);
}

/**
 * Core fetch function with timeout and interceptors
 */
async function fetchWithTimeout<T>(
  url: string,
  config: RequestInit & { timeout?: number }
): Promise<T> {
  const timeout = config.timeout || API_CONFIG.timeout;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Run request interceptor
    const { url: processedUrl, config: processedConfig } = await requestInterceptor(url, {
      ...config,
      signal: controller.signal,
    });

    // Make the request
    const response = await fetch(processedUrl, processedConfig);

    // Run response interceptor
    return await responseInterceptor<T>(response);
  } catch (error) {
    // Handle all errors through the error handler
    handleRequestError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API client methods
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  get: <T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> => {
    return fetchWithTimeout<T>(buildUrl(endpoint, config?.params), {
      method: 'GET',
      headers: config?.headers,
      signal: config?.signal,
      timeout: config?.timeout,
    });
  },

  /**
   * Make a POST request
   */
  post: <T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> => {
    return fetchWithTimeout<T>(buildUrl(endpoint, config?.params), {
      method: 'POST',
      headers: config?.headers,
      body: JSON.stringify(data),
      signal: config?.signal,
      timeout: config?.timeout,
    });
  },

  /**
   * Make a PUT request
   */
  put: <T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> => {
    return fetchWithTimeout<T>(buildUrl(endpoint, config?.params), {
      method: 'PUT',
      headers: config?.headers,
      body: JSON.stringify(data),
      signal: config?.signal,
      timeout: config?.timeout,
    });
  },

  /**
   * Make a PATCH request
   */
  patch: <T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> => {
    return fetchWithTimeout<T>(buildUrl(endpoint, config?.params), {
      method: 'PATCH',
      headers: config?.headers,
      body: JSON.stringify(data),
      signal: config?.signal,
      timeout: config?.timeout,
    });
  },

  /**
   * Make a DELETE request
   */
  delete: <T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> => {
    return fetchWithTimeout<T>(buildUrl(endpoint, config?.params), {
      method: 'DELETE',
      headers: config?.headers,
      signal: config?.signal,
      timeout: config?.timeout,
    });
  },
};

/**
 * Export API configuration for use in other modules
 */
export { API_CONFIG };

/**
 * Export a default instance
 */
export default apiClient;
