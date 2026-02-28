/**
 * Q-DD Orchestrator - Auto-Mission Update System
 * Self-updates Q-DD missions based on revenue signals, acquisition data, and system state
 * Feedback loop: Revenue → Mission Priority, Acquisition → Channel Focus, State → Intervention Strategy
 */

export class QDDAutoMissionUpdateSystem {
  constructor() {
    this.missions = new Map(); // missionId -> mission object
    this.missionHistory = [];  // Past missions for learning
    this.performanceMetrics = new Map(); // missionId -> metrics
    this.updateLog = [];

    this.initializeMissions();
  }

  /**
   * Initialize core Q-DD missions
   */
  initializeMissions() {
    const coreMissions = [
      {
        id: 'MISSION_HEARTBEAT',
        name: 'Autonomous Heartbeat',
        description: 'Monitor system health every 5 minutes',
        interval: 300000,
        priority: 'P0-CRITICAL',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 }
      },
      {
        id: 'MISSION_ACQUISITION',
        name: 'User Acquisition Cycle',
        description: 'Run acquisition orchestration and channel scoring',
        interval: 600000,
        priority: 'P1-HIGH',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 }
      },
      {
        id: 'MISSION_REVENUE_TRACKING',
        name: 'Revenue Signal Tracking',
        description: 'Track Stripe webhooks and revenue events',
        interval: 60000,
        priority: 'P1-HIGH',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 }
      },
      {
        id: 'MISSION_SYSTEM_INFERENCE',
        name: 'System Status Inference',
        description: 'Run system inference and bottleneck detection',
        interval: 300000,
        priority: 'P1-HIGH',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 }
      },
      {
        id: 'MISSION_MEMORY_RECALL',
        name: 'Deterministic Memory Recall',
        description: 'Verify knowledge accessibility and recall latency',
        interval: 900000,
        priority: 'P2-MEDIUM',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 }
      }
    ];

    coreMissions.forEach(mission => {
      this.missions.set(mission.id, mission);
      this.performanceMetrics.set(mission.id, {
        executions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0,
        lastExecution: null
      });
    });
  }

  /**
   * Auto-update missions based on revenue signals
   */
  async updateMissionsFromRevenue(revenueData) {
    const revenuePerHour = revenueData.revenuePerHour || 0;
    const revenuePerDay = revenueData.revenuePerDay || 0;

    const update = {
      timestamp: Date.now(),
      source: 'revenue_signals',
      changes: []
    };

    // Adjust MISSION_ACQUISITION priority based on revenue
    const acquisitionMission = this.missions.get('MISSION_ACQUISITION');
    if (acquisitionMission) {
      const previousPriority = acquisitionMission.priority;

      if (revenuePerHour < 100) {
        // Low revenue: escalate to P0
        acquisitionMission.priority = 'P0-CRITICAL';
        acquisitionMission.interval = 300000; // 5 min
      } else if (revenuePerHour < 500) {
        // Medium revenue: keep at P1 but increase frequency
        acquisitionMission.priority = 'P1-HIGH';
        acquisitionMission.interval = 600000; // 10 min
      } else {
        // High revenue: P2 but maintain monitoring
        acquisitionMission.priority = 'P2-MEDIUM';
        acquisitionMission.interval = 900000; // 15 min
      }

      if (previousPriority !== acquisitionMission.priority) {
        update.changes.push({
          mission: 'MISSION_ACQUISITION',
          field: 'priority',
          from: previousPriority,
          to: acquisitionMission.priority,
          reason: `Revenue: $${revenuePerHour.toFixed(2)}/hr`
        });
      }
    }

    // Adjust MISSION_REVENUE_TRACKING based on transaction volume
    const revenueMission = this.missions.get('MISSION_REVENUE_TRACKING');
    if (revenueMission && revenuePerDay > 1000) {
      revenueMission.interval = 30000; // Every 30 seconds during high activity
    }

    this.updateLog.push(update);
    return update;
  }

  /**
   * Auto-update missions based on acquisition signals
   */
  async updateMissionsFromAcquisition(acquisitionMetrics) {
    const conversionRate = acquisitionMetrics.conversionRate || 0;
    const leadsGenerated = acquisitionMetrics.leadsGenerated || 0;
    const topChannel = acquisitionMetrics.topChannel || 'unknown';

    const update = {
      timestamp: Date.now(),
      source: 'acquisition_signals',
      changes: [],
      channelFocusUpdate: null
    };

    // If conversion rate is dropping, escalate acquisition mission
    const acquisitionMission = this.missions.get('MISSION_ACQUISITION');
    if (acquisitionMission) {
      if (conversionRate < 0.02) {
        // Low conversion: increase frequency
        acquisitionMission.interval = 300000; // 5 min
        update.changes.push({
          mission: 'MISSION_ACQUISITION',
          field: 'interval',
          from: 600000,
          to: 300000,
          reason: `Low conversion rate: ${(conversionRate * 100).toFixed(2)}%`
        });
      }
    }

    // If no leads generated, create emergency acquisition mission
    if (leadsGenerated === 0 && (!this.missions.has('MISSION_EMERGENCY_ACQUISITION'))) {
      const emergencyMission = {
        id: 'MISSION_EMERGENCY_ACQUISITION',
        name: 'Emergency Lead Generation',
        description: 'Urgent acquisition push - no leads detected',
        interval: 120000, // Every 2 min
        priority: 'P0-CRITICAL',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000 // Expires in 1 hour
      };

      this.missions.set('MISSION_EMERGENCY_ACQUISITION', emergencyMission);
      this.performanceMetrics.set('MISSION_EMERGENCY_ACQUISITION', {
        executions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0,
        lastExecution: null
      });

      update.changes.push({
        mission: 'MISSION_EMERGENCY_ACQUISITION',
        field: 'created',
        reason: 'Emergency: Zero leads detected in past cycle'
      });
    }

    // Record channel focus for next cycle
    update.channelFocusUpdate = {
      topPerformingChannel: topChannel,
      shouldEscalate: conversionRate < 0.05,
      shouldDiversify: leadsGenerated > 100 && conversionRate < 0.01
    };

    this.updateLog.push(update);
    return update;
  }

  /**
   * Auto-update missions based on system status inference
   */
  async updateMissionsFromSystemStatus(systemStatus) {
    const bottlenecks = systemStatus.bottlenecks || [];
    const healthScore = systemStatus.healthScore || 100;

    const update = {
      timestamp: Date.now(),
      source: 'system_status',
      changes: [],
      interventions: []
    };

    // If system health is critical, add intervention mission
    if (healthScore < 50) {
      const interventionMission = {
        id: 'MISSION_SYSTEM_INTERVENTION',
        name: 'System Health Intervention',
        description: 'Critical system health detected - run intervention protocol',
        interval: 180000, // Every 3 min
        priority: 'P0-CRITICAL',
        status: 'active',
        performance: { successRate: 0, avgExecutionTime: 0 },
        targetBottlenecks: bottlenecks.map(b => b.component),
        createdAt: Date.now(),
        expiresAt: Date.now() + 7200000 // Expires in 2 hours
      };

      if (!this.missions.has('MISSION_SYSTEM_INTERVENTION')) {
        this.missions.set('MISSION_SYSTEM_INTERVENTION', interventionMission);
        this.performanceMetrics.set('MISSION_SYSTEM_INTERVENTION', {
          executions: 0,
          successes: 0,
          failures: 0,
          totalTime: 0,
          lastExecution: null
        });

        update.interventions.push({
          type: 'CRITICAL_HEALTH',
          healthScore,
          targetComponents: bottlenecks.map(b => b.component)
        });
      }
    }

    // Adjust inference mission frequency based on critical bottlenecks
    if (bottlenecks.filter(b => b.severity === 'critical').length > 0) {
      const inferenceMission = this.missions.get('MISSION_SYSTEM_INFERENCE');
      if (inferenceMission && inferenceMission.interval > 60000) {
        inferenceMission.interval = 60000; // Every minute during critical issues

        update.changes.push({
          mission: 'MISSION_SYSTEM_INFERENCE',
          field: 'interval',
          from: 300000,
          to: 60000,
          reason: 'Critical bottlenecks detected'
        });
      }
    }

    this.updateLog.push(update);
    return update;
  }

  /**
   * Record mission execution metrics
   */
  recordMissionExecution(missionId, success, executionTimeMs) {
    const metrics = this.performanceMetrics.get(missionId);
    if (!metrics) return;

    metrics.executions++;
    metrics.totalTime += executionTimeMs;
    metrics.lastExecution = Date.now();

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    return {
      missionId,
      successRate: (metrics.successes / metrics.executions * 100).toFixed(2) + '%',
      avgExecutionTime: (metrics.totalTime / metrics.executions).toFixed(0) + 'ms'
    };
  }

  /**
   * Clean up expired emergency/intervention missions
   */
  cleanupExpiredMissions() {
    const now = Date.now();
    const expired = [];

    for (const [id, mission] of this.missions.entries()) {
      if (mission.expiresAt && mission.expiresAt < now) {
        expired.push(id);
        this.missionHistory.push({
          ...mission,
          completedAt: now
        });
        this.missions.delete(id);
      }
    }

    return { expiredCount: expired.length, expired };
  }

  /**
   * Get current mission portfolio
   */
  getMissionPortfolio() {
    const portfolio = [];

    for (const [id, mission] of this.missions.entries()) {
      const metrics = this.performanceMetrics.get(id);
      portfolio.push({
        ...mission,
        metrics: {
          successRate: metrics.executions > 0
            ? (metrics.successes / metrics.executions * 100).toFixed(2) + '%'
            : 'N/A',
          avgExecutionTime: metrics.executions > 0
            ? (metrics.totalTime / metrics.executions).toFixed(0) + 'ms'
            : 'N/A',
          totalExecutions: metrics.executions
        }
      });
    }

    return portfolio.sort((a, b) => {
      const priorityOrder = { 'P0-CRITICAL': 0, 'P1-HIGH': 1, 'P2-MEDIUM': 2 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
  }

  /**
   * Get mission by ID
   */
  getMissionById(missionId) {
    return this.missions.get(missionId);
  }

  /**
   * Get all active missions
   */
  getActiveMissions() {
    const active = [];
    for (const [id, mission] of this.missions.entries()) {
      if (mission.status === 'active') {
        active.push({ ...mission });
      }
    }
    return active;
  }

  /**
   * Get update history
   */
  getUpdateHistory(limit = 50) {
    return this.updateLog.slice(-limit);
  }

  /**
   * Get mission performance report
   */
  getMissionPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      totalMissions: this.missions.size,
      activeMissions: Array.from(this.missions.values()).filter(m => m.status === 'active').length,
      missionsByPriority: {},
      overallHealthScore: 0,
      topPerformers: [],
      bottomPerformers: []
    };

    const allMissions = this.getMissionPortfolio();

    // Group by priority
    allMissions.forEach(mission => {
      const priority = mission.priority.split('-')[0];
      if (!report.missionsByPriority[priority]) {
        report.missionsByPriority[priority] = 0;
      }
      report.missionsByPriority[priority]++;
    });

    // Calculate overall health
    let totalSuccessRate = 0;
    allMissions.forEach(mission => {
      const successRate = parseFloat(mission.metrics.successRate) || 0;
      totalSuccessRate += successRate;
    });
    report.overallHealthScore = (totalSuccessRate / allMissions.length).toFixed(2);

    // Top and bottom performers
    const sorted = allMissions.sort((a, b) => {
      const rateA = parseFloat(a.metrics.successRate) || 0;
      const rateB = parseFloat(b.metrics.successRate) || 0;
      return rateB - rateA;
    });

    report.topPerformers = sorted.slice(0, 3);
    report.bottomPerformers = sorted.slice(-3).reverse();

    return report;
  }
}

export default QDDAutoMissionUpdateSystem;
