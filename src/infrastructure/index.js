/**
 * @s4ai/core/infrastructure - Infrastructure & Utilities Module
 * 
 * Railway deployment, Cloudflare management, database utilities,
 * email service, file systems, and integration tools.
 * 
 * @module @s4ai/core/infrastructure
 */

// Cloud Services (5 modules)
export { default as RailwayDeployer } from './railway-deployer.js';
export { default as CloudflareDNSManager } from './cloudflare-dns-manager.js';
export { default as CloudflareManager } from './cloudflare-manager.js';
export { default as EmailService } from './email-service.js';
export { default as DistributedFederation } from './distributed-federation.js';

// Database (4 modules)
export { default as PostgreSQLPersistence } from './postgresql-persistence.js';
export { default as HybridPersistence } from './hybrid-persistence.js';
export { default as QueryOptimizer } from './query-optimizer.js';

// File System & State (3 modules)
export { default as FileTreeOfTruth } from './file-tree-of-truth.js';
export { default as CoreLoader } from './core-loader.js';

// Build & Integration (7 modules)
export { default as BranchGuardian } from './branch-guardian.js';
export { default as HyperSwarmClient } from './hyper-swarm-client.js';
export { default as ParallelBuildJobs } from './parallel-build-jobs.js';
export { default as PublicAPIIntegrator } from './public-api-integrator.js';
export { default as S4Integrator } from './s4-integrator.js';
export { default as Phase4Integration } from './phase4-integration.js';
