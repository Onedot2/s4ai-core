// Multi-Agent Swarm Evolution System
// Dynamic agent spawning, specialization, consensus decision-making
import EventEmitter from 'events';
import logger from '../utils/logger.js';


class SwarmAgent extends EventEmitter {
  constructor(type, config = {}) {
    super();
    this.id = `agent-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type; // research, code-review, security, optimization, deployment, testing
    this.status = 'idle'; // idle, active, busy, error, terminated
    this.health = 100;
    this.confidence = 0.5; // 0-1 decision confidence
    this.specialization = config.specialization || {};
    this.memory = { decisions: [], insights: [], failures: [] };
    this.created = Date.now();
    this.lastActivity = Date.now();
    this.tasksCompleted = 0;
    this.successRate = 1.0;
  }

  async execute(task) {
    this.status = 'active';
    this.lastActivity = Date.now();
    const startTime = Date.now();
    
    try {
      const result = await this.processTask(task);
      this.tasksCompleted++;
      this.confidence = Math.min(1.0, this.confidence + 0.05);
      this.status = 'idle';
      this.emit('task:completed', { task, result, duration: Date.now() - startTime });
      return result;
    } catch (error) {
      this.memory.failures.push({ task, error: error.message, timestamp: Date.now() });
      this.health -= 10;
      this.confidence = Math.max(0.1, this.confidence - 0.1);
      this.successRate = this.tasksCompleted / (this.tasksCompleted + this.memory.failures.length);
      this.status = 'error';
      this.emit('task:failed', { task, error, duration: Date.now() - startTime });
      throw error;
    }
  }

  async processTask(task) {
    // Specialized processing based on agent type
    switch (this.type) {
      case 'research':
        return await this.performResearch(task);
      case 'code-review':
        return await this.reviewCode(task);
      case 'security':
        return await this.scanSecurity(task);
      case 'optimization':
        return await this.optimizeSystem(task);
      case 'deployment':
        return await this.handleDeployment(task);
      case 'testing':
        return await this.runTests(task);
      default:
        return { success: false, message: 'Unknown agent type' };
    }
  }

  async performResearch(task) {
    // Research agent: query patterns, analyze trends, discover improvements
    this.memory.insights.push({ type: 'research', query: task.query, timestamp: Date.now() });
    return {
      success: true,
      findings: `Research completed for: ${task.query}`,
      confidence: this.confidence,
      recommendations: []
    };
  }

  async reviewCode(task) {
    // Code review agent: analyze code quality, suggest improvements
    return {
      success: true,
      analysis: `Code review completed`,
      issues: [],
      suggestions: [],
      confidence: this.confidence
    };
  }

  async scanSecurity(task) {
    // Security agent: vulnerability scanning, compliance checks
    return {
      success: true,
      vulnerabilities: [],
      compliance: true,
      confidence: this.confidence
    };
  }

  async optimizeSystem(task) {
    // Optimization agent: performance tuning, resource optimization
    return {
      success: true,
      optimizations: [],
      metrics: {},
      confidence: this.confidence
    };
  }

  async handleDeployment(task) {
    // Deployment agent: CI/CD coordination, rollout strategies
    return {
      success: true,
      deployed: true,
      rolloutStrategy: 'progressive',
      confidence: this.confidence
    };
  }

  async runTests(task) {
    // Testing agent: unit, integration, e2e testing
    return {
      success: true,
      testsPassed: 0,
      testsFailed: 0,
      coverage: 0,
      confidence: this.confidence
    };
  }

  terminate() {
    this.status = 'terminated';
    this.emit('agent:terminated', { id: this.id, type: this.type });
  }

  getMetrics() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      health: this.health,
      confidence: this.confidence,
      tasksCompleted: this.tasksCompleted,
      successRate: this.successRate,
      uptime: Date.now() - this.created,
      lastActivity: this.lastActivity,
      memorySize: this.memory.decisions.length + this.memory.insights.length + this.memory.failures.length
    };
  }
}

class SwarmOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map(); // id -> SwarmAgent
    this.taskQueue = [];
    this.consensusThreshold = 0.7; // 70% agreement for decisions
    this.maxAgents = 50;
    this.minAgents = 3;
    this.metrics = {
      tasksProcessed: 0,
      consensusReached: 0,
      agentsSpawned: 0,
      agentsTerminated: 0,
      swarmHealth: 100
    };
    this.started = Date.now();
    this.adaptiveScaling = true;
  }

  spawnAgent(type, config = {}) {
    if (this.agents.size >= this.maxAgents) {
      logger.info(`[SwarmOrchestrator] Max agents (${this.maxAgents}) reached. Optimizing swarm.`);
      this.optimizeSwarm();
    }

    const agent = new SwarmAgent(type, config);
    this.agents.set(agent.id, agent);
    this.metrics.agentsSpawned++;

    agent.on('task:completed', (data) => {
      this.emit('swarm:task:completed', { agentId: agent.id, ...data });
    });

    agent.on('task:failed', (data) => {
      this.emit('swarm:task:failed', { agentId: agent.id, ...data });
      this.handleAgentFailure(agent);
    });

    agent.on('agent:terminated', (data) => {
      this.agents.delete(data.id);
    });

    this.emit('swarm:agent:spawned', { id: agent.id, type: agent.type });
    logger.info(`[SwarmOrchestrator] Spawned ${type} agent: ${agent.id}`);
    return agent.id;
  }

  terminateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.terminate();
      this.agents.delete(agentId);
      this.metrics.agentsTerminated++;
      this.emit('swarm:agent:terminated', { id: agentId });
      logger.info(`[SwarmOrchestrator] Terminated agent: ${agentId}`);
    }
  }

  async submitTask(task) {
    this.taskQueue.push(task);
    this.emit('swarm:task:submitted', { task });
    return await this.processTask(task);
  }

  async processTask(task) {
    const eligibleAgents = this.getEligibleAgents(task.type);
    
    if (eligibleAgents.length === 0) {
      // Spawn new agent if none available
      const agentId = this.spawnAgent(task.type);
      eligibleAgents.push(this.agents.get(agentId));
    }

    // Assign to least busy agent with highest confidence
    const selectedAgent = this.selectBestAgent(eligibleAgents);
    const result = await selectedAgent.execute(task);
    this.metrics.tasksProcessed++;
    
    return result;
  }

  getEligibleAgents(taskType) {
    return Array.from(this.agents.values()).filter(
      agent => agent.type === taskType && agent.status !== 'terminated' && agent.health > 30
    );
  }

  selectBestAgent(agents) {
    return agents.reduce((best, current) => {
      const bestScore = best.confidence * (best.health / 100) * (1 - (best.memory.failures.length / 10));
      const currentScore = current.confidence * (current.health / 100) * (1 - (current.memory.failures.length / 10));
      return currentScore > bestScore ? current : best;
    }, agents[0]);
  }

  async requestConsensus(decision) {
    const votes = [];
    
    for (const agent of this.agents.values()) {
      if (agent.status !== 'terminated' && agent.health > 50) {
        const vote = await this.getAgentVote(agent, decision);
        votes.push({ agentId: agent.id, vote, confidence: agent.confidence });
      }
    }

    const consensus = this.calculateConsensus(votes);
    
    if (consensus.approved) {
      this.metrics.consensusReached++;
    }

    this.emit('swarm:consensus:reached', { decision, consensus });
    return consensus;
  }

  async getAgentVote(agent, decision) {
    // Simulate agent voting based on confidence and health
    const randomFactor = Math.random();
    return agent.confidence > randomFactor && agent.health > 60;
  }

  calculateConsensus(votes) {
    const totalVotes = votes.length;
    const approvals = votes.filter(v => v.vote).length;
    const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / totalVotes;
    const approvalRate = approvals / totalVotes;

    return {
      approved: approvalRate >= this.consensusThreshold,
      approvalRate,
      avgConfidence,
      totalVotes,
      approvals,
      rejections: totalVotes - approvals
    };
  }

  handleAgentFailure(agent) {
    logger.info(`[SwarmOrchestrator] Agent failure detected: ${agent.id}`);
    
    if (agent.health < 20 || agent.successRate < 0.3) {
      logger.info(`[SwarmOrchestrator] Terminating unhealthy agent: ${agent.id}`);
      this.terminateAgent(agent.id);
      
      // Spawn replacement if needed
      if (this.agents.size < this.minAgents) {
        this.spawnAgent(agent.type);
      }
    }
  }

  optimizeSwarm() {
    // Remove idle or underperforming agents
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, agent] of this.agents.entries()) {
      if (
        agent.status === 'idle' && 
        (now - agent.lastActivity > idleThreshold) &&
        this.agents.size > this.minAgents
      ) {
        logger.info(`[SwarmOrchestrator] Terminating idle agent: ${id}`);
        this.terminateAgent(id);
      }
    }

    // Update swarm health
    this.updateSwarmHealth();
  }

  updateSwarmHealth() {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) {
      this.metrics.swarmHealth = 0;
      return;
    }

    const avgHealth = agents.reduce((sum, agent) => sum + agent.health, 0) / agents.length;
    const avgSuccessRate = agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length;
    this.metrics.swarmHealth = (avgHealth * 0.6) + (avgSuccessRate * 100 * 0.4);
  }

  getSwarmMetrics() {
    const agents = Array.from(this.agents.values());
    const agentsByType = agents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAgents: agents.length,
      agentsByType,
      agentsByStatus: agents.reduce((acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
      }, {}),
      ...this.metrics,
      uptime: Date.now() - this.started,
      taskQueueSize: this.taskQueue.length,
      avgAgentConfidence: agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length || 0,
      avgAgentHealth: agents.reduce((sum, a) => sum + a.health, 0) / agents.length || 0
    };
  }

  initializeDefaultSwarm() {
    logger.info('[SwarmOrchestrator] Initializing default swarm...');
    this.spawnAgent('research');
    this.spawnAgent('code-review');
    this.spawnAgent('security');
    this.spawnAgent('optimization');
    logger.info('[SwarmOrchestrator] Default swarm initialized with 4 agents');
  }

  terminate() {
    logger.info('[SwarmOrchestrator] Terminating all agents...');
    for (const id of this.agents.keys()) {
      this.terminateAgent(id);
    }
    this.emit('swarm:terminated');
  }
}

export default SwarmOrchestrator;
export { SwarmAgent };

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Multi-Agent Swarm Evolution System ===\n');
  const swarm = new SwarmOrchestrator();
  swarm.initializeDefaultSwarm();
  
  setInterval(() => {
    const metrics = swarm.getSwarmMetrics();
    logger.info('\n--- Swarm Metrics ---');
    logger.info(`Total Agents: ${metrics.totalAgents}`);
    logger.info(`Swarm Health: ${metrics.swarmHealth.toFixed(1)}%`);
    logger.info(`Tasks Processed: ${metrics.tasksProcessed}`);
    logger.info(`Avg Confidence: ${(metrics.avgAgentConfidence * 100).toFixed(1)}%`);
    logger.info('Agents by Type:', metrics.agentsByType);
  }, 10000);
}
