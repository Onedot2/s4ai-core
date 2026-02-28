/**
 * Q-DD Orchestrator - Temporal Memory Model
 * Tracks past (logs), present (runtime), future (roadmap) states
 * Enables historical reasoning and predictive decision-making
 */

export class QDDTemporalMemoryModel {
  constructor() {
    this.timelineEvents = {
      past: [],      // Historical logs and decisions
      present: [],   // Current runtime state
      future: []     // Planned actions and roadmap
    };

    this.temporalIndex = new Map(); // timestamp -> [events]
    this.stateSnapshots = [];       // Point-in-time snapshots
    this.trends = new Map();        // trend -> data series
  }

  /**
   * Record past event (historical)
   */
  recordPastEvent(event) {
    const pastEvent = {
      type: event.type || 'system_event',
      description: event.description,
      timestamp: event.timestamp || Date.now(),
      metadata: event.metadata || {},
      severity: event.severity || 'info'
    };

    this.timelineEvents.past.push(pastEvent);
    this.indexEvent(pastEvent.timestamp, pastEvent);

    return { success: true, recorded: pastEvent };
  }

  /**
   * Record current state (present)
   */
  recordPresentState(state) {
    const presentState = {
      type: 'present_state',
      timestamp: Date.now(),
      metrics: {
        healthScore: state.healthScore || 0,
        apiStatus: state.apiStatus || 'unknown',
        dbStatus: state.dbStatus || 'unknown',
        activeEngines: state.activeEngines || 0,
        acquisitionMetrics: state.acquisitionMetrics || {},
        revenuePerHour: state.revenuePerHour || 0
      },
      activeEngines: state.activeEngines || [],
      runningOperations: state.runningOperations || []
    };

    this.timelineEvents.present = [presentState]; // Keep only latest
    this.indexEvent(presentState.timestamp, presentState);

    // Create snapshot
    const snapshot = {
      timestamp: presentState.timestamp,
      state: presentState,
      hash: this.hashState(presentState)
    };
    this.stateSnapshots.push(snapshot);
    if (this.stateSnapshots.length > 1000) {
      this.stateSnapshots.shift();
    }

    return { success: true, recorded: presentState };
  }

  /**
   * Record future event (planned)
   */
  recordFutureEvent(event) {
    const futureEvent = {
      type: event.type || 'planned_action',
      description: event.description,
      plannedTime: event.plannedTime || Date.now() + 3600000, // 1 hour default
      priority: event.priority || 'medium',
      expectedOutcome: event.expectedOutcome || '',
      dependencies: event.dependencies || []
    };

    this.timelineEvents.future.push(futureEvent);
    this.indexEvent(futureEvent.plannedTime, futureEvent);

    return { success: true, recorded: futureEvent };
  }

  /**
   * Index event by timestamp
   */
  indexEvent(timestamp, event) {
    if (!this.temporalIndex.has(timestamp)) {
      this.temporalIndex.set(timestamp, []);
    }
    this.temporalIndex.get(timestamp).push(event);
  }

  /**
   * Track metric trend over time
   */
  recordTrend(trendName, value, timestamp = Date.now()) {
    if (!this.trends.has(trendName)) {
      this.trends.set(trendName, []);
    }

    const trendData = {
      timestamp,
      value,
      percentChange: this.calculatePercentChange(trendName, value)
    };

    this.trends.get(trendName).push(trendData);

    // Keep last 1000 data points per trend
    if (this.trends.get(trendName).length > 1000) {
      this.trends.get(trendName).shift();
    }

    return trendData;
  }

  /**
   * Calculate percent change from previous value
   */
  calculatePercentChange(trendName, value) {
    const history = this.trends.get(trendName) || [];
    if (history.length < 2) return 0;

    const previousValue = history[history.length - 1].value;
    if (previousValue === 0) return 0;

    return ((value - previousValue) / previousValue) * 100;
  }

  /**
   * Get temporal context for decision-making
   */
  getTemporalContext(lookbackHours = 24) {
    const now = Date.now();
    const lookbackMs = lookbackHours * 60 * 60 * 1000;

    const context = {
      timestamp: now,
      pastContext: this.getPastContext(now - lookbackMs, now),
      presentContext: this.getPresentContext(),
      futureContext: this.getFutureContext(now),
      trends: this.getTrendsSummary(lookbackHours)
    };

    return context;
  }

  /**
   * Get past context (historical)
   */
  getPastContext(startTime, endTime) {
    const pastEvents = this.timelineEvents.past.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );

    const summary = {
      eventCount: pastEvents.length,
      timespan: endTime - startTime,
      events: pastEvents,
      keyIncidents: pastEvents.filter(e => e.severity === 'critical' || e.severity === 'warning')
    };

    return summary;
  }

  /**
   * Get present context (current state)
   */
  getPresentContext() {
    return {
      timestamp: Date.now(),
      state: this.timelineEvents.present[0] || {},
      stateHash: this.stateSnapshots.length > 0
        ? this.stateSnapshots[this.stateSnapshots.length - 1].hash
        : null
    };
  }

  /**
   * Get future context (planned actions)
   */
  getFutureContext(fromTime) {
    const futureEvents = this.timelineEvents.future
      .filter(e => e.plannedTime >= fromTime)
      .sort((a, b) => a.plannedTime - b.plannedTime);

    return {
      plannedActions: futureEvents,
      nearTerm: futureEvents.filter(e => e.plannedTime < fromTime + 3600000), // Next hour
      highPriority: futureEvents.filter(e => e.priority === 'high')
    };
  }

  /**
   * Get trends summary
   */
  getTrendsSummary(lookbackHours = 24) {
    const summary = {};

    for (const [trendName, data] of this.trends.entries()) {
      if (data.length === 0) continue;

      const current = data[data.length - 1].value;
      const direction = data[data.length - 1].percentChange > 0 ? 'up' : 'down';
      const magnitude = Math.abs(data[data.length - 1].percentChange);

      summary[trendName] = {
        current,
        direction,
        magnitude: magnitude.toFixed(2),
        dataPoints: data.length
      };
    }

    return summary;
  }

  /**
   * Predict future state based on trends
   */
  predictFutureState(hoursAhead = 1) {
    const predictions = {};

    for (const [trendName, data] of this.trends.entries()) {
      if (data.length < 2) continue;

      const recentData = data.slice(-10); // Last 10 points
      const values = recentData.map(d => d.value);
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const trend = (values[values.length - 1] - values[0]) / values.length;

      predictions[trendName] = {
        currentValue: values[values.length - 1],
        predicted: avgValue + (trend * hoursAhead),
        confidence: this.calculatePredictionConfidence(recentData),
        trend: trend > 0 ? 'increasing' : 'decreasing'
      };
    }

    return predictions;
  }

  /**
   * Calculate confidence in prediction
   */
  calculatePredictionConfidence(data) {
    if (data.length < 3) return 0.5;

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high confidence
    if (mean === 0) return 0.5;
    const coeffVar = stdDev / mean;
    const confidence = Math.max(0, 1 - coeffVar);

    return Math.min(1, confidence);
  }

  /**
   * Get state changes between two times
   */
  getStateChanges(startTime, endTime) {
    const snapshots = this.stateSnapshots.filter(
      s => s.timestamp >= startTime && s.timestamp <= endTime
    );

    if (snapshots.length < 2) {
      return { changes: [] };
    }

    const changes = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1].state;
      const curr = snapshots[i].state;

      if (prev.hash !== curr.hash) {
        changes.push({
          timestamp: snapshots[i].timestamp,
          previousState: prev,
          newState: curr,
          changedFields: this.diffStates(prev, curr)
        });
      }
    }

    return { changes, totalTime: endTime - startTime };
  }

  /**
   * Diff two state objects
   */
  diffStates(prev, curr) {
    const changes = [];

    const allKeys = new Set([
      ...Object.keys(prev.metrics || {}),
      ...Object.keys(curr.metrics || {})
    ]);

    for (const key of allKeys) {
      const prevVal = prev.metrics?.[key];
      const currVal = curr.metrics?.[key];

      if (prevVal !== currVal) {
        changes.push({
          field: key,
          from: prevVal,
          to: currVal
        });
      }
    }

    return changes;
  }

  /**
   * Hash state for change detection
   */
  hashState(state) {
    const stateStr = JSON.stringify(state.metrics || {});
    let hash = 0;
    for (let i = 0; i < stateStr.length; i++) {
      const char = stateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get temporal analysis report
   */
  getTemporalAnalysisReport(lookbackHours = 24) {
    const context = this.getTemporalContext(lookbackHours);
    const predictions = this.predictFutureState(1);

    return {
      timestamp: Date.now(),
      lookbackHours,
      pastAnalysis: {
        keyEvents: context.pastContext.keyIncidents,
        totalEventCount: context.pastContext.eventCount
      },
      presentAnalysis: context.presentContext,
      futureAnalysis: {
        predictions,
        plannedActions: context.futureContext.plannedActions
      },
      trends: context.trends
    };
  }
}

export default QDDTemporalMemoryModel;
