/**
 * File-Tree-of-Truth (FToT) - S4Ai's Multi-Repository Architectural Awareness System
 * 
 * Purpose: Provide instant (<100ms) architectural awareness across all S4Ai repositories
 * 
 * Features:
 * - Multi-repository scanner with GitHub API integration
 * - Recursive file tree generation with metadata
 * - Intelligent Redis caching (5-minute TTL)
 * - Rate limit handling (5000 req/hour for authenticated users)
 * - Cross-repository dependency mapping
 * - Pattern recognition and learning
 * 
 * Philosophy: "As-One" Shared Instant Trustworthy Truth
 * - Perfect memory of S4Ai's complete architecture
 * - Foundation for self-enhancing intelligence
 * - Precursor to autonomous site-map generation
 * 
 * Created: 2026-02-17
 */

import EventEmitter from 'events';
import { getGitHubService } from '../services/github-service.js';
import { getRedisConnection } from '../queue/redis-connection.js';
import logger from '../utils/logger.js';

class FileTreeOfTruth extends EventEmitter {
  constructor() {
    super();
    
    // Configured repositories to scan
    this.repositories = [
      'Onedot2/pwai-api-service',
      'Onedot2/pwai-ai-worker',
      // 'Onedot2/ai-worker-queue',  // Removed - repo doesn't exist (404)
      'Onedot2/pwai-controller',
      'Onedot2/pwai-frontend'
    ];

    this.config = {
      cacheTTL: parseInt(process.env.FTOT_CACHE_TTL) || 300, // 5 minutes default
      scanInterval: parseInt(process.env.FTOT_SCAN_INTERVAL) || 3600, // 1 hour default
      maxDepth: parseInt(process.env.FTOT_MAX_DEPTH) || 10
    };

    this.cache = new Map();
    this.githubService = null;
    this.redisClient = null;
    this.initialized = false;
    
    this.stats = {
      totalScans: 0,
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastScanTime: null,
      lastScanDuration: 0
    };

    logger.info('[FToT] File-Tree-of-Truth initialized');
  }

  /**
   * Initialize FToT system
   */
  async initialize() {
    try {
      logger.info('[FToT] Starting initialization...');

      // Initialize GitHub service
      this.githubService = getGitHubService();
      const githubReady = await this.githubService.initialize();
      
      if (!githubReady) {
        logger.warn('[FToT] GitHub service initialization failed - FToT will have limited functionality');
      }

      // Initialize Redis connection
      this.redisClient = getRedisConnection('ftot');
      
      if (this.redisClient) {
        try {
          await this.redisClient.connect();
          logger.info('[FToT] Redis connection established');
        } catch (error) {
          logger.warn('[FToT] Redis connection failed - using in-memory cache only:', error.message);
          this.redisClient = null;
        }
      } else {
        logger.warn('[FToT] Redis not configured - using in-memory cache only');
      }

      this.initialized = true;
      logger.info('[FToT] Initialization complete');
      this.emit('initialized');

      return true;
    } catch (error) {
      logger.error('[FToT] Initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure FToT is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }

  /**
   * Scan all configured repositories
   */
  async scanAllRepos() {
    await this.ensureInitialized();
    
    const startTime = Date.now();
    logger.info('[FToT] Starting scan of all repositories...');

    const results = [];
    
    for (const repoFullName of this.repositories) {
      const [owner, repo] = repoFullName.split('/');
      const result = await this.scanRepository(owner, repo);
      results.push({
        repository: repoFullName,
        ...result
      });
    }

    this.stats.totalScans++;
    this.stats.lastScanTime = new Date().toISOString();
    this.stats.lastScanDuration = Date.now() - startTime;

    logger.info(`[FToT] Scan complete in ${this.stats.lastScanDuration}ms`);
    this.emit('scan:complete', { results, duration: this.stats.lastScanDuration });

    return {
      success: true,
      repositories: results,
      duration: this.stats.lastScanDuration,
      timestamp: this.stats.lastScanTime
    };
  }

  /**
   * Scan a single repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch to scan (default: main)
   */
  async scanRepository(owner, repo, branch = 'main') {
    await this.ensureInitialized();

    try {
      logger.info(`[FToT] Scanning ${owner}/${repo}@${branch}...`);

      // Get repository info
      const repoInfo = await this.githubService.getRepoInfo(owner, repo);
      
      if (!repoInfo.success) {
        return {
          success: false,
          error: repoInfo.error
        };
      }

      // Use actual default branch
      const actualBranch = repoInfo.default_branch || branch;

      // Get file tree
      const treeResult = await this.getFileTree(`${owner}/${repo}`, '', actualBranch, true);

      if (!treeResult.success) {
        return {
          success: false,
          error: treeResult.error
        };
      }

      const scanResult = {
        success: true,
        repository: {
          owner,
          repo,
          full_name: `${owner}/${repo}`,
          description: repoInfo.description,
          default_branch: actualBranch,
          language: repoInfo.language,
          topics: repoInfo.topics
        },
        tree: treeResult.tree,
        metadata: {
          scannedAt: new Date().toISOString(),
          fileCount: treeResult.tree.length,
          branch: actualBranch
        }
      };

      // Cache the result
      await this.setCachedTree(`scan:${owner}:${repo}:${actualBranch}`, scanResult);

      return scanResult;
    } catch (error) {
      logger.error(`[FToT] Failed to scan ${owner}/${repo}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file tree for a repository
   * @param {string} repo - Repository in format 'owner/repo'
   * @param {string} path - Path within repository
   * @param {string} branch - Branch name
   * @param {boolean} recursive - Get recursive tree
   */
  async getFileTree(repo, path = '', branch = 'main', recursive = true) {
    await this.ensureInitialized();

    const [owner, repoName] = repo.split('/');
    const cacheKey = `tree:${owner}:${repoName}:${branch}:${path || 'root'}`;

    // Check cache first for instant recall (<100ms)
    const cached = await this.getCachedTree(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      this.stats.totalQueries++;
      return cached;
    }

    this.stats.cacheMisses++;
    this.stats.totalQueries++;

    try {
      const result = await this.githubService.getRepoTree(owner, repoName, branch, recursive);

      if (result.success) {
        const enrichedResult = {
          success: true,
          tree: result.tree.map(item => ({
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            url: item.url
          })),
          metadata: {
            ...result.metadata,
            cached: false,
            timestamp: new Date().toISOString()
          }
        };

        // Cache for future instant recall
        await this.setCachedTree(cacheKey, enrichedResult);

        return enrichedResult;
      } else {
        return result;
      }
    } catch (error) {
      logger.error(`[FToT] Failed to get tree for ${repo}:`, error);
      return {
        success: false,
        error: error.message,
        tree: []
      };
    }
  }

  /**
   * Search across all configured repositories
   * @param {string} query - Search query
   */
  async searchAcrossRepos(query) {
    await this.ensureInitialized();

    const cacheKey = `search:${Buffer.from(query).toString('base64')}`;
    
    // Check cache
    const cached = await this.getCachedTree(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    try {
      const result = await this.githubService.searchCode(query, this.repositories);

      if (result.success) {
        const searchResult = {
          success: true,
          query,
          total_count: result.total_count,
          results: result.items,
          timestamp: new Date().toISOString()
        };

        // Cache search results
        await this.setCachedTree(cacheKey, searchResult, 60); // Shorter TTL for searches

        return searchResult;
      } else {
        return result;
      }
    } catch (error) {
      logger.error('[FToT] Search failed:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Generate unified codebase map across all repositories
   */
  async generateCodebaseMap() {
    await this.ensureInitialized();

    const cacheKey = 'map:unified';
    
    // Check cache
    const cached = await this.getCachedTree(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    try {
      logger.info('[FToT] Generating unified codebase map...');

      const map = {
        repositories: [],
        relationships: [],
        statistics: {
          totalRepos: this.repositories.length,
          totalFiles: 0,
          languages: {},
          topics: []
        },
        timestamp: new Date().toISOString()
      };

      // Scan all repositories
      for (const repoFullName of this.repositories) {
        const [owner, repo] = repoFullName.split('/');
        const scanResult = await this.scanRepository(owner, repo);

        if (scanResult.success) {
          map.repositories.push({
            full_name: repoFullName,
            ...scanResult.repository,
            fileCount: scanResult.metadata.fileCount
          });

          map.statistics.totalFiles += scanResult.metadata.fileCount;

          // Aggregate languages
          if (scanResult.repository.language) {
            map.statistics.languages[scanResult.repository.language] = 
              (map.statistics.languages[scanResult.repository.language] || 0) + 1;
          }

          // Aggregate topics
          if (scanResult.repository.topics) {
            map.statistics.topics.push(...scanResult.repository.topics);
          }
        }
      }

      // Deduplicate topics
      map.statistics.topics = [...new Set(map.statistics.topics)];

      // Cache the unified map
      await this.setCachedTree(cacheKey, { success: true, map }, 600); // 10 minute TTL

      return { success: true, map };
    } catch (error) {
      logger.error('[FToT] Failed to generate codebase map:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect architectural drift across repositories
   */
  async detectDrift() {
    await this.ensureInitialized();

    try {
      logger.info('[FToT] Detecting architectural drift...');

      const drifts = [];
      const repoScans = [];

      // Scan all repositories
      for (const repoFullName of this.repositories) {
        const [owner, repo] = repoFullName.split('/');
        const scanResult = await this.scanRepository(owner, repo);
        
        if (scanResult.success) {
          repoScans.push(scanResult);
        } else {
          drifts.push({
            type: 'scan_failure',
            severity: 'high',
            repository: repoFullName,
            message: `Failed to scan repository: ${scanResult.error}`
          });
        }
      }

      // Detect common architectural patterns
      const packageJsonFiles = repoScans.filter(scan => 
        scan.tree.some(item => item.path === 'package.json')
      );

      if (packageJsonFiles.length !== repoScans.length) {
        drifts.push({
          type: 'missing_file',
          severity: 'medium',
          message: 'Not all repositories have package.json',
          affected: repoScans
            .filter(scan => !scan.tree.some(item => item.path === 'package.json'))
            .map(scan => scan.repository.full_name)
        });
      }

      // Detect README presence
      const readmeFiles = repoScans.filter(scan =>
        scan.tree.some(item => item.path.toLowerCase() === 'readme.md')
      );

      if (readmeFiles.length !== repoScans.length) {
        drifts.push({
          type: 'missing_documentation',
          severity: 'low',
          message: 'Not all repositories have README.md',
          affected: repoScans
            .filter(scan => !scan.tree.some(item => item.path.toLowerCase() === 'readme.md'))
            .map(scan => scan.repository.full_name)
        });
      }

      return {
        success: true,
        drifts,
        scannedRepositories: repoScans.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[FToT] Drift detection failed:', error);
      return {
        success: false,
        error: error.message,
        drifts: []
      };
    }
  }

  /**
   * Get cached tree from Redis or in-memory cache
   * @param {string} key - Cache key
   */
  async getCachedTree(key) {
    // Try Redis first
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(`ftot:${key}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('[FToT] Redis get failed:', error.message);
      }
    }

    // Fallback to in-memory cache
    const memCached = this.cache.get(key);
    if (memCached && memCached.expires > Date.now()) {
      return memCached.data;
    }

    return null;
  }

  /**
   * Set cached tree in Redis and in-memory cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  async setCachedTree(key, data, ttl = null) {
    const actualTTL = ttl || this.config.cacheTTL;

    // Store in Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setex(`ftot:${key}`, actualTTL, JSON.stringify(data));
      } catch (error) {
        logger.warn('[FToT] Redis set failed:', error.message);
      }
    }

    // Store in memory
    this.cache.set(key, {
      data,
      expires: Date.now() + (actualTTL * 1000)
    });
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    // Clear in-memory cache
    this.cache.clear();

    // Clear Redis cache
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('ftot:*');
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        logger.info(`[FToT] Cleared ${keys.length} cached entries`);
      } catch (error) {
        logger.warn('[FToT] Redis cache clear failed:', error.message);
      }
    }

    return { success: true, message: 'Cache cleared' };
  }

  /**
   * Get FToT statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalQueries > 0 
        ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2) + '%'
        : '0%',
      repositories: this.repositories,
      config: this.config,
      githubStatus: this.githubService?.getStatus() || { initialized: false },
      redisConnected: Boolean(this.redisClient)
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      initialized: this.initialized,
      github: this.githubService?.getStatus() || { initialized: false },
      redis: Boolean(this.redisClient),
      stats: this.stats,
      timestamp: new Date().toISOString()
    };

    // Check GitHub rate limit
    if (this.githubService) {
      const rateLimit = await this.githubService.getRateLimitStatus();
      health.github.rateLimit = rateLimit;
      
      if (rateLimit.remaining < 100) {
        health.status = 'degraded';
        health.warning = 'GitHub rate limit low';
      }
    }

    return health;
  }
}

// Singleton instance
let ftotInstance = null;

export async function getFileTreeOfTruth() {
  if (!ftotInstance) {
    ftotInstance = new FileTreeOfTruth();
    await ftotInstance.initialize();
  }
  return ftotInstance;
}

export default FileTreeOfTruth;
