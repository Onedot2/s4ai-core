// MetaReasoning: Reviews ambition/curiosity history, generates self-improvement insights, and adapts strategies.

class MetaReasoning {
  constructor({ ambitionEngine, curiosity, interval = 60000, genesisProtocol = null, middleware = null } = {}) {
    this.ambitionEngine = ambitionEngine;
    this.curiosity = curiosity;
    this.interval = interval;
    this.insights = [];
    this.lastReview = null;
    this.genesisProtocol = genesisProtocol;
    this.middleware = middleware;
  }

  // Inject Genesis-Hard-Cor protocol
  setGenesisProtocol(protocol) {
    this.genesisProtocol = protocol;
  }

  // Swarm awareness: export state for middleware
  exportState() {
    return {
      insights: this.insights,
      lastReview: this.lastReview,
      genesisProtocol: !!this.genesisProtocol,
      timestamp: Date.now()
    };
  }

  // Review ambition and curiosity trends, generate insights
  review() {
    const now = Date.now();
    this.lastReview = now;
    let insight = { timestamp: now, summary: '', details: {} };
    // Ambition trend
    if (this.ambitionEngine) {
      const achievements = this.ambitionEngine.getAchievements();
      const activeGoals = this.ambitionEngine.getActiveGoals();
      insight.details.ambition = {
        achievements: achievements.length,
        activeGoals: activeGoals.length,
        ambitionScore: this.ambitionEngine.getAmbitionLevel()
      };
      if (achievements.length > 0 && achievements.length % 5 === 0) {
        insight.summary += `Milestone: ${achievements.length} goals achieved. `;
      }
      if (activeGoals.length === 0) {
        insight.summary += 'All goals achieved! Consider setting new stretch goals. ';
      }
    }
    // Curiosity trend
    if (this.curiosity) {
      const completed = this.curiosity.getCompletedQuestsCount();
      const active = this.curiosity.quests.filter(q => q.status !== 'completed').length;
      insight.details.curiosity = {
        completedQuests: completed,
        activeQuests: active
      };
      if (completed > 0 && completed % 5 === 0) {
        insight.summary += `Curiosity milestone: ${completed} quests completed. `;
      }
      if (active === 0) {
        insight.summary += 'No active curiosity quests. Suggest generating new ones. ';
      }
    }
    if (!insight.summary) insight.summary = 'No significant meta-reasoning events.';
    this.insights.push(insight);
    if (this.insights.length > 50) this.insights.shift();
    return insight;
  }

  // Get recent insights
  getInsights(n = 10) {
    return this.insights.slice(-n);
  }
}
export default MetaReasoning;
