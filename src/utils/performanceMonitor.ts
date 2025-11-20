// Performance monitoring utility for Firebase operations
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { startTime: number; endTime?: number; duration?: number }> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operationName: string): void {
    this.metrics.set(operationName, { startTime: performance.now() });
  }

  endTimer(operationName: string): number {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    this.logResult(operationName, duration);
    return duration;
  }

  private logResult(_operationName: string, _duration: number): void {
    // Performance logging removed for production
  }

  getMetrics(): Record<string, { duration: number; timestamp: number }> {
    const result: Record<string, { duration: number; timestamp: number }> = {};

    this.metrics.forEach((metric, name) => {
      if (metric.duration !== undefined) {
        result[name] = {
          duration: metric.duration,
          timestamp: metric.startTime
        };
      }
    });

    return result;
  }

  getAverageTime(operationName: string): number {
    const allMetrics = Array.from(this.metrics.entries())
      .filter(([name, metric]) => name.includes(operationName) && metric.duration !== undefined)
      .map(([, metric]) => metric.duration!);

    if (allMetrics.length === 0) return 0;

    return allMetrics.reduce((sum, duration) => sum + duration, 0) / allMetrics.length;
  }

  logSummary(): void {
    const avgConnection = this.getAverageTime('connection');
    const avgUserMatches = this.getAverageTime('getUserMatches');
    const avgCommunityMatches = this.getAverageTime('getCommunityMatches');

    if (avgConnection > 0) { }
    if (avgUserMatches > 0) { }
    if (avgCommunityMatches > 0) { }
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Create and export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper functions for common operations
export const trackFirebaseOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> => {
  performanceMonitor.startTimer(operationName);
  try {
    const result = await operation();
    performanceMonitor.endTimer(operationName);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(operationName);
    throw error;
  }
};

// Cache hit tracking
export class CacheTracker {
  private static hits = 0;
  private static misses = 0;

  static recordHit(): void {
    this.hits++;
  }

  static recordMiss(): void {
    this.misses++;
  }

  static getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : Math.round((this.hits / total) * 100);
  }

  static getSummary(): { hits: number; misses: number; hitRate: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate()
    };
  }

  static reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
} 