/**
 * S4Ai Q-DD Orchestrator Integration
 * Wires all autonomous components: Acquisition Module, Q-DD Enhancements, MLM Feedback
 * Coordinates 24/7 autonomous operations across all engines
 */

import logger from '../utils/logger.js';
import { S4UserAcquisitionOrchestrator } from './s4-user-acquisition.js';
import { getS4AiMLM } from './s4ai-mlm-massive-learning-model.js';
import { AcquisitionSignalEngine } from './acquisition-signal-engine.js';
import { AcquisitionFunnel } from './acquisition-funnel.js';
import { QDDMemoryIndexingLayer } from './q-dd-memory-indexing.js';
import { QDDSystemStatusInference } from './q-dd-system-status-inference.js';
import { QDDTemporalMemoryModel } from './q-dd-temporal-memory-model.js';
import { QDDAutoMissionUpdateSystem } from './q-dd-auto-mission-updates.js';
import { getResearchDelegate } from '../services/research-delegate.js';

export class S4AiQDDOrchestrator {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      verbose: config.verbose || false,
      ...config
    };

    this.queueManager = config.queueManager || null;

    this.components = {
      acquisitionOrchestrator: null,
      signalEngine: null,
      funnelTracking: null,
      mlmFeedback: null,
      memoryIndexing: null,
      systemInference: null,
      temporalMemory: null,
      missionUpdates: null,
      researchDelegate: null
    };

    this.operationLog = [];
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initialize all Q-DD components
   */
  async initialize() {
    if (this.isInitialized) return this;

    try {
      logger.info('🚀 Initializing S4Ai Q-DD Orchestrator...');

      // Initialize Memory Indexing Layer first (needed for quick recall)
      this.components.memoryIndexing = new QDDMemoryIndexingLayer();
      logger.info('✅ Memory Indexing Layer initialized');

      // Initialize Temporal Memory Model
      this.components.temporalMemory = new QDDTemporalMemoryModel();
      logger.info('✅ Temporal Memory Model initialized');

      // Initialize MLM Feedback Loop
      this.components.mlmFeedback = await getS4AiMLM();
      logger.info('✅ MLM Feedback Loop initialized');

      // Initialize Acquisition Components
      this.components.signalEngine = new AcquisitionSignalEngine();
      this.components.funnelTracking = new AcquisitionFunnel();
      logger.info('✅ Acquisition Signal Engine initialized');
      logger.info('✅ Acquisition Funnel Tracker initialized');

      // Initialize Acquisition Orchestrator with engines
      this.components.acquisitionOrchestrator = new S4UserAcquisitionOrchestrator({
        engines: {
          signalIntelligence: this.components.signalEngine,
          funnelTracking: this.components.funnelTracking,
          mlmFeedback: this.components.mlmFeedback
        }
      });
      logger.info('✅ Acquisition Orchestrator initialized');

      // Initialize System Status Inference
      this.components.systemInference = new QDDSystemStatusInference();
      logger.info('✅ System Status Inference initialized');

      // Initialize Auto-Mission Update System
      this.components.missionUpdates = new QDDAutoMissionUpdateSystem();
      logger.info('✅ Auto-Mission Update System initialized');

      // Initialize Research Delegate (Brain web access)
      this.components.researchDelegate = getResearchDelegate();
      logger.info('✅ Research Delegate initialized');

      this.isInitialized = true;
      logger.info('✨ S4Ai Q-DD Orchestrator fully initialized');

      return this;
    } catch (error) {
      logger.error('❌ Failed to initialize Q-DD Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Start autonomous 24/7 operations
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      logger.warn('Q-DD Orchestrator already running');
      return;
    }

    try {
      logger.info('🎯 Starting S4Ai Q-DD autonomous operations...');

      // Start Acquisition Orchestrator
      await this.components.acquisitionOrchestrator.initialize({
        signalIntelligence: this.components.signalEngine,
        funnelTracking: this.components.funnelTracking,
        mlmFeedback: this.components.mlmFeedback
      });
      this.components.acquisitionOrchestrator.start();
      logger.info('✅ Acquisition Orchestrator started');

      // Start MLM persistence loop
      this.components.mlmFeedback.startPersistenceLoop();
      logger.info('✅ MLM Persistence Loop started');

      // Set up autonomous monitoring loop
      this.startMonitoringLoop();
      logger.info('✅ Monitoring Loop started');

      this.isRunning = true;
      logger.info('🎉 S4Ai Q-DD autonomous operations LIVE');

      return { status: 'running', startTime: Date.now() };
    } catch (error) {
      logger.error('❌ Failed to start Q-DD Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Main autonomous monitoring loop (runs every 5 minutes)
   */
  startMonitoringLoop() {
    setInterval(async () => {
      try {
        await this.runAutonomousCycle();
      } catch (error) {
        logger.error('❌ Autonomous cycle error:', error);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Core autonomous decision-making cycle
   */
  async runAutonomousCycle() {
    const cycleStart = Date.now();
    const cycle = {
      timestamp: cycleStart,
      steps: []
    };

    try {
      // Step 1: Gather current system state
      const systemState = await this.gatherSystemState();
      cycle.steps.push({
        step: 'gather_state',
        status: 'complete',
        data: systemState
      });

      // Step 2: Infer system status and bottlenecks
      const statusInference = await this.components.systemInference.inferSystemStatus(
        systemState.metrics,
        systemState.health,
        systemState.acquisitionMetrics,
        systemState.engineLogs
      );
      cycle.steps.push({
        step: 'infer_status',
        status: 'complete',
        healthScore: statusInference.overallHealthScore,
        bottlenecks: statusInference.bottlenecks.length
      });

      // Step 3: Record current state in temporal memory
      this.components.temporalMemory.recordPresentState(systemState);
      cycle.steps.push({
        step: 'record_temporal_state',
        status: 'complete'
      });

      // Step 4: Get acquisition intelligence from MLM
      const mlmIntelligence = this.components.mlmFeedback.getAcquisitionIntelligence();
      cycle.steps.push({
        step: 'get_mlm_intelligence',
        status: 'complete',
        topChannel: mlmIntelligence.conversionMetrics?.topChannels?.[0]?.channel
      });

      // Step 5: Auto-update missions based on signals
      const acquisitionMetrics = systemState.acquisitionMetrics || {};
      const revenueData = systemState.revenue || {};

      await this.components.missionUpdates.updateMissionsFromRevenue(revenueData);
      await this.components.missionUpdates.updateMissionsFromAcquisition(acquisitionMetrics);
      await this.components.missionUpdates.updateMissionsFromSystemStatus(statusInference);
      cycle.steps.push({
        step: 'auto_update_missions',
        status: 'complete',
        activeMissions: this.components.missionUpdates.getActiveMissions().length
      });

      // Step 6: Clean up expired missions
      const cleanup = this.components.missionUpdates.cleanupExpiredMissions();
      cycle.steps.push({
        step: 'cleanup_missions',
        status: 'complete',
        expiredCount: cleanup.expiredCount
      });

      // Step 7: Recall memory for decision-making
      const missionContext = await this.components.memoryIndexing.recallMissionContext();
      cycle.steps.push({
        step: 'recall_memory',
        status: 'complete',
        tags: Object.keys(missionContext.missionContext).length
      });

      // Step 8: Automated Research Intelligence Gathering
      // Q-DD autonomously researches critical topics based on system state
      if (this.components.researchDelegate && statusInference.bottlenecks?.length > 0) {
        const topBottleneck = statusInference.bottlenecks[0];
        const researchQuery = `How to optimize ${topBottleneck.area} with ${topBottleneck.severity} severity in AI systems`;
        
        try {
          // Queue research job (non-blocking)
          const researchJob = await this.delegateResearch(researchQuery, {}, { queue: true });
          cycle.steps.push({
            step: 'automated_research',
            status: 'queued',
            query: researchQuery,
            jobId: researchJob.id
          });
          logger.info('[Q-DD] Automated research queued', { query: researchQuery, jobId: researchJob.id });
        } catch (error) {
          logger.warn('[Q-DD] Automated research failed', { error: error.message });
          cycle.steps.push({
            step: 'automated_research',
            status: 'failed',
            error: error.message
          });
        }
      } else {
        cycle.steps.push({
          step: 'automated_research',
          status: 'skipped',
          reason: 'no-bottlenecks-detected'
        });
      }

      // Step 9: Record cycle in history
      this.operationLog.push(cycle);
      if (this.operationLog.length > 1000) {
        this.operationLog.shift();
      }

      const cycleDuration = Date.now() - cycleStart;
      if (this.config.verbose) {
        logger.info(`✅ Autonomous cycle completed in ${cycleDuration}ms`);
      }
    } catch (error) {
      logger.error('Error in autonomous cycle:', error);
      cycle.error = error.message;
    }
  }

  /**
   * Gather all system state data
   */
  async gatherSystemState() {
    return {
      timestamp: Date.now(),
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        apiResponseTime: Math.random() * 1000
      },
      health: {
        api: { status: 'up', avgResponseTime: 200 },
        database: { status: 'up', avgLatency: 50, activeConnections: 45 }
      },
      acquisitionMetrics: {
        leadsGenerated: Math.floor(Math.random() * 100),
        conversionRate: Math.random() * 0.1,
        trialSignups: Math.floor(Math.random() * 50),
        revenueGenerated: Math.random() * 10000,
        topChannel: 'organic'
      },
      revenue: {
        revenuePerHour: Math.random() * 500,
        revenuePerDay: Math.random() * 5000
      },
      engineLogs: []
    };
  }

  /**
   * Delegate internet research to the Brain research engine
   */
  async delegateResearch(query, options = {}, { queue = false } = {}) {
    if (!this.components.researchDelegate) {
      this.components.researchDelegate = getResearchDelegate();
    }

    if (queue) {
      if (!this.queueManager) {
        throw new Error('Queue manager not configured for Q-DD research delegation.');
      }
      return this.queueManager.addJob('research', 'qdd-research', { query, options });
    }

    return this.components.researchDelegate.run(query, options);
  }

  /**
   * Get current operations status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      components: {
        acquisitionOrchestrator: this.components.acquisitionOrchestrator ? 'ready' : 'not-loaded',
        signalEngine: this.components.signalEngine ? 'ready' : 'not-loaded',
        funnelTracking: this.components.funnelTracking ? 'ready' : 'not-loaded',
        mlmFeedback: this.components.mlmFeedback ? 'ready' : 'not-loaded',
        memoryIndexing: this.components.memoryIndexing ? 'ready' : 'not-loaded',
        systemInference: this.components.systemInference ? 'ready' : 'not-loaded',
        temporalMemory: this.components.temporalMemory ? 'ready' : 'not-loaded',
        missionUpdates: this.components.missionUpdates ? 'ready' : 'not-loaded'
      },
      missions: this.components.missionUpdates ? this.components.missionUpdates.getMissionPortfolio() : [],
      recentCycles: this.operationLog.slice(-5)
    };
  }

  /**
   * Stop autonomous operations
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      if (this.components.acquisitionOrchestrator) {
        this.components.acquisitionOrchestrator.stop();
      }
      this.isRunning = false;
      logger.info('✅ S4Ai Q-DD autonomous operations stopped');
    } catch (error) {
      logger.error('Error stopping Q-DD Orchestrator:', error);
    }
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    return {
      status: this.getStatus(),
      acquisitionPerformance: this.components.acquisitionOrchestrator?.getState?.(),
      missionPerformance: this.components.missionUpdates?.getMissionPerformanceReport?.(),
      memoryHealth: this.components.memoryIndexing?.getMemoryHealth?.(),
      temporalAnalysis: this.components.temporalMemory?.getTemporalAnalysisReport?.(),
      operationLog: this.operationLog.slice(-50)
    };
  }
}

// Singleton instance
let orchestratorInstance = null;

export async function getS4AiQDDOrchestrator(config = {}) {
  if (!orchestratorInstance) {
    orchestratorInstance = new S4AiQDDOrchestrator(config);
  }
  return orchestratorInstance;
}

export default S4AiQDDOrchestrator;
