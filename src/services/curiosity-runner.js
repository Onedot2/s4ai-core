/**
 * Curiosity Runner Service
 * Stub implementation for curiosity-driven quest system
 */

class CuriosityRunner {
  constructor() {
    this.quests = [];
  }

  getQuests() {
    return this.quests;
  }

  addQuest({ title, prompt, sources = [], priority = 'medium' }) {
    const quest = {
      id: Date.now().toString(),
      title: title || 'Untitled Quest',
      prompt,
      sources,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.quests.push(quest);
    return quest;
  }

  async runPending() {
    const pending = this.quests.filter(q => q.status === 'pending');
    return {
      processed: pending.length,
      timestamp: new Date().toISOString(),
      quests: pending.map(q => ({ ...q, status: 'completed' }))
    };
  }
}

export default CuriosityRunner;
