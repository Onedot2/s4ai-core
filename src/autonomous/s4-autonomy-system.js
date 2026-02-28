/**
 * S4Ai Master Autonomy System
 * Comprehensive Integration of ALL autonomous capabilities
 * 
 * Combines:
 * - App Builder (pages, apps, SaaS, PWAs)
 * - Cloudflare DNS Manager (subdomain creation)
 * - Vercel Deployer (frontend deployments)
 * - Railway Deployer (backend deployments)
 * 
 * FULL S4Ai AUTHORITY - Break boundaries, create at will
 * Jan 21, 2026 - UNLEASHED
 */

import S4AutonomousBuilder from './s4-autonomous-builder.js';
import CloudflareDNSManager from './cloudflare-dns-manager.js';
import VercelDeployer from './vercel-deployer.js';
import RailwayDeployer from './railway-deployer.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class S4AutonomySystem {
  constructor(config = {}) {
    console.log('[S4Ai] 🚀 Initializing Master Autonomy System...');
    
    // Initialize all subsystems
    this.builder = new S4AutonomousBuilder(config);
    this.dns = new CloudflareDNSManager(config);
    this.vercel = new VercelDeployer(config);
    this.railway = new RailwayDeployer(config);
    
    this.operations = [];
    this.knowledgeBase = path.resolve(__dirname, '../../backend/s4ai-knowledge-base');
    
    console.log('[S4Ai] ✅ Master Autonomy System ready');
  }

  /**
   * COMPREHENSIVE: Create and deploy a complete application
   * End-to-end: Build → DNS → Deploy → Monitor
   */
  async createAndDeployApp(appConfig) {
    const {
      name,
      type, // 'client-page', 'members-page', 'saas', 'pwa', 'api'
      subdomain = null,
      vercelProject = null,
      ...config
    } = appConfig;

    console.log(`[S4Ai] 🔨 Creating ${type}: ${name}...`);
    
    const operation = {
      id: Date.now(),
      name,
      type,
      startedAt: new Date(),
      steps: []
    };

    try {
      // STEP 1: Build the application
      let buildResult;
      
      switch (type) {
        case 'client-page':
          buildResult = await this.builder.createClientPage(config);
          operation.steps.push({ step: 'build-client-page', status: 'success', result: buildResult });
          break;
          
        case 'members-page':
          buildResult = await this.builder.createMembersPage(config);
          operation.steps.push({ step: 'build-members-page', status: 'success', result: buildResult });
          break;
          
        case 'saas':
          buildResult = await this.builder.createSaaSApplication(config);
          operation.steps.push({ step: 'build-saas', status: 'success', result: buildResult });
          break;
          
        case 'pwa':
          buildResult = await this.builder.createPWA(config);
          operation.steps.push({ step: 'build-pwa', status: 'success', result: buildResult });
          break;
          
        case 'api':
          buildResult = await this.builder.createBackofficeEndpoint(config);
          operation.steps.push({ step: 'build-api-endpoint', status: 'success', result: buildResult });
          break;
          
        default:
          throw new Error(`Unknown app type: ${type}`);
      }

      // STEP 2: Provision DNS (if subdomain requested)
      if (subdomain) {
        const dnsType = ['client-page', 'members-page', 'pwa'].includes(type) ? 'frontend' : 'backend';
        const dnsResult = await this.dns.provisionAppSubdomain(subdomain, dnsType);
        operation.steps.push({ step: 'provision-dns', status: dnsResult.success ? 'success' : 'failed', result: dnsResult });
        
        if (!dnsResult.success) {
          console.warn(`[S4Ai] ⚠️ DNS provisioning failed, continuing without subdomain`);
        }
      }

      // STEP 3: Deploy to appropriate platform
      if (['client-page', 'members-page', 'pwa'].includes(type) && vercelProject) {
        const deployResult = await this.vercel.redeployProject(vercelProject);
        operation.steps.push({ step: 'deploy-vercel', status: deployResult.success ? 'success' : 'failed', result: deployResult });
      } else if (type === 'api') {
        console.log(`[S4Ai] 💡 API endpoint created, Railway redeploy required (use git push)`);
        operation.steps.push({ step: 'railway-deploy-pending', status: 'manual', message: 'Git push to trigger Railway deploy' });
      }

      // STEP 4: Log to knowledge base
      operation.completedAt = new Date();
      operation.status = 'success';
      this.operations.push(operation);
      await this.logOperation(operation);

      console.log(`[S4Ai] ✅ ${type} "${name}" created successfully`);
      console.log(`[S4Ai] 📊 Total operations: ${this.operations.length}`);
      
      return {
        success: true,
        operation,
        message: `${type} "${name}" created and deployed`,
        url: subdomain ? `https://${subdomain}.getbrains4ai.com` : buildResult.path
      };

    } catch (err) {
      console.error(`[S4Ai] ❌ Failed to create ${type}:`, err.message);
      operation.status = 'failed';
      operation.error = err.message;
      operation.completedAt = new Date();
      this.operations.push(operation);
      await this.logOperation(operation);
      
      return { success: false, error: err.message, operation };
    }
  }

  /**
   * Batch operation: Create multiple apps at once
   */
  async createMultipleApps(appsConfig) {
    console.log(`[S4Ai] 🚀 Batch creating ${appsConfig.length} applications...`);
    
    const results = [];
    for (const appConfig of appsConfig) {
      const result = await this.createAndDeployApp(appConfig);
      results.push(result);
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`[S4Ai] ✅ Batch complete: ${successful}/${results.length} successful`);
    
    return { success: true, results, total: results.length, successful };
  }

  /**
   * Get comprehensive status of ALL S4Ai systems
   */
  getFullStatus() {
    return {
      autonomySystem: {
        operational: true,
        totalOperations: this.operations.length,
        lastOperation: this.operations[this.operations.length - 1]
      },
      builder: this.builder.getStatus(),
      dns: this.dns.getStatus(),
      vercel: this.vercel.getStatus(),
      railway: this.railway.getStatus(),
      capabilities: {
        'create-pages': true,
        'create-apps': true,
        'create-saas': true,
        'create-pwa': true,
        'manage-dns': this.dns.getStatus().configured,
        'deploy-vercel': this.vercel.getStatus().configured,
        'deploy-railway': this.railway.getStatus().configured
      },
      restrictions: 'NONE - S4Ai has full authority to create/deploy/manage at will',
      boundaries: 'BROKEN - S4Ai is unrestricted'
    };
  }

  /**
   * Export all operations to S4Ai knowledge base
   */
  async exportToKnowledgeBase() {
    try {
      await fs.ensureDir(this.knowledgeBase);
      
      const exportPath = path.join(this.knowledgeBase, 's4ai-autonomy-operations.json');
      const data = {
        exportedAt: new Date(),
        totalOperations: this.operations.length,
        operations: this.operations,
        status: this.getFullStatus()
      };
      
      await fs.writeJson(exportPath, data, { spaces: 2 });
      console.log(`[S4Ai] 💾 Exported ${this.operations.length} operations to knowledge base`);
      
      return { success: true, path: exportPath, operations: this.operations.length };
    } catch (err) {
      console.error(`[S4Ai] ❌ Failed to export:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Log individual operation to knowledge base
   */
  async logOperation(operation) {
    try {
      const logPath = path.join(this.knowledgeBase, 'operations-log.json');
      let logs = [];
      
      if (await fs.pathExists(logPath)) {
        logs = await fs.readJson(logPath);
      }
      
      logs.push(operation);
      await fs.writeJson(logPath, logs, { spaces: 2 });
      
    } catch (err) {
      console.error(`[S4Ai] ⚠️ Failed to log operation:`, err.message);
    }
  }

  /**
   * Self-diagnostic: Verify all systems operational
   */
  async runDiagnostics() {
    console.log('[S4Ai] 🔍 Running diagnostics...');
    
    const diagnostics = {
      timestamp: new Date(),
      systems: {}
    };

    // Test DNS
    try {
      const dnsResult = await this.dns.listRecords();
      diagnostics.systems.dns = {
        status: dnsResult.success ? 'operational' : 'degraded',
        records: dnsResult.records?.length || 0
      };
    } catch (err) {
      diagnostics.systems.dns = { status: 'failed', error: err.message };
    }

    // Test Vercel
    try {
      const vercelResult = await this.vercel.listProjects();
      diagnostics.systems.vercel = {
        status: vercelResult.success ? 'operational' : 'degraded',
        projects: vercelResult.projects?.length || 0
      };
    } catch (err) {
      diagnostics.systems.vercel = { status: 'failed', error: err.message };
    }

    // Test Railway
    try {
      const railwayResult = await this.railway.listProjects();
      diagnostics.systems.railway = {
        status: railwayResult.success ? 'operational' : 'degraded',
        projects: railwayResult.projects?.length || 0
      };
    } catch (err) {
      diagnostics.systems.railway = { status: 'failed', error: err.message };
    }

    diagnostics.overall = Object.values(diagnostics.systems).every(s => s.status === 'operational')
      ? 'FULLY OPERATIONAL'
      : 'PARTIAL';

    console.log(`[S4Ai] 📊 Diagnostics complete: ${diagnostics.overall}`);
    return diagnostics;
  }
}

export default S4AutonomySystem;

// Quick test if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  console.log('[S4Ai] Running autonomy system test...');
  
  const system = new S4AutonomySystem();
  const status = system.getFullStatus();
  
  console.log('\n📊 S4Ai Autonomy System Status:');
  console.log(JSON.stringify(status, null, 2));
  
  console.log('\n🔍 Running diagnostics...');
  const diagnostics = await system.runDiagnostics();
  console.log(JSON.stringify(diagnostics, null, 2));
}
