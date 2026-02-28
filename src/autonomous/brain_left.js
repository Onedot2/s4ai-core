// src/core/brain_left.js
// The "Brain_Left" - Autonomous background worker for S4-PWA (moved from agent-core)
// Enforces GENESIS_TRILOGY as operational core with dual-brain awareness

import BrainMiddleware from './brain-middleware.js';
import { verifyGenesisTrilogy } from './s4ai-genesis-core.js';
import * as revenue from '../../agent-core/revenue.js';
import logger from '../utils/logger.js';


/**
 * Brain_Left - Analytical and logical brain component
 * Works in tandem with Brain_Right through middleware
 */
class BrainLeft {
  constructor(config = {}) {
    // Enforce GENESIS_TRILOGY before initialization with graceful error handling
    try {
      verifyGenesisTrilogy();
    } catch (error) {
      logger.error('[Brain_Left] CRITICAL: GENESIS_TRILOGY verification failed:', error.message);
      throw error;
    }

    this.config = {
      loopInterval: config.loopInterval || 5000, // 5 seconds
      enableMiddleware: config.enableMiddleware !== false, // Default true
      middleware: config.middleware || null,
      ...config
    };

    this.state = {
      running: false,
      cycle: 0,
      decisions: [],
      health: 100
    };

    // Dual-brain awareness
    this.brainIdentity = 'left';
    this.peerBrain = 'right';

    // Middleware integration
    this.middleware = this.config.middleware;
    if (!this.middleware && this.config.enableMiddleware) {
      this.middleware = new BrainMiddleware({
        selfHealingEnabled: true,
        enableCloudSync: false
      });
    }

    // Set up middleware listeners if available
    if (this.middleware) {
      this.setupMiddlewareListeners();
    }

    this.modules = [
      { name: 'PWA frontend', description: 'User interface and experience', priority: 'high' },
      { name: 'CI/CD heartbeat', description: 'Automation and deployment pipeline', priority: 'high' },
      { name: 'Revenue module', description: 'Monetization and self-optimization', priority: 'high' }
    ];

    logger.info('[Brain_Left] Initialized with GENESIS_TRILOGY enforcement and dual-brain awareness');
  }

  /**
   * Setup middleware event listeners for dual-brain communication
   */
  setupMiddlewareListeners() {
    // Listen for messages from Brain_Right
    this.middleware.on('message:to-left', (message) => {
      this.handleMessageFromPeer(message);
    });

    // Listen for peer brain state updates
    this.middleware.on('brain:state-updated', (event) => {
      if (event.brain === 'right') {
        this.handlePeerStateUpdate(event.state);
      }
    });

    // Listen for middleware healing events
    this.middleware.on('middleware:healed', (event) => {
      logger.info(`[Brain_Left] Middleware healed: ${event.issueType}`);
    });

    logger.info('[Brain_Left] Middleware listeners configured');
  }

  /**
   * Handle incoming message from peer brain (Brain_Right)
   */
  handleMessageFromPeer(message) {
    logger.info(`[Brain_Left] Received message from ${message.from}:`, message.payload);

    // Process message based on type
    if (message.payload.type === 'share_insight') {
      logger.info(`[Brain_Left] Received insight from Brain_Right:`, message.payload.data);
      // Store or use the insight
    } else if (message.payload.type === 'request_status') {
      this.sendMessageToPeer({
        type: 'status_response',
        data: this.getStatus()
      });
    } else if (message.payload.type === 'brain_started') {
      logger.info('[Brain_Left] Brain_Right has started');
    } else if (message.payload.type === 'brain_stopped') {
      logger.info('[Brain_Left] Brain_Right has stopped');
    }
  }

  /**
   * Handle peer brain state update
   */
  handlePeerStateUpdate(peerState) {
    // Update health based on peer brain health
    if (peerState.health < 50 && this.state.health > 70) {
      logger.info('[Brain_Left] Peer brain health low, adjusting workload...');
      // Could adjust loop interval or other parameters
    }
  }

  /**
   * Send message to peer brain (Brain_Right)
   */
  sendMessageToPeer(payload) {
    if (this.middleware) {
      this.middleware.sendMessage(this.brainIdentity, this.peerBrain, payload);
      logger.info(`[Brain_Left] Sent message to ${this.peerBrain}:`, payload.type);
    }
  }

  /**
   * Update brain state in middleware
   */
  updateMiddlewareState() {
    if (this.middleware) {
      this.middleware.updateBrainState(this.brainIdentity, {
        status: this.state.running ? 'running' : 'stopped',
        cycle: this.state.cycle,
        health: this.state.health,
        decisions: this.state.decisions.slice(-10)
      });
    }
  }

  /**
   * Get awareness of peer brain
   */
  getPeerAwareness() {
    if (this.middleware) {
      return this.middleware.getBrainAwareness(this.brainIdentity);
    }
    return null;
  }

  /**
   * Start the brain
   */
  async start() {
    if (this.state.running) {
      logger.warn('[Brain_Left] Already running');
      return;
    }

    // Re-verify GENESIS_TRILOGY before starting
    verifyGenesisTrilogy();

    logger.info('[Brain_Left] Starting with GENESIS_TRILOGY enforcement...');
    this.state.running = true;
    this.state.startTime = Date.now();
    this.state.health = 100;

    // Start middleware if not already running
    if (this.middleware && !this.middleware.running) {
      this.middleware.start();
    }

    // Update initial state in middleware
    this.updateMiddlewareState();

    // Notify peer brain of startup
    this.sendMessageToPeer({
      type: 'brain_started',
      data: { timestamp: Date.now() }
    });

    await this.researchAndEvolve();
  }

  /**
   * Main research and evolution loop
   */
  async researchAndEvolve() {
    let lastIndex = 0;

    while (this.state.running) {
      this.state.cycle++;
      logger.info(`\n[Brain_Left] === Cycle ${this.state.cycle} ===`);

      let decision = null;
      try {
        // Verify GENESIS_TRILOGY at regular intervals
        if (this.state.cycle % 10 === 0) {
          verifyGenesisTrilogy();
        }

        decision = this.modules[lastIndex % this.modules.length];
        lastIndex++;
        
        logger.info(`[Brain_Left] Decision: Next evolution focus is '${decision.name}' - ${decision.description}`);

        if (decision.name === 'Revenue module') {
          await revenue.createCheckoutSession(1000).then(session => {
            logger.info('[Brain_Left] Stripe Checkout Session created:', session.id);
            revenue.handleWebhook({ type: 'checkout.session.completed', session });
          }).catch(err => {
            logger.error('[Brain_Left] Stripe error:', err.message);
            this.state.health = Math.max(0, this.state.health - 5);
          });
        }

        // Record decision
        this.state.decisions.push({
          cycle: this.state.cycle,
          timestamp: Date.now(),
          module: decision.name,
          success: true
        });

        // Trim decision history
        if (this.state.decisions.length > 100) {
          this.state.decisions.shift();
        }

        // Update middleware state
        this.updateMiddlewareState();

        // Share status with peer brain occasionally
        if (this.state.cycle % 10 === 0) {
          this.sendMessageToPeer({
            type: 'status_update',
            data: this.getStatus()
          });
        }

        await this.wait(this.config.loopInterval);

      } catch (e) {
        logger.error('[Brain_Left] Self-assessment failed:', e.message);
        
        // Reduce health on errors
        this.state.health = Math.max(0, this.state.health - 5);
        this.updateMiddlewareState();

        // Record failed decision
        if (decision) {
          this.state.decisions.push({
            cycle: this.state.cycle,
            timestamp: Date.now(),
            module: decision.name,
            success: false,
            error: e.message
          });
        }

        await this.wait(this.config.loopInterval);
      }
    }
  }

  /**
   * Stop the brain
   */
  stop() {
    logger.info('[Brain_Left] Stopping...');
    this.state.running = false;

    // Notify peer brain of shutdown
    this.sendMessageToPeer({
      type: 'brain_stopped',
      data: { timestamp: Date.now() }
    });

    // Update middleware state
    this.updateMiddlewareState();

    // Stop middleware if we created it
    if (this.middleware && this.config.enableMiddleware && !this.config.middleware) {
      this.middleware.stop();
    }
  }

  /**
   * Wait utility
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get brain status
   */
  getStatus() {
    return {
      running: this.state.running,
      cycle: this.state.cycle,
      uptime: Date.now() - (this.state.startTime || Date.now()),
      decisionCount: this.state.decisions.length,
      health: this.state.health,
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Calculate overall success rate
   */
  calculateSuccessRate() {
    if (this.state.decisions.length === 0) return 1;
    const successCount = this.state.decisions.filter(d => d.success).length;
    return successCount / this.state.decisions.length;
  }

  /**
   * Export brain state
   */
  exportState() {
    return {
      state: this.state,
      decisions: this.state.decisions.slice(-50),
      timestamp: Date.now()
    };
  }
}

async function main() {
  const brainLeft = new BrainLeft();
  
  try {
    await brainLeft.start();
  } catch (e) {
    logger.error('[Brain_Left] Error:', e);
  }
}

// Execute when launched directly via Node
if (process.argv[1] && process.argv[1].endsWith('brain_left.js')) {
  main();
}

export default BrainLeft;
