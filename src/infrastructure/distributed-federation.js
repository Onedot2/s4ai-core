// Distributed Brain Federation
// Multi-S4Ai coordination, distributed consensus, global knowledge sharing
import EventEmitter from 'events';
import logger from '../utils/logger.js';


class FederatedBrain extends EventEmitter {
  constructor(brainId, config = {}) {
    super();
    this.id = brainId;
    this.nodeType = config.nodeType || 'peer'; // 'leader', 'peer', 'observer'
    this.peers = new Map(); // id -> peer info
    this.federationStatus = 'initializing';
    this.sharedKnowledge = {};
    this.localKnowledge = config.localKnowledge || {};
    this.consensusThreshold = config.consensusThreshold || 0.7;
    this.lastHeartbeat = Date.now();
    this.messageQueue = [];
    this.protocol = 's4ai-federation-v1';
  }

  async joinFederation(peers) {
    logger.info(`[FederatedBrain ${this.id}] Joining federation with ${peers.length} peers...`);
    
    for (const peer of peers) {
      this.peers.set(peer.id, {
        id: peer.id,
        nodeType: peer.nodeType,
        lastSeen: Date.now(),
        knowledgeSync: false,
        trustScore: 1.0
      });
    }

    this.federationStatus = 'joined';
    this.emit('federation:joined', { brain: this.id, peerCount: this.peers.size });

    // Start heartbeat
    this.startHeartbeat();
  }

  async shareKnowledge(key, value) {
    logger.info(`[FederatedBrain ${this.id}] Sharing knowledge: ${key}`);
    
    this.localKnowledge[key] = {
      value,
      timestamp: Date.now(),
      source: this.id,
      version: 1
    };

    // Broadcast to federation
    await this.broadcastMessage({
      type: 'knowledge:share',
      payload: {
        key,
        value,
        version: 1,
        source: this.id
      }
    });

    this.emit('knowledge:shared', { key, source: this.id });
  }

  async receiveKnowledge(message) {
    const { key, value, version, source } = message.payload;

    // Version conflict resolution
    if (this.sharedKnowledge[key]) {
      const existing = this.sharedKnowledge[key];
      if (version > existing.version) {
        // Newer version, update
        this.sharedKnowledge[key] = { value, version, source, timestamp: Date.now() };
        this.emit('knowledge:updated', { key, source });
      }
    } else {
      // New knowledge
      this.sharedKnowledge[key] = { value, version, source, timestamp: Date.now() };
      this.emit('knowledge:received', { key, source });
    }

    // Update trust score for reliable peers
    const peer = this.peers.get(source);
    if (peer) {
      peer.trustScore = Math.min(1.0, peer.trustScore + 0.05);
      peer.lastSeen = Date.now();
    }
  }

  async broadcastMessage(message) {
    message.from = this.id;
    message.timestamp = Date.now();
    message.protocol = this.protocol;

    for (const [peerId, peer] of this.peers.entries()) {
      try {
        // Simulate network transmission
        await this.sendMessage(peerId, message);
      } catch (error) {
        logger.error(`[FederatedBrain ${this.id}] Failed to send to ${peerId}:`, error.message);
        peer.trustScore = Math.max(0.1, peer.trustScore - 0.1);
      }
    }
  }

  async sendMessage(peerId, message) {
    // Simulate async message transmission
    return new Promise(resolve => {
      setTimeout(() => {
        this.messageQueue.push({ to: peerId, message });
        resolve();
      }, Math.random() * 100);
    });
  }

  async requestDistributedDecision(proposal) {
    logger.info(`[FederatedBrain ${this.id}] Requesting distributed decision: ${proposal.title}`);
    
    const votes = [];

    // Request votes from federation
    await this.broadcastMessage({
      type: 'decision:request',
      payload: proposal
    });

    // Simulate gathering votes
    for (const peerId of this.peers.keys()) {
      const vote = await this.simulateVote(proposal);
      votes.push({ voter: peerId, ...vote });
    }

    const decision = this.aggregateVotes(votes);
    this.emit('decision:made', { proposal: proposal.title, decision });

    return decision;
  }

  async simulateVote(proposal) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          vote: Math.random() > 0.3,
          confidence: Math.random() * 0.5 + 0.5
        });
      }, Math.random() * 200);
    });
  }

  aggregateVotes(votes) {
    const approvals = votes.filter(v => v.vote).length;
    const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;
    const approved = approvals / votes.length >= this.consensusThreshold;

    return {
      approved,
      approvalRate: (approvals / votes.length * 100).toFixed(1) + '%',
      avgConfidence: (avgConfidence * 100).toFixed(1) + '%',
      totalVotes: votes.length,
      approvals
    };
  }

  async syncKnowledge() {
    logger.info(`[FederatedBrain ${this.id}] Syncing knowledge with federation...`);
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (!peer.knowledgeSync || Date.now() - this.lastHeartbeat > 30000) {
        await this.broadcastMessage({
          type: 'knowledge:sync',
          payload: {
            knowledge: this.localKnowledge,
            version: 1
          }
        });

        peer.knowledgeSync = true;
        peer.lastSeen = Date.now();
      }
    }

    this.emit('knowledge:synced');
  }

  startHeartbeat(interval = 30000) {
    setInterval(() => {
      this.lastHeartbeat = Date.now();

      // Check peer health
      for (const [peerId, peer] of this.peers.entries()) {
        const timeSinceLastSeen = Date.now() - peer.lastSeen;
        
        if (timeSinceLastSeen > interval * 2) {
          // Peer offline
          peer.trustScore = Math.max(0, peer.trustScore - 0.2);
        }
      }

      // Send heartbeat
      this.broadcastMessage({
        type: 'heartbeat',
        payload: {
          health: 100,
          timestamp: Date.now()
        }
      });
    }, interval);
  }

  async electNewLeader() {
    logger.info(`[FederatedBrain ${this.id}] Initiating leader election...`);
    
    const candidates = Array.from(this.peers.values())
      .filter(p => p.nodeType !== 'observer')
      .sort((a, b) => b.trustScore - a.trustScore);

    const newLeader = candidates[0] || this;

    await this.broadcastMessage({
      type: 'leader:elected',
      payload: {
        leaderId: newLeader.id,
        term: Date.now()
      }
    });

    this.nodeType = newLeader.id === this.id ? 'leader' : 'peer';
    this.emit('leader:elected', { leaderId: newLeader.id });

    return newLeader;
  }

  getFederationMetrics() {
    const healthyPeers = Array.from(this.peers.values())
      .filter(p => Date.now() - p.lastSeen < 60000).length;

    return {
      federationId: `fed-${this.id}`,
      totalPeers: this.peers.size,
      healthyPeers,
      myNodeType: this.nodeType,
      federationStatus: this.federationStatus,
      sharedKnowledgeSize: Object.keys(this.sharedKnowledge).length,
      localKnowledgeSize: Object.keys(this.localKnowledge).length,
      avgTrustScore: Array.from(this.peers.values())
        .reduce((sum, p) => sum + p.trustScore, 0) / Math.max(1, this.peers.size),
      messageQueue: this.messageQueue.length
    };
  }

  async mergeFederations(otherFederation) {
    logger.info(`[FederatedBrain ${this.id}] Merging with federation led by ${otherFederation.id}...`);
    
    // Merge peer lists
    for (const [peerId, peerInfo] of otherFederation.peers.entries()) {
      if (!this.peers.has(peerId)) {
        this.peers.set(peerId, peerInfo);
      }
    }

    // Merge knowledge
    for (const [key, value] of Object.entries(otherFederation.sharedKnowledge)) {
      if (!this.sharedKnowledge[key]) {
        this.sharedKnowledge[key] = value;
      }
    }

    this.emit('federation:merged', {
      peerCount: this.peers.size,
      knowledgeSize: Object.keys(this.sharedKnowledge).length
    });
  }

  async terminate() {
    logger.info(`[FederatedBrain ${this.id}] Terminating federation node...`);
    
    await this.broadcastMessage({
      type: 'node:leaving',
      payload: { brain: this.id }
    });

    this.federationStatus = 'terminated';
    this.emit('node:terminated');
  }
}

class BrainFederation extends EventEmitter {
  constructor() {
    super();
    this.brains = new Map();
    this.globalConsensusThreshold = 0.7;
    this.federationTopology = 'mesh'; // mesh | star | hybrid
  }

  addBrain(brainId, nodeType = 'peer') {
    const brain = new FederatedBrain(brainId, { nodeType });
    this.brains.set(brainId, brain);
    this.emit('brain:added', { brainId, nodeType });
    logger.info(`[BrainFederation] Added brain ${brainId} (${nodeType})`);
    return brain;
  }

  async initializeFederation() {
    logger.info('[BrainFederation] Initializing federation mesh...');
    
    const brainArray = Array.from(this.brains.values());

    // Each brain connects to all others (mesh topology)
    for (const brain of brainArray) {
      const peers = brainArray.filter(b => b.id !== brain.id);
      await brain.joinFederation(peers);
    }

    this.emit('federation:initialized', { totalBrains: this.brains.size });
  }

  async requestGlobalDecision(proposal) {
    logger.info(`[BrainFederation] Making global decision: ${proposal.title}`);
    
    const decisions = [];

    for (const brain of this.brains.values()) {
      const decision = await brain.requestDistributedDecision(proposal);
      decisions.push({ brain: brain.id, ...decision });
    }

    const aggregated = this.aggregateGlobalVotes(decisions);
    this.emit('global:decision:made', aggregated);

    return aggregated;
  }

  aggregateGlobalVotes(decisions) {
    const approvals = decisions.filter(d => d.approved).length;
    const totalDecisions = decisions.length;

    return {
      decision: approvals / totalDecisions >= this.globalConsensusThreshold ? 'approved' : 'rejected',
      approvalRate: (approvals / totalDecisions * 100).toFixed(1) + '%',
      brainConsensus: decisions.map(d => ({ brain: d.brain, approved: d.approved })),
      timestamp: Date.now()
    };
  }

  async shareGlobalKnowledge(key, value) {
    logger.info(`[BrainFederation] Broadcasting global knowledge: ${key}`);
    
    for (const brain of this.brains.values()) {
      await brain.shareKnowledge(key, value);
    }

    this.emit('global:knowledge:shared', { key });
  }

  getFederationReport() {
    const metrics = Array.from(this.brains.values()).map(b => b.getFederationMetrics());

    return {
      totalBrains: this.brains.size,
      topology: this.federationTopology,
      totalHealthyNodes: metrics.reduce((sum, m) => sum + m.healthyPeers, 0),
      averageTrustScore: metrics.reduce((sum, m) => sum + m.avgTrustScore, 0) / metrics.length,
      totalSharedKnowledge: metrics.reduce((sum, m) => sum + m.sharedKnowledgeSize, 0),
      networkLoad: metrics.reduce((sum, m) => sum + m.messageQueue, 0),
      brainMetrics: metrics
    };
  }
}

export default BrainFederation;
export { FederatedBrain };

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Distributed Brain Federation ===\n');
  
  const federation = new BrainFederation();

  // Create multi-instance federation
  federation.addBrain('brain-us-east', 'leader');
  federation.addBrain('brain-eu-west', 'peer');
  federation.addBrain('brain-asia-pacific', 'peer');

  (async () => {
    await federation.initializeFederation();

    // Share knowledge globally
    await federation.shareGlobalKnowledge('system-optimization', {
      approach: 'distributed-consensus',
      efficiency: 0.95
    });

    // Make global decision
    const decision = await federation.requestGlobalDecision({
      title: 'Should we expand to new region?',
      priority: 'high'
    });

    logger.info('\n--- Federation Report ---');
    const report = federation.getFederationReport();
    logger.info(`Total Brains: ${report.totalBrains}`);
    logger.info(`Healthy Nodes: ${report.totalHealthyNodes}`);
    logger.info(`Avg Trust Score: ${(report.averageTrustScore * 100).toFixed(1)}%`);
    logger.info(`Global Decision: ${decision.decision.toUpperCase()} (${decision.approvalRate})`);
  })();
}
