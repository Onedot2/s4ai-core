/**
 * @s4ai/core - S4Ai Core Systems Package
 * 
 * Central repository for intelligence, autonomy, monitoring, business, and infrastructure
 * modules used across all S4Ai services.
 * 
 * Principle: "All for one & One for All"
 * 
 * @module @s4ai/core
 * @version 0.1.0
 * @author Bradley Levitan <bradleylevitan@gmail.com>
 */

// Export all categories
export * from './autonomous/index.js';
export * from './intelligence/index.js';
export * from './monitoring/index.js';
export * from './business/index.js';
export * from './infrastructure/index.js';

// Re-export commonly used modules for convenience
export { default as MLM } from './intelligence/s4ai-mlm-massive-learning-model.js';
export { default as TruthSeeker } from './monitoring/truth-seeker-module.js';
export { default as BrainMiddleware } from './autonomous/brain-middleware.js';
export { default as RevenueOptimization } from './business/revenue-optimization-engine.js';
export { default as RailwayDeployer } from './infrastructure/railway-deployer.js';

/**
 * Package Information
 */
export const PACKAGE_INFO = {
  name: '@s4ai/core',
  version: '0.1.0',
  author: 'Bradley Levitan',
  email: 'bradleylevitan@gmail.com',
  principle: 'All for one & One for All',
  categories: {
    autonomous: 'Brain systems, Q-DD, autonomous loops, self-evolution',
    intelligence: 'MLM, quantum reasoning, learning, NLP',
    monitoring: 'Truth Seeker, health, errors, testing',
    business: 'Revenue, analytics, acquisition, CLV',
    infrastructure: 'Railway, Cloudflare, database, utilities'
  },
  moduleCount: {
    autonomous: 31,
    intelligence: 20,
    monitoring: 14,
    business: 16,
    infrastructure: 19,
    total: 100
  }
};
