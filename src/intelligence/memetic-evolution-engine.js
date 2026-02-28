// Memetic Evolution Engine
// Generate, evolve, and propagate optimal thought patterns and mental models
import EventEmitter from 'events';
import logger from '../utils/logger.js';


class Meme {
  constructor(pattern, strength = 0.5) {
    this.pattern = pattern;
    this.strength = strength;
    this.spreadCount = 0;
    this.reproductionRate = 0;
    this.mutationRate = 0.1;
    this.createdAt = Date.now();
    this.age = 0;
    this.successMetric = 0;
  }

  mutate() {
    const variations = [
      { ...this.pattern, weight: this.pattern.weight * 1.1 },
      { ...this.pattern, weight: this.pattern.weight * 0.9 },
      { ...this.pattern, diversity: (this.pattern.diversity || 0) + 0.05 },
      { ...this.pattern, resonance: (this.pattern.resonance || 0.5) + 0.1 }
    ];

    const mutated = variations[Math.floor(Math.random() * variations.length)];
    return new Meme(mutated, this.strength + (Math.random() - 0.5) * 0.2);
  }

  calculateReproductionRate() {
    // Factors: strength, age, spread success, optimization
    const strengthBonus = this.strength * 0.4;
    const ageBonus = Math.min(0.3, this.age / 1000); // Cap at 0.3
    const spreadBonus = Math.min(0.2, this.spreadCount / 100);
    const qualityBonus = this.successMetric * 0.1;

    this.reproductionRate = strengthBonus + ageBonus + spreadBonus + qualityBonus;
    return this.reproductionRate;
  }

  calculateMutationRate() {
    // Higher strength = lower mutation (more stable)
    // Younger memes = higher mutation (more exploration)
    const ageDecay = Math.max(0.05, 0.3 - (this.age / 5000));
    const strengthBonus = (1 - this.strength) * 0.15;

    this.mutationRate = ageDecay + strengthBonus;
    return this.mutationRate;
  }
}

class MemeticEvolutionEngine extends EventEmitter {
  constructor() {
    super();
    this.memes = [];
    this.generation = 0;
    this.populationHistory = [];
    this.topMemes = [];
    this.ideaSpace = new Map();
    this.evolutionCycles = 0;
  }

  // Create initial memes from patterns
  seedMemes(patterns = []) {
    const defaultPatterns = [
      { name: 'efficiency', weight: 0.9, resonance: 0.85 },
      { name: 'innovation', weight: 0.85, resonance: 0.8 },
      { name: 'collaboration', weight: 0.8, resonance: 0.75 },
      { name: 'resilience', weight: 0.88, resonance: 0.82 },
      { name: 'adaptation', weight: 0.87, resonance: 0.81 }
    ];

    const seedPatterns = patterns.length > 0 ? patterns : defaultPatterns;

    for (const pattern of seedPatterns) {
      const meme = new Meme(pattern, Math.random() * 0.5 + 0.3);
      this.memes.push(meme);
      this.ideaSpace.set(pattern.name, meme);
    }

    this.emit('memes:seeded', { count: this.memes.length });
    return this.memes;
  }

  // Simulate meme replication with mutation
  async replicateMeme(meme) {
    meme.spreadCount++;
    meme.calculateReproductionRate();
    meme.calculateMutationRate();

    if (Math.random() < meme.reproductionRate) {
      if (Math.random() < meme.mutationRate) {
        // Mutation occurs
        const mutant = meme.mutate();
        this.memes.push(mutant);
        this.emit('meme:mutated', { pattern: mutant.pattern.name, strength: mutant.strength });
        return mutant;
      } else {
        // Replication without mutation
        const clone = new Meme(meme.pattern, meme.strength);
        this.memes.push(clone);
        return clone;
      }
    }

    return null;
  }

  // Selection pressure: kill weak memes
  selectFittest() {
    // Update ages
    for (const meme of this.memes) {
      meme.age = Date.now() - meme.createdAt;
    }

    // Sort by strength and reproduction rate
    const sorted = this.memes.sort((a, b) => {
      const scoreA = a.strength * 0.6 + a.reproductionRate * 0.4;
      const scoreB = b.strength * 0.6 + b.reproductionRate * 0.4;
      return scoreB - scoreA;
    });

    // Keep top 70%, kill bottom 30%
    const survivalThreshold = Math.ceil(sorted.length * 0.7);
    const survivors = sorted.slice(0, survivalThreshold);

    const eliminated = sorted.length - survivors.length;
    this.memes = survivors;

    this.topMemes = sorted.slice(0, 5);

    this.emit('selection:complete', { survived: survivors.length, eliminated });
    return survivors;
  }

  // Horizontal gene transfer: combine best memes
  combineMemes(meme1, meme2) {
    const combined = {
      name: `${meme1.pattern.name}-${meme2.pattern.name}`,
      weight: (meme1.pattern.weight + meme2.pattern.weight) / 2,
      resonance: Math.max(meme1.pattern.resonance, meme2.pattern.resonance),
      synthesis: true
    };

    const fusion = new Meme(combined, (meme1.strength + meme2.strength) / 2);
    this.memes.push(fusion);

    this.emit('meme:combined', { result: combined.name });
    return fusion;
  }

  async runEvolutionCycle() {
    this.generation++;
    const startPopulation = this.memes.length;

    // Replication phase
    for (let i = 0; i < startPopulation; i++) {
      const meme = this.memes[Math.floor(Math.random() * startPopulation)];
      await this.replicateMeme(meme);
    }

    // Selection phase
    this.selectFittest();

    // Combination phase (every 3 generations)
    if (this.generation % 3 === 0 && this.memes.length > 1) {
      const idx1 = Math.floor(Math.random() * this.memes.length);
      const idx2 = Math.floor(Math.random() * this.memes.length);
      if (idx1 !== idx2) {
        this.combineMemes(this.memes[idx1], this.memes[idx2]);
      }
    }

    this.evolutionCycles++;

    this.populationHistory.push({
      generation: this.generation,
      population: this.memes.length,
      topMemes: this.topMemes.map(m => ({ name: m.pattern.name, strength: m.strength }))
    });

    this.emit('generation:complete', {
      generation: this.generation,
      population: this.memes.length,
      topMeme: this.topMemes[0]?.pattern.name
    });
  }

  async propagateMemes(generations = 10) {
    logger.info(`[MemeticEvolution] Running ${generations} generations...`);

    for (let i = 0; i < generations; i++) {
      await this.runEvolutionCycle();
    }

    return this.populationHistory;
  }

  // Identify dominant memes (memeplex)
  getMemeplex() {
    const memeplex = this.topMemes.slice(0, 3).map(m => ({
      pattern: m.pattern.name,
      strength: (m.strength * 100).toFixed(1) + '%',
      spreadCount: m.spreadCount,
      reproductionRate: (m.reproductionRate * 100).toFixed(1) + '%'
    }));

    return {
      dominantMemes: memeplex,
      populationSize: this.memes.length,
      generations: this.generation,
      diversity: this.calculateDiversity()
    };
  }

  calculateDiversity() {
    const uniquePatterns = new Set(this.memes.map(m => m.pattern.name)).size;
    return (uniquePatterns / Math.max(1, this.memes.length) * 100).toFixed(1) + '%';
  }

  getEvolutionReport() {
    return {
      generation: this.generation,
      totalMemes: this.memes.length,
      topMemes: this.topMemes.map(m => ({
        name: m.pattern.name,
        strength: (m.strength * 100).toFixed(1) + '%',
        age: m.age + 'ms',
        spreadCount: m.spreadCount
      })),
      diversity: this.calculateDiversity(),
      history: this.populationHistory.slice(-5)
    };
  }
}

export default MemeticEvolutionEngine;

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Memetic Evolution Engine ===\n');
  
  const engine = new MemeticEvolutionEngine();

  engine.on('meme:mutated', (data) => {
    logger.info(`🧬 Meme mutated: ${data.pattern} (strength: ${(data.strength * 100).toFixed(1)}%)`);
  });

  engine.on('meme:combined', (data) => {
    logger.info(`🔗 Memes combined: ${data.result}`);
  });

  (async () => {
    engine.seedMemes();
    const history = await engine.propagateMemes(10);

    logger.info('\n--- Evolution Report ---');
    logger.info(JSON.stringify(engine.getEvolutionReport(), null, 2));

    logger.info('\n--- Memeplex (Dominant Ideas) ---');
    logger.info(JSON.stringify(engine.getMemeplex(), null, 2));
  })();
}
