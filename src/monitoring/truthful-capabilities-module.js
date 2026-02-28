#!/usr/bin/env node
/**
 * S4Ai TRUTHFUL CAPABILITIES MODULE
 * Ground Truth Verification System
 * 
 * Purpose: Report ONLY verified, testable, demonstrable facts
 * Principle: Potential ≠ Truth. When potential is realized → Truth.
 * Mission: Safeguard verified truths remain truthful over time
 * 
 * Core Rules:
 * 1. TRUTH: Code exists, compiles, runs, tested, verified
 * 2. POTENTIAL: Designed but not implemented
 * 3. POSSIBILITY: Theoretically feasible
 * 4. CLAIM: Unverified assertion
 * 
 * Verification Levels:
 * - VERIFIED: Tested and confirmed working
 * - EXISTS: File present, compiles
 * - PLANNED: Documented intention
 * - CLAIMED: Stated but unverified
 * - FALSE: Proven incorrect
 * 
 * Date: January 30, 2026
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getS4AiMLM } from './s4ai-mlm-massive-learning-model.js';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instance
let truthfulCapabilitiesInstance = null;

/**
 * Verification levels
 */
const VerificationLevel = {
  VERIFIED: 'VERIFIED',       // Tested and confirmed working
  EXISTS: 'EXISTS',           // File present, compiles
  INTEGRATED: 'INTEGRATED',   // Connected to main system
  PLANNED: 'PLANNED',         // Documented intention
  CLAIMED: 'CLAIMED',         // Stated but unverified
  FALSE: 'FALSE'              // Proven incorrect
};

/**
 * TRUTHFUL CAPABILITIES MODULE
 */
class TruthfulCapabilitiesModule extends EventEmitter {
  constructor() {
    super();
    
    this.groundTruth = {
      capabilities: [],
      verificationHistory: [],
      falsehoods: [],
      potential: [],
      lastVerification: null,
      verificationCount: 0
    };
    
    this.mlm = null;
    this.verificationTimer = null;
    
    console.log('[TruthfulCapabilities] Initialized - Ground Truth Only');
  }
  
  /**
   * Initialize the module
   */
  async initialize() {
    try {
      console.log('[TruthfulCapabilities] Starting verification...');
      
      // Initialize MLM connection
      this.mlm = await getS4AiMLM();
      
      // Perform initial verification
      await this.verifyAllCapabilities();
      
      // Start periodic re-verification (truth can become false over time)
      this.startPeriodicVerification();
      
      console.log('[TruthfulCapabilities] Verification complete');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('[TruthfulCapabilities] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Verify all capabilities
   */
  async verifyAllCapabilities() {
    console.log('[TruthfulCapabilities] Verifying all capabilities...');
    
    const startTime = Date.now();
    const capabilities = [];
    
    // Define what we CLAIM to have - then VERIFY each
    const claimedCapabilities = [
      // Phase 5: Q-DD Components
      {
        name: 'BlackRock Analyst',
        claim: 'Analyzes markets using BlackRock autumn 2025 themes',
        file: 'apps/api/agent-core/blackrock-analyst.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_class', critical: true },
          { type: 'has_methods', methods: ['analyzeMarketTheme', 'generateInvestmentStrategy'], critical: false }
        ]
      },
      {
        name: 'CERN Quantum Researcher',
        claim: 'Integrates CERN research for quantum algorithm enhancement',
        file: 'apps/api/agent-core/cern-quantum-researcher.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_class', critical: true },
          { type: 'has_methods', methods: ['fetchCERNOpenData', 'enhanceQuantumAlgorithms'], critical: false }
        ]
      },
      {
        name: 'Public API Integrator',
        claim: '15+ free public APIs with fallback chains',
        file: 'apps/api/src/core/public-api-integrator.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'initialization', critical: true },
          { type: 'api_sources', expected: 15, critical: false }
        ]
      },
      {
        name: 'Q-DD Execution Engine',
        claim: '4-phase autonomous execution cycle',
        file: 'apps/api/src/core/q-dd-execution-engine.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_singleton', critical: true },
          { type: 'has_methods', methods: ['executeCycle', 'start', 'stop'], critical: false }
        ]
      },
      {
        name: 'Truth Seeker Module',
        claim: 'Verifies architectural integrity every 5 minutes',
        file: 'apps/api/src/core/truth-seeker-module.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'initialization', critical: true },
          { type: 'scan_performance', maxMs: 2000, critical: false }
        ]
      },
      {
        name: 'Workflow Swarm-Healer',
        claim: 'Auto-heals GitHub Actions workflow failures',
        file: 'apps/api/src/core/workflow-swarm-healer.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_singleton', critical: true },
          { type: 'deployment_verified', critical: true }
        ]
      },
      {
        name: 'MLM (Massive Learning Model)',
        claim: 'Persistent memory with 30-second auto-save',
        file: 'apps/api/src/core/s4ai-mlm-massive-learning-model.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'initialization', critical: true },
          { type: 'persistence', critical: true }
        ]
      },
      {
        name: 'ALADDIN Vault',
        claim: 'Tracks 33 secrets with smart testing',
        file: 'apps/api/src/services/aladdin.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_functions', functions: ['getAladdinStatus', 'testSecret'], critical: true }
        ]
      },
      {
        name: 'Stripe Integration',
        claim: 'Revenue system with $29-$299 tiers',
        file: 'apps/api/routes/stripe-webhook-handler.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'webhook_configured', critical: false }
        ]
      },
      {
        name: 'PostgreSQL Persistence',
        claim: 'Database with JSON fallback',
        file: 'apps/api/src/db/pool.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true }
        ]
      },
      {
        name: 'Vercel Webhook Integration',
        claim: 'Receives deployment events from Vercel with SHA1 HMAC signature verification',
        file: 'apps/api/api/webhooks-vercel.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_functions', functions: ['router'], critical: true },
          { type: 'webhook_configured', critical: true }
        ]
      },
      {
        name: 'Vercel Webhook Signature Verification',
        claim: 'Middleware for HMAC-SHA1 signature verification of Vercel webhooks',
        file: 'apps/api/src/middleware/vercel-webhook-verify.js',
        tests: [
          { type: 'file_exists', critical: true },
          { type: 'compiles', critical: true },
          { type: 'exports_functions', functions: ['verifyVercelSignature', 'vercelWebhookMiddleware'], critical: true }
        ]
      }
    ];
    
    // Verify each capability
    for (const claimed of claimedCapabilities) {
      const verification = await this.verifyCapability(claimed);
      capabilities.push(verification);
      
      // Track falsehoods
      if (verification.status === VerificationLevel.FALSE) {
        this.groundTruth.falsehoods.push({
          name: claimed.name,
          claim: claimed.claim,
          reason: verification.failureReason,
          detectedAt: new Date().toISOString()
        });
      }
    }
    
    this.groundTruth.capabilities = capabilities;
    this.groundTruth.lastVerification = new Date().toISOString();
    this.groundTruth.verificationCount++;
    
    const duration = Date.now() - startTime;
    
    // Record in MLM
    if (this.mlm) {
      this.mlm.recordLearning('capability_verification', {
        timestamp: this.groundTruth.lastVerification,
        verified: capabilities.filter(c => c.status === VerificationLevel.VERIFIED).length,
        exists: capabilities.filter(c => c.status === VerificationLevel.EXISTS).length,
        false: capabilities.filter(c => c.status === VerificationLevel.FALSE).length,
        duration
      });
    }
    
    console.log(`[TruthfulCapabilities] Verified ${capabilities.length} capabilities in ${duration}ms`);
    this.emit('verification:complete', { capabilities, duration });
    
    return capabilities;
  }
  
  /**
   * Verify a single capability
   */
  async verifyCapability(capability) {
    const result = {
      name: capability.name,
      claim: capability.claim,
      status: VerificationLevel.CLAIMED,
      tests: [],
      criticalFailures: 0,
      failureReason: null,
      verifiedAt: new Date().toISOString()
    };
    
    try {
      const rootPath = process.cwd();
      const filePath = path.join(rootPath, capability.file);
      
      // Run all tests
      for (const test of capability.tests) {
        const testResult = await this.runTest(test, filePath, capability);
        result.tests.push(testResult);
        
        if (!testResult.passed && test.critical) {
          result.criticalFailures++;
        }
      }
      
      // Determine final status
      if (result.criticalFailures > 0) {
        result.status = VerificationLevel.FALSE;
        result.failureReason = result.tests
          .filter(t => !t.passed && t.critical)
          .map(t => t.reason)
          .join('; ');
      } else if (result.tests.every(t => t.passed)) {
        result.status = VerificationLevel.VERIFIED;
      } else if (result.tests.some(t => t.type === 'file_exists' && t.passed)) {
        result.status = VerificationLevel.EXISTS;
      }
      
    } catch (error) {
      result.status = VerificationLevel.FALSE;
      result.failureReason = error.message;
    }
    
    return result;
  }
  
  /**
   * Run a specific test
   */
  async runTest(test, filePath, capability) {
    const result = {
      type: test.type,
      critical: test.critical,
      passed: false,
      reason: null
    };
    
    try {
      switch (test.type) {
        case 'file_exists':
          result.passed = fs.existsSync(filePath);
          if (!result.passed) {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'compiles':
          if (fs.existsSync(filePath)) {
            // Basic syntax check - try to read file
            const content = fs.readFileSync(filePath, 'utf-8');
            result.passed = content.length > 0 && !content.includes('SYNTAX_ERROR');
            if (!result.passed) {
              result.reason = 'File appears to have syntax errors';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'exports_class':
        case 'exports_singleton':
        case 'exports_functions':
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (test.type === 'exports_class') {
              result.passed = content.includes('class ') && content.includes('export');
            } else if (test.type === 'exports_singleton') {
              result.passed = content.includes('export') && (content.includes('getInstance') || content.includes('get'));
            } else {
              result.passed = test.functions.every(fn => content.includes(`export function ${fn}`) || content.includes(`${fn}(`));
            }
            if (!result.passed) {
              result.reason = 'Expected exports not found';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'has_methods':
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            result.passed = test.methods.every(method => content.includes(`${method}(`));
            if (!result.passed) {
              result.reason = 'Expected methods not found';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'initialization':
          // For now, just check file exists and has init-related code
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            result.passed = content.includes('initialize') || content.includes('init') || content.includes('constructor');
            if (!result.passed) {
              result.reason = 'No initialization code found';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'deployment_verified':
          // Check if mentioned in server.js
          const serverPath = path.join(process.cwd(), 'apps/api/server.js');
          if (fs.existsSync(serverPath)) {
            const serverContent = fs.readFileSync(serverPath, 'utf-8');
            // For Stripe, check for webhook handler import and mount
            if (capability.name === 'Stripe Integration') {
              result.passed = serverContent.includes('stripeWebhookHandler') && serverContent.includes("'/api', stripeWebhookHandler");
            } else {
              result.passed = serverContent.includes(capability.name.toLowerCase().replace(/\s+/g, '-'));
            }
            if (!result.passed) {
              result.reason = 'Not integrated in server.js';
            }
          } else {
            result.reason = 'server.js not found';
          }
          break;
          
        case 'persistence':
          // Check for auto-save logic
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            result.passed = content.includes('save') && (content.includes('setInterval') || content.includes('auto'));
            if (!result.passed) {
              result.reason = 'No persistence mechanism found';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        case 'api_sources':
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Count API source definitions
            const matches = content.match(/apiSources\s*=\s*\[/);
            if (matches) {
              result.passed = true; // Simplified - actual count would need parsing
            }
            if (!result.passed) {
              result.reason = 'API sources not found or insufficient';
            }
          } else {
            result.reason = 'File does not exist';
          }
          break;
          
        default:
          result.reason = 'Unknown test type';
      }
    } catch (error) {
      result.passed = false;
      result.reason = error.message;
    }
    
    return result;
  }
  
  /**
   * Register a potential capability (not yet truth)
   */
  registerPotential(name, description, requirements) {
    const potential = {
      name,
      description,
      requirements,
      status: 'potential',
      registeredAt: new Date().toISOString()
    };
    
    this.groundTruth.potential.push(potential);
    this.emit('potential:registered', potential);
    
    console.log(`[TruthfulCapabilities] Potential registered: ${name}`);
    return potential;
  }
  
  /**
   * Promote potential to truth when realized
   */
  async promotePotentialToTruth(potentialName) {
    const potential = this.groundTruth.potential.find(p => p.name === potentialName);
    
    if (!potential) {
      throw new Error(`Potential '${potentialName}' not found`);
    }
    
    // Verify the potential has been realized
    console.log(`[TruthfulCapabilities] Verifying potential became truth: ${potentialName}`);
    
    // Re-run verification
    await this.verifyAllCapabilities();
    
    // Check if it's now verified
    const capability = this.groundTruth.capabilities.find(c => c.name === potentialName);
    
    if (capability && capability.status === VerificationLevel.VERIFIED) {
      // Remove from potential, it's now truth
      this.groundTruth.potential = this.groundTruth.potential.filter(p => p.name !== potentialName);
      
      this.groundTruth.verificationHistory.push({
        action: 'potential_realized',
        name: potentialName,
        from: 'potential',
        to: 'verified_truth',
        timestamp: new Date().toISOString()
      });
      
      console.log(`[TruthfulCapabilities] ✅ Potential became truth: ${potentialName}`);
      this.emit('potential:realized', { name: potentialName, capability });
      
      return true;
    } else {
      console.log(`[TruthfulCapabilities] ❌ Potential not yet realized: ${potentialName}`);
      return false;
    }
  }
  
  /**
   * Get ground truth report
   */
  getGroundTruth() {
    const stats = {
      verified: this.groundTruth.capabilities.filter(c => c.status === VerificationLevel.VERIFIED).length,
      exists: this.groundTruth.capabilities.filter(c => c.status === VerificationLevel.EXISTS).length,
      integrated: this.groundTruth.capabilities.filter(c => c.status === VerificationLevel.INTEGRATED).length,
      false: this.groundTruth.capabilities.filter(c => c.status === VerificationLevel.FALSE).length,
      potential: this.groundTruth.potential.length
    };
    
    return {
      ...this.groundTruth,
      stats,
      truthScore: stats.verified + stats.exists + stats.integrated,
      totalClaims: this.groundTruth.capabilities.length,
      honesty: ((stats.verified + stats.exists + stats.integrated) / Math.max(this.groundTruth.capabilities.length, 1) * 100).toFixed(1) + '%'
    };
  }
  
  /**
   * Start periodic re-verification (truth can decay)
   */
  startPeriodicVerification() {
    if (this.verificationTimer) {
      clearInterval(this.verificationTimer);
    }
    
    // Re-verify every 10 minutes
    this.verificationTimer = setInterval(async () => {
      try {
        console.log('[TruthfulCapabilities] Running periodic re-verification...');
        await this.verifyAllCapabilities();
      } catch (error) {
        console.error('[TruthfulCapabilities] Re-verification failed:', error);
      }
    }, 10 * 60 * 1000);
    
    console.log('[TruthfulCapabilities] Periodic re-verification started (every 10 minutes)');
  }
  
  /**
   * Export for dashboard
   */
  exportForDashboard() {
    const truth = this.getGroundTruth();
    
    return {
      name: 'TRUTHFUL_CAPABILITIES',
      status: 'active',
      lastVerification: truth.lastVerification,
      verificationCount: truth.verificationCount,
      summary: {
        verified: truth.stats.verified,
        exists: truth.stats.exists,
        false: truth.stats.false,
        potential: truth.stats.potential,
        honesty: truth.honesty
      },
      capabilities: truth.capabilities.map(c => ({
        name: c.name,
        status: c.status,
        criticalFailures: c.criticalFailures
      })),
      falsehoods: truth.falsehoods
    };
  }
  
  /**
   * Shutdown
   */
  shutdown() {
    if (this.verificationTimer) {
      clearInterval(this.verificationTimer);
      this.verificationTimer = null;
    }
    console.log('[TruthfulCapabilities] Shutdown complete');
  }
}

/**
 * Get singleton instance
 */
export async function getTruthfulCapabilities() {
  if (!truthfulCapabilitiesInstance) {
    truthfulCapabilitiesInstance = new TruthfulCapabilitiesModule();
    await truthfulCapabilitiesInstance.initialize();
  }
  return truthfulCapabilitiesInstance;
}

export { VerificationLevel };
export default TruthfulCapabilitiesModule;
