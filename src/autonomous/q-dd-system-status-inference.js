/**
 * Q-DD Orchestrator - System Status Inference Engine
 * Real-time inference of system health, bottlenecks, and optimal intervention points
 * Consumes: /api/metrics, /api/health, engine logs, acquisition funnels, revenue streams
 */

export class QDDSystemStatusInference {
  constructor() {
    this.systemState = {
      healthScore: 100,
      isOptimal: true,
      criticalAlerts: [],
      warnings: [],
      bottlenecks: [],
      recommendations: []
    };

    this.metricThresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      dbLatency: 200,
      apiResponseTime: 500,
      errorRate: 5,
      funnelConversionDrop: 20
    };

    this.statusHistory = [];
  }

  /**
   * Infer system status from multiple metric sources
   */
  async inferSystemStatus(metrics, health, acquisitionMetrics, engineLogs) {
    const inference = {
      timestamp: Date.now(),
      sources: [],
      inference: {},
      actionItems: []
    };

    // Infer API health
    if (health && health.api) {
      const apiInference = this.inferAPIHealth(health.api);
      Object.assign(inference.inference, apiInference);
      inference.sources.push('api_health');
    }

    // Infer database health
    if (health && health.database) {
      const dbInference = this.inferDatabaseHealth(health.database, metrics);
      Object.assign(inference.inference, dbInference);
      inference.sources.push('database_health');
    }

    // Infer acquisition funnel health
    if (acquisitionMetrics) {
      const funnelInference = this.inferFunnelHealth(acquisitionMetrics);
      Object.assign(inference.inference, funnelInference);
      inference.sources.push('acquisition_funnel');
    }

    // Infer engine health
    if (engineLogs && engineLogs.length > 0) {
      const engineInference = this.inferEngineHealth(engineLogs);
      Object.assign(inference.inference, engineInference);
      inference.sources.push('engine_logs');
    }

    // Calculate overall health score
    inference.overallHealthScore = this.calculateHealthScore(inference.inference);

    // Identify bottlenecks and recommendations
    inference.bottlenecks = this.identifyBottlenecks(inference.inference);
    inference.recommendations = this.generateRecommendations(inference.bottlenecks);
    inference.actionItems = this.prioritizeActions(inference.bottlenecks);

    // Store in history
    this.statusHistory.push(inference);
    if (this.statusHistory.length > 1000) {
      this.statusHistory.shift(); // Keep last 1000
    }

    return inference;
  }

  /**
   * Infer API health status
   */
  inferAPIHealth(apiMetrics) {
    const inference = {
      apiStatus: apiMetrics.status || 'unknown',
      responseTime: apiMetrics.avgResponseTime || 0,
      errorRate: apiMetrics.errorRate || 0,
      uptimePercentage: apiMetrics.uptime || 100
    };

    inference.apiHealthScore = 100;
    if (inference.responseTime > this.metricThresholds.apiResponseTime) {
      inference.apiHealthScore -= 20;
    }
    if (inference.errorRate > this.metricThresholds.errorRate) {
      inference.apiHealthScore -= (inference.errorRate * 5);
    }
    if (inference.uptimePercentage < 99.5) {
      inference.apiHealthScore -= (100 - inference.uptimePercentage) * 10;
    }

    return inference;
  }

  /**
   * Infer database health status
   */
  inferDatabaseHealth(dbMetrics, metrics) {
    const inference = {
      dbStatus: dbMetrics.status || 'unknown',
      connections: dbMetrics.activeConnections || 0,
      latency: dbMetrics.avgLatency || 0,
      queryQueueDepth: metrics?.db?.queueLength || 0
    };

    inference.dbHealthScore = 100;
    if (inference.latency > this.metricThresholds.dbLatency) {
      inference.dbHealthScore -= Math.min(30, (inference.latency / 100));
    }
    if (inference.queryQueueDepth > 50) {
      inference.dbHealthScore -= 25;
    }
    if (inference.connections > 90) {
      inference.dbHealthScore -= 15;
    }

    return inference;
  }

  /**
   * Infer acquisition funnel health
   */
  inferFunnelHealth(acquisitionMetrics) {
    const inference = {
      leadsGenerated: acquisitionMetrics.leadsGenerated || 0,
      conversionRate: acquisitionMetrics.conversionRate || 0,
      trialSignups: acquisitionMetrics.trialSignups || 0,
      revenueGenerated: acquisitionMetrics.revenueGenerated || 0
    };

    inference.funnelHealthScore = 100;

    // Check for conversion bottlenecks
    if (inference.conversionRate < 0.01) {
      inference.funnelHealthScore -= 40;
    } else if (inference.conversionRate < 0.05) {
      inference.funnelHealthScore -= 20;
    }

    // Check for lead quality
    if (inference.leadsGenerated === 0) {
      inference.funnelHealthScore -= 30;
    }

    return inference;
  }

  /**
   * Infer engine health from logs
   */
  inferEngineHealth(engineLogs) {
    const recentLogs = engineLogs.slice(-100); // Last 100 logs

    const inference = {
      totalEngines: recentLogs.length || 0,
      runningEngines: 0,
      failedEngines: 0,
      stalledEngines: 0,
      errors: []
    };

    recentLogs.forEach(log => {
      if (log.status === 'running') {
        inference.runningEngines++;
      } else if (log.status === 'failed') {
        inference.failedEngines++;
        inference.errors.push(log.engine);
      } else if (log.status === 'stalled') {
        inference.stalledEngines++;
        inference.errors.push(log.engine);
      }
    });

    inference.engineHealthScore = 100;
    if (inference.failedEngines > 0) {
      inference.engineHealthScore -= (inference.failedEngines * 10);
    }
    if (inference.stalledEngines > 0) {
      inference.engineHealthScore -= (inference.stalledEngines * 5);
    }

    return inference;
  }

  /**
   * Calculate overall system health score
   */
  calculateHealthScore(inference) {
    const scores = [];
    if (inference.apiHealthScore !== undefined) scores.push(inference.apiHealthScore);
    if (inference.dbHealthScore !== undefined) scores.push(inference.dbHealthScore);
    if (inference.funnelHealthScore !== undefined) scores.push(inference.funnelHealthScore);
    if (inference.engineHealthScore !== undefined) scores.push(inference.engineHealthScore);

    if (scores.length === 0) return 100;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Identify system bottlenecks
   */
  identifyBottlenecks(inference) {
    const bottlenecks = [];

    if (inference.apiHealthScore !== undefined && inference.apiHealthScore < 70) {
      bottlenecks.push({
        component: 'API',
        severity: inference.apiHealthScore < 50 ? 'critical' : 'warning',
        issue: `API health score: ${inference.apiHealthScore.toFixed(0)}`,
        metrics: {
          responseTime: inference.responseTime,
          errorRate: inference.errorRate
        }
      });
    }

    if (inference.dbHealthScore !== undefined && inference.dbHealthScore < 70) {
      bottlenecks.push({
        component: 'Database',
        severity: inference.dbHealthScore < 50 ? 'critical' : 'warning',
        issue: `Database health score: ${inference.dbHealthScore.toFixed(0)}`,
        metrics: {
          latency: inference.latency,
          queueDepth: inference.queryQueueDepth
        }
      });
    }

    if (inference.funnelHealthScore !== undefined && inference.funnelHealthScore < 70) {
      bottlenecks.push({
        component: 'AcquisitionFunnel',
        severity: inference.conversionRate < 0.01 ? 'critical' : 'warning',
        issue: `Conversion rate: ${(inference.conversionRate * 100).toFixed(2)}%`,
        metrics: {
          conversionRate: inference.conversionRate,
          leadsGenerated: inference.leadsGenerated
        }
      });
    }

    if (inference.failedEngines > 0) {
      bottlenecks.push({
        component: 'Engines',
        severity: inference.failedEngines > 5 ? 'critical' : 'warning',
        issue: `${inference.failedEngines} engines failed`,
        failedEngines: inference.errors
      });
    }

    return bottlenecks;
  }

  /**
   * Generate remediation recommendations
   */
  generateRecommendations(bottlenecks) {
    const recommendations = [];

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.component) {
        case 'API':
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'P0' : 'P1',
            action: 'Increase API server resources or enable auto-scaling',
            expectedImpact: 'Reduce response time by 30-50%'
          });
          break;

        case 'Database':
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'P0' : 'P1',
            action: 'Optimize slow queries or increase connection pool size',
            expectedImpact: 'Reduce database latency by 40-60%'
          });
          break;

        case 'AcquisitionFunnel':
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'P0' : 'P2',
            action: 'Run A/B test on landing page or adjust channel mix',
            expectedImpact: 'Increase conversion rate by 25-40%'
          });
          break;

        case 'Engines':
          recommendations.push({
            priority: bottleneck.severity === 'critical' ? 'P0' : 'P1',
            action: `Restart failed engines: ${bottleneck.failedEngines.join(', ')}`,
            expectedImpact: 'Restore system to full capacity'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Prioritize action items for execution
   */
  prioritizeActions(bottlenecks) {
    const actions = [];
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    const warningBottlenecks = bottlenecks.filter(b => b.severity === 'warning');

    criticalBottlenecks.forEach((bottleneck, idx) => {
      actions.push({
        priority: 'P0-' + (idx + 1),
        component: bottleneck.component,
        action: bottleneck.issue,
        immediateAction: true
      });
    });

    warningBottlenecks.forEach((bottleneck, idx) => {
      actions.push({
        priority: 'P1-' + (idx + 1),
        component: bottleneck.component,
        action: bottleneck.issue,
        immediateAction: false
      });
    });

    return actions.sort((a, b) => a.priority.localeCompare(b.priority));
  }

  /**
   * Get inference history for trend analysis
   */
  getInferenceHistory(limit = 50) {
    return this.statusHistory.slice(-limit);
  }

  /**
   * Get current system state
   */
  getCurrentSystemState() {
    if (this.statusHistory.length === 0) {
      return this.systemState;
    }

    const latest = this.statusHistory[this.statusHistory.length - 1];
    return {
      timestamp: latest.timestamp,
      overallHealthScore: latest.overallHealthScore,
      bottlenecks: latest.bottlenecks,
      recommendations: latest.recommendations,
      actionItems: latest.actionItems
    };
  }
}

export default QDDSystemStatusInference;
