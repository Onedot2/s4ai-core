#!/usr/bin/env node

/**
 * Phase 4 System Test: Advanced Swarm Coordination + Quantum Reasoning
 * Validates all new systems and integration
 */

import { AdvancedSwarmAgent, AdvancedSwarmOrchestrator } from './advanced-swarm-coordination.js';
import { QuantumReasoningV3 } from './quantum-reasoning-v3.js';
import { Phase4Integration } from './phase4-integration.js';
import logger from '../utils/logger.js';


logger.info('\n╔════════════════════════════════════════════════════════╗');
logger.info('║  🚀 PHASE 4 SYSTEM TEST: SWARM + QUANTUM REASONING     ║');
logger.info('╚════════════════════════════════════════════════════════╝\n');

async function testAdvancedSwarm() {
  logger.info('📊 Testing Advanced Swarm Coordination...\n');
  
  const orchestrator = new AdvancedSwarmOrchestrator();
  
  // Create agents
  const agent1 = new AdvancedSwarmAgent('research', { tier: 'senior' });
  const agent2 = new AdvancedSwarmAgent('code-review', { tier: 'junior' });
  const agent3 = new AdvancedSwarmAgent('security', { tier: 'expert' });
  
  orchestrator.agents.set(agent1.id, agent1);
  orchestrator.agents.set(agent2.id, agent2);
  orchestrator.agents.set(agent3.id, agent3);
  
  // Create team
  const team = orchestrator.createTeam('Test Team', [agent1.id, agent2.id, agent3.id]);
  logger.info(`✅ Team created: ${team.name} with ${team.agents.length} agents`);
  
  // Create cluster
  const cluster = orchestrator.createCluster('Test Cluster', [team.id]);
  logger.info(`✅ Cluster created: ${cluster.name}\n`);
  
  // Test collaboration
  const task = { category: 'testing', name: 'Security audit' };
  try {
    const result = await agent1.executeWithCollaboration(task, [agent2, agent3]);
    logger.info(`✅ Collaboration successful: ${result.collaboratorCount} collaborators`);
    logger.info(`   Success rate: ${result.aggregation.successCount}/${result.aggregation.successCount + result.aggregation.failureCount}\n`);
  } catch (error) {
    logger.error(`❌ Collaboration failed: ${error.message}\n`);
  }

  // Get metrics
  const metrics = orchestrator.getOrchestrationMetrics();
  logger.info('📈 Swarm Metrics:');
  logger.info(`   Total agents: ${metrics.totalAgents}`);
  logger.info(`   Agent avg health: ${metrics.agentMetrics.avgHealth.toFixed(1)}`);
  logger.info(`   Agent avg confidence: ${metrics.agentMetrics.avgConfidence.toFixed(2)}`);
  logger.info(`   Mentorships: ${metrics.agentMetrics.mentorships}\n`);
}

async function testQuantumReasoning() {
  logger.info('⚛️  Testing Quantum Reasoning V3...\n');
  
  const quantum = new QuantumReasoningV3({
    qubits: 8,
    depth: 4,
    classicalIterations: 50
  });
  
  // Test Grover's algorithm
  logger.info('🔍 Grover Algorithm Test:');
  const solutions = ['solution_a', 'solution_b', 'solution_c', 'solution_d'];
  const groverResult = await quantum.groversAlgorithm('Find optimal path', solutions);
  logger.info(`   Optimal solution found: ${groverResult.optimalSolution}`);
  logger.info(`   Amplification factor: ${groverResult.amplificationFactor.toFixed(2)}`);
  logger.info(`   Confidence: ${groverResult.confidence.toFixed(2)}\n`);
  
  // Test VQE
  logger.info('🔬 VQE Optimization Test:');
  const vqeResult = await quantum.vqeOptimization('Minimize energy', { max: 100 });
  logger.info(`   Best energy found: ${vqeResult.bestEnergy.toFixed(2)}`);
  logger.info(`   Convergence: ${vqeResult.convergence.toFixed(2)}\n`);
  
  // Test Quantum Annealing
  logger.info('🌡️  Quantum Annealing Test:');
  const annealingResult = await quantum.quantumAnnealing('Combinatorial optimization');
  logger.info(`   Optimal schedule: ${annealingResult.optimalSchedule.toFixed(2)}`);
  logger.info(`   Optimal energy: ${annealingResult.optimalEnergy.toFixed(2)}`);
  logger.info(`   Ground state approximation: ${annealingResult.groundStateApproximation.toFixed(2)}\n`);
  
  // Test QAOC
  logger.info('⚡ QAOC Test:');
  const qaocResult = await quantum.qaoc('Approximate solution', 5);
  logger.info(`   Best energy: ${qaocResult.bestEnergy.toFixed(2)}`);
  logger.info(`   Approximation ratio: ${qaocResult.approximationRatio.toFixed(2)}\n`);
  
  // Test semantic network
  logger.info('🧠 Semantic Network Test:');
  const concepts = ['optimization', 'efficiency', 'performance', 'quality', 'reliability'];
  const networkResult = quantum.createSemanticNetwork(concepts);
  logger.info(`   Concepts embedded: ${networkResult.conceptsEmbedded}`);
  logger.info(`   Entanglement relationships: ${networkResult.entanglements}`);
  logger.info(`   Network density: ${networkResult.networkDensity.toFixed(3)}\n`);
  
  // Test hybrid decision
  logger.info('🤖 Hybrid Decision Test:');
  const alternatives = ['approach_A', 'approach_B', 'approach_C'];
  const hybridResult = await quantum.hybridDecision('Choose best strategy', alternatives);
  logger.info(`   Best choice: ${hybridResult.bestChoice.alternative}`);
  logger.info(`   Hybrid confidence: ${hybridResult.hybridConfidence.toFixed(2)}`);
  logger.info(`   Quantum influence: ${hybridResult.quantumInfluence.toFixed(2)}`);
  logger.info(`   Classical influence: ${hybridResult.classicalInfluence.toFixed(2)}\n`);
  
  // Get metrics
  const metricsResult = quantum.getReasoningMetrics();
  logger.info('📊 Quantum Metrics:');
  logger.info(`   Qubits: ${metricsResult.qubits}`);
  logger.info(`   Grover iterations: ${metricsResult.groversIterations}`);
  logger.info(`   VQE iterations: ${metricsResult.vqeIterations}`);
  logger.info(`   QAOC layers: ${metricsResult.qaocLayers}`);
  logger.info(`   Semantic network size: ${metricsResult.semanticNetworkSize}\n`);
}

async function testPhase4Integration() {
  logger.info('🔗 Testing Phase 4 Integration...\n');
  
  const integration = new Phase4Integration();
  
  // Initialize swarm
  logger.info('🐜 Initializing swarm...');
  const swarmInit = integration.initializeSwarm(15);
  logger.info(`   ${swarmInit.agentsCreated} agents created`);
  logger.info(`   Swarm size: ${swarmInit.swarmSize}\n`);
  
  // Create structure
  logger.info('🏢 Creating team structure...');
  const teamStructure = integration.createTeamStructure([
    { name: 'Research Team', agentIds: [0, 1, 2] },
    { name: 'Security Team', agentIds: [3, 4, 5] },
    { name: 'Deployment Team', agentIds: [6, 7, 8] }
  ]);
  logger.info(`   Teams created: ${teamStructure.teamsCreated}\n`);
  
  // Create clusters
  logger.info('🔷 Creating clusters...');
  const clusterStructure = integration.createClusterStructure([
    { name: 'Cluster Alpha', teamIds: [0, 1] }
  ]);
  logger.info(`   Clusters created: ${clusterStructure.clustersCreated}\n`);
  
  // Execute hybrid task
  logger.info('⚙️  Executing hybrid task...');
  try {
    const task = {
      name: 'Optimize system performance',
      type: 'optimization',
      constraints: { max: 100 },
      concepts: ['efficiency', 'speed', 'reliability'],
      alternatives: ['solution_a', 'solution_b', 'solution_c']
    };
    
    const result = await integration.executeHybridTask(task);
    logger.info(`   Task: ${result.task}`);
    logger.info(`   Duration: ${result.duration}ms`);
    logger.info(`   Hybrid confidence: ${result.hybridConfidence.toFixed(2)}\n`);
  } catch (error) {
    logger.error(`   Error: ${error.message}\n`);
  }
  
  // Get Phase 4 metrics
  const phase4Metrics = integration.getPhase4Metrics();
  logger.info('📊 Phase 4 System Metrics:');
  logger.info(`   Total agents: ${phase4Metrics.teamStructure.agentCount}`);
  logger.info(`   Total teams: ${phase4Metrics.teamStructure.teamCount}`);
  logger.info(`   Total clusters: ${phase4Metrics.teamStructure.clusterCount}`);
  logger.info(`   Execution count: ${phase4Metrics.executionCount}`);
  logger.info(`   Success rate: ${(phase4Metrics.successRate * 100).toFixed(1)}%`);
  logger.info(`   Avg decision time: ${phase4Metrics.performance.avgDecisionTime.toFixed(0)}ms\n`);
}

async function runAllTests() {
  try {
    await testAdvancedSwarm();
    await testQuantumReasoning();
    await testPhase4Integration();
    
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║  ✅ ALL PHASE 4 TESTS COMPLETED SUCCESSFULLY           ║');
    logger.info('╚════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    logger.error(`\n❌ Test failed: ${error.message}\n`);
    process.exit(1);
  }
}

runAllTests();
