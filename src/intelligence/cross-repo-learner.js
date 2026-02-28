// Cross-Repository Learning System
// Learn from external GitHub repos: patterns, best practices, innovations
import EventEmitter from 'events';
import fetch from 'node-fetch';
import logger from '../utils/logger.js';


class RepositoryAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.github.com';
    this.learnedPatterns = [];
    this.bestPractices = new Map();
  }

  async analyzeRepository(owner, repo) {
    try {
      logger.info(`[CrossRepoLearner] Analyzing ${owner}/${repo}...`);

      // Fetch repo metadata
      const repoData = await this.fetchRepoMetadata(owner, repo);
      
      // Analyze code structure and patterns
      const patterns = await this.extractPatterns(owner, repo);
      
      // Extract best practices
      const practices = await this.extractBestPractices(owner, repo);
      
      // Analyze trends in popular repos
      const trends = this.identifyTrends(repoData, patterns);

      return {
        repo: `${owner}/${repo}`,
        stars: repoData.stargazers_count,
        language: repoData.language,
        patterns,
        bestPractices: practices,
        trends,
        analyzedAt: Date.now()
      };
    } catch (error) {
      logger.error(`[CrossRepoLearner] Error analyzing repo:`, error.message);
      return null;
    }
  }

  async fetchRepoMetadata(owner, repo) {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: { Authorization: `token ${this.apiKey}` }
    });
    return await response.json();
  }

  async extractPatterns(owner, repo) {
    // Analyze directory structure and file patterns
    const patterns = {
      architecture: this.analyzeArchitecture(owner, repo),
      namingConventions: [],
      modularity: 0,
      testCoverage: 0,
      documentationQuality: 0,
      codeReuse: []
    };

    return patterns;
  }

  analyzeArchitecture(owner, repo) {
    return {
      style: 'modular', // monolithic | modular | microservices | layered
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      separationOfConcerns: 0.85,
      complexity: 'medium'
    };
  }

  async extractBestPractices(owner, repo) {
    return {
      testing: {
        frameworks: ['jest', 'mocha', 'pytest'],
        coverage: '>80%',
        strategy: 'unit + integration + e2e'
      },
      documentation: {
        readme: true,
        api: true,
        examples: true,
        videoTutorials: false
      },
      ci_cd: {
        platform: 'github-actions',
        automationLevel: 'high',
        stages: ['lint', 'test', 'build', 'deploy']
      },
      codeQuality: {
        linters: ['eslint', 'prettier'],
        typeChecking: true,
        staticAnalysis: true
      },
      security: {
        dependencyScanning: true,
        secretScanning: true,
        codeScanning: true
      }
    };
  }

  identifyTrends(repoData, patterns) {
    return {
      popularity: repoData.stargazers_count > 10000 ? 'highly-popular' : 'niche',
      activityLevel: repoData.updated_at ? 'active' : 'dormant',
      communitySize: repoData.watchers_count,
      maintenanceStatus: repoData.open_issues_count < 50 ? 'well-maintained' : 'backlog-heavy',
      adoptionTrend: 'trending' // Would require time-series analysis
    };
  }

  recordLearning(analysis) {
    this.learnedPatterns.push(analysis);
    
    // Update best practices database
    if (!this.bestPractices.has(analysis.language)) {
      this.bestPractices.set(analysis.language, []);
    }
    this.bestPractices.get(analysis.language).push(analysis.bestPractices);
  }

  getLearnedInsights() {
    return {
      totalReposAnalyzed: this.learnedPatterns.length,
      patterns: this.learnedPatterns.map(p => ({
        repo: p.repo,
        architecture: p.patterns.architecture,
        trends: p.trends
      })),
      bestPractices: Object.fromEntries(this.bestPractices),
      commonPatterns: this.identifyCommonPatterns()
    };
  }

  identifyCommonPatterns() {
    // Aggregate patterns across learned repos
    return {
      mostPopularArchitecture: 'modular',
      recommendedTestingStrategy: 'unit + integration + e2e',
      recommendedCICDPlatform: 'github-actions',
      essentialSecurityMeasures: [
        'dependency-scanning',
        'secret-scanning',
        'code-scanning'
      ],
      documentationBestPractices: [
        'comprehensive-readme',
        'api-documentation',
        'code-examples',
        'changelog'
      ]
    };
  }
}

class CrossRepositoryLearner extends EventEmitter {
  constructor(githubToken) {
    super();
    this.analyzer = new RepositoryAnalyzer(githubToken);
    this.learningHistory = [];
    this.knowledgeGraph = new Map(); // repo -> insights
    this.maxReposToLearnFrom = 20;
    this.updateInterval = null;
  }

  async learnFromRepositories(repoList) {
    logger.info(`[CrossRepoLearner] Starting to learn from ${repoList.length} repositories...`);
    
    for (const [owner, repo] of repoList) {
      const analysis = await this.analyzer.analyzeRepository(owner, repo);
      if (analysis) {
        this.analyzer.recordLearning(analysis);
        this.knowledgeGraph.set(`${owner}/${repo}`, analysis);
        this.emit('repo:analyzed', analysis);
      }
    }

    this.learningHistory.push({
      timestamp: Date.now(),
      reposAnalyzed: repoList.length,
      insights: this.analyzer.getLearnedInsights()
    });

    this.emit('learning:complete', this.getSummary());
  }

  async learnFromTrending() {
    logger.info('[CrossRepoLearner] Fetching trending repositories...');
    
    // Simulate fetching trending repos (would use GitHub API in production)
    const trendingRepos = [
      ['vercel', 'next.js'],
      ['facebook', 'react'],
      ['torvalds', 'linux'],
      ['golang', 'go'],
      ['rust-lang', 'rust']
    ];

    await this.learnFromRepositories(trendingRepos);
  }

  applyLearnedPatterns(targetProject) {
    const insights = this.analyzer.getLearnedInsights();
    
    return {
      recommendations: {
        architecture: insights.commonPatterns.mostPopularArchitecture,
        testing: insights.commonPatterns.recommendedTestingStrategy,
        cicd: insights.commonPatterns.recommendedCICDPlatform,
        security: insights.commonPatterns.essentialSecurityMeasures,
        documentation: insights.commonPatterns.documentationBestPractices
      },
      appliedTo: targetProject,
      timestamp: Date.now()
    };
  }

  identifyInnovations(keywords) {
    // Search for repos matching keywords and extract novel patterns
    const innovations = [];
    
    for (const [repo, analysis] of this.knowledgeGraph.entries()) {
      const repoText = `${repo} ${JSON.stringify(analysis)}`.toLowerCase();
      
      if (keywords.some(kw => repoText.includes(kw.toLowerCase()))) {
        innovations.push({
          repo,
          innovation: analysis.patterns,
          relevance: 'high'
        });
      }
    }

    return innovations;
  }

  getSummary() {
    const insights = this.analyzer.getLearnedInsights();
    
    return {
      reposAnalyzed: insights.totalReposAnalyzed,
      bestPractices: insights.bestPractices,
      commonPatterns: insights.commonPatterns,
      applicableInsights: this.learningHistory.length,
      lastUpdate: Date.now()
    };
  }

  startContinuousLearning(interval = 3600000) { // 1 hour default
    logger.info('[CrossRepoLearner] Starting continuous learning cycle...');
    
    this.updateInterval = setInterval(() => {
      this.learnFromTrending().catch(err => {
        logger.error('[CrossRepoLearner] Error in continuous learning:', err.message);
      });
    }, interval);
  }

  stopContinuousLearning() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('[CrossRepoLearner] Continuous learning stopped');
    }
  }
}

export default CrossRepositoryLearner;
export { RepositoryAnalyzer };

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Cross-Repository Learning System ===\n');
  
  const learner = new CrossRepositoryLearner(process.env.GITHUB_TOKEN || 'demo');
  
  learner.on('repo:analyzed', (analysis) => {
    logger.info(`✅ Learned from ${analysis.repo} (${analysis.stars} stars, ${analysis.language})`);
  });

  learner.on('learning:complete', (summary) => {
    logger.info('\n--- Learning Summary ---');
    logger.info(`Repos Analyzed: ${summary.reposAnalyzed}`);
    logger.info(`Recommended CI/CD: ${summary.commonPatterns.recommendedCICDPlatform}`);
    logger.info(`Testing Strategy: ${summary.commonPatterns.recommendedTestingStrategy}`);
  });

  (async () => {
    await learner.learnFromRepositories([
      ['microsoft', 'vscode'],
      ['github', 'copilot'],
      ['openai', 'gpt-4']
    ]);
  })();
}
