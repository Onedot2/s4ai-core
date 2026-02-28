/**
 * Phase 3D.1: Q-DD Cycle Tuning
 * Optimizes the Q-DD decision cycle time based on decision complexity and confidence
 * 
 * Default: 5-minute cycle
 * Optimized: 30 seconds to 5 minutes based on decision type
 */

import pool from '../db/pool.js';

class QDDCycleTuner {
  constructor() {
    this.defaultCycleTime = 5 * 60 * 1000; // 5 minutes in ms
    this.minCycleTime = 30 * 1000; // 30 seconds (high confidence)
    this.maxCycleTime = 5 * 60 * 1000; // 5 minutes (low confidence)
    this.metrics = {
      decision_count: 0,
      avg_confidence: 0,
      avg_cycle_time: 0,
      total_executions: 0
    };
  }

  /**
   * Calculate optimal cycle time based on decision characteristics
   */
  calculateCycleTime(decisionData) {
    const {
      confidence = 0.5,
      decision_type = 'default',
      recent_success_rate = 0.5,
      revenue_impact = 0,
      urgency = 'normal'
    } = decisionData;

    // Base cycle time from confidence
    let cycleTime = this.maxCycleTime * (1 - confidence);

    // Adjust for decision type
    const typeMultipliers = {
      'revenue_threshold_trigger': 0.6, // High priority
      'pricing_optimization': 0.8,
      'channel_reallocation': 0.7,
      'premium_tier_adoption': 0.75,
      'default': 1.0
    };

    const multiplier = typeMultipliers[decision_type] || 1.0;
    cycleTime *= multiplier;

    // Adjust for recent success rate
    if (recent_success_rate > 0.8) {
      cycleTime *= 0.7; // Speed up successful decision types
    } else if (recent_success_rate < 0.5) {
      cycleTime *= 1.3; // Slow down failing decision types
    }

    // Adjust for revenue impact (high-impact decisions execute faster)
    if (revenue_impact > 10000) { // $100+ impact
      cycleTime *= 0.5;
    }

    // Adjust for urgency
    const urgencyMultipliers = {
      'critical': 0.4,
      'high': 0.7,
      'normal': 1.0,
      'low': 1.3
    };

    cycleTime *= urgencyMultipliers[urgency] || 1.0;

    // Clamp within bounds
    return Math.max(this.minCycleTime, Math.min(this.maxCycleTime, cycleTime));
  }

  /**
   * Analyze recent decision performance
   */
  async analyzePerfomance() {
    try {
      // Get recent decisions (last 100)
      const query = `
        SELECT
          decision_type,
          confidence,
          created_at,
          outcome
        FROM q_dd_decisions
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const result = await pool.query(query);

      if (result.rows.length === 0) {
        return {
          avg_confidence: 0.5,
          avg_cycle_time: this.defaultCycleTime,
          total_decisions: 0,
          success_rate: 0
        };
      }

      const decisions = result.rows;

      // Calculate metrics
      const avgConfidence = decisions.reduce((sum, d) => sum + (d.confidence || 0.5), 0) / decisions.length;
      const successCount = decisions.filter(d => d.outcome && JSON.parse(d.outcome).action).length;
      const successRate = successCount / decisions.length;

      // Calculate by decision type
      const byType = {};
      decisions.forEach(d => {
        if (!byType[d.decision_type]) {
          byType[d.decision_type] = {
            count: 0,
            success: 0,
            avg_confidence: 0
          };
        }
        byType[d.decision_type].count++;
        byType[d.decision_type].avg_confidence += d.confidence || 0.5;

        if (d.outcome && JSON.parse(d.outcome).action) {
          byType[d.decision_type].success++;
        }
      });

      // Normalize
      Object.keys(byType).forEach(type => {
        byType[type].avg_confidence /= byType[type].count;
        byType[type].success_rate = byType[type].success / byType[type].count;
      });

      this.metrics = {
        decision_count: decisions.length,
        avg_confidence: avgConfidence,
        success_rate: successRate,
        by_type: byType
      };

      return this.metrics;

    } catch (error) {
      console.error('Q-DD performance analysis error:', error);
      return null;
    }
  }

  /**
   * Get recommended cycle times for all decision types
   */
  async getRecommendedCycleTimes() {
    const perf = await this.analyzePerfomance();

    if (!perf) return null;

    const recommended = {};
    const decisionTypes = [
      'revenue_threshold_trigger',
      'pricing_optimization',
      'channel_reallocation',
      'premium_tier_adoption',
      'default'
    ];

    decisionTypes.forEach(type => {
      const metrics = perf.by_type[type];
      const baseData = {
        decision_type: type,
        confidence: metrics ? metrics.avg_confidence : 0.5,
        recent_success_rate: metrics ? metrics.success_rate : 0.5
      };

      recommended[type] = {
        cycle_time_ms: this.calculateCycleTime(baseData),
        cycle_time_seconds: Math.round(this.calculateCycleTime(baseData) / 1000),
        metrics: metrics || { count: 0, success_rate: 0 }
      };
    });

    return recommended;
  }

  /**
   * Log cycle tuning metrics for analysis
   */
  async logTuningMetrics(decisionType, cycleTime, executionTime) {
    try {
      const query = `
        INSERT INTO q_dd_cycle_metrics (decision_type, cycle_time_ms, execution_time_ms, created_at)
        VALUES ($1, $2, $3, $4)
      `;

      await pool.query(query, [
        decisionType,
        cycleTime,
        executionTime,
        new Date().toISOString()
      ]);

      this.metrics.total_executions++;

    } catch (error) {
      console.error('Cycle metrics logging error:', error);
    }
  }

  /**
   * Get optimization report
   */
  async getOptimizationReport() {
    const perf = await this.analyzePerfomance();
    const cycleTimes = await this.getRecommendedCycleTimes();

    return {
      summary: {
        total_decisions: perf.decision_count,
        avg_confidence: (perf.avg_confidence * 100).toFixed(1) + '%',
        overall_success_rate: (perf.success_rate * 100).toFixed(1) + '%'
      },
      cycle_time_optimization: cycleTimes,
      recommendations: this.generateRecommendations(perf, cycleTimes),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate tuning recommendations
   */
  generateRecommendations(perf, cycleTimes) {
    const recommendations = [];

    // Check for low success rates
    Object.entries(perf.by_type || {}).forEach(([type, metrics]) => {
      if (metrics.success_rate < 0.5) {
        recommendations.push({
          type: 'low_success_rate',
          decision_type: type,
          current_rate: (metrics.success_rate * 100).toFixed(1) + '%',
          recommendation: `Increase cycle time for ${type} - only ${(metrics.success_rate * 100).toFixed(1)}% success rate`,
          action: 'Slow down decision execution to gather more data'
        });
      }
    });

    // Check for high confidence decisions
    if (perf.avg_confidence > 0.8) {
      recommendations.push({
        type: 'high_confidence',
        recommendation: 'System is making confident decisions - can safely reduce cycle time',
        action: `Consider reducing minimum cycle time from ${Math.round(this.minCycleTime / 1000)}s`
      });
    }

    // Revenue threshold check
    if (perf.success_rate > 0.8) {
      recommendations.push({
        type: 'high_performance',
        recommendation: 'Q-DD system performing well with high success rate',
        action: 'Increase decision frequency to capture more optimization opportunities'
      });
    }

    return recommendations;
  }
}

// Singleton instance
let tunerInstance = null;

export function getQDDCycleTuner() {
  if (!tunerInstance) {
    tunerInstance = new QDDCycleTuner();
  }
  return tunerInstance;
}

export default QDDCycleTuner;
