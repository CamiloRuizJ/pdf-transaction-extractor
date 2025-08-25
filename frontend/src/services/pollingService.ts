interface PollingOptions {
  interval?: number; // milliseconds
  maxAttempts?: number;
  onUpdate?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
  shouldStop?: (data: any) => boolean;
}

class PollingService {
  private activePolls: Map<string, { timeoutId: NodeJS.Timeout | null; attempts: number }> = new Map();

  async startPolling<T>(
    key: string,
    pollFunction: () => Promise<T>,
    options: PollingOptions = {}
  ): Promise<void> {
    const {
      interval = 2000,
      maxAttempts = 30,
      onUpdate,
      onComplete,
      onError,
      shouldStop = () => false,
    } = options;

    // Stop any existing poll with the same key
    this.stopPolling(key);

    const poll = async (attemptCount: number = 0): Promise<void> => {
      if (attemptCount >= maxAttempts) {
        this.stopPolling(key);
        onError?.(new Error(`Polling exceeded maximum attempts (${maxAttempts})`));
        return;
      }

      try {
        const data = await pollFunction();
        
        onUpdate?.(data);

        if (shouldStop(data)) {
          this.stopPolling(key);
          onComplete?.(data);
          return;
        }

        // Schedule next poll
        const timeoutId = setTimeout(() => {
          poll(attemptCount + 1);
        }, interval);

        // Update tracking
        this.activePolls.set(key, { timeoutId, attempts: attemptCount + 1 });

      } catch (error) {
        this.stopPolling(key);
        onError?.(error instanceof Error ? error : new Error('Polling failed'));
      }
    };

    // Start polling
    poll(0);
  }

  stopPolling(key: string): void {
    const poll = this.activePolls.get(key);
    if (poll?.timeoutId) {
      clearTimeout(poll.timeoutId);
    }
    this.activePolls.delete(key);
  }

  stopAllPolling(): void {
    for (const key of this.activePolls.keys()) {
      this.stopPolling(key);
    }
  }

  isPolling(key: string): boolean {
    return this.activePolls.has(key);
  }

  getPollingStatus(key: string): { isActive: boolean; attempts: number } {
    const poll = this.activePolls.get(key);
    return {
      isActive: !!poll,
      attempts: poll?.attempts || 0,
    };
  }
}

// Export singleton instance
export const pollingService = new PollingService();

// React hook for using polling service
import { useEffect, useRef } from 'react';

interface UsePollingOptions<T> extends PollingOptions {
  enabled?: boolean;
  dependencies?: any[];
}

export function usePolling<T>(
  key: string,
  pollFunction: () => Promise<T>,
  options: UsePollingOptions<T> = {}
) {
  const {
    enabled = true,
    dependencies = [],
    ...pollingOptions
  } = options;

  const keyRef = useRef(key);
  const pollFunctionRef = useRef(pollFunction);

  // Update refs when values change
  keyRef.current = key;
  pollFunctionRef.current = pollFunction;

  useEffect(() => {
    if (!enabled) {
      pollingService.stopPolling(keyRef.current);
      return;
    }

    pollingService.startPolling(
      keyRef.current,
      pollFunctionRef.current,
      pollingOptions
    );

    return () => {
      pollingService.stopPolling(keyRef.current);
    };
  }, [enabled, ...dependencies]);

  const stop = () => pollingService.stopPolling(keyRef.current);
  const restart = () => {
    pollingService.stopPolling(keyRef.current);
    if (enabled) {
      pollingService.startPolling(keyRef.current, pollFunctionRef.current, pollingOptions);
    }
  };

  const status = pollingService.getPollingStatus(keyRef.current);

  return { stop, restart, ...status };
}