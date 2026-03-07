import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'backend', 's4ai-knowledge-base');
const EVENTS_FILE = 'acquisition-events.json';

const safeString = (value) => (typeof value === 'string' ? value.trim() : '');
const safeLower = (value) => safeString(value).toLowerCase();

function normalizeLead(input = {}) {
  const now = new Date().toISOString();
  const email = safeLower(input.email || '');
  const lead = {
    id: input.id || crypto.randomUUID(),
    type: 'lead',
    createdAt: input.createdAt || now,
    email: email || null,
    source: safeLower(input.source || input.utm_source || input.channel || 'direct'),
    medium: safeLower(input.medium || input.utm_medium || ''),
    campaign: safeString(input.campaign || input.utm_campaign || ''),
    term: safeString(input.term || input.utm_term || ''),
    content: safeString(input.content || input.utm_content || ''),
    referrer: safeString(input.referrer || ''),
    landingPage: safeString(input.landingPage || input.page || ''),
    userAgent: safeString(input.userAgent || ''),
    ip: safeString(input.ip || ''),
    tags: Array.isArray(input.tags) ? input.tags.map(safeString).filter(Boolean) : [],
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };

  return lead;
}

function normalizeConversion(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || crypto.randomUUID(),
    type: 'conversion',
    createdAt: input.createdAt || now,
    leadId: safeString(input.leadId || ''),
    event: safeString(input.event || input.eventType || 'stripe_conversion'),
    plan: safeString(input.plan || input.tier || ''),
    amount: Number.isFinite(Number(input.amount)) ? Number(input.amount) : null,
    currency: safeLower(input.currency || ''),
    stripeCustomerId: safeString(input.stripeCustomerId || ''),
    stripeSubscriptionId: safeString(input.stripeSubscriptionId || ''),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function summarize(events = []) {
  const leads = events.filter((event) => event.type === 'lead');
  const conversions = events.filter((event) => event.type === 'conversion');
  const sourceMap = new Map();
  const campaignMap = new Map();
  const mediumMap = new Map();

  leads.forEach((lead) => {
    const source = lead.source || 'direct';
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    if (lead.campaign) {
      campaignMap.set(lead.campaign, (campaignMap.get(lead.campaign) || 0) + 1);
    }
    if (lead.medium) {
      mediumMap.set(lead.medium, (mediumMap.get(lead.medium) || 0) + 1);
    }
  });

  const conversionRate = leads.length > 0 ? conversions.length / leads.length : 0;

  return {
    totals: {
      leads: leads.length,
      conversions: conversions.length,
      conversionRate
    },
    sources: Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    campaigns: Array.from(campaignMap.entries()).map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count),
    mediums: Array.from(mediumMap.entries()).map(([medium, count]) => ({ medium, count }))
      .sort((a, b) => b.count - a.count)
  };
}

async function loadEvents(dataDir) {
  const filePath = path.join(dataDir, EVENTS_FILE);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveEvents(dataDir, events) {
  const filePath = path.join(dataDir, EVENTS_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  const trimmed = events.slice(-10000);
  await fs.writeFile(filePath, JSON.stringify(trimmed, null, 2));
}

export function getS4UserAcquisitionModule(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  let cachedEvents = null;

  async function ensureEvents() {
    if (!cachedEvents) {
      cachedEvents = await loadEvents(dataDir);
    }
    return cachedEvents;
  }

  return {
    async captureLead(payload = {}) {
      const events = await ensureEvents();
      const lead = normalizeLead(payload);
      events.push(lead);
      await saveEvents(dataDir, events);
      return lead;
    },

    async recordConversion(payload = {}) {
      const events = await ensureEvents();
      const conversion = normalizeConversion(payload);
      events.push(conversion);
      await saveEvents(dataDir, events);
      return conversion;
    },

    async getSummary() {
      const events = await ensureEvents();
      return summarize(events);
    },

    async getRecent(limit = 50) {
      const events = await ensureEvents();
      return events.slice(-Math.max(1, limit)).reverse();
    },

    async getHealth() {
      const summary = await this.getSummary();
      return {
        status: 'ready',
        totals: summary.totals,
        timestamp: new Date().toISOString()
      };
    }
  };
}
/**
 * S4 User-Acquisition Orchestrator Class
 * Coordinates autonomous user growth loops: signal intelligence, lead capture,
 * funnel tracking, and MLM feedback integration.
 */
export class S4UserAcquisitionOrchestrator {
  constructor(config = {}) {
    this.config = {
      cycleInterval: config.cycleInterval || 300000, // 5 min
      signalThreshold: config.signalThreshold || 0.6,
      channelRotation: config.channelRotation || ['organic', 'paid', 'referral', 'partnership'],
      maxLeadBuffer: config.maxLeadBuffer || 1000,
      ...config
    };

    this.state = {
      isRunning: false,
      cycle: 0,
      leads: [],
      channelScores: {},
      acquisitionMetrics: {
        totalLeads: 0,
        qualifiedLeads: 0,
        conversionRate: 0,
        costPerAcquisition: 0,
        channelROI: {}
      },
      lastRun: null,
      nextScheduled: null
    };

    this.engines = {
      signalIntelligence: null,
      funnelTracking: null,
      mlmFeedback: null
    };

    this.channels = new Map();
    this.leadQueue = [];
    this.signals = [];
  }

  /**
   * Initialize orchestrator with engines
   */
  async initialize(signalEngine, funnelEngine, mlmEngine) {
    try {
      this.engines.signalIntelligence = signalEngine;
      this.engines.funnelTracking = funnelEngine;
      this.engines.mlmFeedback = mlmEngine;

      // Initialize channel tracking
      for (const channel of this.config.channelRotation) {
        this.channels.set(channel, {
          name: channel,
          leads: 0,
          conversions: 0,
          roi: 0,
          priority: 0,
          lastScore: 0
        });
      }

      console.log('[S4-UAO] Acquisition orchestrator initialized');
      return { success: true };
    } catch (error) {
      console.error('[S4-UAO] Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Main acquisition cycle - runs autonomously
   */
  async runAcquisitionCycle() {
    try {
      this.state.cycle++;
      const cycleStart = Date.now();

      // Phase 1: Generate acquisition signals
      const signals = this.engines.signalIntelligence 
        ? await this.engines.signalIntelligence.analyzeChannels()
        : [];
      this.signals = signals;

      // Phase 2: Score channels by ROI
      await this.scoreChannels(signals);

      // Phase 3: Process lead queue through funnel
      const funnelMetrics = this.engines.funnelTracking
        ? await this.engines.funnelTracking.processFunnel(this.leadQueue)
        : { conversions: 0, processed: 0, qualifiedLeads: 0 };

      // Phase 4: Update MLM with conversion feedback
      if (funnelMetrics.conversions > 0 && this.engines.mlmFeedback) {
        await this.engines.mlmFeedback.recordConversionSignal({
          channel: funnelMetrics.topChannel || 'organic',
          conversions: funnelMetrics.conversions,
          quality: funnelMetrics.avgQuality || 0.5,
          timestamp: Date.now()
        });
      }

      // Phase 5: Prioritize channels for next cycle
      const nextChannelFocus = await this.selectNextChannelFocus();

      // Update metrics
      this.updateAcquisitionMetrics(funnelMetrics);

      const cycleEnd = Date.now();
      this.state.lastRun = cycleEnd;
      this.state.nextScheduled = cycleEnd + this.config.cycleInterval;

      return {
        success: true,
        cycle: this.state.cycle,
        duration: cycleEnd - cycleStart,
        signals: signals.length,
        leadsProcessed: this.leadQueue.length,
        conversions: funnelMetrics.conversions,
        nextFocus: nextChannelFocus,
        metrics: this.state.acquisitionMetrics
      };
    } catch (error) {
      console.error('[S4-UAO] Cycle failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Score channels based on conversion rate, ROI, and signals
   */
  async scoreChannels(signals) {
    for (const signal of signals) {
      const channel = this.channels.get(signal.channel);
      if (!channel) continue;

      const conversionRate = channel.conversions / Math.max(channel.leads, 1);
      const roiScore = channel.roi > 0 ? Math.min(channel.roi / 100, 1) : 0;
      const signalScore = signal.score || 0;

      // Weighted score: 40% conversion, 40% ROI, 20% signal
      const compositeScore = 
        (conversionRate * 0.4) + 
        (roiScore * 0.4) + 
        (signalScore * 0.2);

      channel.lastScore = compositeScore;
      channel.priority = compositeScore > this.config.signalThreshold ? 1 : 0;

      this.state.channelScores[signal.channel] = compositeScore;
    }
  }

  /**
   * Select highest-priority channel for next acquisition push
   */
  async selectNextChannelFocus() {
    let topChannel = null;
    let topScore = 0;

    for (const [name, channel] of this.channels.entries()) {
      if (channel.lastScore > topScore) {
        topScore = channel.lastScore;
        topChannel = name;
      }
    }

    return topChannel || this.config.channelRotation[0];
  }

  /**
   * Capture new lead from acquisition channel
   */
  async captureLead(lead) {
    try {
      if (this.leadQueue.length >= this.config.maxLeadBuffer) {
        this.leadQueue.shift();
      }

      const enrichedLead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...lead,
        timestamp: Date.now(),
        source: lead.channel || 'direct',
        stage: 'captured',
        quality: 0.5,
        converted: false
      };

      this.leadQueue.push(enrichedLead);
      this.state.leads.push(enrichedLead);
      this.state.acquisitionMetrics.totalLeads++;

      const channel = this.channels.get(enrichedLead.source);
      if (channel) channel.leads++;

      return { success: true, leadId: enrichedLead.id };
    } catch (error) {
      console.error('[S4-UAO] Lead capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update acquisition metrics based on funnel performance
   */
  updateAcquisitionMetrics(funnelMetrics) {
    this.state.acquisitionMetrics.qualifiedLeads = funnelMetrics.qualifiedLeads || 0;
    this.state.acquisitionMetrics.conversionRate = 
      (funnelMetrics.conversions / Math.max(funnelMetrics.processed, 1)) * 100;
    
    for (const [channel, data] of this.channels.entries()) {
      if (data.leads > 0) {
        this.state.acquisitionMetrics.channelROI[channel] = 
          ((data.conversions / data.leads) * 100).toFixed(2);
      }
    }
  }

  /**
   * Record conversion from lead to customer
   */
  async recordConversion(leadId, metadata = {}) {
    try {
      const lead = this.state.leads.find(l => l.id === leadId);
      if (!lead) return { success: false, error: 'Lead not found' };

      lead.converted = true;
      lead.stage = 'converted';
      lead.conversionMetadata = metadata;
      lead.conversionTime = Date.now();

      const channel = this.channels.get(lead.source);
      if (channel) channel.conversions++;

      this.state.acquisitionMetrics.qualifiedLeads++;

      return { success: true, leadId, metadata };
    } catch (error) {
      console.error('[S4-UAO] Conversion record failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current acquisition state
   */
  getState() {
    return {
      running: this.state.isRunning,
      cycle: this.state.cycle,
      leads: this.state.leads.length,
      metrics: this.state.acquisitionMetrics,
      channelScores: this.state.channelScores,
      nextScheduled: this.state.nextScheduled
    };
  }

  /**
   * Start autonomous acquisition loop
   */
  async start() {
    if (this.state.isRunning) return { success: false, error: 'Already running' };

    this.state.isRunning = true;
    console.log('[S4-UAO] Autonomous acquisition loop started');

    const loop = setInterval(async () => {
      if (this.state.isRunning) {
        await this.runAcquisitionCycle();
      }
    }, this.config.cycleInterval);

    this.loopInterval = loop;
    return { success: true };
  }

  /**
   * Stop autonomous acquisition loop
   */
  stop() {
    this.state.isRunning = false;
    if (this.loopInterval) clearInterval(this.loopInterval);
    console.log('[S4-UAO] Autonomous acquisition loop stopped');
    return { success: true };
  }
}