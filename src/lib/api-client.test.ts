import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiClient,
  setAuthToken,
  getAuthToken,
  ApiError,
  API_CONFIG,
} from './api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    setAuthToken(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setAuthToken(null);
  });

  describe('setAuthToken and getAuthToken', () => {
    it('should set and get auth token', () => {
      setAuthToken('test-token');
      expect(getAuthToken()).toBe('test-token');
    });

    it('should clear auth token when set to null', () => {
      setAuthToken('test-token');
      expect(getAuthToken()).toBe('test-token');
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('GET requests', () => {
    it('should make a GET request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      const result = await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should include query parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      await apiClient.get('/test', { params: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test?page=1&limit=10`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should add auth header when token is set', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      setAuthToken('test-token');
      await apiClient.get('/test');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.headers).toBeDefined();
      expect(callArgs[1]?.headers instanceof Headers).toBe(true);
      expect(callArgs[1]?.headers.get('Authorization')).toBe('Bearer test-token');
    });
  });

  describe('POST requests', () => {
    it('should make a POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 201,
      });

      const data = { name: 'test' };
      const result = await apiClient.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('PUT requests', () => {
    it('should make a PUT request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'updated' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      const data = { name: 'updated' };
      const result = await apiClient.put('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      );
      expect(result).toEqual({ id: 1, name: 'updated' });
    });
  });

  describe('PATCH requests', () => {
    it('should make a PATCH request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'patched' }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      const data = { name: 'patched' };
      const result = await apiClient.patch('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      );
      expect(result).toEqual({ id: 1, name: 'patched' });
    });
  });

  describe('DELETE requests', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
      });

      const result = await apiClient.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseURL}/test/1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError on failed request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(apiClient.get('/not-found')).rejects.toThrow(ApiError);
    });

    it('should include error message in ApiError', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      try {
        await apiClient.get('/bad-request');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.message).toBe('Bad request');
          expect(error.status).toBe(400);
        }
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      // The error should be thrown and contain network error information
      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      // The error should be thrown
      await expect(apiClient.get('/test', { timeout: 100 })).rejects.toThrow();
    });
  });

  describe('Request timeout', () => {
    it('should handle timeout with abort error', async () => {
      // Simulate fetch being aborted
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      // The request should throw an ApiError
      await expect(apiClient.get('/test', { timeout: 100 })).rejects.toThrow('Request timeout');
    });

    it('should use default timeout when not specified', () => {
      expect(API_CONFIG.timeout).toBe(30000);
    });
  });

  describe('Empty response handling', () => {
    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await apiClient.delete('/test/1');
      expect(result).toBeUndefined();
    });
  });
});
