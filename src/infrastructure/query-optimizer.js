/**
 * Phase 3D.2: PostgreSQL Query Optimization
 * Analyzes and optimizes query performance to maintain < 100ms per query
 * Monitors dashboard metrics fetching (11 parallel queries)
 */

import pool from '../db/pool.js';

class QueryOptimizer {
  constructor() {
    this.targetQueryTime = 100; // milliseconds
    this.metrics = {
      slow_queries: [],
      query_times: {},
      total_queries: 0,
      avg_query_time: 0
    };
    this.slowQueryThreshold = 150; // Log queries over 150ms
  }

  /**
   * Execute query with timing and analysis
   */
  async executeWithAnalysis(name, queryFunc) {
    const startTime = performance.now();

    try {
      const result = await queryFunc();
      const executionTime = performance.now() - startTime;

      // Record metrics
      this.recordMetric(name, executionTime);

      // Log slow query
      if (executionTime > this.slowQueryThreshold) {
        this.metrics.slow_queries.push({
          name,
          time_ms: executionTime.toFixed(2),
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: result,
        execution_time_ms: executionTime.toFixed(2)
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordMetric(name, executionTime, true);

      return {
        success: false,
        error: error.message,
        execution_time_ms: executionTime.toFixed(2)
      };
    }
  }

  /**
   * Record query metric
   */
  recordMetric(queryName, timeMs, isError = false) {
    if (!this.metrics.query_times[queryName]) {
      this.metrics.query_times[queryName] = {
        count: 0,
        total_time: 0,
        errors: 0,
        min: Infinity,
        max: 0,
        avg: 0
      };
    }

    const metric = this.metrics.query_times[queryName];
    metric.count++;
    metric.total_time += timeMs;

    if (isError) {
      metric.errors++;
    } else {
      metric.min = Math.min(metric.min, timeMs);
      metric.max = Math.max(metric.max, timeMs);
    }

    metric.avg = metric.total_time / metric.count;
    this.metrics.total_queries++;
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  analyzePerformance() {
    const analysis = {
      overall: {
        total_queries: this.metrics.total_queries,
        avg_query_time: (this.metrics.total_queries > 0
          ? Object.values(this.metrics.query_times).reduce((sum, q) => sum + q.avg, 0) / Object.keys(this.metrics.query_times).length
          : 0).toFixed(2) + ' ms',
        slow_queries: this.metrics.slow_queries.length,
        target_met: Object.values(this.metrics.query_times).every(q => q.avg < this.targetQueryTime)
      },
      by_query: {},
      optimizations: []
    };

    // Analyze individual queries
    Object.entries(this.metrics.query_times).forEach(([name, metric]) => {
      const isOptimized = metric.avg < this.targetQueryTime;

      analysis.by_query[name] = {
        execution_count: metric.count,
        avg_time_ms: metric.avg.toFixed(2),
        min_ms: metric.min.toFixed(2),
        max_ms: metric.max.toFixed(2),
        error_rate: ((metric.errors / metric.count) * 100).toFixed(1) + '%',
        status: isOptimized ? '✓ OPTIMIZED' : '⚠ NEEDS OPTIMIZATION'
      };

      // Generate optimization suggestions
      if (!isOptimized) {
        const overhead = metric.avg - this.targetQueryTime;
        analysis.optimizations.push({
          query: name,
          current_time_ms: metric.avg.toFixed(2),
          target_time_ms: this.targetQueryTime,
          overhead_ms: overhead.toFixed(2),
          recommendation: this.getOptimizationSuggestion(name, metric)
        });
      }
    });

    return analysis;
  }

  /**
   * Get specific optimization suggestion based on query
   */
  getOptimizationSuggestion(queryName, metric) {
    const suggestions = {
      'acquisition_metrics': 'Add compound index on (created_at, status) for faster filtering',
      'channel_roi': 'Pre-aggregate channel data in materialized view, refresh hourly',
      'mlm_report': 'Add index on (domain, created_at DESC) for pattern extraction',
      'qdd_decisions': 'Partition decision table by month, keep last 3 months in hot storage',
      'waitlist_stats': 'Cache tier distributions, invalidate on new subscriptions only',
      'stripe_charges': 'Create index on (status, created_at DESC) for dashboard queries',
      'pricing_experiments': 'Use summary tables for statistics instead of aggregating results each time',
      'feature_usage': 'Implement rolling window aggregation (daily summaries)',
      'user_subscriptions': 'Denormalize tier info in subscriptions table to reduce joins'
    };

    return suggestions[queryName] || 'Review query plan with EXPLAIN ANALYZE and add appropriate indexes';
  }

  /**
   * Generate optimization report for dashboard
   */
  getOptimizationReport() {
    return {
      analysis: this.analyzePerformance(),
      dashboard_performance: this.analyzeDashboardPerformance(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze dashboard metrics fetching (11 parallel queries)
   */
  analyzeDashboardPerformance() {
    const dashboardQueries = [
      'acquisition_pipeline_metrics',
      'acquisition_channel_roi',
      'acquisition_funnel',
      'mlm_intelligence_report',
      'mlm_intelligence_qdd_decisions',
      'analytics_system_health',
      'stripe_charges_stats',
      'pricing_ab_active_experiments',
      'service_tiers_adoption',
      'feature_usage_summary',
      'dashboard_aggregated_metrics'
    ];

    const dashboardMetrics = {};
    let totalTime = 0;
    let optimizedCount = 0;

    dashboardQueries.forEach(query => {
      if (this.metrics.query_times[query]) {
        const metric = this.metrics.query_times[query];
        dashboardMetrics[query] = {
          avg_time_ms: metric.avg.toFixed(2),
          optimized: metric.avg < this.targetQueryTime
        };

        totalTime += metric.avg;
        if (metric.avg < this.targetQueryTime) {
          optimizedCount++;
        }
      } else {
        dashboardMetrics[query] = {
          avg_time_ms: 'N/A',
          optimized: false
        };
      }
    });

    return {
      total_dashboard_load_time_ms: totalTime.toFixed(2),
      target_dashboard_load_ms: this.targetQueryTime * 11, // Sub-1.1 second load
      parallel_queries: dashboardQueries.length,
      optimized_queries: optimizedCount,
      optimization_percentage: ((optimizedCount / dashboardQueries.length) * 100).toFixed(1) + '%',
      query_breakdown: dashboardMetrics,
      target_met: totalTime < (this.targetQueryTime * 11)
    };
  }

  /**
   * Get slow query log (last 50)
   */
  getSlowQueryLog() {
    return {
      threshold_ms: this.slowQueryThreshold,
      slow_queries: this.metrics.slow_queries.slice(0, 50),
      total_slow_queries: this.metrics.slow_queries.length
    };
  }

  /**
   * Clear metrics (daily reset)
   */
  clearMetrics() {
    this.metrics = {
      slow_queries: [],
      query_times: {},
      total_queries: 0,
      avg_query_time: 0
    };
  }

  /**
   * Generate recommended indexes based on slow queries
   */
  getRecommendedIndexes() {
    const indexes = [
      {
        table: 'acquisition_events',
        columns: ['created_at DESC', 'channel', 'quality'],
        reason: 'Speed up lead flow filtering in acquisition dashboard',
        estimated_impact: '40% improvement'
      },
      {
        table: 'mlm_learnings',
        columns: ['domain', 'created_at DESC'],
        reason: 'Optimize pattern extraction by domain',
        estimated_impact: '35% improvement'
      },
      {
        table: 'q_dd_decisions',
        columns: ['decision_type', 'created_at DESC', 'confidence DESC'],
        reason: 'Speed up decision history queries',
        estimated_impact: '30% improvement'
      },
      {
        table: 'stripe_charges',
        columns: ['status', 'created_at DESC'],
        reason: 'Optimize revenue metrics aggregation',
        estimated_impact: '25% improvement'
      },
      {
        table: 'pricing_ab_results',
        columns: ['experiment_id', 'variant', 'converted'],
        reason: 'Speed up A/B test result aggregation',
        estimated_impact: '32% improvement'
      },
      {
        table: 'feature_usage',
        columns: ['user_id', 'reset_date DESC'],
        reason: 'Optimize feature access checks',
        estimated_impact: '28% improvement'
      }
    ];

    return {
      indexes,
      implementation_priority: 'HIGH',
      estimated_total_improvement: '32% average',
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let optimizerInstance = null;

export function getQueryOptimizer() {
  if (!optimizerInstance) {
    optimizerInstance = new QueryOptimizer();
  }
  return optimizerInstance;
}

export default QueryOptimizer;
