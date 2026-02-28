/**
 * Acquisition Funnel Lifecycle Tracking
 * Monitors lead progression: capture → qualified → trial → paid
 */

export class AcquisitionFunnel {
  constructor(config = {}) {
    this.config = {
      stages: config.stages || ['captured', 'qualified', 'trial', 'converted'],
      qualificationThreshold: config.qualificationThreshold || 0.5,
      trialDuration: config.trialDuration || 14 * 24 * 60 * 60 * 1000, // 14 days
      ...config
    };

    this.state = {
      funnelMetrics: {},
      stageTransitions: {},
      dropoffRate: 0,
      avgTimeInStage: {}
    };

    this.leads = new Map();
  }

  /**
   * Process leads through funnel stages
   */
  async processFunnel(leadQueue = []) {
    try {
      let processed = 0;
      let qualified = 0;
      let conversions = 0;
      let totalQuality = 0;
      let topChannel = 'organic';
      const channelConversions = {};

      for (const lead of leadQueue) {
        processed++;
        
        // Determine if lead qualifies
        const qualityScore = await this.scoreLeadQuality(lead);
        lead.quality = qualityScore;
        
        if (qualityScore >= this.config.qualificationThreshold) {
          qualified++;
          lead.stage = 'qualified';
          
          // Simulate conversion probability
          if (Math.random() < qualityScore * 0.3) {
            conversions++;
            lead.stage = 'converted';
            
            channelConversions[lead.source] = (channelConversions[lead.source] || 0) + 1;
          } else {
            lead.stage = 'trial';
          }
        } else {
          lead.stage = 'captured';
        }

        totalQuality += qualityScore;
        this.leads.set(lead.id, lead);
      }

      // Find top conversion channel
      let maxConversions = 0;
      for (const [channel, count] of Object.entries(channelConversions)) {
        if (count > maxConversions) {
          maxConversions = count;
          topChannel = channel;
        }
      }

      const avgQuality = processed > 0 ? totalQuality / processed : 0;
      const conversionRate = processed > 0 ? (conversions / processed) * 100 : 0;

      this.state.funnelMetrics = {
        processed,
        qualified,
        conversions,
        conversionRate,
        avgQuality
      };

      return {
        processed,
        qualifiedLeads: qualified,
        conversions,
        conversionRate,
        avgQuality,
        topChannel,
        dropoffRate: ((processed - conversions) / processed) * 100
      };
    } catch (error) {
      console.error('[Funnel] Processing failed:', error.message);
      return {
        processed: 0,
        qualifiedLeads: 0,
        conversions: 0,
        conversionRate: 0,
        avgQuality: 0
      };
    }
  }

  /**
   * Score lead quality based on multiple factors
   */
  async scoreLeadQuality(lead) {
    let score = 0.5; // Base score

    // Email domain credibility
    if (lead.email) {
      const domain = lead.email.split('@')[1];
      if (domain && !domain.includes('spam') && !domain.includes('temp')) {
        score += 0.15;
      }
    }

    // Source credibility
    const sourceWeights = {
      'organic': 0.2,
      'referral': 0.25,
      'partnership': 0.2,
      'paid': 0.15,
      'direct': 0.1
    };
    score += (sourceWeights[lead.source] || 0.05);

    // Campaign engagement
    if (lead.campaign) score += 0.1;
    if (lead.landingPage) score += 0.1;

    // Add randomness for realistic variation
    score += (Math.random() - 0.5) * 0.2;

    return Math.min(Math.max(score, 0), 1.0);
  }

  /**
   * Track lead through conversion funnel
   */
  async trackLeadProgression(leadId, stage, metadata = {}) {
    try {
      const lead = this.leads.get(leadId);
      if (!lead) return { success: false, error: 'Lead not found' };

      const previousStage = lead.stage;
      lead.stage = stage;
      lead.lastTransition = { from: previousStage, to: stage, timestamp: Date.now() };
      lead.metadata = { ...lead.metadata, ...metadata };

      this.recordTransition(previousStage, stage);

      return { success: true, lead };
    } catch (error) {
      console.error('[Funnel] Progression tracking failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record stage transition for analytics
   */
  recordTransition(fromStage, toStage) {
    const key = `${fromStage}→${toStage}`;
    this.state.stageTransitions[key] = (this.state.stageTransitions[key] || 0) + 1;
  }

  /**
   * Calculate funnel metrics at each stage
   */
  calculateFunnelMetrics() {
    const metrics = {
      captured: 0,
      qualified: 0,
      trial: 0,
      converted: 0
    };

    for (const lead of this.leads.values()) {
      if (metrics[lead.stage] !== undefined) {
        metrics[lead.stage]++;
      }
    }

    // Calculate conversion rates
    const total = metrics.captured + metrics.qualified + metrics.trial + metrics.converted;
    const conversionRate = total > 0 ? (metrics.converted / total) * 100 : 0;
    const qualificationRate = total > 0 ? ((metrics.qualified + metrics.trial + metrics.converted) / total) * 100 : 0;

    return {
      stageBreakdown: metrics,
      conversionRate: conversionRate.toFixed(2),
      qualificationRate: qualificationRate.toFixed(2),
      totalLeads: total,
      transitions: this.state.stageTransitions
    };
  }

  /**
   * Identify bottlenecks in funnel
   */
  identifyBottlenecks() {
    const metrics = this.calculateFunnelMetrics();
    const bottlenecks = [];

    // Captured → Qualified
    if (metrics.stageBreakdown.captured > metrics.stageBreakdown.qualified * 5) {
      bottlenecks.push({
        stage: 'Qualification',
        severity: 'high',
        message: 'High drop-off from captured to qualified'
      });
    }

    // Qualified → Converted
    const qualifiedTotal = metrics.stageBreakdown.qualified + metrics.stageBreakdown.trial;
    if (qualifiedTotal > 0 && metrics.stageBreakdown.converted < qualifiedTotal * 0.1) {
      bottlenecks.push({
        stage: 'Conversion',
        severity: 'high',
        message: 'Low conversion rate from trial'
      });
    }

    return bottlenecks;
  }

  /**
   * Get funnel report
   */
  getReport() {
    const metrics = this.calculateFunnelMetrics();
    const bottlenecks = this.identifyBottlenecks();

    return {
      timestamp: new Date().toISOString(),
      metrics,
      bottlenecks,
      recommendations: this.generateRecommendations(metrics, bottlenecks)
    };
  }

  /**
   * Generate recommendations based on funnel health
   */
  generateRecommendations(metrics, bottlenecks) {
    const recommendations = [];

    for (const bottleneck of bottlenecks) {
      if (bottleneck.stage === 'Qualification') {
        recommendations.push('Improve lead qualification criteria or nurture sequences');
      } else if (bottleneck.stage === 'Conversion') {
        recommendations.push('Optimize trial-to-paid conversion with better onboarding');
      }
    }

    if (metrics.conversionRate < 1) {
      recommendations.push('Consider A/B testing different messaging and offers');
    }

    return recommendations;
  }

  /**
   * Get lead at specific stage
   */
  getLeadsByStage(stage) {
    const leads = [];
    for (const lead of this.leads.values()) {
      if (lead.stage === stage) {
        leads.push(lead);
      }
    }
    return leads;
  }

  /**
   * Get funnel state
   */
  getState() {
    return {
      funnelMetrics: this.state.funnelMetrics,
      stageTransitions: this.state.stageTransitions,
      totalLeads: this.leads.size,
      metrics: this.calculateFunnelMetrics()
    };
  }
}

export default AcquisitionFunnel;
