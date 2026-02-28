/**
 * Multi-Repository Cross-Learning Engine
 * Scans multiple GitHub repositories
 * Extracts patterns, aggregates insights
 * Enables knowledge transfer between repos
 * Creates learning graph
 */

import logger from '../utils/logger.js';

export class MultiRepoLearner {
  constructor(config = {}) {
    this.config = {
      gitHubToken: config.gitHubToken || process.env.GITHUB_TOKEN,
      maxRepos: config.maxRepos || 10,
      patternThreshold: config.patternThreshold || 0.6
    };

    this.discoveredRepos = [];
    this.patterns = new Map();
    this.learningGraph = new Map();
    this.insightCache = new Map();

    logger.info('[MultiRepoLearner] Engine initialized');
  }

  /**
   * Discover repositories based on criteria
   */
  async discoverRepositories(criteria = { language: 'javascript', topic: 'ai' }) {
    try {
      logger.info(`[MultiRepoLearner] Discovering repos with criteria:`, criteria);

      // Simulated GitHub search (would use GitHub API in production)
      const mockRepos = [
        { owner: 'openai', repo: 'gpt-3-examples', stars: 5000, language: 'python' },
        { owner: 'microsoft', repo: 'semantic-kernel', stars: 3500, language: 'csharp' },
        { owner: 'langchain-ai', repo: 'langchain', stars: 50000, language: 'python' },
        { owner: 'huggingface', repo: 'transformers', stars: 120000, language: 'python' },
        { owner: 'pytorch', repo: 'pytorch', stars: 70000, language: 'cpp' }
      ];

      this.discoveredRepos = mockRepos.slice(0, this.config.maxRepos);

      logger.info(`[MultiRepoLearner] Discovered ${this.discoveredRepos.length} repositories`);
      return this.discoveredRepos;
    } catch (error) {
      logger.error('[MultiRepoLearner] Discovery error:', error.message);
      return [];
    }
  }

  /**
   * Extract patterns from repository structure and code
   */
  async extractPatterns(repo) {
    try {
      const patterns = {
        architecturePatterns: [],
        codingPatterns: [],
        deploymentPatterns: [],
        testingPatterns: [],
        documentationPatterns: []
      };

      // Analyze repository metadata
      const repoKey = `${repo.owner}/${repo.repo}`;

      // Architecture pattern detection
      if (repo.stars > 10000) {
        patterns.architecturePatterns.push('modular-design');
        patterns.architecturePatterns.push('plugin-system');
      }

      if (repo.language === 'python') {
        patterns.codingPatterns.push('functional-programming');
        patterns.codingPatterns.push('type-hints');
      }

      // Deployment patterns
      patterns.deploymentPatterns.push('ci-cd');
      patterns.deploymentPatterns.push('containerization');

      // Store patterns
      this.patterns.set(repoKey, patterns);

      logger.info(`[MultiRepoLearner] Extracted patterns from ${repoKey}`);
      return patterns;
    } catch (error) {
      logger.error('[MultiRepoLearner] Pattern extraction error:', error.message);
      return {};
    }
  }

  /**
   * Find transferable patterns across repos
   */
  async findTransferablePatterns() {
    try {
      const transferable = [];

      // Collect all patterns
      const allPatterns = {};
      for (const patterns of this.patterns.values()) {
        for (const [category, patternList] of Object.entries(patterns)) {
          if (!allPatterns[category]) allPatterns[category] = {};
          for (const pattern of patternList) {
            allPatterns[category][pattern] = (allPatterns[category][pattern] || 0) + 1;
          }
        }
      }

      // Find patterns that appear in multiple repos
      for (const [category, patterns] of Object.entries(allPatterns)) {
        for (const [pattern, count] of Object.entries(patterns)) {
          const transferability = count / this.patterns.size;
          if (transferability >= this.config.patternThreshold) {
            transferable.push({
              category,
              pattern,
              transferability,
              applicableRepos: count
            });
          }
        }
      }

      logger.info(`[MultiRepoLearner] Found ${transferable.length} transferable patterns`);
      return transferable;
    } catch (error) {
      logger.error('[MultiRepoLearner] Transferability analysis error:', error.message);
      return [];
    }
  }

  /**
   * Build learning graph: nodes = repos, edges = pattern similarity
   */
  buildLearningGraph() {
    try {
      // Create nodes for each repo
      const nodes = this.discoveredRepos.map(repo => ({
        id: `${repo.owner}/${repo.repo}`,
        label: repo.repo,
        stars: repo.stars,
        language: repo.language
      }));

      // Create edges based on pattern similarity
      const edges = [];
      const patternArray = Array.from(this.patterns.entries());

      for (let i = 0; i < patternArray.length; i++) {
        for (let j = i + 1; j < patternArray.length; j++) {
          const [repoA, patternsA] = patternArray[i];
          const [repoB, patternsB] = patternArray[j];

          // Calculate similarity
          const similarity = this.calculatePatternSimilarity(patternsA, patternsB);

          if (similarity > 0.3) {
            edges.push({
              source: repoA,
              target: repoB,
              weight: similarity,
              label: `${(similarity * 100).toFixed(0)}%`
            });
          }
        }
      }

      this.learningGraph = {
        nodes,
        edges,
        timestamp: new Date().toISOString()
      };

      logger.info(`[MultiRepoLearner] Learning graph built: ${nodes.length} nodes, ${edges.length} edges`);
      return this.learningGraph;
    } catch (error) {
      logger.error('[MultiRepoLearner] Graph building error:', error.message);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Calculate pattern similarity between two repos
   */
  calculatePatternSimilarity(patternsA, patternsB) {
    const flatA = Object.values(patternsA).flat();
    const flatB = Object.values(patternsB).flat();

    const setA = new Set(flatA);
    const setB = new Set(flatB);

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Generate insights from cross-repo learning
   */
  async generateInsights() {
    try {
      const insights = {
        commonPatterns: [],
        bestPractices: [],
        emergingTrends: [],
        recommendations: []
      };

      // Discover common patterns
      const patternFrequency = {};
      for (const patterns of this.patterns.values()) {
        for (const patternList of Object.values(patterns)) {
          for (const pattern of patternList) {
            patternFrequency[pattern] = (patternFrequency[pattern] || 0) + 1;
          }
        }
      }

      insights.commonPatterns = Object.entries(patternFrequency)
        .filter(([_, count]) => count > 1)
        .map(([pattern, count]) => ({
          pattern,
          frequency: count,
          adoption: `${(count / this.patterns.size * 100).toFixed(0)}%`
        }));

      // Best practices from high-star repos
      const topRepos = this.discoveredRepos.sort((a, b) => b.stars - a.stars).slice(0, 3);
      for (const repo of topRepos) {
        const key = `${repo.owner}/${repo.repo}`;
        const repoPatterns = this.patterns.get(key) || {};
        insights.bestPractices.push({
          repo: repo.repo,
          patterns: repoPatterns,
          stars: repo.stars
        });
      }

      // Recommendations for S4Ai
      if (insights.commonPatterns.length > 0) {
        insights.recommendations.push(`Adopt: ${insights.commonPatterns[0].pattern}`);
      }
      if (this.learningGraph.edges) {
        insights.recommendations.push(`Integrate patterns from high-similarity repos`);
      }

      this.insightCache.set('latest', insights);

      logger.info(`[MultiRepoLearner] Generated insights`);
      return insights;
    } catch (error) {
      logger.error('[MultiRepoLearner] Insight generation error:', error.message);
      return {};
    }
  }

  /**
   * Run full learning cycle
   */
  async runLearningCycle(criteria) {
    try {
      logger.info('[MultiRepoLearner] Starting learning cycle...');

      // Discover repos
      await this.discoverRepositories(criteria);

      // Extract patterns from each repo
      for (const repo of this.discoveredRepos) {
        await this.extractPatterns(repo);
      }

      // Find transferable patterns
      await this.findTransferablePatterns();

      // Build learning graph
      this.buildLearningGraph();

      // Generate insights
      const insights = await this.generateInsights();

      logger.info('[MultiRepoLearner] Learning cycle complete');

      return {
        reposAnalyzed: this.discoveredRepos.length,
        patternsFound: this.patterns.size,
        graphEdges: this.learningGraph.edges?.length || 0,
        insights
      };
    } catch (error) {
      logger.error('[MultiRepoLearner] Learning cycle error:', error.message);
      throw error;
    }
  }

  /**
   * Get learning graph visualization
   */
  getGraphVisualization() {
    return this.learningGraph;
  }

  /**
   * Get cached insights
   */
  getInsights() {
    return this.insightCache.get('latest') || {};
  }
}

export default MultiRepoLearner;
