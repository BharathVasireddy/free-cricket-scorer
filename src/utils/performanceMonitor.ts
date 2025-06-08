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
    console.log(`⏱️ Started: ${operationName}`);
  }
  
  endTimer(operationName: string): number {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      console.warn(`❌ Timer not found: ${operationName}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    this.logResult(operationName, duration);
    return duration;
  }
  
  private logResult(operationName: string, duration: number): void {
    const emoji = this.getPerformanceEmoji(duration);
    const timeText = duration < 1000 ? `${Math.round(duration)}ms` : `${(duration / 1000).toFixed(2)}s`;
    
    console.log(`${emoji} Completed: ${operationName} in ${timeText}`);
    
    // Warn about slow operations
    if (duration > 3000) {
      console.warn(`🐌 Slow operation detected: ${operationName} took ${timeText}`);
    }
  }
  
  private getPerformanceEmoji(duration: number): string {
    if (duration < 100) return '⚡'; // Very fast
    if (duration < 500) return '🚀'; // Fast
    if (duration < 1000) return '✅'; // Good
    if (duration < 3000) return '⏳'; // Acceptable
    return '🐌'; // Slow
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
    console.log('📊 Performance Summary:');
    
    const avgConnection = this.getAverageTime('connection');
    const avgUserMatches = this.getAverageTime('getUserMatches');
    const avgCommunityMatches = this.getAverageTime('getCommunityMatches');
    
    if (avgConnection > 0) {
      console.log(`  Connection Test: ${Math.round(avgConnection)}ms avg`);
    }
    if (avgUserMatches > 0) {
      console.log(`  User Matches: ${Math.round(avgUserMatches)}ms avg`);
    }
    if (avgCommunityMatches > 0) {
      console.log(`  Community Matches: ${Math.round(avgCommunityMatches)}ms avg`);
    }
  }
  
  clear(): void {
    this.metrics.clear();
    console.log('🗑️ Performance metrics cleared');
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
    console.log(`📦 Cache hit! (${this.hits}/${this.hits + this.misses} = ${this.getHitRate()}%)`);
  }
  
  static recordMiss(): void {
    this.misses++;
    console.log(`💾 Cache miss (${this.hits}/${this.hits + this.misses} = ${this.getHitRate()}%)`);
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
    console.log('🗑️ Cache metrics reset');
  }
} 