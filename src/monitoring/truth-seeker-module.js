#!/usr/bin/env node
/**
 * S4Ai TRUTH_SEEKER_MODULE
 * The Architectural Source of Truth
 * 
 * Purpose: Centralized system verification and architectural integrity
 * Integrates with: ALADDIN, File System, Routes, Endpoints, URLs, Hosts
 * 
 * Features:
 * - Route Discovery: Scan all API routes and endpoints
 * - File Mapping: Index all .js files and entry points
 * - URL Verification: Validate all hosts and deployment URLs
 * - ALADDIN Integration: Cross-reference secrets with actual usage
 * - Drift Detection: Compare expected vs actual configurations
 * - Self-Healing: Auto-correction recommendations
 * - Truth Database: Canonical source of all architectural facts
 * - MLM Integration: Persistent memory of system architecture
 * 
 * Date: January 30, 2026
 * Phase: 5+ (Post-Q-DD Enhancement)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAladdinStatus, testSecret } from '../services/aladdin.js';
import { getS4AiMLM } from '../intelligence/s4ai-mlm-massive-learning-model.js';
import { getFileTreeOfTruth } from './file-tree-of-truth.js';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instance
let truthSeekerInstance = null;

/**
 * TRUTH_SEEKER_MODULE - Architectural Source of Truth
 */
class TruthSeekerModule extends EventEmitter {
  constructor() {
    super();

    this.config = {
      rootPath: process.cwd(),
      scanPaths: {
        routes: 'routes',
        api: 'api',
        core: 'src/core',
        services: 'src/services',
        agentCore: 'agent-core',
        scripts: 'scripts',
        db: 'db'
      },
      ecosystem: {
        services: [
          {
            name: 'pwai-api-service',
            description: 'Central API Gateway & Truth Seeker (This Repository)',
            role: 'Source of Truth',
            repository: 'https://github.com/Onedot2/pwai-api-service',
            status: 'active',
            components: ['API Gateway', 'Truth Seeker', 'Autonomous Brain', 'S42Owner', 'Quantum Geometry']
          },
          {
            name: 'pwai-ai-worker',
            description: 'AI Task Execution & Model Operations',
            role: 'Task Processor',
            repository: 'https://github.com/Onedot2/pwai-ai-worker',
            status: 'planned',
            components: ['Model Inference', 'Task Execution', 'Result Processing']
          },
          {
            name: 'ai-worker-queue',
            description: 'Task Queue Management & Distribution',
            role: 'Queue Coordinator',
            repository: 'https://github.com/Onedot2/ai-worker-queue',
            status: 'planned',
            components: ['BullMQ Manager', 'Redis Coordination', 'Job Scheduling']
          },
          {
            name: 'pwai-controller',
            description: 'Workflow Orchestration & Deployment Coordination',
            role: 'Workflow Manager',
            repository: 'https://github.com/Onedot2/pwai-controller',
            status: 'planned',
            components: ['Workflow Engine', 'Deployment Manager', 'Service Health']
          },
          {
            name: 'pwai-frontend',
            description: 'User Interface & Admin Dashboards',
            role: 'Presentation Layer',
            repository: 'https://github.com/Onedot2/pwai-frontend',
            status: 'planned',
            components: ['User Dashboard', 'Admin Panel', 'S4AEye Monitoring', 'S4Admin']
          }
        ]
      },
      urls: {
        production: {
          api: 'https://api.getbrains4ai.com',
          admin: 'https://admin.getbrains4ai.com',
          marketing: 'https://www.getbrains4ai.com',
          s4aeye: 'https://s4aeye.vercel.app',
          s4admin: 'https://s4-admin.vercel.app'
        },
        local: {
          api: 'http://localhost:3000',
          admin: 'http://localhost:3000/admin',
          marketing: 'http://localhost:3000'
        }
      },
      scanInterval: 5 * 60 * 1000, // 5 minutes
      autoCorrect: true
    };

    this.truth = {
      routes: [],
      endpoints: [],
      files: {
        routes: [],
        api: [],
        core: [],
        services: [],
        agentCore: [],
        scripts: [],
        db: []
      },
      secrets: {
        total: 0,
        present: 0,
        missing: 0,
        tested: 0,
        valid: 0,
        invalid: 0,
        details: {}
      },
      urls: {
        verified: [],
        unverified: [],
        broken: []
      },
      integrations: [],
      ecosystem: [],
      drift: [],
      lastScan: null,
      scanCount: 0
    };

    this.stats = {
      totalScans: 0,
      totalRoutes: 0,
      totalFiles: 0,
      totalSecrets: 0,
      totalDrifts: 0,
      totalCorrections: 0,
      lastScanDuration: 0
    };

    this.mlm = null;
    this.ftot = null;
    this.scanTimer = null;
    this.isScanning = false;

    console.log('[TruthSeeker] Initialized - Architectural Source of Truth');
  }

  /**
   * Initialize the Truth Seeker
   */
  async initialize() {
    try {
      console.log('[TruthSeeker] Starting initialization...');

      // Initialize MLM connection
      this.mlm = await getS4AiMLM();

      // Perform initial comprehensive scan
      await this.performComprehensiveScan();

      // Start periodic scanning
      this.startPeriodicScanning();

      console.log('[TruthSeeker] Initialization complete');
      this.emit('initialized', { truth: this.truth });

      return true;
    } catch (error) {
      console.error('[TruthSeeker] Initialization failed:', error);
      this.emit('error', { phase: 'initialization', error });
      throw error;
    }
  }

  /**
   * Perform comprehensive system scan
   */
  async performComprehensiveScan() {
    if (this.isScanning) {
      console.log('[TruthSeeker] Scan already in progress, skipping...');
      return this.truth;
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      console.log('[TruthSeeker] Starting comprehensive scan...');

      // Phase 1: File System Discovery
      await this.discoverFiles();

      // Phase 2: Route Discovery
      await this.discoverRoutes();

      // Phase 3: ALADDIN Integration (disabled - in development, not production-ready)
      // ALADDIN is a shared secrets keeper still under development
      // Truth-Seeker health monitoring should NOT depend on ALADDIN
      // await this.integrateWithAladdin();

      // Fallback: Basic secrets tracking without ALADDIN
      this.truth.secrets = {
        total: 33,
        present: Object.keys(process.env).length,
        missing: 0,
        tested: 0,
        valid: 0,
        invalid: 0,
        details: {},
        required: [],
        missingKeys: [],
        presentKeys: Object.keys(process.env)
      };
      console.log('[TruthSeeker] ⚠️ ALADDIN integration disabled - using basic env tracking');

      // Phase 4: URL Verification
      await this.verifyUrls();

      // Phase 5: Integration Mapping
      await this.mapIntegrations();

      // Phase 5.5: Ecosystem Status
      await this.mapEcosystem();

      // Phase 6: Drift Detection
      await this.detectDrift();

      // Phase 7: Record in MLM
      await this.recordTruthInMLM();

      // Update stats
      this.truth.lastScan = new Date().toISOString();
      this.truth.scanCount++;
      this.stats.totalScans++;
      this.stats.lastScanDuration = Date.now() - startTime;

      console.log(`[TruthSeeker] Scan complete in ${this.stats.lastScanDuration}ms`);
      this.emit('scan:complete', { truth: this.truth, duration: this.stats.lastScanDuration });

      return this.truth;
    } catch (error) {
      console.error('[TruthSeeker] Scan failed:', error);
      this.emit('scan:failed', { error });
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Phase 1: Discover all JavaScript files
   */
  async discoverFiles() {
    console.log('[TruthSeeker] Discovering files...');

    const scanPath = (category, relativePath) => {
      const fullPath = path.join(this.config.rootPath, relativePath);
      const files = [];

      if (!fs.existsSync(fullPath)) {
        console.warn(`[TruthSeeker] Path not found: ${relativePath}`);
        return files;
      }

      const scan = (dir) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              // Skip node_modules and other irrelevant directories
              if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                scan(entryPath);
              }
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
              const relPath = path.relative(this.config.rootPath, entryPath);
              files.push({
                name: entry.name,
                path: relPath,
                fullPath: entryPath,
                size: fs.statSync(entryPath).size,
                category
              });
            }
          }
        } catch (error) {
          console.warn(`[TruthSeeker] Error scanning ${dir}:`, error.message);
        }
      };

      scan(fullPath);
      return files;
    };

    // Scan each category
    this.truth.files.routes = scanPath('routes', this.config.scanPaths.routes);
    this.truth.files.api = scanPath('api', this.config.scanPaths.api);
    this.truth.files.core = scanPath('core', this.config.scanPaths.core);
    this.truth.files.services = scanPath('services', this.config.scanPaths.services);
    this.truth.files.agentCore = scanPath('agentCore', this.config.scanPaths.agentCore);
    this.truth.files.scripts = scanPath('scripts', this.config.scanPaths.scripts);
    this.truth.files.db = scanPath('db', this.config.scanPaths.db);

    const totalFiles = Object.values(this.truth.files).reduce((sum, arr) => sum + arr.length, 0);
    this.stats.totalFiles = totalFiles;

    console.log(`[TruthSeeker] Discovered ${totalFiles} JavaScript files`);
    this.emit('discovery:files', { count: totalFiles, files: this.truth.files });
  }

  /**
   * Phase 2: Discover all routes and endpoints
   */
  async discoverRoutes() {
    console.log('[TruthSeeker] Discovering routes...');

    const routes = [];
    const endpoints = [];

    // Parse route files
    const routeFiles = [...this.truth.files.routes, ...this.truth.files.api];

    for (const file of routeFiles) {
      try {
        const content = fs.readFileSync(file.fullPath, 'utf-8');

        // Extract route definitions
        // Matches: router.get('/path', ...), router.post('/path', ...), app.use('/prefix', ...)
        const routeRegex = /(router|app)\.(get|post|put|delete|patch|use)\(['"`]([^'"`]+)['"`]/g;
        let match;

        while ((match = routeRegex.exec(content)) !== null) {
          const [, target, method, routePath] = match;

          const routeInfo = {
            file: file.path,
            target, // router or app
            method: method.toUpperCase(),
            path: routePath,
            fullPath: this.buildFullPath(file.path, routePath)
          };

          if (target === 'app' && method === 'use') {
            routes.push(routeInfo);
          } else {
            endpoints.push(routeInfo);
          }
        }
      } catch (error) {
        console.warn(`[TruthSeeker] Error parsing ${file.path}:`, error.message);
      }
    }

    this.truth.routes = routes;
    this.truth.endpoints = endpoints;
    this.stats.totalRoutes = routes.length + endpoints.length;

    console.log(`[TruthSeeker] Discovered ${routes.length} routes, ${endpoints.length} endpoints`);
    this.emit('discovery:routes', { routes: routes.length, endpoints: endpoints.length });
  }

  /**
   * Build full API path from file and route path
   */
  buildFullPath(filePath, routePath) {
    // Extract base path from file location
    if (filePath.includes('routes/stripe')) return '/api' + routePath;
    if (filePath.includes('routes/')) return '/api' + routePath;
    if (filePath.includes('api/aladdin')) return '/api/aladdin' + (routePath === '/' ? '' : routePath);
    if (filePath.includes('api/')) return routePath;
    return routePath;
  }

  /**
   * Phase 3: Integrate with ALADDIN Vault
   */
  async integrateWithAladdin() {
    console.log('[TruthSeeker] Integrating with ALADDIN...');

    try {
      const aladdinStatus = getAladdinStatus();

      this.truth.secrets = {
        total: aladdinStatus.requiredCount,
        present: aladdinStatus.presentCount,
        missing: aladdinStatus.missingCount,
        tested: 0,
        valid: 0,
        invalid: 0,
        details: {},
        required: aladdinStatus.required,
        missingKeys: aladdinStatus.missing,
        presentKeys: aladdinStatus.present
      };

      // Test critical secrets
      const criticalSecrets = [
        'DATABASE_URL',
        'STRIPE_LIVE_KEY',
        'RAILWAY_API_TOKEN',
        'GITHUB_TOKEN',
        'TAVILY_API_KEY'
      ];

      for (const key of criticalSecrets) {
        if (aladdinStatus.present.includes(key)) {
          const value = process.env[key];
          try {
            const testResult = await testSecret(key, value);
            this.truth.secrets.tested++;

            if (testResult.valid === true) {
              this.truth.secrets.valid++;
            } else if (testResult.valid === false) {
              this.truth.secrets.invalid++;
            }

            this.truth.secrets.details[key] = testResult;
          } catch (error) {
            this.truth.secrets.details[key] = {
              valid: null,
              reason: `Test error: ${error.message}`
            };
          }
        }
      }

      this.stats.totalSecrets = this.truth.secrets.total;

      console.log(`[TruthSeeker] ALADDIN integration complete: ${this.truth.secrets.present}/${this.truth.secrets.total} secrets present`);
      this.emit('aladdin:integrated', { secrets: this.truth.secrets });
    } catch (error) {
      console.error('[TruthSeeker] ALADDIN integration failed:', error);
      this.emit('aladdin:failed', { error });
    }
  }

  /**
   * Phase 4: Verify all URLs and hosts
   */
  async verifyUrls() {
    console.log('[TruthSeeker] Verifying URLs...');

    const urlsToVerify = [
      ...Object.entries(this.config.urls.production),
      ...Object.entries(this.config.urls.local)
    ];

    for (const [name, url] of urlsToVerify) {
      try {
        // Skip localhost verification (not accessible in production)
        if (url.includes('localhost')) {
          this.truth.urls.unverified.push({ name, url, reason: 'Localhost not verified in production' });
          continue;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url + '/health', {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
          this.truth.urls.verified.push({ name, url, status: response.status });
        } else {
          this.truth.urls.broken.push({ name, url, status: response.status });
        }
      } catch (error) {
        this.truth.urls.broken.push({ name, url, error: error.message });
      }
    }

    console.log(`[TruthSeeker] URL verification complete: ${this.truth.urls.verified.length} verified, ${this.truth.urls.broken.length} broken`);
    this.emit('urls:verified', { verified: this.truth.urls.verified.length, broken: this.truth.urls.broken.length });
  }

  /**
   * Phase 5: Map all system integrations
   */
  async mapIntegrations() {
    console.log('[TruthSeeker] Mapping integrations...');

    const integrations = [
      { name: 'PostgreSQL', secret: 'DATABASE_URL', status: 'active' },
      { name: 'Stripe', secret: 'STRIPE_LIVE_KEY', status: 'active' },
      { name: 'Railway', secret: 'RAILWAY_API_TOKEN', status: 'active' },
      { name: 'Vercel', secret: 'VERCEL_TOKEN', status: 'active' },
      { name: 'GitHub', secret: 'GITHUB_TOKEN', status: 'active' },
      { name: 'Tavily', secret: 'TAVILY_API_KEY', status: 'active' },
      { name: 'OpenAI', secret: 'OPEN_AI_KEY', status: 'active' },
      { name: 'Resend', secret: 'RESEND_API_KEY', status: 'active' },
      { name: 'Cloudflare', secret: 'CLOUDFLARE_API_TOKEN', status: 'active' },
      { name: 'ALADDIN', type: 'internal', status: 'active' },
      { name: 'MLM', type: 'internal', status: 'active' },
      { name: 'Q-DD Engine', type: 'internal', status: 'active' },
      { name: 'Workflow Healer', type: 'internal', status: 'active' },
      { name: 'BlackRock Analyst', type: 'internal', status: 'active' },
      { name: 'CERN Researcher', type: 'internal', status: 'active' }
    ];

    for (const integration of integrations) {
      const hasSecret = integration.secret ? this.truth.secrets.presentKeys?.includes(integration.secret) : true;
      integration.configured = hasSecret;
      this.truth.integrations.push(integration);
    }

    console.log(`[TruthSeeker] Mapped ${integrations.length} integrations`);
    this.emit('integrations:mapped', { count: integrations.length });
  }

  /**
   * Phase 5.5: Map PWAI Ecosystem Services
   */
  async mapEcosystem() {
    console.log('[TruthSeeker] Mapping ecosystem services...');

    this.truth.ecosystem = this.config.ecosystem.services.map(service => ({
      ...service,
      scannedAt: new Date().toISOString()
    }));

    console.log(`[TruthSeeker] Mapped ${this.truth.ecosystem.length} ecosystem services`);
    this.emit('ecosystem:mapped', { count: this.truth.ecosystem.length, services: this.truth.ecosystem });
  }

  /**
   * Phase 6: Detect architectural drift
   */
  async detectDrift() {
    console.log('[TruthSeeker] Detecting drift...');

    const drifts = [];

    // Check for missing critical files (excluding self to avoid circular dependency)
    const criticalFiles = [
      'server.js',
      'src/core/s4ai-mlm-massive-learning-model.js',
      'src/core/q-dd-orchestrator-integration.js',
      'src/core/workflow-swarm-healer.js',
      'src/services/aladdin.js',
      'routes/s42owner-routes.js',
      'README.md',
      'ARCHITECTURE.md'
    ];

    for (const expectedFile of criticalFiles) {
      const fullPath = path.join(this.config.rootPath, expectedFile);
      if (!fs.existsSync(fullPath)) {
        drifts.push({
          type: 'missing_file',
          severity: 'critical',
          item: expectedFile,
          recommendation: 'Restore missing file from backup or repository'
        });
      }
    }

    // Check for missing secrets
    if (this.truth.secrets.missingKeys?.length > 0) {
      for (const key of this.truth.secrets.missingKeys) {
        drifts.push({
          type: 'missing_secret',
          severity: 'high',
          item: key,
          recommendation: `Set ${key} in environment variables`
        });
      }
    }

    // Check for broken URLs
    if (this.truth.urls.broken.length > 0) {
      for (const url of this.truth.urls.broken) {
        drifts.push({
          type: 'broken_url',
          severity: 'medium',
          item: url.url,
          recommendation: 'Verify deployment and DNS configuration'
        });
      }
    }

    this.truth.drift = drifts;
    this.stats.totalDrifts = drifts.length;

    console.log(`[TruthSeeker] Detected ${drifts.length} drift issues`);
    this.emit('drift:detected', { count: drifts.length, drifts });

    // Auto-correct if enabled
    if (this.config.autoCorrect && drifts.length > 0) {
      await this.attemptAutoCorrection(drifts);
    }
  }

  /**
   * Attempt auto-correction of detected drift
   */
  async attemptAutoCorrection(drifts) {
    console.log('[TruthSeeker] Attempting auto-correction...');

    let corrected = 0;

    for (const drift of drifts) {
      try {
        // For now, just log recommendations
        // Future: Implement actual auto-correction logic
        console.log(`[TruthSeeker] Recommendation for ${drift.item}: ${drift.recommendation}`);

        // Record in MLM for future analysis
        if (this.mlm) {
          this.mlm.recordLearning('drift_detection', {
            type: drift.type,
            item: drift.item,
            severity: drift.severity,
            recommendation: drift.recommendation
          });
        }
      } catch (error) {
        console.error('[TruthSeeker] Auto-correction failed for', drift.item, error);
      }
    }

    this.stats.totalCorrections += corrected;
    this.emit('correction:complete', { corrected });
  }

  /**
   * Phase 7: Record truth in MLM for persistence
   */
  async recordTruthInMLM() {
    if (!this.mlm) return;

    try {
      this.mlm.recordLearning('architectural_truth', {
        scanTime: this.truth.lastScan,
        scanCount: this.truth.scanCount,
        files: {
          total: this.stats.totalFiles,
          byCategory: Object.fromEntries(
            Object.entries(this.truth.files).map(([cat, files]) => [cat, files.length])
          )
        },
        routes: {
          total: this.stats.totalRoutes,
          routes: this.truth.routes.length,
          endpoints: this.truth.endpoints.length
        },
        secrets: {
          total: this.truth.secrets.total,
          present: this.truth.secrets.present,
          missing: this.truth.secrets.missing
        },
        integrations: this.truth.integrations.length,
        drift: this.truth.drift.length,
        urls: {
          verified: this.truth.urls.verified.length,
          broken: this.truth.urls.broken.length
        }
      });

      console.log('[TruthSeeker] Truth recorded in MLM');
    } catch (error) {
      console.error('[TruthSeeker] Failed to record in MLM:', error);
    }
  }

  /**
   * Start periodic scanning
   */
  startPeriodicScanning() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }

    this.scanTimer = setInterval(async () => {
      try {
        await this.performComprehensiveScan();
      } catch (error) {
        console.error('[TruthSeeker] Periodic scan failed:', error);
      }
    }, this.config.scanInterval);

    console.log(`[TruthSeeker] Periodic scanning started (every ${this.config.scanInterval / 1000}s)`);
  }

  /**
   * Stop periodic scanning
   */
  stopPeriodicScanning() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
      console.log('[TruthSeeker] Periodic scanning stopped');
    }
  }

  /**
   * Get current architectural truth
   */
  getTruth() {
    return {
      ...this.truth,
      stats: this.stats,
      config: {
        scanInterval: this.config.scanInterval,
        autoCorrect: this.config.autoCorrect
      }
    };
  }

  /**
   * Export for dashboard
   */
  exportForDashboard() {
    return {
      name: 'TRUTH_SEEKER',
      status: this.isScanning ? 'scanning' : 'active',
      lastScan: this.truth.lastScan,
      scanCount: this.truth.scanCount,
      summary: {
        files: this.stats.totalFiles,
        routes: this.stats.totalRoutes,
        secrets: `${this.truth.secrets.present}/${this.truth.secrets.total}`,
        integrations: this.truth.integrations.length,
        ecosystem: this.truth.ecosystem.length,
        drift: this.stats.totalDrifts,
        urls: {
          verified: this.truth.urls.verified.length,
          broken: this.truth.urls.broken.length
        }
      },
      health: {
        secretsHealth: (this.truth.secrets.present / this.truth.secrets.total * 100).toFixed(1) + '%',
        urlsHealth: this.truth.urls.broken.length === 0 ? '100%' : ((this.truth.urls.verified.length / (this.truth.urls.verified.length + this.truth.urls.broken.length)) * 100).toFixed(1) + '%',
        driftSeverity: this.truth.drift.some(d => d.severity === 'critical') ? 'critical' :
          this.truth.drift.some(d => d.severity === 'high') ? 'high' :
            this.truth.drift.length > 0 ? 'medium' : 'healthy'
      },
      stats: this.stats
    };
  }

  /**
   * Self-check: Verify Truth Seeker's own integrity
   */
  async performSelfCheck() {
    console.log('[TruthSeeker] Performing self-check...');

    const checks = {
      moduleIntegrity: false,
      mlmConnection: false,
      aladdinConnection: false,
      scanCapability: false,
      configValid: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Check 1: Module Integrity
      const selfPath = path.join(this.config.rootPath, 'src/core/truth-seeker-module.js');
      if (fs.existsSync(selfPath)) {
        const stats = fs.statSync(selfPath);
        checks.moduleIntegrity = stats.size > 0;
      }

      // Check 2: MLM Connection
      checks.mlmConnection = this.mlm !== null;

      // Check 3: ALADDIN Connection
      try {
        const aladdinStatus = getAladdinStatus();
        checks.aladdinConnection = aladdinStatus !== null;
      } catch {
        checks.aladdinConnection = false;
      }

      // Check 4: Scan Capability
      checks.scanCapability = !this.isScanning && this.truth.scanCount >= 0;

      // Check 5: Config Validity
      checks.configValid = this.config.rootPath !== null &&
        this.config.scanPaths !== null &&
        this.config.urls !== null;

      const allPassed = Object.values(checks).every(v => v === true || typeof v === 'string');

      console.log(`[TruthSeeker] Self-check ${allPassed ? 'PASSED' : 'FAILED'}:`, checks);
      this.emit('selfcheck:complete', { passed: allPassed, checks });

      return { passed: allPassed, checks };
    } catch (error) {
      console.error('[TruthSeeker] Self-check failed:', error);
      this.emit('selfcheck:failed', { error });
      return { passed: false, error: error.message, checks };
    }
  }

  /**
   * FToT Enhancement: Integrate File-Tree-of-Truth for multi-repo awareness
   */
  async enhanceWithFToT() {
    try {
      console.log('[TruthSeeker] Enhancing with FToT multi-repository awareness...');

      // Initialize FToT if not already done
      if (!this.ftot) {
        this.ftot = await getFileTreeOfTruth();
      }

      // Scan all configured repositories
      const scanResult = await this.ftot.scanAllRepos();

      if (scanResult.success) {
        // Store FToT data in truth
        this.truth.ftot = {
          repositories: scanResult.repositories,
          lastScan: scanResult.timestamp,
          duration: scanResult.duration
        };

        // Record in MLM
        if (this.mlm) {
          await this.mlm.storeFToTData(scanResult);
        }

        console.log(`[TruthSeeker] FToT enhancement complete: scanned ${scanResult.repositories.length} repositories`);
        this.emit('ftot:enhanced', scanResult);

        return { success: true, ...scanResult };
      } else {
        console.error('[TruthSeeker] FToT enhancement failed:', scanResult.error);
        return { success: false, error: scanResult.error };
      }
    } catch (error) {
      console.error('[TruthSeeker] FToT enhancement error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * FToT Enhancement: Instant recall with sub-100ms response
   * @param {string} query - File/function/pattern to search for
   */
  async instantRecall(query) {
    try {
      if (!this.ftot) {
        this.ftot = await getFileTreeOfTruth();
      }

      const startTime = Date.now();

      // Check if query is for a specific repository
      const repoMatch = query.match(/^([\w-]+\/[\w-]+):(.+)$/);

      let result;
      if (repoMatch) {
        // Specific repository query
        const [, repo, path] = repoMatch;
        result = await this.ftot.getFileTree(repo, path);
      } else {
        // Cross-repository search
        result = await this.ftot.searchAcrossRepos(query);
      }

      const duration = Date.now() - startTime;

      console.log(`[TruthSeeker] Instant recall completed in ${duration}ms`);
      this.emit('recall:complete', { query, duration, cached: result.metadata?.cached });

      return {
        success: true,
        query,
        result,
        duration,
        subHundredMs: duration < 100
      };
    } catch (error) {
      console.error('[TruthSeeker] Instant recall failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * FToT Enhancement: Self-enhancement loop - learns from each scan
   */
  async selfEnhance() {
    try {
      console.log('[TruthSeeker] Starting self-enhancement cycle...');

      // Analyze current architectural state
      const currentTruth = this.getTruth();

      // Detect patterns in file organization
      const patterns = [];

      if (this.truth.ftot?.repositories) {
        for (const repo of this.truth.ftot.repositories) {
          if (repo.success && repo.tree) {
            // Detect common patterns
            const hasTests = repo.tree.some(f => f.path.includes('test') || f.path.includes('spec'));
            const hasDocs = repo.tree.some(f => f.path.toLowerCase().includes('readme'));
            const hasCI = repo.tree.some(f => f.path.includes('.github/workflows'));

            patterns.push({
              repository: repo.repository.full_name,
              hasTests,
              hasDocs,
              hasCI,
              fileCount: repo.tree.length
            });
          }
        }
      }

      // Learn from patterns
      if (this.mlm && patterns.length > 0) {
        this.mlm.recordLearning('architectural_patterns', {
          patterns,
          timestamp: new Date().toISOString(),
          scanCount: this.truth.scanCount
        });
      }

      console.log('[TruthSeeker] Self-enhancement complete - learned from', patterns.length, 'repositories');
      this.emit('enhance:complete', { patterns });

      return {
        success: true,
        patternsLearned: patterns.length,
        patterns
      };
    } catch (error) {
      console.error('[TruthSeeker] Self-enhancement failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * FToT Enhancement: Detect cross-repository drift
   */
  async detectCrossRepoDrift() {
    try {
      console.log('[TruthSeeker] Detecting cross-repository drift...');

      if (!this.ftot) {
        this.ftot = await getFileTreeOfTruth();
      }

      const driftResult = await this.ftot.detectDrift();

      if (driftResult.success) {
        // Add to existing drift tracking
        this.truth.drift = [
          ...this.truth.drift,
          ...driftResult.drifts.map(d => ({
            ...d,
            category: 'cross-repo',
            detectedAt: new Date().toISOString()
          }))
        ];

        console.log(`[TruthSeeker] Cross-repo drift detection complete: found ${driftResult.drifts.length} issues`);
        this.emit('drift:cross-repo', driftResult);

        return driftResult;
      } else {
        return { success: false, error: driftResult.error };
      }
    } catch (error) {
      console.error('[TruthSeeker] Cross-repo drift detection failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Shutdown
   */
  async shutdown() {
    console.log('[TruthSeeker] Shutting down...');
    this.stopPeriodicScanning();
    this.emit('shutdown');
  }
}

/**
 * Get Truth Seeker singleton instance
 */
export async function getTruthSeeker(options = {}) {
  if (!truthSeekerInstance) {
    truthSeekerInstance = new TruthSeekerModule();

    // Apply config overrides
    if (options.scanInterval) {
      truthSeekerInstance.config.scanInterval = options.scanInterval;
    }
    if (options.autoCorrect !== undefined) {
      truthSeekerInstance.config.autoCorrect = options.autoCorrect;
    }

    await truthSeekerInstance.initialize();
  }
  return truthSeekerInstance;
}

export default TruthSeekerModule;
