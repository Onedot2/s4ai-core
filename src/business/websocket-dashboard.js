/**
 * WebSocket Real-Time Dashboard
 * Provides live updates to connected clients
 * Streams metrics, system state, and autonomous decisions
 */

import { Server } from 'socket.io';
import logger from '../utils/logger.js';


export class WebSocketDashboard {
  constructor(server, brain = null) {
    this.io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    this.brain = brain;
    this.connectedClients = 0;
    this.metrics = {
      uptime: 0,
      autonomousDecisions: 0,
      selfOptimizations: 0,
      systemHealth: 100
    };

    this.setupHandlers();
    logger.info('[WebSocket] Dashboard initialized');
  }

  /**
   * Setup socket.io event handlers
   */
  setupHandlers() {
    this.io.on('connection', (socket) => {
      this.connectedClients++;
      logger.info(`[WebSocket] Client connected (${this.connectedClients} total)`);

      // Send initial state
      socket.emit('system:state', {
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });

      // Subscribe to real-time updates
      socket.on('subscribe:metrics', () => {
        this.subscribeMetrics(socket);
      });

      socket.on('subscribe:ambition', () => {
        this.subscribeAmbition(socket);
      });

      socket.on('subscribe:curiosity', () => {
        this.subscribeCuriosity(socket);
      });

      socket.on('subscribe:meta-reasoning', () => {
        this.subscribeMetaReasoning(socket);
      });

      socket.on('disconnect', () => {
        this.connectedClients--;
        logger.info(`[WebSocket] Client disconnected (${this.connectedClients} remaining)`);
      });
    });
  }

  /**
   * Subscribe to metrics updates
   */
  subscribeMetrics(socket) {
    const interval = setInterval(() => {
      socket.emit('metrics:update', {
        uptime: this.metrics.uptime,
        autonomousDecisions: this.metrics.autonomousDecisions,
        selfOptimizations: this.metrics.selfOptimizations,
        systemHealth: this.metrics.systemHealth,
        timestamp: new Date().toISOString()
      });

      this.metrics.uptime += 1; // Increment every emission
    }, 1000);

    socket.on('disconnect', () => clearInterval(interval));
  }

  /**
   * Subscribe to ambition engine updates
   */
  subscribeAmbition(socket) {
    const interval = setInterval(() => {
      if (this.brain) {
        const state = this.brain.getSharedState();
        socket.emit('ambition:update', {
          goals: state.leftBrain?.goals || [],
          health: state.leftBrain?.health || 0,
          timestamp: new Date().toISOString()
        });
      }
    }, 2000);

    socket.on('disconnect', () => clearInterval(interval));
  }

  /**
   * Subscribe to curiosity engine updates
   */
  subscribeCuriosity(socket) {
    const interval = setInterval(() => {
      if (this.brain) {
        const state = this.brain.getSharedState();
        socket.emit('curiosity:update', {
          quests: state.rightBrain?.decisions || [],
          completedCount: (state.rightBrain?.decisions || []).length,
          timestamp: new Date().toISOString()
        });
      }
    }, 2000);

    socket.on('disconnect', () => clearInterval(interval));
  }

  /**
   * Subscribe to meta-reasoning updates
   */
  subscribeMetaReasoning(socket) {
    const interval = setInterval(() => {
      if (this.brain) {
        const knowledge = this.brain.getSharedKnowledge('meta') || {};
        socket.emit('meta-reasoning:update', {
          insights: knowledge,
          timestamp: new Date().toISOString()
        });
      }
    }, 3000);

    socket.on('disconnect', () => clearInterval(interval));
  }

  /**
   * Broadcast metric update to all clients
   */
  broadcastMetrics(metrics) {
    this.metrics = { ...this.metrics, ...metrics };
    this.io.emit('metrics:broadcast', {
      ...this.metrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast autonomous decision to all clients
   */
  broadcastDecision(decisionType, decisionData) {
    this.metrics.autonomousDecisions++;
    this.io.emit('decision:broadcast', {
      type: decisionType,
      data: decisionData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system health update
   */
  broadcastHealth(health) {
    this.metrics.systemHealth = health;
    this.io.emit('health:update', {
      health,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get client count
   */
  getClientCount() {
    return this.connectedClients;
  }
}

export default WebSocketDashboard;
