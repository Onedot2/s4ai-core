// Curiosity: Drives S4Ai to explore unknowns, generate research tasks, and learn from outcomes.

class Curiosity {
  constructor({ researchEngine, maxConcurrentQuests = 3, genesisProtocol = null, middleware = null } = {}) {
    this.researchEngine = researchEngine; // Reference to the research engine
    this.maxConcurrentQuests = maxConcurrentQuests;
    this.quests = []; // Active and completed curiosity quests
    this.completedQuests = [];
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
      quests: this.quests,
      completedQuests: this.completedQuests,
      genesisProtocol: !!this.genesisProtocol,
      timestamp: Date.now()
    };
  }

  // Generate a new curiosity quest (e.g., after waking, or when a goal is achieved)
  generateQuest(prompt) {
    const quest = {
      id: Date.now() + Math.random(),
      prompt,
      status: 'pending',
      result: null,
      createdAt: Date.now(),
      completedAt: null
    };
    this.quests.push(quest);
    return quest;
  }

  // Launch all pending quests (up to maxConcurrentQuests)
  async pursueQuests() {
    const pending = this.quests.filter(q => q.status === 'pending').slice(0, this.maxConcurrentQuests);
    for (const quest of pending) {
      quest.status = 'in-progress';
      try {
        if (this.researchEngine && typeof this.researchEngine.research === 'function') {
          quest.result = await this.researchEngine.research(quest.prompt);
        } else {
          quest.result = 'No research engine available.';
        }
        quest.status = 'completed';
        quest.completedAt = Date.now();
        this.completedQuests.push(quest);
      } catch (err) {
        quest.status = 'failed';
        quest.result = err.message;
      }
    }
  }

  // Get the number of completed quests (for ambition integration)
  getCompletedQuestsCount() {
    return this.completedQuests.length;
  }

  // Suggest new curiosity prompts (could be random, based on logs, or ambition)
  suggestPrompts() {
    return [
      "What new technologies could improve S4Ai's performance?",
      "Are there security vulnerabilities in the current codebase?",
      "What are the latest trends in autonomous software?",
      "How can S4Ai optimize its revenue strategies?",
      "What features are users requesting most?"
    ];
  }

  // Utility: Add a random curiosity quest
  addRandomQuest() {
    const prompts = this.suggestPrompts();
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    return this.generateQuest(prompt);
  }
}
export default Curiosity;
