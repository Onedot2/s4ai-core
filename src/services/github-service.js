/**
 * GitHub Service
 * Provides GitHub API integration for FToT (File-Tree-of-Truth)
 * Uses @octokit/rest for repository scanning and code search
 */

import { Octokit } from '@octokit/rest';
import logger from '../utils/logger.js';

class GitHubService {
  constructor() {
    this.octokit = null;
    this.initialized = false;
    this.rateLimitRemaining = 5000;
    this.rateLimitReset = null;
  }

  /**
   * Initialize GitHub client with token
   * HARDCODED REQUIREMENT: GH_PAT (GitHub Personal Access Token)
   * Required for multi-repo scope in unified S4Ai Railway project
   * User confirmed: "always monitoring with manual override"
   */
  async initialize() {
    try {
      // CRITICAL: GH_PAT is HARDCODED requirement for S4Ai unified system
      const token = process.env.GH_PAT || process.env.GITHUB_TOKEN || process.env.GH_PAT_KEY;
      
      if (!token) {
        logger.error('[GitHub Service] ❌ CRITICAL: No GitHub PAT (GH_PAT) configured - REQUIRED for multi-repo access');
        this.initialized = false;
        return false;
      }

      this.octokit = new Octokit({
        auth: token,
        userAgent: 'S4Ai-FToT/1.0.0'
      });

      // Test the connection
      const { data: user } = await this.octokit.users.getAuthenticated();
      logger.info(`[GitHub Service] Authenticated as ${user.login}`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('[GitHub Service] Initialization failed:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure service is initialized before use
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }

  /**
   * Get repository tree using GitHub API
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Branch/commit SHA (default: 'main')
   * @param {boolean} recursive - Get recursive tree
   */
  async getRepoTree(owner, repo, sha = 'main', recursive = true) {
    if (!await this.ensureInitialized()) {
      throw new Error('GitHub Service not initialized - missing token');
    }

    try {
      // First, get the default branch if sha is 'main' or 'master'
      if (sha === 'main' || sha === 'master') {
        const { data: repoData } = await this.octokit.repos.get({ owner, repo });
        sha = repoData.default_branch;
      }

      // Get the commit to get the tree SHA
      const { data: commit } = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      const treeSha = commit.commit.tree.sha;

      // Get the tree
      const { data: tree } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: recursive ? 'true' : 'false'
      });

      // Update rate limit info
      await this.updateRateLimitInfo();

      return {
        success: true,
        tree: tree.tree,
        sha: treeSha,
        truncated: tree.truncated,
        metadata: {
          owner,
          repo,
          branch: sha,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`[GitHub Service] Failed to get tree for ${owner}/${repo}:`, error.message);
      return {
        success: false,
        error: error.message,
        tree: []
      };
    }
  }

  /**
   * Get specific file content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Branch/tag reference
   */
  async getFileContent(owner, repo, path, ref = 'main') {
    if (!await this.ensureInitialized()) {
      throw new Error('GitHub Service not initialized - missing token');
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      await this.updateRateLimitInfo();

      if (data.type === 'file') {
        return {
          success: true,
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          size: data.size,
          sha: data.sha,
          path: data.path
        };
      } else {
        return {
          success: false,
          error: 'Path is not a file'
        };
      }
    } catch (error) {
      logger.error(`[GitHub Service] Failed to get file ${owner}/${repo}/${path}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search code across repositories
   * @param {string} query - Search query
   * @param {Array<string>} repos - Repository filters (e.g., ['Onedot2/pwai-api-service'])
   */
  async searchCode(query, repos = []) {
    if (!await this.ensureInitialized()) {
      throw new Error('GitHub Service not initialized - missing token');
    }

    try {
      let fullQuery = query;
      
      // Add repo filters to query
      if (repos.length > 0) {
        const repoFilters = repos.map(repo => `repo:${repo}`).join(' ');
        fullQuery = `${query} ${repoFilters}`;
      }

      const { data } = await this.octokit.search.code({
        q: fullQuery,
        per_page: 30
      });

      await this.updateRateLimitInfo();

      return {
        success: true,
        total_count: data.total_count,
        items: data.items.map(item => ({
          repository: item.repository.full_name,
          path: item.path,
          name: item.name,
          sha: item.sha,
          url: item.html_url
        }))
      };
    } catch (error) {
      logger.error('[GitHub Service] Code search failed:', error.message);
      return {
        success: false,
        error: error.message,
        items: []
      };
    }
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  async getRepoInfo(owner, repo) {
    if (!await this.ensureInitialized()) {
      throw new Error('GitHub Service not initialized - missing token');
    }

    try {
      const { data } = await this.octokit.repos.get({ owner, repo });

      await this.updateRateLimitInfo();

      return {
        success: true,
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        default_branch: data.default_branch,
        language: data.language,
        size: data.size,
        created_at: data.created_at,
        updated_at: data.updated_at,
        topics: data.topics
      };
    } catch (error) {
      logger.error(`[GitHub Service] Failed to get repo info for ${owner}/${repo}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update rate limit information
   */
  async updateRateLimitInfo() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitRemaining = data.rate.remaining;
      this.rateLimitReset = new Date(data.rate.reset * 1000);
    } catch (error) {
      logger.warn('[GitHub Service] Failed to get rate limit:', error.message);
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus() {
    if (!await this.ensureInitialized()) {
      return {
        initialized: false,
        remaining: 0,
        reset: null
      };
    }

    await this.updateRateLimitInfo();

    return {
      initialized: true,
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
      limit: 5000 // Authenticated users get 5000 req/hour
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasToken: Boolean(process.env.GH_PAT || process.env.GITHUB_TOKEN || process.env.GH_PAT_KEY),
      tokenPriority: process.env.GH_PAT ? 'GH_PAT (✅ REQUIRED)' : 'Fallback token',
      hardcodedRequirement: 'GH_PAT env var for multi-repo scope',
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitReset: this.rateLimitReset
    };
  }
}

// Singleton instance
let githubServiceInstance = null;

export function getGitHubService() {
  if (!githubServiceInstance) {
    githubServiceInstance = new GitHubService();
  }
  return githubServiceInstance;
}

export default GitHubService;
