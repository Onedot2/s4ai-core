/**
 * Phase 3D.4: System Health Dashboard
 * Real-time monitoring and bottleneck identification
 * Aggregates: query performance, Q-DD decision metrics, MLM learning accuracy
 */

import pool from '../db/pool.js';
import { getQueryOptimizer } from './query-optimizer.js';
import { getQDDCycleTuner } from './q-dd-cycle-tuner.js';
import { getMLMLearningOptimizer } from '../intelligence/mlm-learning-optimizer.js';

class SystemHealthMonitor {
  constructor() {
    this.health_checks = {
      database: null,
      api_latency: null,
      query_performance: null,
      qdd_metrics: null,
      mlm_metrics: null
    };

    this.last_check = null;
    this.check_interval = 30000; // 30 seconds
  }

  /**
   * Database connectivity health
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();

    try {
      await pool.query('SELECT 1');
      const latency = Date.now() - startTime;

      return {
        status: latency < 100 ? 'HEALTHY' : latency < 500 ? 'DEGRADED' : 'CRITICAL',
        latency_ms: latency,
        target_ms: 50,
        connection_pool_active: pool.totalCount || 0,
        connection_pool_idle: pool.idleCount || 0,
        recommendation: latency > 100 ? 'Check connection pool saturation' : null
      };
    } catch (error) {
      return {
        status: 'CRITICAL',
        error: error.message,
        latency_ms: Date.now() - startTime,
        recommendation: 'Database connection failing - investigate immediately'
      };
    }
  }

  /**
   * Query performance health
   */
  async checkQueryPerformance() {
    const optimizer = getQueryOptimizer();
    const analysis = await optimizer.analyzePerformance();

    if (!analysis) {
      return {
        status: 'UNKNOWN',
        message: 'No query metrics available'
      };
    }

    const slowQueryPercentage = (analysis.overall.slow_queries / analysis.overall.total_queries) * 100;
    const avgQueryTime = analysis.overall.avg_query_time;

    let status = 'HEALTHY';
    if (slowQueryPercentage > 20) status = 'CRITICAL';
    else if (slowQueryPercentage > 10) status = 'DEGRADED';
    else if (avgQueryTime > 100) status = 'DEGRADED';

    return {
      status,
      avg_query_time_ms: avgQueryTime.toFixed(1),
      target_ms: 100,
      slow_queries_percent: slowQueryPercentage.toFixed(1),
      total_queries_monitored: analysis.overall.total_queries,
      slowest_queries: analysis.by_query
        ? Object.entries(analysis.by_query)
          .sort((a, b) => b[1].avg_time - a[1].avg_time)
          .slice(0, 3)
          .map(([name, metrics]) => ({
            query: name,
            avg_time_ms: metrics.avg_time.toFixed(1),
            count: metrics.count
          }))
        : [],
      recommendation: status !== 'HEALTHY' ? 'Implement recommended database indexes' : null
    };
  }

  /**
   * Q-DD decision cycle health
   */
  async checkQDDHealth() {
    try {
      const tuner = getQDDCycleTuner();
      const analysis = tuner.analyzePerfomance();

      if (!analysis) {
        return { status: 'UNKNOWN', message: 'No Q-DD metrics available' };
      }

      const avgConfidence = analysis.by_type
        ? Object.values(analysis.by_type).reduce((sum, t) => sum + t.avg_confidence, 0) /
          Object.keys(analysis.by_type).length
        : 0;

      let status = 'HEALTHY';
      if (avgConfidence < 0.60) status = 'CRITICAL';
      else if (avgConfidence < 0.70) status = 'DEGRADED';

      return {
        status,
        avg_confidence: (avgConfidence * 100).toFixed(1) + '%',
        target_confidence: '70%+',
        decision_types: Object.keys(analysis.by_type || {}),
        decision_count_24h: analysis.decision_count || 0,
        low_confidence_decisions: Object.entries(analysis.by_type || {})
          .filter(([_, data]) => data.avg_confidence < 0.70)
          .map(([type, data]) => ({
            type,
            confidence: (data.avg_confidence * 100).toFixed(1) + '%',
            count: data.decision_count
          })),
        recommendation: status !== 'HEALTHY' ? 'Review decision confidence thresholds' : null
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  /**
   * MLM pattern learning health
   */
  async checkMLMHealth() {
    try {
      const optimizer = getMLMLearningOptimizer();
      const accuracy = await optimizer.analyzeLearningAccuracy();

      if (!accuracy) {
        return { status: 'UNKNOWN', message: 'No MLM metrics available' };
      }

      const accuracyRate = accuracy.overall_metrics.high_confidence_patterns /
                          accuracy.overall_metrics.total_patterns;

      let status = 'HEALTHY';
      if (accuracyRate < 0.75) status = 'CRITICAL';
      else if (accuracyRate < 0.85) status = 'DEGRADED';

      return {
        status,
        pattern_accuracy: (accuracyRate * 100).toFixed(1) + '%',
        target_accuracy: '90%+',
        total_patterns: accuracy.overall_metrics.total_patterns,
        high_confidence_patterns: accuracy.overall_metrics.high_confidence_patterns,
        patterns_by_domain: Object.entries(accuracy.accuracy_by_domain)
          .map(([domain, data]) => ({
            domain,
            patterns: data.total_patterns,
            accuracy: data.accuracy_rate
          })),
        recommendation: status !== 'HEALTHY' ? 'Update pattern confidence scoring algorithm' : null
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  /**
   * Dashboard load performance
   */
  async checkDashboardHealth() {
    const optimizer = getQueryOptimizer();
    const dashboardAnalysis = await optimizer.analyzeDashboardPerformance();

    if (!dashboardAnalysis) {
      return {
        status: 'UNKNOWN',
        message: 'Dashboard metrics unavailable'
      };
    }

    const loadTime = dashboardAnalysis.total_dashboard_load_time_ms;
    let status = 'HEALTHY';

    if (loadTime > 1500) status = 'CRITICAL';
    else if (loadTime > 1100) status = 'DEGRADED';

    return {
      status,
      total_load_time_ms: loadTime.toFixed(1),
      target_ms: 1000,
      query_count: 11,
      optimization_percent: dashboardAnalysis.optimization_percentage.toFixed(1),
      slow_dashboard_queries: dashboardAnalysis.queries
        ? dashboardAnalysis.queries
          .filter(q => q.execution_time_ms > 100)
          .map(q => ({
            name: q.name,
            time_ms: q.execution_time_ms.toFixed(1)
          }))
        : [],
      recommendation: status !== 'HEALTHY' ? 'Optimize 11 dashboard queries - see recommended indexes' : null
    };
  }

  /**
   * Identify system bottlenecks
   */
  identifyBottlenecks(healthReport) {
    const bottlenecks = [];

    Object.entries(healthReport).forEach(([component, health]) => {
      if (health && health.status === 'CRITICAL') {
        bottlenecks.push({
          component,
          severity: 'CRITICAL',
          message: health.recommendation || `${component} is experiencing critical issues`,
          details: health
        });
      } else if (health && health.status === 'DEGRADED') {
        bottlenecks.push({
          component,
          severity: 'HIGH',
          message: health.recommendation || `${component} is degraded`,
          details: health
        });
      }
    });

    return {
      bottleneck_count: bottlenecks.length,
      critical_count: bottlenecks.filter(b => b.severity === 'CRITICAL').length,
      high_count: bottlenecks.filter(b => b.severity === 'HIGH').length,
      bottlenecks,
      overall_system_status: bottlenecks.length === 0 ? 'OPERATIONAL' : bottlenecks.some(b => b.severity === 'CRITICAL') ? 'CRITICAL' : 'DEGRADED'
    };
  }

  /**
   * Generate recovery suggestions
   */
  getRecoverySuggestions(bottlenecks) {
    const suggestions = [];

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.component) {
        case 'database':
          suggestions.push({
            component: 'database',
            issue: bottleneck.message,
            quick_fix: 'Restart database connection pool',
            long_term_fix: 'Upgrade connection pool settings or database resources',
            estimated_time: '5-15 minutes'
          });
          break;

        case 'query_performance':
          suggestions.push({
            component: 'query_performance',
            issue: bottleneck.message,
            quick_fix: 'Clear query cache, analyze slow queries',
            long_term_fix: 'Implement database indexes as recommended by query optimizer',
            estimated_time: '30 minutes - 2 hours',
            recommended_indexes: [
              'acquisition_events(created_at DESC, channel, quality)',
              'mlm_learnings(domain, created_at DESC)',
              'q_dd_decisions(decision_type, created_at DESC, confidence DESC)'
            ]
          });
          break;

        case 'qdd_metrics':
          suggestions.push({
            component: 'qdd_metrics',
            issue: bottleneck.message,
            quick_fix: 'Review recent Q-DD decisions, check input data quality',
            long_term_fix: 'Adjust confidence thresholds, validate decision logic',
            estimated_time: '1-4 hours'
          });
          break;

        case 'mlm_metrics':
          suggestions.push({
            component: 'mlm_metrics',
            issue: bottleneck.message,
            quick_fix: 'Validate MLM input data sources',
            long_term_fix: 'Implement advanced confidence scoring, increase validation requirements',
            estimated_time: '2-4 hours'
          });
          break;

        case 'dashboard_performance':
          suggestions.push({
            component: 'dashboard_performance',
            issue: bottleneck.message,
            quick_fix: 'Implement query caching, reduce polling frequency',
            long_term_fix: 'Optimize 11 dashboard queries with recommended indexes',
            estimated_time: '1-3 hours'
          });
          break;
      }
    });

    return suggestions;
  }

  /**
   * Run complete health check
   */
  async runFullHealthCheck() {
    const timestamp = new Date().toISOString();

    const [
      database,
      query_performance,
      qdd_metrics,
      mlm_metrics,
      dashboard_performance
    ] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkQueryPerformance(),
      this.checkQDDHealth(),
      this.checkMLMHealth(),
      this.checkDashboardHealth()
    ]);

    const healthReport = {
      database,
      query_performance,
      qdd_metrics,
      mlm_metrics,
      dashboard_performance
    };

    const bottlenecks = this.identifyBottlenecks(healthReport);
    const recovery = this.getRecoverySuggestions(bottlenecks.bottlenecks);

    this.last_check = {
      timestamp,
      health: healthReport,
      bottlenecks,
      recovery_suggestions: recovery,
      summary: {
        overall_status: bottlenecks.overall_system_status,
        healthy_components: Object.keys(healthReport).filter(k => healthReport[k].status === 'HEALTHY'),
        degraded_components: Object.keys(healthReport).filter(k => healthReport[k].status === 'DEGRADED'),
        critical_components: Object.keys(healthReport).filter(k => healthReport[k].status === 'CRITICAL'),
        check_duration_ms: Date.now() - Date.parse(timestamp)
      }
    };

    return this.last_check;
  }

  /**
   * Get last health check (or run new one)
   */
  async getHealthStatus() {
    return this.last_check || (await this.runFullHealthCheck());
  }
}

// Singleton instance
let monitorInstance = null;

export function getSystemHealthMonitor() {
  if (!monitorInstance) {
    monitorInstance = new SystemHealthMonitor();
  }
  return monitorInstance;
}

export default SystemHealthMonitor;
