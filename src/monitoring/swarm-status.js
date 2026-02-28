// src/core/swarm-status.js
// S4Ai Swarm Status Reporter - Professional Console
// Aggregates and displays health/state of all brains and modules

import CoreLoader from './core-loader.js';
import logger from '../utils/logger.js';


function color(val, colorCode) {
  return `\x1b[${colorCode}m${val}\x1b[0m`;
}

function healthColor(health) {
  if (health >= 80) return color(health, '32'); // green
  if (health >= 50) return color(health, '33'); // yellow
  return color(health, '31'); // red
}

function pad(str, len) {
  return (str + ' '.repeat(len)).slice(0, len);
}

function divider() {
  return '-'.repeat(80);
}

function nowISO() {
  return new Date().toISOString();
}

async function reportSwarmStatus() {
  const loader = new CoreLoader();
  const middleware = loader.middleware;
  const sharedState = middleware.getSharedState();

  // 24-hour summary section
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  let leftDecisions = (sharedState.leftBrain.decisions || []).filter(d => d.timestamp > oneDayAgo);
  let rightDecisions = (sharedState.rightBrain.decisions || []).filter(d => d.timestamp > oneDayAgo);
  let leftErrors = leftDecisions.filter(d => d.success === false);
  let rightErrors = rightDecisions.filter(d => d.success === false);

  logger.info('\n24-HOUR SUMMARY'.padEnd(60));
  logger.info(divider());
  logger.info(`Brain-Left:  Decisions: ${leftDecisions.length}  Errors: ${leftErrors.length}`);
  logger.info(`Brain-Right: Decisions: ${rightDecisions.length}  Errors: ${rightErrors.length}`);
  // Swarm modules summary (if any)
  const modules = sharedState.unified.swarmModules || {};
  Object.entries(modules).forEach(([name, state]) => {
    if (state.decisions) {
      const modDecisions = state.decisions.filter(d => d.timestamp > oneDayAgo);
      const modErrors = modDecisions.filter(d => d.success === false);
      logger.info(`${pad(name, 12)} Decisions: ${modDecisions.length}  Errors: ${modErrors.length}`);
    }
  });
  logger.info('For full logs: ./logs/ or ./logs/documentation-agent.log');
  logger.info(divider());

  // Header
  logger.info('\n' + divider());
  logger.info('S4Ai SYSTEM STATUS REPORT'.padEnd(60) + 'Timestamp: ' + nowISO());
  logger.info(divider());


  // Prime Directive
  if (loader.genesisProtocol) {
    const match = loader.genesisProtocol.match(/prime directive[^\n]*\n> ([^\n]+)/i);
    if (match && match[1]) {
      logger.info('PRIME DIRECTIVE: ' + color(match[1], '36'));
      logger.info(divider());
    }
  }

  // Brains
  logger.info('BRAINS'.padEnd(20) + 'Status   Cycle   Health   Decisions');
  ['leftBrain', 'rightBrain'].forEach(brain => {
    const state = sharedState[brain];
    const label = pad(brain === 'leftBrain' ? 'Brain-Left' : 'Brain-Right', 20);
    const status = pad(state.status, 8);
    const cycle = pad(state.cycle, 6);
    const health = pad(healthColor(state.health), 8);
    const decisions = pad(state.decisions.length, 9);
    logger.info(`${label}${status}${cycle}${health}${decisions}`);
  });
  logger.info(divider());

  // Swarm modules
  const swarmModules = sharedState.unified.swarmModules || {};
  if (Object.keys(swarmModules).length > 0) {
    logger.info('MODULES'.padEnd(20) + 'Health   Key Stats');
    Object.entries(swarmModules).forEach(([name, state]) => {
      let health = state.health !== undefined ? healthColor(state.health) : color('N/A', '90');
      let stats = [];
      if (state.genesisProtocol) stats.push('Genesis-Hard-Cor');
      if (state.ambitionScore !== undefined) stats.push('Ambition: ' + state.ambitionScore);
      if (state.completedQuests !== undefined) stats.push('Quests: ' + state.completedQuests.length);
      if (state.insights !== undefined) stats.push('Insights: ' + state.insights.length);
      if (state.research !== undefined) stats.push('Research: ' + (state.research.length || 0));
      if (state.decisionCount !== undefined) stats.push('Decisions: ' + state.decisionCount);
      logger.info(`${pad(name, 20)}${pad(health, 8)}${stats.join('  ')}`);
    });
    logger.info(divider());
  }

  // Swarm status summary
  const totalNodes = 2 + Object.keys(modules).length;
  const healthyNodes =
    (['leftBrain', 'rightBrain'].filter(b => sharedState[b].health >= 80).length +
      Object.values(modules).filter(m => m.health >= 80).length);
  const warningNodes =
    (['leftBrain', 'rightBrain'].filter(b => sharedState[b].health < 80 && sharedState[b].health >= 50).length +
      Object.values(modules).filter(m => m.health < 80 && m.health >= 50).length);
  const criticalNodes = totalNodes - healthyNodes - warningNodes;
  logger.info(
    `Swarm Status: ${healthyNodes} healthy, ${warningNodes} warning, ${criticalNodes} critical  |  Total Nodes: ${totalNodes}`
  );
  logger.info(divider());
  logger.info('End of S4Ai System Status Report\n');
}

if (require.main === module) {
  reportSwarmStatus();
}

export default reportSwarmStatus;
