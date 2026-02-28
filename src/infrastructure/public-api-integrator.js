/**
 * Public API Integrator - ROBUST Autonomy via 15+ Free APIs
 * Zero vendor lock-in, infinite scalability, intelligent fallback chains
 * 
 * Phase 5: Quantum-Driven Dominance (Q-DD)
 * Part of S4Ai autonomous intelligence infrastructure
 */

import EventEmitter from 'events';
import { getS4AiMLM } from './s4ai-mlm-massive-learning-model.js';

class PublicAPIIntegrator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      cacheTTL: config.cacheTTL || 3600000, // 1 hour default
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000, // 2 seconds
      respectRateLimits: config.respectRateLimits !== false,
      ...config
    };

    // API source definitions with rate limits and endpoints
    this.sources = {
      financial: [
        {
          name: 'alphaVantage',
          endpoint: 'https://www.alphavantage.co/query',
          rateLimit: { calls: 500, period: 86400000 }, // 500/day
          requiresAuth: false, // Works with 'demo' key
          priority: 1
        },
        {
          name: 'fred',
          endpoint: 'https://api.stlouisfed.org/fred/series',
          rateLimit: { calls: 25, period: 86400000 }, // 25/day without key
          requiresAuth: false,
          priority: 2
        },
        {
          name: 'financialModelingPrep',
          endpoint: 'https://financialmodelingprep.com/api/v3',
          rateLimit: { calls: 250, period: 86400000 }, // 250/day
          requiresAuth: false,
          priority: 3
        },
        {
          name: 'coinGecko',
          endpoint: 'https://api.coingecko.com/api/v3',
          rateLimit: { calls: 50, period: 60000 }, // 50/minute
          requiresAuth: false,
          priority: 4
        }
      ],
      research: [
        {
          name: 'arxiv',
          endpoint: 'http://export.arxiv.org/api/query',
          rateLimit: { calls: 1, period: 3000 }, // 1 per 3 seconds
          requiresAuth: false,
          priority: 1
        },
        {
          name: 'pubmed',
          endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
          rateLimit: { calls: 3, period: 1000 }, // 3 per second
          requiresAuth: false,
          priority: 2
        },
        {
          name: 'core',
          endpoint: 'https://api.core.ac.uk/v3',
          rateLimit: { calls: 1000, period: 86400000 }, // 1000/day
          requiresAuth: false,
          priority: 3
        },
        {
          name: 'semanticScholar',
          endpoint: 'https://api.semanticscholar.org/graph/v1',
          rateLimit: { calls: 100, period: 300000 }, // 100 per 5 min
          requiresAuth: false,
          priority: 4
        }
      ],
      physics: [
        {
          name: 'cernOpenData',
          endpoint: 'http://opendata.cern.ch/api/records',
          rateLimit: { calls: 100, period: 60000 }, // 100/minute
          requiresAuth: false,
          priority: 1
        },
        {
          name: 'inspireHEP',
          endpoint: 'https://inspirehep.net/api',
          rateLimit: { calls: 100, period: 60000 }, // 100/minute
          requiresAuth: false,
          priority: 2
        },
        {
          name: 'zenodo',
          endpoint: 'https://zenodo.org/api/records',
          rateLimit: { calls: 100, period: 3600000 }, // 100/hour
          requiresAuth: false,
          priority: 3
        }
      ],
      news: [
        {
          name: 'newsapi',
          endpoint: 'https://newsapi.org/v2',
          rateLimit: { calls: 100, period: 86400000 }, // 100/day free
          requiresAuth: false, // Works without key (limited)
          priority: 1
        },
        {
          name: 'hackernews',
          endpoint: 'https://hacker-news.firebaseio.com/v0',
          rateLimit: { calls: 1000, period: 60000 }, // Very generous
          requiresAuth: false,
          priority: 2
        }
      ],
      ai: [
        {
          name: 'github',
          endpoint: 'https://api.github.com',
          rateLimit: { calls: 60, period: 3600000 }, // 60/hour without auth
          requiresAuth: false,
          priority: 1
        },
        {
          name: 'papersWithCode',
          endpoint: 'https://paperswithcode.com/api/v1',
          rateLimit: { calls: 100, period: 60000 }, // 100/minute
          requiresAuth: false,
          priority: 2
        }
      ]
    };

    // Rate limit tracking
    this.rateLimitTracking = {};
    
    // Response cache
    this.cache = new Map();
    
    // Failure tracking for intelligent fallback
    this.failures = {};
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      apiCalls: 0,
      failures: 0,
      fallbacks: 0,
      bySource: {}
    };

    // MLM integration for persistent learning
    this.mlm = null;
    this.initializePromise = this.initialize();
  }

  async initialize() {
    try {
      this.mlm = await getS4AiMLM();
      
      // Initialize rate limit tracking for all sources
      Object.keys(this.sources).forEach(category => {
        this.sources[category].forEach(source => {
          this.rateLimitTracking[source.name] = {
            calls: [],
            remaining: source.rateLimit.calls,
            resetAt: Date.now() + source.rateLimit.period
          };
          
          this.stats.bySource[source.name] = {
            calls: 0,
            hits: 0,
            errors: 0
          };
        });
      });

      // Start rate limit monitoring
      this.startRateLimitMonitoring();

      console.log('[PublicAPIIntegrator] Initialized with 15+ public APIs');
      this.emit('initialized');
    } catch (error) {
      console.error('[PublicAPIIntegrator] Initialization error:', error.message);
    }
  }

  /**
   * Fetch data with intelligent fallback chains
   * @param {string} category - Category: financial, research, physics, news, ai
   * @param {string} query - Query parameters or endpoint path
   * @param {object} options - Additional options
   */
  async fetchWithFallback(category, query, options = {}) {
    await this.initializePromise;
    
    const sources = this.sources[category];
    if (!sources) {
      throw new Error(`Unknown category: ${category}`);
    }

    this.stats.totalRequests++;

    // Check cache first (unless force refresh)
    if (!options.forceRefresh) {
      const cached = this.getFromCache(category, query);
      if (cached) {
        this.stats.cacheHits++;
        this.emit('cache:hit', { category, query });
        return cached;
      }
    }

    // Sort sources by priority and availability
    const availableSources = sources
      .filter(source => this.isSourceAvailable(source.name))
      .sort((a, b) => a.priority - b.priority);

    let lastError = null;
    
    // Try each source in order
    for (const source of availableSources) {
      try {
        const result = await this.fetchFromSource(source, query, options);
        
        // Success! Cache and return
        this.setCache(category, query, result);
        this.stats.apiCalls++;
        this.stats.bySource[source.name].hits++;
        
        // Record success in MLM
        if (this.mlm) {
          this.mlm.recordLearning('api_success', {
            source: source.name,
            category,
            timestamp: Date.now()
          });
        }
        
        this.emit('fetch:success', { source: source.name, category, query });
        return result;
        
      } catch (error) {
        lastError = error;
        this.stats.failures++;
        this.stats.bySource[source.name].errors++;
        this.recordFailure(source.name);
        
        this.emit('fetch:error', { 
          source: source.name, 
          category, 
          query, 
          error: error.message 
        });
        
        // Continue to next source (fallback)
        if (availableSources.indexOf(source) < availableSources.length - 1) {
          this.stats.fallbacks++;
          this.emit('fetch:fallback', { 
            from: source.name, 
            to: availableSources[availableSources.indexOf(source) + 1].name 
          });
        }
      }
    }

    // All sources failed
    const error = new Error(`All ${category} sources failed. Last error: ${lastError?.message}`);
    this.emit('fetch:all_failed', { category, query });
    throw error;
  }

  /**
   * Fetch from specific source
   */
  async fetchFromSource(source, query, options = {}) {
    // Check rate limit
    if (!this.canMakeRequest(source.name)) {
      throw new Error(`Rate limit exceeded for ${source.name}`);
    }

    // Record the request
    this.recordRequest(source.name);

    // Build URL (source-specific logic)
    const url = this.buildURL(source, query, options);

    // Make request with retry logic
    return await this.makeRequestWithRetry(url, source, options);
  }

  /**
   * Make HTTP request with automatic retry
   */
  async makeRequestWithRetry(url, source, options = {}, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType && contentType.includes('text/xml')) {
        return await response.text(); // Return XML as text for parsing
      } else {
        return await response.text();
      }

    } catch (error) {
      if (attempt < this.config.maxRetries) {
        // Wait before retry (exponential backoff)
        await this.sleep(this.config.retryDelay * attempt);
        return await this.makeRequestWithRetry(url, source, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Build URL for specific source
   */
  buildURL(source, query, options = {}) {
    let url = source.endpoint;

    // Source-specific URL building
    switch (source.name) {
      case 'alphaVantage':
        url += `?function=${options.function || 'TIME_SERIES_DAILY'}&symbol=${query}&apikey=demo`;
        break;
        
      case 'fred':
        url += `/observations?series_id=${query}&file_type=json`;
        break;
        
      case 'financialModelingPrep':
        url += `/${options.path || 'quote'}/${query}`;
        break;
        
      case 'coinGecko':
        url += `/${options.path || 'simple/price'}?ids=${query}&vs_currencies=usd`;
        break;
        
      case 'arxiv':
        url += `?search_query=${encodeURIComponent(query)}&max_results=${options.maxResults || 10}`;
        break;
        
      case 'pubmed':
        url += `/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json`;
        break;
        
      case 'core':
        url += `/search/works?q=${encodeURIComponent(query)}&limit=${options.limit || 10}`;
        break;
        
      case 'semanticScholar':
        url += `/paper/search?query=${encodeURIComponent(query)}&limit=${options.limit || 10}`;
        break;
        
      case 'cernOpenData':
        url += `?q=${encodeURIComponent(query)}&size=${options.size || 10}`;
        break;
        
      case 'inspireHEP':
        url += `/literature?q=${encodeURIComponent(query)}&size=${options.size || 10}`;
        break;
        
      case 'zenodo':
        url += `?q=${encodeURIComponent(query)}&size=${options.size || 10}`;
        break;
        
      case 'newsapi':
        url += `/everything?q=${encodeURIComponent(query)}&pageSize=${options.pageSize || 10}`;
        break;
        
      case 'hackernews':
        url += `/${options.type || 'topstories'}.json?limitToFirst=${options.limit || 10}`;
        break;
        
      case 'github':
        url += `/search/repositories?q=${encodeURIComponent(query)}&per_page=${options.perPage || 10}`;
        break;
        
      case 'papersWithCode':
        url += `/papers?q=${encodeURIComponent(query)}`;
        break;
        
      default:
        url += `?q=${encodeURIComponent(query)}`;
    }

    return url;
  }

  /**
   * Rate limit management
   */
  canMakeRequest(sourceName) {
    const tracking = this.rateLimitTracking[sourceName];
    if (!tracking) return true;

    // Clean old calls
    const now = Date.now();
    const source = this.findSource(sourceName);
    tracking.calls = tracking.calls.filter(
      callTime => now - callTime < source.rateLimit.period
    );

    return tracking.calls.length < source.rateLimit.calls;
  }

  recordRequest(sourceName) {
    const tracking = this.rateLimitTracking[sourceName];
    if (tracking) {
      tracking.calls.push(Date.now());
    }
    
    this.stats.bySource[sourceName].calls++;
  }

  isSourceAvailable(sourceName) {
    // Check if source has had too many recent failures
    const failures = this.failures[sourceName] || [];
    const recentFailures = failures.filter(
      time => Date.now() - time < 300000 // Last 5 minutes
    );
    
    // If more than 5 failures in 5 minutes, mark as unavailable
    if (recentFailures.length > 5) {
      return false;
    }
    
    // Check rate limit
    return this.canMakeRequest(sourceName);
  }

  recordFailure(sourceName) {
    if (!this.failures[sourceName]) {
      this.failures[sourceName] = [];
    }
    this.failures[sourceName].push(Date.now());
    
    // Keep only last 10 failures
    if (this.failures[sourceName].length > 10) {
      this.failures[sourceName].shift();
    }
  }

  findSource(sourceName) {
    for (const category in this.sources) {
      const source = this.sources[category].find(s => s.name === sourceName);
      if (source) return source;
    }
    return null;
  }

  /**
   * Cache management
   */
  getFromCache(category, query) {
    const key = `${category}:${query}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key); // Expired
    }
    
    return null;
  }

  setCache(category, query, data) {
    const key = `${category}:${query}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size (keep last 1000 entries)
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clearCache() {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Start monitoring rate limits
   */
  startRateLimitMonitoring() {
    setInterval(() => {
      this.checkRateLimits();
    }, 60000); // Every minute
  }

  checkRateLimits() {
    const warnings = [];
    
    for (const sourceName in this.rateLimitTracking) {
      const tracking = this.rateLimitTracking[sourceName];
      const source = this.findSource(sourceName);
      
      if (source) {
        const remaining = source.rateLimit.calls - tracking.calls.length;
        const percentUsed = (tracking.calls.length / source.rateLimit.calls) * 100;
        
        if (percentUsed > 80) {
          warnings.push({
            source: sourceName,
            remaining,
            percentUsed: percentUsed.toFixed(1)
          });
        }
      }
    }
    
    if (warnings.length > 0) {
      this.emit('rate_limit:warning', warnings);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalRequests > 0 
        ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      cacheSize: this.cache.size,
      failureRate: this.stats.apiCalls > 0
        ? (this.stats.failures / this.stats.apiCalls * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get available sources by category
   */
  getAvailableSources(category) {
    const sources = this.sources[category] || [];
    return sources
      .filter(source => this.isSourceAvailable(source.name))
      .map(source => ({
        name: source.name,
        priority: source.priority,
        remaining: this.getRemainingCalls(source.name)
      }));
  }

  getRemainingCalls(sourceName) {
    const tracking = this.rateLimitTracking[sourceName];
    const source = this.findSource(sourceName);
    
    if (!tracking || !source) return 0;
    
    return source.rateLimit.calls - tracking.calls.length;
  }

  /**
   * Utility: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let integratorInstance = null;

export async function getPublicAPIIntegrator(config) {
  if (!integratorInstance) {
    integratorInstance = new PublicAPIIntegrator(config);
    await integratorInstance.initializePromise;
  }
  return integratorInstance;
}

export default PublicAPIIntegrator;
