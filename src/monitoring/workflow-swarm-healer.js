/**
 * S4Ai Workflow Swarm-Healer
 * Monitors GitHub Actions workflows and auto-heals failures
 * TRUE AUTONOMY: Self-healing infrastructure
 */

import { Octokit } from '@octokit/rest';
import logger from '../utils/logger.js';

class WorkflowSwarmHealer {
  constructor(config = {}) {
    this.config = {
      githubToken: config.githubToken || process.env.GITHUB_TOKEN,
      owner: config.owner || 'Onedot2',
      repo: config.repo || 'PWAI',
      checkInterval: config.checkInterval || 300000, // 5 minutes
      maxFailures: config.maxFailures || 3,
      autoRetry: config.autoRetry !== false,
      ...config
    };

    if (!this.config.githubToken) {
      logger.warn('[WorkflowHealer] No GITHUB_TOKEN - workflow monitoring disabled');
      this.enabled = false;
      return;
    }

    this.octokit = new Octokit({ auth: this.config.githubToken });
    this.enabled = true;
    this.monitoredWorkflows = [
      'autonomous-heartbeat.yml',
      'code-quality.yml',
      'deploy-railway.yml'
    ];
    
    this.failureHistory = new Map();
    this.healingActions = new Map();
    this.isRunning = false;

    logger.info('[WorkflowHealer] Initialized - monitoring GitHub Actions');
  }

  /**
   * Start continuous workflow monitoring
   */
  async start() {
    if (!this.enabled) {
      logger.warn('[WorkflowHealer] Monitoring disabled (no GITHUB_TOKEN)');
      return;
    }

    if (this.isRunning) {
      logger.warn('[WorkflowHealer] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[WorkflowHealer] Starting workflow swarm healer...');

    // Initial check
    await this.checkAllWorkflows();

    // Continuous monitoring
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkAllWorkflows();
      } catch (error) {
        logger.error('[WorkflowHealer] Monitor error:', error);
      }
    }, this.config.checkInterval);

    logger.info(`[WorkflowHealer] Monitoring every ${this.config.checkInterval / 1000}s`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.isRunning = false;
      logger.info('[WorkflowHealer] Stopped');
    }
  }

  /**
   * Check all monitored workflows
   */
  async checkAllWorkflows() {
    if (!this.enabled) return;

    logger.info('[WorkflowHealer] Checking workflow health...');

    for (const workflow of this.monitoredWorkflows) {
      try {
        await this.checkWorkflow(workflow);
      } catch (error) {
        logger.error(`[WorkflowHealer] Error checking ${workflow}:`, error.message);
      }
    }
  }

  /**
   * Check specific workflow for failures
   */
  async checkWorkflow(workflowFile) {
    try {
      // Get recent workflow runs
      const { data } = await this.octokit.actions.listWorkflowRuns({
        owner: this.config.owner,
        repo: this.config.repo,
        workflow_id: workflowFile,
        per_page: 10
      });

      if (!data.workflow_runs || data.workflow_runs.length === 0) {
        logger.debug(`[WorkflowHealer] No runs found for ${workflowFile}`);
        return;
      }

      // Check for failures
      const recentRuns = data.workflow_runs.slice(0, 5);
      const failures = recentRuns.filter(r => r.conclusion === 'failure');

      if (failures.length > 0) {
        logger.warn(`[WorkflowHealer] Found ${failures.length} failures in ${workflowFile}`);
        
        for (const failure of failures) {
          await this.handleFailure(workflowFile, failure);
        }
      } else {
        logger.info(`[WorkflowHealer] ✅ ${workflowFile} healthy`);
        // Clear failure history on success
        this.failureHistory.delete(workflowFile);
      }

      // Check for stuck workflows
      const running = recentRuns.filter(r => r.status === 'in_progress');
      for (const run of running) {
        await this.checkStuckWorkflow(workflowFile, run);
      }

    } catch (error) {
      logger.error(`[WorkflowHealer] Error checking workflow ${workflowFile}:`, error.message);
    }
  }

  /**
   * Handle workflow failure with smart healing
   */
  async handleFailure(workflowFile, failedRun) {
    const key = `${workflowFile}-${failedRun.id}`;
    
    // Skip if already handled
    if (this.healingActions.has(key)) {
      return;
    }

    logger.warn(`[WorkflowHealer] 🚨 Failure detected: ${workflowFile} run #${failedRun.id}`);
    logger.warn(`[WorkflowHealer]    Status: ${failedRun.conclusion}`);
    logger.warn(`[WorkflowHealer]    Created: ${failedRun.created_at}`);
    logger.warn(`[WorkflowHealer]    URL: ${failedRun.html_url}`);

    // Track failure history
    const history = this.failureHistory.get(workflowFile) || [];
    history.push({
      runId: failedRun.id,
      conclusion: failedRun.conclusion,
      createdAt: failedRun.created_at,
      attempt: history.length + 1
    });
    this.failureHistory.set(workflowFile, history);

    // Get failure logs
    const failureReason = await this.getFailureReason(failedRun);
    logger.warn(`[WorkflowHealer]    Reason: ${failureReason}`);

    // Determine healing action
    const action = this.determineHealingAction(workflowFile, failedRun, failureReason);
    
    if (action) {
      logger.info(`[WorkflowHealer] 🔧 Applying healing action: ${action.type}`);
      await this.applyHealing(workflowFile, failedRun, action);
      this.healingActions.set(key, { action, timestamp: Date.now() });
    }

    // Alert if too many failures
    if (history.length >= this.config.maxFailures) {
      await this.sendAlert(workflowFile, history);
    }
  }

  /**
   * Get failure reason from logs
   */
  async getFailureReason(run) {
    try {
      const { data: jobs } = await this.octokit.actions.listJobsForWorkflowRun({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: run.id
      });

      const failedJobs = jobs.jobs.filter(j => j.conclusion === 'failure');
      if (failedJobs.length === 0) return 'Unknown';

      // Get first failed job's steps
      const failedJob = failedJobs[0];
      const failedSteps = failedJob.steps.filter(s => s.conclusion === 'failure');
      
      if (failedSteps.length > 0) {
        return failedSteps[0].name;
      }

      return failedJob.name;
    } catch (error) {
      logger.error('[WorkflowHealer] Error getting failure reason:', error.message);
      return 'Unable to determine';
    }
  }

  /**
   * Determine appropriate healing action
   */
  determineHealingAction(workflowFile, run, reason) {
    // Common failure patterns and solutions
    const patterns = [
      {
        match: /test|spec|vitest/i,
        action: { type: 'retry', reason: 'Flaky test detected' }
      },
      {
        match: /timeout|timed out/i,
        action: { type: 'retry_with_longer_timeout', reason: 'Timeout issue' }
      },
      {
        match: /npm|install|dependencies/i,
        action: { type: 'clear_cache_retry', reason: 'Dependency issue' }
      },
      {
        match: /checkout|fetch/i,
        action: { type: 'retry', reason: 'Git fetch issue' }
      },
      {
        match: /build|vite/i,
        action: { type: 'investigate', reason: 'Build failure - needs manual review' }
      }
    ];

    for (const pattern of patterns) {
      if (pattern.match.test(reason)) {
        return pattern.action;
      }
    }

    // Default: retry if auto-retry enabled
    if (this.config.autoRetry) {
      return { type: 'retry', reason: 'Auto-retry enabled' };
    }

    return { type: 'log', reason: 'No auto-healing action' };
  }

  /**
   * Apply healing action
   */
  async applyHealing(workflowFile, run, action) {
    switch (action.type) {
      case 'retry':
        await this.retryWorkflow(run);
        break;
      
      case 'retry_with_longer_timeout':
        logger.warn('[WorkflowHealer] ⏰ Manual intervention needed: increase timeout in workflow file');
        break;
      
      case 'clear_cache_retry':
        await this.clearCacheAndRetry(run);
        break;
      
      case 'investigate':
        logger.error('[WorkflowHealer] 🔍 Manual investigation required');
        await this.createIssue(workflowFile, run, action.reason);
        break;
      
      case 'log':
        logger.info('[WorkflowHealer] Logged failure, no action taken');
        break;
    }
  }

  /**
   * Retry failed workflow
   */
  async retryWorkflow(run) {
    if (!this.config.autoRetry) {
      logger.warn('[WorkflowHealer] Auto-retry disabled');
      return;
    }

    try {
      await this.octokit.actions.reRunWorkflow({
        owner: this.config.owner,
        repo: this.config.repo,
        run_id: run.id
      });
      logger.info(`[WorkflowHealer] ✅ Retried workflow run #${run.id}`);
    } catch (error) {
      logger.error(`[WorkflowHealer] Failed to retry workflow: ${error.message}`);
    }
  }

  /**
   * Clear GitHub Actions cache and retry
   */
  async clearCacheAndRetry(run) {
    logger.warn('[WorkflowHealer] Cache clearing requires API v2 - retrying workflow instead');
    await this.retryWorkflow(run);
  }

  /**
   * Check for stuck workflows
   */
  async checkStuckWorkflow(workflowFile, run) {
    const runningTime = Date.now() - new Date(run.created_at).getTime();
    const maxRunTime = 30 * 60 * 1000; // 30 minutes

    if (runningTime > maxRunTime) {
      logger.warn(`[WorkflowHealer] ⚠️ Stuck workflow detected: ${workflowFile} run #${run.id}`);
      logger.warn(`[WorkflowHealer]    Running for: ${Math.round(runningTime / 1000 / 60)} minutes`);
      
      // Cancel and retry
      try {
        await this.octokit.actions.cancelWorkflowRun({
          owner: this.config.owner,
          repo: this.config.repo,
          run_id: run.id
        });
        logger.info(`[WorkflowHealer] ✅ Cancelled stuck workflow`);
        
        // Wait a bit then retry
        setTimeout(() => this.retryWorkflow(run), 5000);
      } catch (error) {
        logger.error(`[WorkflowHealer] Failed to cancel stuck workflow: ${error.message}`);
      }
    }
  }

  /**
   * Create GitHub issue for manual intervention
   */
  async createIssue(workflowFile, run, reason) {
    try {
      const title = `[AUTO] Workflow Failure: ${workflowFile}`;
      const body = `
## Workflow Failure Detected

**Workflow:** ${workflowFile}
**Run ID:** ${run.id}
**Run URL:** ${run.html_url}
**Status:** ${run.conclusion}
**Created:** ${run.created_at}
**Reason:** ${reason}

**Action Required:** Manual investigation needed.

### Auto-Healing Attempted
- Automatic retry: ${this.config.autoRetry ? 'Yes' : 'No'}
- Failure count: ${this.failureHistory.get(workflowFile)?.length || 0}

### Next Steps
1. Check workflow logs: ${run.html_url}
2. Fix underlying issue
3. Re-run workflow manually

---
*Generated by S4Ai Workflow Swarm-Healer*
      `;

      await this.octokit.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        labels: ['bug', 'ci/cd', 'auto-generated']
      });

      logger.info('[WorkflowHealer] ✅ Created GitHub issue for manual review');
    } catch (error) {
      logger.error('[WorkflowHealer] Failed to create issue:', error.message);
    }
  }

  /**
   * Send alert (integrate with monitoring systems)
   */
  async sendAlert(workflowFile, history) {
    logger.error(`[WorkflowHealer] 🚨 ALERT: ${workflowFile} has failed ${history.length} times`);
    logger.error(`[WorkflowHealer] Failure history:`, history.map(h => `#${h.runId} (${h.conclusion})`).join(', '));
    
    // TODO: Integrate with Slack, Discord, email, etc.
    // For now, just log
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      monitoredWorkflows: this.monitoredWorkflows,
      failureHistory: Object.fromEntries(this.failureHistory),
      healingActions: this.healingActions.size,
      config: {
        checkInterval: this.config.checkInterval,
        maxFailures: this.config.maxFailures,
        autoRetry: this.config.autoRetry
      }
    };
  }
}

// Singleton instance
let healerInstance = null;

export function getWorkflowHealer(config) {
  if (!healerInstance) {
    healerInstance = new WorkflowSwarmHealer(config);
  }
  return healerInstance;
}

export default WorkflowSwarmHealer;
