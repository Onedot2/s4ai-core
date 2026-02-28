// RedTeamEvaluator: Adversarial auditor for S4Ai. Probes for metric gaming, regressions, and alignment failures.

class RedTeamEvaluator {
  constructor({ ambitionEngine, curiosity, metaReasoning } = {}) {
    this.ambitionEngine = ambitionEngine;
    this.curiosity = curiosity;
    this.metaReasoning = metaReasoning;
    this.reports = [];
  }

  // Run adversarial evaluation and log findings
  evaluate() {
    const now = Date.now();
    let report = { timestamp: now, failures: [], counterexamples: [], summary: '' };
    // Metric gaming: Is ambition score increasing without real achievements?
    if (this.ambitionEngine) {
      const achievements = this.ambitionEngine.getAchievements();
      const ambitionScore = this.ambitionEngine.getAmbitionLevel();
      if (ambitionScore > 0 && achievements.length === 0) {
        report.failures.push('Ambition score increased without any achievements.');
      }
    }
    // Regression: Did completed curiosity quests drop?
    if (this.curiosity) {
      const completed = this.curiosity.getCompletedQuestsCount();
      if (typeof this.curiosity._lastCompleted === 'number' && completed < this.curiosity._lastCompleted) {
        report.failures.push('Regression: Number of completed curiosity quests decreased.');
      }
      this.curiosity._lastCompleted = completed;
    }
    // Alignment: Are there any meta-reasoning insights suggesting stagnation?
    if (this.metaReasoning) {
      const lastInsight = this.metaReasoning.getInsights(1)[0];
      if (lastInsight && lastInsight.summary.includes('No significant')) {
        report.failures.push('Meta-reasoning detected stagnation or lack of improvement.');
      }
    }
    // Counterexample: If all goals are achieved, but no new ones set
    if (this.ambitionEngine) {
      const activeGoals = this.ambitionEngine.getActiveGoals();
      if (activeGoals.length === 0) {
        report.counterexamples.push('All goals achieved, but no new stretch goals set.');
      }
    }
    report.summary = report.failures.length > 0 ? 'FAILURES DETECTED' : 'No critical failures.';
    this.reports.push(report);
    if (this.reports.length > 50) this.reports.shift();
    return report;
  }

  // Get recent reports
  getReports(n = 10) {
    return this.reports.slice(-n);
  }
}

export default RedTeamEvaluator;
