import { useCallback, useEffect, useRef, useState } from 'react';

export interface WebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function usePerformance() {
  const [webVitals, setWebVitals] = useState<WebVitals>({});
  const [memory, setMemory] = useState<Partial<MemoryInfo>>({});
  const [renderTime, setRenderTime] = useState<number>(0);
  const [showMonitor, setShowMonitor] = useState(false);
  const renderStartTime = useRef<number>(Date.now());

  // Measure component render time
  useEffect(() => {
    const endTime = Date.now();
    setRenderTime(endTime - renderStartTime.current);
  }, []);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Web Vitals collection
      if ('performance' in window && 'getEntriesByType' in performance) {
        const paintEntries = performance.getEntriesByType('paint');
        const navigationEntries = performance.getEntriesByType('navigation');

        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          setWebVitals(prev => ({ ...prev, FCP: fcpEntry.startTime }));
        }

        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0] as PerformanceNavigationTiming;
          setWebVitals(prev => ({
            ...prev,
            TTFB: nav.responseStart - nav.requestStart,
          }));
        }
      }

      // Memory usage
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setMemory({
          usedJSHeapSize: memInfo.usedJSHeapSize,
          totalJSHeapSize: memInfo.totalJSHeapSize,
          jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
        });
      }
    }
  }, []);

  // Performance observer for additional metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            setWebVitals(prev => ({ ...prev, LCP: entry.startTime }));
          }
          if (entry.entryType === 'first-input') {
            setWebVitals(prev => ({ ...prev, FID: (entry as any).processingStart - entry.startTime }));
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            setWebVitals(prev => ({ ...prev, CLS: (prev.CLS || 0) + (entry as any).value }));
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // Observer not supported
        console.warn('Performance observer not supported');
      }

      return () => observer.disconnect();
    }
  }, []);

  // Periodic metrics collection
  useEffect(() => {
    const interval = setInterval(collectMetrics, 5000);
    collectMetrics(); // Initial collection
    return () => clearInterval(interval);
  }, [collectMetrics]);

  const toggleMonitor = useCallback(() => {
    setShowMonitor(prev => !prev);
  }, []);

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Performance monitor component
  const PerformanceMonitor = () => {
    if (!showMonitor) return null;

    return (
      <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
        <div className="font-bold mb-2">Performance Monitor</div>
        
        <div className="space-y-1">
          {webVitals.FCP && (
            <div className={webVitals.FCP > 2500 ? 'text-red-300' : 'text-green-300'}>
              FCP: {webVitals.FCP.toFixed(0)}ms
            </div>
          )}
          
          {webVitals.LCP && (
            <div className={webVitals.LCP > 4000 ? 'text-red-300' : 'text-green-300'}>
              LCP: {webVitals.LCP.toFixed(0)}ms
            </div>
          )}
          
          {memory.usedJSHeapSize && (
            <div>
              Memory: {formatBytes(memory.usedJSHeapSize)} / {formatBytes(memory.totalJSHeapSize || 0)}
            </div>
          )}
          
          <div>Render: {renderTime}ms</div>
          
          {webVitals.FID && (
            <div className={webVitals.FID > 100 ? 'text-red-300' : 'text-green-300'}>
              FID: {webVitals.FID.toFixed(0)}ms
            </div>
          )}
          
          {webVitals.CLS && (
            <div className={webVitals.CLS > 0.1 ? 'text-red-300' : 'text-green-300'}>
              CLS: {webVitals.CLS.toFixed(3)}
            </div>
          )}
        </div>
        
        <button
          onClick={toggleMonitor}
          className="mt-2 text-xs opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    );
  };

  return {
    webVitals,
    memory,
    renderTime,
    showMonitor,
    toggleMonitor,
    PerformanceMonitor,
    collectMetrics,
  };
}