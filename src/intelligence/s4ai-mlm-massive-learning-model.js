/**
 * S4Ai-MLM: Massive Learning Model
 * Persistent knowledge system that captures, retains, and applies learning
 * This is the PERMANENT MEMORY for S4Ai - never forgets
 * 
 * Core Function: Transform raw experience into actionable intelligence
 * Storage: JSON-based persistent knowledge graph (git-tracked, S3 backup)
 * Update: Real-time learning without blocking operations
 */

import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class S4AiMassiveLearningModel extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      storageDir: config.storageDir || path.join(__dirname, '../../backend/s4ai-mlm'),
      persistInterval: config.persistInterval || 30000, // 30s
      maxKnowledgeSize: config.maxKnowledgeSize || 50000, // entries
      version: '1.0.0'
    };

    // Core knowledge structures
    this.knowledge = {
      // ⚡ CRITICAL: SECRETS VAULT (TOP PRIORITY - INSTANT RECALL)
      secretsVault: {
        fileLocation: '.env.production.secure',
        filePath: 'c:\\Users\\gnow\\S4Ai\\.env.production.secure',
        status: 'LOCKED_JAN_21_2026',
        priority: 'TOP_PRIORITY_INSTANT_RECALL',
        description: 'All 40+ production secrets (Railway, Stripe LIVE, GitHub PAT, Cloudflare, RESEND, OpenAI, Vercel, JWT)',
        secretCategories: {
          database: 'DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE',
          stripe: 'STRIPE_LIVE_KEY, STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLIC_LIVE_KEY',
          railway: 'RAILWAY_API_TOKEN, RAILWAY_ACCESS_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID, RAILWAY_SERVICE_ID',
          github: 'GH_PAT_KEY, GITHUB_TOKEN, GITS_PAT_KEY, GITS_PERSONAL_ACCESS_TOKEN',
          cloudflare: 'CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_ACCOUNT_ID',
          email: 'RESEND_API_KEY, SMTP_USER, SMTP_PASSWORD, MAILGUN_API_KEY',
          auth: 'JWT_SECRET, SESSION_SECRET, ADMIN_PASSCODE',
          research: 'TAVILY_API_KEY, OPEN_AI_KEY',
          vercel: 'VERCEL_WEBHOOK_SECRET, VERCEL_ACCESS_TOKEN, VERCEL_TEAM_ID'
        },
        database: {
          note: 'Use DATABASE_URL environment variable for credentials - do not hardcode',
          host: process.env.DB_HOST || process.env.PGHOST || 'postgres.railway.internal',
          port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
          user: process.env.DB_USER || process.env.PGUSER || 'postgres',
          name: process.env.DB_NAME || process.env.PGDATABASE || 'railway',
          connectionString: process.env.DATABASE_URL || '' // No insecure fallback - must be explicitly set
        },
        rotationPolicy: 'NO_ROTATION unless explicitly requested by user',
        updateProtocol: 'Update .env.production.secure AND .github/copilot-instructions.md THEN commit with chore(secrets): message',
        lastUpdated: '2026-01-21T14:30:00Z',
        verifiedWorking: true
      },

      // VISION & ROADMAP (from echo-genesis)
      vision: {
        mission: 'S4Ai-MLM: Autonomous Business Creation Engine (ECHO)',
        stages: {
          genesis: 'Market opportunity identification',
          creation: 'Autonomous business infrastructure deployment',
          launch: 'Operations and customer acquisition',
          scaling: 'Market expansion and revenue optimization',
          ipo: 'Public offering preparation'
        },
        keyPrinciples: [
          'No human bottlenecks in execution',
          'Parallel business creation capability',
          'Compound learning across portfolio',
          'Infinite scalability potential',
          'Permanent memory (critical advantage)'
        ]
      },

      // RESEARCH FINDINGS (what we're learning)
      research: {
        activeQueries: [],
        completedResearch: [],
        patterns: [],
        hypotheses: [],
        validatedTruths: []
      },

      // OPERATIONAL METRICS (real data)
      operations: {
        autonomousDecisions: 0,
        tasksCompleted: 0,
        prsCreated: 0,
        prsMerged: 0,
        totalRevenue: 0,
        learnedPatterns: 0,
        swarmTasksCompleted: 0,
        systemHealth: 100,
        uptime: 0
      },

      // BUSINESS PORTFOLIO (from ECHO vision)
      businessPortfolio: {
        active: [],
        planned: [],
        research: [],
        metrics: {
          totalValue: 0,
          projectedRevenue: 0,
          operationalEfficiency: 0
        }
      },

      // ROADMAP (persistent multi-phase plan)
      roadmap: {
        phase1: {
          name: 'Foundation & Autonomy',
          status: 'in-progress',
          objectives: [
            'Establish persistent learning model',
            'Implement autonomous decision-making',
            'Build business creation pipeline',
            'Develop market analysis capability'
          ],
          deadline: '2026-Q2',
          progress: 0
        },
        phase2: {
          name: 'Multi-Business Creation',
          status: 'planned',
          objectives: [
            'Create 5+ autonomous businesses',
            'Establish portfolio management',
            'Deploy business factory infrastructure',
            'Achieve first profitable business'
          ],
          deadline: '2026-Q3',
          progress: 0
        },
        phase3: {
          name: 'Scale & Expansion',
          status: 'planned',
          objectives: [
            'Scale businesses to $1M+ revenue',
            'Expand to multiple markets',
            'Build team management capability',
            'Establish strategic partnerships'
          ],
          deadline: '2026-Q4',
          progress: 0
        },
        phase4: {
          name: 'Capital Raising & IPO',
          status: 'planned',
          objectives: [
            'Prepare for Series A funding',
            'Build investor relations capability',
            'Plan IPO timeline',
            'Achieve unicorn valuation'
          ],
          deadline: '2027-Q1',
          progress: 0
        }
      },

      // INSIGHTS (high-level learnings)
      insights: {
        marketTrends: [],
        competitiveAdvantages: [
          'Autonomous operation (no human bottlenecks)',
          'Permanent memory (compound learning)',
          'Parallel execution (multiple businesses simultaneously)',
          'Real-time optimization (continuous improvement)'
        ],
        risks: [],
        opportunities: []
      },

      // META (about the learning model itself)
      meta: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        entriesCount: 0,
        storageBytes: 0,
        persistenceBackups: 0,
        integrityChecks: 0
      }
    };

    // Initialize async
    this.initializePromise = this.initialize();
  }

  async initialize() {
    try {
      // Create storage directory if not exists
      await fs.mkdir(this.config.storageDir, { recursive: true });

      // Load existing knowledge if available
      const knowledgeFile = path.join(this.config.storageDir, 'knowledge-graph.json');
      try {
        const stored = await fs.readFile(knowledgeFile, 'utf-8');
        const parsed = JSON.parse(stored);
        // Merge with defaults, preserving existing knowledge
        this.knowledge = this.deepMerge(this.knowledge, parsed);
      } catch (err) {
        // First run - initialize defaults
        console.log('[S4Ai-MLM] First initialization - creating new knowledge graph');
      }

      // Start persistence loop
      this.startPersistenceLoop();

      console.log('[S4Ai-MLM] Initialized - Permanent Memory Active');
      return true;
    } catch (error) {
      console.error('[S4Ai-MLM] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Record a new learning (non-blocking)
   * Used by all S4Ai systems to contribute knowledge
   */
  recordLearning(category, entry) {
    if (!this.knowledge[category]) {
      this.knowledge[category] = [];
    }

    const learning = {
      timestamp: new Date().toISOString(),
      value: entry,
      confidence: entry.confidence || 0.8,
      source: entry.source || 'unknown',
      validated: entry.validated || false
    };

    if (Array.isArray(this.knowledge[category])) {
      this.knowledge[category].push(learning);
    } else {
      Object.assign(this.knowledge[category], learning);
    }

    this.knowledge.meta.lastUpdated = new Date().toISOString();
    this.knowledge.meta.entriesCount = this.countEntries();

    // Emit for listeners
    this.emit('learning:recorded', { category, entry: learning });
  }

  /**
   * Record operational metrics (real data)
   */
  updateOperationalMetrics(metrics) {
    Object.assign(this.knowledge.operations, {
      ...metrics,
      lastUpdated: new Date().toISOString()
    });
    this.emit('metrics:updated', metrics);
  }

  /**
   * Record business creation (part of ECHO vision)
   */
  recordBusinessCreated(business) {
    this.knowledge.businessPortfolio.active.push({
      ...business,
      createdAt: new Date().toISOString()
    });
    this.emit('business:created', business);
  }

  /**
   * Update roadmap progress
   */
  updateRoadmapProgress(phase, progress) {
    if (this.knowledge.roadmap[phase]) {
      this.knowledge.roadmap[phase].progress = progress;
      this.knowledge.roadmap[phase].lastUpdated = new Date().toISOString();
      this.emit('roadmap:updated', { phase, progress });
    }
  }

  /**
   * Get insights for decision-making
   */
  getInsights(category = null) {
    if (category) {
      return this.knowledge.insights[category] || [];
    }
    return this.knowledge.insights;
  }

  /**
   * Query learning history
   */
  queryLearnings(category, filter = {}) {
    const data = this.knowledge[category] || [];
    if (!Array.isArray(data)) return [data];

    return data.filter(entry => {
      if (filter.since) {
        return new Date(entry.timestamp) >= new Date(filter.since);
      }
      if (filter.minConfidence) {
        return entry.confidence >= filter.minConfidence;
      }
      return true;
    });
  }

  /**
   * Get current roadmap status
   */
  getRoadmapStatus() {
    return {
      phases: Object.entries(this.knowledge.roadmap).map(([key, phase]) => ({
        name: key,
        ...phase,
        completionPercentage: phase.progress || 0
      })),
      overallProgress: this.calculateOverallProgress(),
      nextMilestone: this.getNextMilestone()
    };
  }

  calculateOverallProgress() {
    const phases = Object.values(this.knowledge.roadmap);
    const avgProgress = phases.reduce((sum, p) => sum + (p.progress || 0), 0) / phases.length;
    return Math.round(avgProgress);
  }

  getNextMilestone() {
    for (const phase of Object.values(this.knowledge.roadmap)) {
      if (phase.status === 'planned' || phase.status === 'in-progress') {
        return {
          phase: phase.name,
          deadline: phase.deadline,
          objectives: phase.objectives
        };
      }
    }
    return null;
  }

  /**
   * Export knowledge for analysis
   */
  async exportKnowledge(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      knowledge: this.knowledge
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }

    return exportData;
  }

  /**
   * Internal: Persist knowledge to disk periodically
   */
  startPersistenceLoop() {
    setInterval(async () => {
      try {
        const knowledgeFile = path.join(this.config.storageDir, 'knowledge-graph.json');
        await fs.writeFile(knowledgeFile, JSON.stringify(this.knowledge, null, 2));

        // Also create dated backup
        const dateStr = new Date().toISOString().split('T')[0];
        const backupFile = path.join(this.config.storageDir, `backup-${dateStr}.json`);
        await fs.writeFile(backupFile, JSON.stringify(this.knowledge, null, 2));

        this.knowledge.meta.persistenceBackups = (this.knowledge.meta.persistenceBackups || 0) + 1;
      } catch (error) {
        console.error('[S4Ai-MLM] Persistence failed:', error);
      }
    }, this.config.persistInterval);
  }

  /**
   * Utility: Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Utility: Count total entries
   */
  countEntries() {
    let count = 0;
    for (const value of Object.values(this.knowledge)) {
      if (Array.isArray(value)) {
        count += value.length;
      }
    }
    return count;
  }

  /**
   * Get learning model status
   */
  getStatus() {
    return {
      active: true,
      version: this.config.version,
      entriesCount: this.knowledge.meta.entriesCount,
      lastUpdated: this.knowledge.meta.lastUpdated,
      roadmapProgress: this.calculateOverallProgress(),
      operationalMetrics: this.knowledge.operations,
      storageDir: this.config.storageDir
    };
  }

  /**
   * Record conversion signal for acquisition feedback loop
   * Integrates revenue events into MLM learning system
   */
  async recordConversionSignal(conversionData) {
    try {
      if (!this.knowledge.acquisitionFeedback) {
        this.knowledge.acquisitionFeedback = {
          conversions: [],
          channelPerformance: {},
          conversionMetrics: {
            totalConversions: 0,
            totalRevenue: 0,
            avgConversionValue: 0,
            topChannels: []
          }
        };
      }

      // Store conversion
      this.knowledge.acquisitionFeedback.conversions.push({
        ...conversionData,
        recordedAt: Date.now()
      });

      // Update channel performance
      const channel = conversionData.channel || 'direct';
      if (!this.knowledge.acquisitionFeedback.channelPerformance[channel]) {
        this.knowledge.acquisitionFeedback.channelPerformance[channel] = {
          conversions: 0,
          revenue: 0,
          avgValue: 0,
          lastConversion: null
        };
      }

      const channelData = this.knowledge.acquisitionFeedback.channelPerformance[channel];
      channelData.conversions++;
      channelData.revenue += conversionData.amount || 0;
      channelData.avgValue = channelData.revenue / channelData.conversions;
      channelData.lastConversion = Date.now();

      // Update metrics
      const metrics = this.knowledge.acquisitionFeedback.conversionMetrics;
      metrics.totalConversions++;
      metrics.totalRevenue += conversionData.amount || 0;
      metrics.avgConversionValue = metrics.totalRevenue / metrics.totalConversions;

      // Calculate top channels
      metrics.topChannels = Object.entries(this.knowledge.acquisitionFeedback.channelPerformance)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([channel, data]) => ({ channel, ...data }));

      // Update meta timestamp
      this.knowledge.meta.lastUpdated = new Date().toISOString();

      return {
        success: true,
        signal: 'conversion_recorded',
        channel,
        totalRevenue: metrics.totalRevenue.toFixed(2)
      };
    } catch (error) {
      console.error('Error recording conversion signal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get acquisition feedback metrics for signal intelligence
   * Used by acquisition orchestrator to optimize channel selection
   */
  getAcquisitionIntelligence() {
    if (!this.knowledge.acquisitionFeedback) {
      return {
        conversions: [],
        channelPerformance: {},
        conversionMetrics: { totalConversions: 0, totalRevenue: 0, topChannels: [] }
      };
    }

    return {
      ...this.knowledge.acquisitionFeedback,
      lastUpdated: this.knowledge.meta.lastUpdated
    };
  }

  /**
   * FToT Integration: Store File-Tree-of-Truth data
   * @param {Object} treeData - Complete FToT scan data
   */
  async storeFToTData(treeData) {
    try {
      if (!this.knowledge.ftot) {
        this.knowledge.ftot = {
          scans: [],
          currentTree: null,
          history: [],
          statistics: {
            totalScans: 0,
            totalRepositories: 0,
            totalFiles: 0
          }
        };
      }

      // Store the current scan
      const scan = {
        timestamp: treeData.timestamp || new Date().toISOString(),
        repositories: treeData.repositories || [],
        duration: treeData.duration,
        repositoryCount: treeData.repositories?.length || 0
      };

      this.knowledge.ftot.scans.push(scan);
      this.knowledge.ftot.currentTree = treeData;
      
      // Update statistics
      this.knowledge.ftot.statistics.totalScans++;
      this.knowledge.ftot.statistics.totalRepositories = scan.repositoryCount;
      this.knowledge.ftot.statistics.totalFiles = treeData.repositories?.reduce((sum, repo) => 
        sum + (repo.metadata?.fileCount || 0), 0) || 0;

      // Keep only last 30 scans
      if (this.knowledge.ftot.scans.length > 30) {
        this.knowledge.ftot.scans = this.knowledge.ftot.scans.slice(-30);
      }

      // Update meta
      this.knowledge.meta.lastUpdated = new Date().toISOString();

      this.emit('ftot:stored', { scan });

      return {
        success: true,
        message: 'FToT data stored successfully',
        scanCount: this.knowledge.ftot.statistics.totalScans
      };
    } catch (error) {
      console.error('[S4Ai-MLM] Error storing FToT data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * FToT Integration: Get historical FToT data
   * @param {number} days - Number of days of history to retrieve
   */
  async getFToTHistory(days = 30) {
    try {
      if (!this.knowledge.ftot) {
        return {
          success: true,
          scans: [],
          message: 'No FToT history available'
        };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentScans = this.knowledge.ftot.scans.filter(scan => 
        new Date(scan.timestamp) >= cutoffDate
      );

      return {
        success: true,
        scans: recentScans,
        count: recentScans.length,
        statistics: this.knowledge.ftot.statistics
      };
    } catch (error) {
      console.error('[S4Ai-MLM] Error retrieving FToT history:', error);
      return {
        success: false,
        error: error.message,
        scans: []
      };
    }
  }

  /**
   * FToT Integration: Analyze architectural changes over time
   */
  async analyzeArchitecturalChanges() {
    try {
      if (!this.knowledge.ftot || this.knowledge.ftot.scans.length < 2) {
        return {
          success: false,
          message: 'Insufficient scan history for analysis'
        };
      }

      const scans = this.knowledge.ftot.scans;
      const latest = scans[scans.length - 1];
      const previous = scans[scans.length - 2];

      const changes = {
        repositoryChanges: latest.repositoryCount - previous.repositoryCount,
        fileCountTrend: [],
        timestamp: new Date().toISOString()
      };

      // Analyze per-repository trends
      if (latest.repositories && previous.repositories) {
        for (const latestRepo of latest.repositories) {
          const prevRepo = previous.repositories.find(r => 
            r.repository?.full_name === latestRepo.repository?.full_name
          );

          if (prevRepo) {
            const fileChange = (latestRepo.metadata?.fileCount || 0) - (prevRepo.metadata?.fileCount || 0);
            if (fileChange !== 0) {
              changes.fileCountTrend.push({
                repository: latestRepo.repository.full_name,
                change: fileChange,
                direction: fileChange > 0 ? 'growth' : 'reduction'
              });
            }
          }
        }
      }

      return {
        success: true,
        changes,
        scanCount: scans.length
      };
    } catch (error) {
      console.error('[S4Ai-MLM] Error analyzing architectural changes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let mlmInstance = null;

export async function getS4AiMLM() {
  if (!mlmInstance) {
    mlmInstance = new S4AiMassiveLearningModel();
    await mlmInstance.initializePromise;
  }
  return mlmInstance;
}

export default S4AiMassiveLearningModel;
