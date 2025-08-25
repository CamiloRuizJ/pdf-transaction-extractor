import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useRenderPerformance, 
  useWebVitals, 
  useMemoryMonitoring, 
  useNetworkMonitoring,
  usePerformanceBudget 
} from './usePerformance';
import { mockPerformanceEntries } from '../test/mocks';

// Mock performance APIs
const mockPerformanceObserver = vi.fn();
const mockPerformanceNow = vi.fn();
const mockPerformanceGetEntriesByType = vi.fn();
const mockPerformanceMemory = {
  usedJSHeapSize: 1000000,
  totalJSHeapSize: 2000000,
  jsHeapSizeLimit: 4000000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  // Mock performance API
  global.performance = {
    ...global.performance,
    now: mockPerformanceNow,
    getEntriesByType: mockPerformanceGetEntriesByType,
    memory: mockPerformanceMemory,
  } as any;

  global.PerformanceObserver = mockPerformanceObserver;

  mockPerformanceNow.mockReturnValue(1000);
  mockPerformanceGetEntriesByType.mockImplementation((type) => 
    mockPerformanceEntries[type as keyof typeof mockPerformanceEntries] || []
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useRenderPerformance', () => {
  it('tracks render count and timing', () => {
    const { result, rerender } = renderHook(() => useRenderPerformance('TestComponent'));

    // Initial render
    expect(result.current.renderCount).toBe(1);
    expect(result.current.totalRenderTime).toBeGreaterThan(0);
    expect(result.current.averageRenderTime).toBeGreaterThan(0);

    // Re-render
    rerender();
    expect(result.current.renderCount).toBe(2);
  });

  it('calculates average render time correctly', () => {
    let currentTime = 1000;
    mockPerformanceNow.mockImplementation(() => currentTime);

    const { result, rerender } = renderHook(() => useRenderPerformance('TestComponent'));

    // First render
    currentTime = 1050; // 50ms render time
    act(() => {
      vi.advanceTimersByTime(50);
    });

    rerender();
    
    // Second render  
    currentTime = 1080; // 30ms render time
    act(() => {
      vi.advanceTimersByTime(30);
    });

    // Average should be (50 + 30) / 2 = 40ms
    expect(result.current.averageRenderTime).toBeCloseTo(40, 0);
    expect(result.current.renderCount).toBe(2);
  });

  it('provides mount time function', () => {
    const { result } = renderHook(() => useRenderPerformance('TestComponent'));

    const mountTime = result.current.getMountTime();
    expect(mountTime).toBeGreaterThanOrEqual(0);
  });

  it('logs performance in development', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderHook(() => useRenderPerformance('TestComponent'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Performance] TestComponent render took')
    );

    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });
});

describe('useWebVitals', () => {
  it('measures FCP and TTFB from navigation timing', () => {
    mockPerformanceGetEntriesByType.mockImplementation((type) => {
      if (type === 'navigation') {
        return [{ responseStart: 100 }];
      }
      if (type === 'paint') {
        return [{ name: 'first-contentful-paint', startTime: 1200 }];
      }
      return [];
    });

    const { result } = renderHook(() => useWebVitals());

    expect(result.current.TTFB).toBe(100);
    expect(result.current.FCP).toBe(1200);
  });

  it('sets up performance observers for LCP', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    mockPerformanceObserver.mockImplementation((callback) => {
      // Simulate LCP entry
      setTimeout(() => {
        callback({
          getEntries: () => [{ startTime: 2100 }],
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useWebVitals());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(mockObserver.observe).toHaveBeenCalledWith({
      entryTypes: ['largest-contentful-paint'],
    });
  });

  it('measures FID from first-input events', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    mockPerformanceObserver.mockImplementation((callback) => {
      // Simulate FID entry
      setTimeout(() => {
        callback({
          getEntries: () => [{
            processingStart: 150,
            startTime: 100,
          }],
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useWebVitals());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.FID).toBe(50); // 150 - 100
  });

  it('accumulates CLS score from layout-shift events', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    mockPerformanceObserver.mockImplementation((callback) => {
      // Simulate multiple layout shift entries
      setTimeout(() => {
        callback({
          getEntries: () => [
            { value: 0.1, hadRecentInput: false },
            { value: 0.05, hadRecentInput: false },
            { value: 0.02, hadRecentInput: true }, // Should be ignored
          ],
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useWebVitals());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.CLS).toBe(0.15); // 0.1 + 0.05, ignoring the one with recent input
  });

  it('handles observer creation errors gracefully', () => {
    mockPerformanceObserver.mockImplementation(() => {
      throw new Error('Observer not supported');
    });

    expect(() => {
      renderHook(() => useWebVitals());
    }).not.toThrow();
  });

  it('cleans up observers on unmount', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    mockPerformanceObserver.mockReturnValue(mockObserver);

    const { unmount } = renderHook(() => useWebVitals());

    unmount();

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});

describe('useMemoryMonitoring', () => {
  it('provides current memory info', () => {
    const { result } = renderHook(() => useMemoryMonitoring());

    expect(result.current.usedJSHeapSize).toBe(1000000);
    expect(result.current.totalJSHeapSize).toBe(2000000);
    expect(result.current.jsHeapSizeLimit).toBe(4000000);
  });

  it('calculates memory usage percentage', () => {
    const { result } = renderHook(() => useMemoryMonitoring());

    const percentage = result.current.getMemoryUsagePercentage();
    expect(percentage).toBe(25); // 1000000 / 4000000 * 100
  });

  it('updates memory info periodically', () => {
    const { result } = renderHook(() => useMemoryMonitoring());

    // Update mock memory values
    mockPerformanceMemory.usedJSHeapSize = 1500000;

    act(() => {
      vi.advanceTimersByTime(5000); // 5 second interval
    });

    expect(result.current.usedJSHeapSize).toBe(1500000);
  });

  it('handles missing memory API', () => {
    const originalPerformance = global.performance;
    global.performance = { ...global.performance };
    delete (global.performance as any).memory;

    const { result } = renderHook(() => useMemoryMonitoring());

    expect(result.current.usedJSHeapSize).toBeUndefined();
    expect(result.current.getMemoryUsagePercentage()).toBe(0);

    global.performance = originalPerformance;
  });

  it('clears interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useMemoryMonitoring());
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

describe('useNetworkMonitoring', () => {
  it('tracks network requests through performance observer', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    const mockResourceEntries = [
      {
        name: 'https://api.example.com/data',
        requestStart: 100,
        responseEnd: 300,
        transferSize: 1024,
      },
      {
        name: 'https://api.example.com/more-data',
        requestStart: 200,
        responseEnd: 450,
        transferSize: 2048,
      },
    ];

    mockPerformanceObserver.mockImplementation((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => mockResourceEntries,
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useNetworkMonitoring());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.requests).toBe(2);
    expect(result.current.totalTransferSize).toBe(3072); // 1024 + 2048
    expect(result.current.averageLatency).toBeGreaterThan(0);
  });

  it('filters out data URLs and non-HTTP resources', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    const mockResourceEntries = [
      {
        name: 'https://api.example.com/data',
        requestStart: 100,
        responseEnd: 300,
        transferSize: 1024,
      },
      {
        name: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        requestStart: 200,
        responseEnd: 250,
        transferSize: 512,
      },
      {
        name: 'chrome-extension://extension/script.js',
        requestStart: 300,
        responseEnd: 400,
        transferSize: 256,
      },
    ];

    mockPerformanceObserver.mockImplementation((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => mockResourceEntries,
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useNetworkMonitoring());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Should only count the HTTP request
    expect(result.current.requests).toBe(1);
    expect(result.current.totalTransferSize).toBe(1024);
  });

  it('tracks failed requests', () => {
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    const mockResourceEntries = [
      {
        name: 'https://api.example.com/success',
        requestStart: 100,
        responseEnd: 300,
        transferSize: 1024,
      },
      {
        name: 'https://api.example.com/timeout',
        requestStart: 100,
        responseEnd: 35000, // > 30000ms = timeout
        transferSize: 0,
      },
      {
        name: 'https://api.example.com/failed',
        requestStart: 100,
        responseEnd: 0, // No response
        transferSize: 0,
      },
    ];

    mockPerformanceObserver.mockImplementation((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => mockResourceEntries,
        });
      }, 0);
      return mockObserver;
    });

    const { result } = renderHook(() => useNetworkMonitoring());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.requests).toBe(3);
    expect(result.current.failedRequests).toBe(2); // timeout + failed
  });
});

describe('usePerformanceBudget', () => {
  const mockBudget = {
    maxRenderTime: 50,
    maxMemoryUsage: 100, // MB
    maxNetworkLatency: 1000,
  };

  // Mock the individual hooks
  const mockUseWebVitals = vi.fn();
  const mockUseMemoryMonitoring = vi.fn();
  const mockUseNetworkMonitoring = vi.fn();
  const mockUseRenderPerformance = vi.fn();

  beforeEach(() => {
    vi.mock('./usePerformance', async () => {
      const actual = await vi.importActual('./usePerformance');
      return {
        ...actual,
        useWebVitals: mockUseWebVitals,
        useMemoryMonitoring: mockUseMemoryMonitoring,
        useNetworkMonitoring: mockUseNetworkMonitoring,
        useRenderPerformance: mockUseRenderPerformance,
      };
    });

    mockUseWebVitals.mockReturnValue({});
    mockUseMemoryMonitoring.mockReturnValue({ 
      usedJSHeapSize: 50000000, // 50MB 
      getMemoryUsagePercentage: () => 50,
    });
    mockUseNetworkMonitoring.mockReturnValue({ 
      averageLatency: 500, 
      requests: 10,
      failedRequests: 0,
      totalTransferSize: 1024000,
    });
    mockUseRenderPerformance.mockReturnValue({ 
      averageRenderTime: 25,
      renderCount: 5,
      totalRenderTime: 125,
      getMountTime: () => 1000,
    });
  });

  it('detects no violations when within budget', () => {
    const { result } = renderHook(() => usePerformanceBudget(mockBudget));

    expect(result.current.violations).toHaveLength(0);
    expect(result.current.isWithinBudget).toBe(true);
  });

  it('detects render time violations', () => {
    mockUseRenderPerformance.mockReturnValue({ 
      averageRenderTime: 75, // Exceeds 50ms budget
      renderCount: 5,
      totalRenderTime: 375,
      getMountTime: () => 1000,
    });

    const { result } = renderHook(() => usePerformanceBudget(mockBudget));

    expect(result.current.violations).toContain(
      expect.stringContaining('Render time exceeded budget: 75.00ms > 50ms')
    );
    expect(result.current.isWithinBudget).toBe(false);
  });

  it('detects memory usage violations', () => {
    mockUseMemoryMonitoring.mockReturnValue({ 
      usedJSHeapSize: 150000000, // 150MB, exceeds 100MB budget
      getMemoryUsagePercentage: () => 150,
    });

    const { result } = renderHook(() => usePerformanceBudget(mockBudget));

    expect(result.current.violations).toContain(
      expect.stringContaining('Memory usage exceeded budget: 143.05MB > 100MB')
    );
    expect(result.current.isWithinBudget).toBe(false);
  });

  it('detects network latency violations', () => {
    mockUseNetworkMonitoring.mockReturnValue({ 
      averageLatency: 1500, // Exceeds 1000ms budget
      requests: 10,
      failedRequests: 0,
      totalTransferSize: 1024000,
    });

    const { result } = renderHook(() => usePerformanceBudget(mockBudget));

    expect(result.current.violations).toContain(
      expect.stringContaining('Network latency exceeded budget: 1500.00ms > 1000ms')
    );
    expect(result.current.isWithinBudget).toBe(false);
  });

  it('logs violations in development', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockUseRenderPerformance.mockReturnValue({ 
      averageRenderTime: 75, // Violation
      renderCount: 5,
      totalRenderTime: 375,
      getMountTime: () => 1000,
    });

    renderHook(() => usePerformanceBudget(mockBudget));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Performance Budget] Violations detected:',
      expect.any(Array)
    );

    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it('provides access to all performance metrics', () => {
    const { result } = renderHook(() => usePerformanceBudget(mockBudget));

    expect(result.current.webVitals).toBeDefined();
    expect(result.current.memory).toBeDefined();
    expect(result.current.network).toBeDefined();
    expect(result.current.renderPerf).toBeDefined();
  });
});