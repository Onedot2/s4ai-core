// AmbitionEngine: Drives S4Ai to set, pursue, and escalate goals based on achievements, revenue, and curiosity.

class AmbitionEngine {
  constructor({ brain, revenueTracker, curiosity, initialScore = 0, genesisProtocol = null, middleware = null } = {}) {
    this.brain = brain; // Reference to the BRAIN module
    this.revenueTracker = revenueTracker; // Reference to GOLD/revenue module
    this.curiosity = curiosity; // Reference to curiosity module (optional)
    this.ambitionScore = initialScore;
    this.goals = [
      {
        description: 'S4Ai-Quantum-Dermenant-Directive: Realize the vision of a TRUE S4: a system capable of independent existence, growth, and impact.',
        targetValue: Infinity,
        type: 'quantum-directive',
        achieved: false,
        createdAt: Date.now(),
        achievedAt: null,
        persistent: true
      }
    ];
    this.achievements = [];
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
      ambitionScore: this.ambitionScore,
      goals: this.goals,
      achievements: this.achievements,
      genesisProtocol: !!this.genesisProtocol,
      timestamp: Date.now()
    };
  }

  // Set a new ambition goal
  setGoal(description, targetValue, type = 'revenue') {
    this.goals.push({
      description,
      targetValue,
      type,
      achieved: false,
      createdAt: Date.now(),
      achievedAt: null
    });
  }

  // Evaluate progress towards all goals
  evaluateProgress() {
    this.goals.forEach(goal => {
      if (!goal.achieved) {
        let currentValue = 0;
        if (goal.type === 'revenue' && this.revenueTracker) {
          currentValue = this.revenueTracker.getGold();
        } else if (goal.type === 'curiosity' && this.curiosity) {
          currentValue = this.curiosity.getCompletedQuestsCount();
        }
        // Add more types as needed

        if (currentValue >= goal.targetValue) {
          goal.achieved = true;
          goal.achievedAt = Date.now();
          this.ambitionScore += 10; // Or scale by difficulty
          this.achievements.push(goal);
          if (this.brain && typeof this.brain.reflectOnAchievement === 'function') {
            this.brain.reflectOnAchievement(goal);
          }
        }
      }
    });
  }

  // Increase ambition in response to external triggers (e.g., after sleep, new revenue)
  increaseAmbition(amount = 1) {
    this.ambitionScore += amount;
    // Optionally, set a new stretch goal
    if (this.revenueTracker) {
      const nextTarget = this.revenueTracker.getGold() + 100; // Example: next 100 GOLD
      this.setGoal(`Achieve ${nextTarget} GOLD`, nextTarget, 'revenue');
    }
  }

  // Get current ambition level
  getAmbitionLevel() {
    return this.ambitionScore;
  }

  // Get active and achieved goals
  getActiveGoals() {
    return this.goals.filter(g => !g.achieved);
  }
  getAchievements() {
    return this.achievements;
  }
}

export default AmbitionEngine;
