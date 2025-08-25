import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiService } from '../../services/api';
import { mockProcessingResult, mockFile } from '../mocks';

const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

describe('API Service Integration', () => {
  const baseURL = 'http://localhost:8000';

  describe('File Upload', () => {
    it('uploads file successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          fileId: 'test-file-id',
          filename: 'test.pdf',
          uploadUrl: 'https://example.com/upload',
        },
      };

      server.use(
        http.post(`${baseURL}/api/upload`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const result = await apiService.uploadFile(file);

      expect(result).toEqual(mockResponse);
    });

    it('handles upload errors', async () => {
      server.use(
        http.post(`${baseURL}/api/upload`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      await expect(apiService.uploadFile(file)).rejects.toThrow();
    });

    it('includes progress tracking', async () => {
      const onProgress = vi.fn();
      const mockResponse = { success: true, data: { fileId: 'test-id' } };

      server.use(
        http.post(`${baseURL}/api/upload`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      await apiService.uploadFile(file, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('validates file types', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await expect(apiService.uploadFile(invalidFile)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('validates file size', async () => {
      // Create a file that's too large (> 50MB)
      const largeContent = 'x'.repeat(50 * 1024 * 1024 + 1);
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      
      await expect(apiService.uploadFile(largeFile)).rejects.toThrow(
        'File size exceeds limit'
      );
    });
  });

  describe('Document Processing', () => {
    it('starts processing successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          jobId: 'job-123',
          status: 'processing',
          estimatedDuration: 30,
        },
      };

      server.use(
        http.post(`${baseURL}/api/process`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.processDocument('file-123');
      expect(result).toEqual(mockResponse);
    });

    it('handles processing errors', async () => {
      server.use(
        http.post(`${baseURL}/api/process`, () => {
          return HttpResponse.json(
            { success: false, error: 'Processing failed' },
            { status: 422 }
          );
        })
      );

      await expect(apiService.processDocument('file-123')).rejects.toThrow(
        'Processing failed'
      );
    });

    it('gets processing status', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'completed',
          progress: 100,
          result: mockProcessingResult,
        },
      };

      server.use(
        http.get(`${baseURL}/api/process/:jobId/status`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.getProcessingStatus('job-123');
      expect(result).toEqual(mockResponse);
    });

    it('polls processing status until completion', async () => {
      let callCount = 0;
      const responses = [
        { success: true, data: { status: 'processing', progress: 25 } },
        { success: true, data: { status: 'processing', progress: 50 } },
        { success: true, data: { status: 'processing', progress: 75 } },
        { success: true, data: { status: 'completed', progress: 100, result: mockProcessingResult } },
      ];

      server.use(
        http.get(`${baseURL}/api/process/:jobId/status`, () => {
          const response = responses[callCount++];
          return HttpResponse.json(response);
        })
      );

      const result = await apiService.pollProcessingStatus('job-123');
      expect(result.data.status).toBe('completed');
      expect(callCount).toBe(4);
    });
  });

  describe('Results Management', () => {
    it('retrieves results successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [mockProcessingResult],
          total: 1,
        },
      };

      server.use(
        http.get(`${baseURL}/api/results`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.getResults();
      expect(result).toEqual(mockResponse);
    });

    it('supports pagination in results', async () => {
      const mockResponse = {
        success: true,
        data: {
          results: [mockProcessingResult],
          total: 10,
          page: 1,
          pageSize: 1,
        },
      };

      server.use(
        http.get(`${baseURL}/api/results`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('page')).toBe('1');
          expect(url.searchParams.get('limit')).toBe('10');
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.getResults({ page: 1, limit: 10 });
      expect(result).toEqual(mockResponse);
    });

    it('supports filtering in results', async () => {
      server.use(
        http.get(`${baseURL}/api/results`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('documentType')).toBe('rent_roll');
          expect(url.searchParams.get('status')).toBe('completed');
          return HttpResponse.json({ success: true, data: { results: [], total: 0 } });
        })
      );

      await apiService.getResults({ 
        documentType: 'rent_roll',
        status: 'completed' 
      });
    });
  });

  describe('Export Functionality', () => {
    it('exports to Excel successfully', async () => {
      const mockBlob = new Blob(['excel content'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      server.use(
        http.post(`${baseURL}/api/export/excel`, () => {
          return new HttpResponse(mockBlob, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="results.xlsx"',
            },
          });
        })
      );

      const result = await apiService.exportResults(['result-1'], 'excel');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('exports to CSV successfully', async () => {
      const csvContent = 'name,email,role\nJohn,john@example.com,admin';
      const mockBlob = new Blob([csvContent], { type: 'text/csv' });

      server.use(
        http.post(`${baseURL}/api/export/csv`, () => {
          return new HttpResponse(mockBlob, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="results.csv"',
            },
          });
        })
      );

      const result = await apiService.exportResults(['result-1'], 'csv');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');
    });

    it('handles export errors', async () => {
      server.use(
        http.post(`${baseURL}/api/export/excel`, () => {
          return HttpResponse.json(
            { success: false, error: 'Export failed' },
            { status: 500 }
          );
        })
      );

      await expect(apiService.exportResults(['result-1'], 'excel')).rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('returns healthy status', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'healthy',
            ai_service: 'healthy',
            storage: 'healthy',
          },
        },
      };

      server.use(
        http.get(`${baseURL}/api/health`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.healthCheck();
      expect(result).toEqual(mockResponse);
    });

    it('handles unhealthy status', async () => {
      const mockResponse = {
        success: false,
        data: {
          status: 'unhealthy',
          services: {
            database: 'healthy',
            ai_service: 'unhealthy',
            storage: 'healthy',
          },
        },
      };

      server.use(
        http.get(`${baseURL}/api/health`, () => {
          return HttpResponse.json(mockResponse, { status: 503 });
        })
      );

      await expect(apiService.healthCheck()).rejects.toThrow();
    });
  });

  describe('AI Service Status', () => {
    it('returns AI service configuration', async () => {
      const mockResponse = {
        success: true,
        data: {
          configured: true,
          status: 'online',
          models: ['gpt-4', 'claude-3'],
          lastHealthCheck: new Date().toISOString(),
        },
      };

      server.use(
        http.get(`${baseURL}/api/ai/status`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.getAIStatus();
      expect(result).toEqual(mockResponse);
    });

    it('handles offline AI service', async () => {
      const mockResponse = {
        success: true,
        data: {
          configured: false,
          status: 'offline',
          error: 'API key not configured',
        },
      };

      server.use(
        http.get(`${baseURL}/api/ai/status`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiService.getAIStatus();
      expect(result.data.status).toBe('offline');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      server.use(
        http.get(`${baseURL}/api/results`, () => {
          return HttpResponse.error();
        })
      );

      await expect(apiService.getResults()).rejects.toThrow();
    });

    it('handles timeout errors', async () => {
      server.use(
        http.get(`${baseURL}/api/results`, () => {
          return new Promise(() => {}); // Never resolves
        })
      );

      // Mock timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100);
      });

      await expect(Promise.race([
        apiService.getResults(),
        timeoutPromise
      ])).rejects.toThrow('Request timeout');
    });

    it('retries failed requests', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get(`${baseURL}/api/results`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json({ success: true, data: { results: [] } });
        })
      );

      const result = await apiService.getResults();
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Initial + 2 retries
    });

    it('handles rate limiting', async () => {
      server.use(
        http.post(`${baseURL}/api/process`, () => {
          return new HttpResponse(null, { 
            status: 429,
            headers: {
              'Retry-After': '60',
            },
          });
        })
      );

      await expect(apiService.processDocument('file-123')).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    it('includes auth headers when token is present', async () => {
      const token = 'test-token';
      localStorage.setItem('auth_token', token);

      server.use(
        http.get(`${baseURL}/api/results`, ({ request }) => {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${token}`);
          return HttpResponse.json({ success: true, data: { results: [] } });
        })
      );

      await apiService.getResults();

      localStorage.removeItem('auth_token');
    });

    it('handles authentication errors', async () => {
      server.use(
        http.get(`${baseURL}/api/results`, () => {
          return HttpResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await expect(apiService.getResults()).rejects.toThrow('Unauthorized');
    });
  });

  describe('Request Cancellation', () => {
    it('supports request cancellation', async () => {
      const controller = new AbortController();
      
      server.use(
        http.get(`${baseURL}/api/results`, () => {
          // Simulate long request
          return new Promise(() => {});
        })
      );

      const requestPromise = apiService.getResults({}, { signal: controller.signal });
      
      // Cancel after 50ms
      setTimeout(() => controller.abort(), 50);

      await expect(requestPromise).rejects.toThrow('aborted');
    });
  });
});