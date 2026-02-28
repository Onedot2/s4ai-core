// Predictive Health Monitoring System
// ML-based failure prediction, pattern recognition, anomaly detection
import EventEmitter from 'events';
import logger from '../utils/logger.js';


class HealthPattern {
  constructor(type, indicators, threshold) {
    this.type = type; // degradation, spike, anomaly, failure-precursor
    this.indicators = indicators; // Array of metric patterns
    this.threshold = threshold; // Confidence threshold for prediction
    this.occurrences = 0;
    this.lastSeen = null;
    this.predictions = { correct: 0, incorrect: 0 };
  }

  match(metrics) {
    const matches = this.indicators.filter(indicator => {
      const value = this.getMetricValue(metrics, indicator.path);
      return this.checkCondition(value, indicator.condition, indicator.value);
    });

    return matches.length / this.indicators.length >= this.threshold;
  }

  getMetricValue(metrics, path) {
    return path.split('.').reduce((obj, key) => obj?.[key], metrics);
  }

  checkCondition(value, condition, threshold) {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'trend_down': return value < threshold * 0.9;
      case 'trend_up': return value > threshold * 1.1;
      default: return false;
    }
  }

  recordPrediction(correct) {
    if (correct) {
      this.predictions.correct++;
    } else {
      this.predictions.incorrect++;
    }
  }

  get accuracy() {
    const total = this.predictions.correct + this.predictions.incorrect;
    return total > 0 ? this.predictions.correct / total : 0;
  }
}

class PredictiveHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      system: {},
      brain: {},
      agents: {},
      swarm: {}
    };
    this.history = [];
    this.maxHistory = 1000;
    this.patterns = this.initializePatterns();
    this.predictions = [];
    this.anomalyBaseline = null;
    this.learningEnabled = true;
    this.monitoringInterval = null;
  }

  initializePatterns() {
    return [
      new HealthPattern('memory-leak', [
        { path: 'system.memoryUsage', condition: 'trend_up', value: 80 },
        { path: 'system.heapUsed', condition: 'trend_up', value: 70 }
      ], 0.8),
      
      new HealthPattern('cpu-degradation', [
        { path: 'system.cpuUsage', condition: 'gt', value: 85 },
        { path: 'system.eventLoopDelay', condition: 'gt', value: 100 }
      ], 0.7),
      
      new HealthPattern('brain-desync', [
        { path: 'brain.syncErrors', condition: 'gt', value: 3 },
        { path: 'brain.health', condition: 'lt', value: 70 }
      ], 0.9),
      
      new HealthPattern('swarm-instability', [
        { path: 'swarm.agentFailures', condition: 'gt', value: 5 },
        { path: 'swarm.consensusFailures', condition: 'gt', value: 2 }
      ], 0.75),
      
      new HealthPattern('task-overflow', [
        { path: 'swarm.taskQueueSize', condition: 'gt', value: 50 },
        { path: 'swarm.avgProcessingTime', condition: 'gt', value: 5000 }
      ], 0.8),
      
      new HealthPattern('agent-cascade-failure', [
        { path: 'agents.terminatedRecently', condition: 'gt', value: 3 },
        { path: 'agents.avgHealth', condition: 'lt', value: 50 }
      ], 0.85)
    ];
  }

  recordMetrics(metrics) {
    const timestamp = Date.now();
    const snapshot = {
      timestamp,
      ...metrics,
      predictions: this.generatePredictions(metrics)
    };

    this.history.push(snapshot);
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.metrics = metrics;
    
    // Check for anomalies
    const anomalies = this.detectAnomalies(metrics);
    if (anomalies.length > 0) {
      this.emit('health:anomaly', { anomalies, metrics, timestamp });
    }

    // Update baseline if learning enabled
    if (this.learningEnabled) {
      this.updateBaseline(metrics);
    }

    return snapshot;
  }

  generatePredictions(metrics) {
    const predictions = [];

    for (const pattern of this.patterns) {
      if (pattern.match(metrics)) {
        const prediction = {
          type: pattern.type,
          confidence: pattern.accuracy || 0.5,
          timeToFailure: this.estimateTimeToFailure(pattern, metrics),
          severity: this.calculateSeverity(pattern),
          recommendedActions: this.getRecommendedActions(pattern),
          timestamp: Date.now()
        };

        predictions.push(prediction);
        this.emit('health:prediction', prediction);
        
        pattern.occurrences++;
        pattern.lastSeen = Date.now();
      }
    }

    return predictions;
  }

  estimateTimeToFailure(pattern, metrics) {
    // Simple linear extrapolation based on trend
    const recentMetrics = this.history.slice(-10);
    if (recentMetrics.length < 2) return null;

    // Calculate average rate of change
    const trends = pattern.indicators.map(indicator => {
      const values = recentMetrics.map(m => 
        indicator.path.split('.').reduce((obj, key) => obj?.[key], m)
      ).filter(v => v !== undefined);

      if (values.length < 2) return null;

      const avgChange = (values[values.length - 1] - values[0]) / values.length;
      const currentValue = values[values.length - 1];
      const threshold = indicator.value;

      if (avgChange === 0) return null;
      return Math.abs((threshold - currentValue) / avgChange);
    }).filter(t => t !== null);

    if (trends.length === 0) return null;

    // Return average time estimate in milliseconds
    const avgMinutes = trends.reduce((sum, t) => sum + t, 0) / trends.length;
    return avgMinutes * 60 * 1000; // Convert to ms
  }

  calculateSeverity(pattern) {
    // Severity based on pattern type and historical accuracy
    const severityMap = {
      'memory-leak': 8,
      'cpu-degradation': 7,
      'brain-desync': 9,
      'swarm-instability': 8,
      'task-overflow': 6,
      'agent-cascade-failure': 10
    };

    const baseSeverity = severityMap[pattern.type] || 5;
    const accuracyModifier = pattern.accuracy > 0.8 ? 1.2 : pattern.accuracy > 0.6 ? 1.0 : 0.8;
    
    return Math.min(10, Math.round(baseSeverity * accuracyModifier));
  }

  getRecommendedActions(pattern) {
    const actionsMap = {
      'memory-leak': [
        'Restart affected agents',
        'Clear caches',
        'Reduce agent spawn rate',
        'Enable garbage collection logging'
      ],
      'cpu-degradation': [
        'Reduce concurrent tasks',
        'Optimize swarm task distribution',
        'Terminate idle agents',
        'Enable CPU profiling'
      ],
      'brain-desync': [
        'Restart brain middleware sync',
        'Clear message queues',
        'Verify Genesis trilogy',
        'Force brain state reconciliation'
      ],
      'swarm-instability': [
        'Reduce consensus threshold temporarily',
        'Spawn replacement agents',
        'Optimize swarm',
        'Enable detailed agent logging'
      ],
      'task-overflow': [
        'Spawn additional agents',
        'Increase task processing parallelism',
        'Reject low-priority tasks',
        'Enable task queue monitoring'
      ],
      'agent-cascade-failure': [
        'Emergency agent respawn',
        'Isolate failing agents',
        'Reduce swarm load',
        'Enable failure analysis mode'
      ]
    };

    return actionsMap[pattern.type] || ['Monitor situation', 'Enable detailed logging'];
  }

  detectAnomalies(metrics) {
    if (!this.anomalyBaseline) return [];

    const anomalies = [];

    // Check each metric against baseline
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'number' && this.anomalyBaseline[key]) {
        const baseline = this.anomalyBaseline[key];
        const deviation = Math.abs(value - baseline.mean) / (baseline.stdDev || 1);

        if (deviation > 3) { // 3 sigma rule
          anomalies.push({
            metric: key,
            value,
            baseline: baseline.mean,
            deviation,
            severity: deviation > 5 ? 'critical' : deviation > 4 ? 'high' : 'medium'
          });
        }
      }
    }

    return anomalies;
  }

  updateBaseline(metrics) {
    if (!this.anomalyBaseline) {
      this.anomalyBaseline = {};
    }

    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'number') {
        if (!this.anomalyBaseline[key]) {
          this.anomalyBaseline[key] = {
            mean: value,
            variance: 0,
            stdDev: 0,
            count: 1
          };
        } else {
          const baseline = this.anomalyBaseline[key];
          const oldMean = baseline.mean;
          const newCount = baseline.count + 1;
          const newMean = oldMean + (value - oldMean) / newCount;
          const newVariance = baseline.variance + (value - oldMean) * (value - newMean);

          baseline.mean = newMean;
          baseline.variance = newVariance;
          baseline.stdDev = Math.sqrt(newVariance / newCount);
          baseline.count = newCount;
        }
      }
    }
  }

  getHealthScore() {
    if (this.history.length === 0) return 100;

    const recentMetrics = this.history.slice(-5);
    const recentPredictions = recentMetrics.flatMap(m => m.predictions || []);

    if (recentPredictions.length === 0) return 100;

    // Calculate health score based on predictions
    const criticalPredictions = recentPredictions.filter(p => p.severity >= 8);
    const highPredictions = recentPredictions.filter(p => p.severity >= 6 && p.severity < 8);

    let healthScore = 100;
    healthScore -= criticalPredictions.length * 15;
    healthScore -= highPredictions.length * 8;
    healthScore -= (recentPredictions.length - criticalPredictions.length - highPredictions.length) * 3;

    return Math.max(0, Math.min(100, healthScore));
  }

  getPredictiveDashboard() {
    const activePredictions = this.history
      .slice(-5)
      .flatMap(m => m.predictions || [])
      .filter(p => p.timeToFailure && p.timeToFailure < 30 * 60 * 1000); // Next 30 minutes

    return {
      healthScore: this.getHealthScore(),
      activePredictions: activePredictions.length,
      criticalAlerts: activePredictions.filter(p => p.severity >= 8).length,
      predictions: activePredictions.sort((a, b) => b.severity - a.severity),
      patternAccuracy: this.patterns.map(p => ({
        type: p.type,
        accuracy: p.accuracy,
        occurrences: p.occurrences,
        lastSeen: p.lastSeen
      })),
      anomalies: this.detectAnomalies(this.metrics),
      historySize: this.history.length,
      learningEnabled: this.learningEnabled
    };
  }

  startMonitoring(interval = 10000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.emit('health:monitor:tick');
    }, interval);

    logger.info(`[PredictiveHealth] Monitoring started (interval: ${interval}ms)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('[PredictiveHealth] Monitoring stopped');
    }
  }

  exportPatterns() {
    return this.patterns.map(p => ({
      type: p.type,
      indicators: p.indicators,
      threshold: p.threshold,
      accuracy: p.accuracy,
      occurrences: p.occurrences
    }));
  }

  importPatterns(patterns) {
    patterns.forEach(p => {
      const existing = this.patterns.find(ep => ep.type === p.type);
      if (existing) {
        existing.predictions.correct = p.predictions?.correct || 0;
        existing.predictions.incorrect = p.predictions?.incorrect || 0;
        existing.occurrences = p.occurrences || 0;
      }
    });
    logger.info('[PredictiveHealth] Imported patterns');
  }
}

export default PredictiveHealthMonitor;

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Predictive Health Monitoring System ===\n');
  
  const monitor = new PredictiveHealthMonitor();
  monitor.startMonitoring(5000);

  // Simulate metrics
  setInterval(() => {
    const metrics = {
      system: {
        memoryUsage: 60 + Math.random() * 30,
        heapUsed: 50 + Math.random() * 40,
        cpuUsage: 40 + Math.random() * 50,
        eventLoopDelay: Math.random() * 150
      },
      brain: {
        syncErrors: Math.floor(Math.random() * 5),
        health: 70 + Math.random() * 30
      },
      swarm: {
        agentFailures: Math.floor(Math.random() * 8),
        consensusFailures: Math.floor(Math.random() * 4),
        taskQueueSize: Math.floor(Math.random() * 60),
        avgProcessingTime: 2000 + Math.random() * 5000
      },
      agents: {
        terminatedRecently: Math.floor(Math.random() * 5),
        avgHealth: 50 + Math.random() * 50
      }
    };

    monitor.recordMetrics(metrics);
    const dashboard = monitor.getPredictiveDashboard();
    
    logger.info('\n--- Predictive Health Dashboard ---');
    logger.info(`Health Score: ${dashboard.healthScore.toFixed(1)}/100`);
    logger.info(`Active Predictions: ${dashboard.activePredictions}`);
    logger.info(`Critical Alerts: ${dashboard.criticalAlerts}`);
    if (dashboard.predictions.length > 0) {
      logger.info('\nTop Predictions:');
      dashboard.predictions.slice(0, 3).forEach(p => {
        logger.info(`  - ${p.type}: Severity ${p.severity}/10, Confidence ${(p.confidence * 100).toFixed(0)}%`);
      });
    }
  }, 5000);

  monitor.on('health:prediction', (pred) => {
    logger.info(`\n⚠️  PREDICTION: ${pred.type} (Severity: ${pred.severity}/10)`);
    logger.info(`   Recommended Actions: ${pred.recommendedActions.slice(0, 2).join(', ')}`);
  });

  monitor.on('health:anomaly', ({ anomalies }) => {
    logger.info(`\n🚨 ANOMALY DETECTED: ${anomalies.length} metrics out of normal range`);
  });
}
