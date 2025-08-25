import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })) as any;

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })) as any;

  // Mock Performance API
  Object.defineProperty(window, 'performance', {
    value: {
      ...window.performance,
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
      mark: vi.fn(),
      measure: vi.fn(),
      now: vi.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000,
      },
    },
  });

  // Mock PerformanceObserver
  global.PerformanceObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })) as any;

  // Mock Web Vitals APIs
  Object.defineProperty(window, 'PerformanceNavigationTiming', {
    value: vi.fn(),
  });

  // Mock crypto.randomUUID for toast IDs
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mock-uuid'),
    },
  });

  // Mock matchMedia for accessibility hooks
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();

  // Mock focus method
  HTMLElement.prototype.focus = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});