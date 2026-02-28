// Clean ESM implementation of ResearchEngine
import * as cheerio from 'cheerio';
import ddgSearchPkg from 'duckduckgo-search';
import fsBase, { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const { search: ddgSearch } = ddgSearchPkg;

class ResearchEngine {
    constructor(config = {}) {
        this.config = {
            tavilyApiKey:
                config.tavilyApiKey ||
                process.env.TAVILY_API_KEY ||
                process.env.TAVILYAPIKEY ||
                process.env.tavilyApiKey ||
                process.env.tavilyapikey,
            tavilyMcpKey:
                config.tavilyMcpKey ||
                process.env.TAVILY_API_KEY_MCP ||
                process.env.TAVILYAPIKEY_MCP ||
                process.env.tavilyApiKey_MCP ||
                process.env.tavilyapikey_mcp,
            maxResults: config.maxResults || 5,
            searchDepth: config.searchDepth || 'advanced',
            includeAnswer: config.includeAnswer !== false,
            includeRawContent: config.includeRawContent || false,
            mode: (config.mode || process.env.TAVILY_MODE || 'hybrid').toLowerCase(),
            monthlyCreditLimit: parseInt(process.env.TAVILY_MONTHLY_CREDIT_LIMIT || config.monthlyCreditLimit || '1250', 10),
            monthlyBudgetUsd: parseFloat(process.env.TAVILY_BUDGET_USD || config.monthlyBudgetUsd || '10')
        };
        this.researchHistory = [];
        this.onboardCount = 0;
        this.tavilyCount = 0;
        this.knowledgeBase = new Map();
        this.usageFile = process.env.TAVILY_USAGE_FILE || 'backend/s4ai-knowledge-base/tavily-usage.json';
        this.usage = this.loadUsage();
        logger.info('[ResearchEngine] Initializing autonomous research system...');
    }

    async onboardFetchAndParse(url) {
        try {
            const res = await fetch(url, { timeout: 10000 });
            if (!res.ok) return { url, error: `HTTP ${res.status}` };
            const html = await res.text();
            const $ = cheerio.load(html);
            const title = $('title').text() || '';
            const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
            return { url, title, text };
        } catch (err) {
            return { url, error: err.message };
        }
    }

    genesisCubedSynthesis(crawledResults) {
        const imagination = crawledResults.map(r => ({
            type: 'imagination',
            hypothesis: `If ${r.title || r.pageTitle} is true, what could be the next breakthrough?`,
            source: r.url
        }));
        const dreamState = crawledResults.map(r => ({
            type: 'dream_state',
            vision: `Envision a world where the knowledge from ${r.title || r.pageTitle} is universally accessible.`,
            source: r.url
        }));
        const thought = crawledResults.map(r => ({
            type: 'thought',
            reflection: `What does the existence of this information imply about the evolution of intelligence?`,
            source: r.url
        }));
        return [...imagination, ...dreamState, ...thought];
    }

    async onboardWebSearch(query, maxResults = 5) {
        try {
            const results = await ddgSearch(query, { maxResults });
            return results.map(r => ({
                type: 'search_result',
                title: r.title,
                url: r.url,
                content: r.snippet || r.body || '',
                score: 0.8,
                source: 'duckduckgo'
            }));
        } catch (err) {
            return [{ type: 'error', error: 'Web search failed', details: err.message }];
        }
    }

    async research(query, options = {}) {
        logger.info(`[ResearchEngine] Researching: ${query}`);
        const searchOptions = { ...this.config, ...options };
        try {
            // Decide path based on mode, credits, and options
            const preferOnboard = options.preferOnboard === true;
            const forceTavily = options.forceTavily === true;
            let results;
            if (preferOnboard && !forceTavily) {
                results = await this.onboardWebSearch(query, searchOptions.maxResults || 5);
                results = results.map(r => ({ ...r, fallback: true }));
            } else {
                // If hybrid and credit limit exceeded, fallback to onboard
                const creditsNeeded = searchOptions.searchDepth === 'advanced' ? 2 : 1;
                if (this.isCreditLimitExceeded(creditsNeeded) && this.config.mode === 'hybrid' && !forceTavily) {
                    logger.warn('[ResearchEngine] Tavily credit limit reached, using onboard search');
                    results = await this.onboardWebSearch(query, searchOptions.maxResults || 5);
                    results = results.map(r => ({ ...r, fallback: true }));
                } else {
                    results = await this.performTavilySearch(query, searchOptions);
                    // Track credits if we actually used Tavily
                    if (!results[0]?.fallback) {
                        this.trackCredits('search', searchOptions.searchDepth === 'advanced' ? 2 : 1);
                    }
                }
            }

            let source = 'tavily';
            if (results && results.length > 0 && results[0].fallback) {
                source = 'onboard';
            }
            if (source === 'tavily') this.tavilyCount++;
            else this.onboardCount++;

            let genesisCubedInsights = [];
            if (source === 'onboard') {
                genesisCubedInsights = this.genesisCubedSynthesis(results);
            }

            const research = {
                query,
                timestamp: Date.now(),
                results,
                insights: this.extractInsights(results),
                genesisCubedInsights,
                recommendations: this.generateRecommendations(results),
                confidence: this.assessConfidence(results),
                source
            };

            this.researchHistory.push(research);
            this.updateKnowledgeBase(query, research);

            logger.info(`[ResearchEngine] Research completed. Found ${results.length} results (source: ${source})`);
            return research;
        } catch (error) {
            logger.error('[ResearchEngine] Research failed:', error.message);
            this.onboardCount++;
            return {
                query,
                timestamp: Date.now(),
                error: error.message,
                results: [],
                confidence: 0,
                source: 'onboard'
            };
        }
    }

    async performTavilySearch(query, options) {
        if (!this.config.tavilyApiKey && !this.config.tavilyMcpKey) {
            logger.warn('[ResearchEngine] Tavily API key not configured, returning onboard DDG results');
            const ddg = await this.onboardWebSearch(query, options.maxResults || 5);
            return ddg.map(r => ({ ...r, fallback: true }));
        }

        const apiKey = this.config.tavilyMcpKey || this.config.tavilyApiKey;
        const requestBody = {
            api_key: apiKey,
            query: query,
            search_depth: options.searchDepth || 'advanced',
            include_answer: options.includeAnswer !== false,
            include_raw_content: options.includeRawContent || false,
            max_results: options.maxResults || 5,
            include_domains: options.includeDomains || [],
            exclude_domains: options.excludeDomains || []
        };

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            logger.warn('[ResearchEngine] Tavily request failed, using onboard DDG');
            const ddg = await this.onboardWebSearch(query, options.maxResults || 5);
            return ddg.map(r => ({ ...r, fallback: true }));
        }
        const json = await response.json();
        const results = (json.results || []).map(r => ({
            type: 'web_result',
            title: r.title || r.pageTitle,
            url: r.url,
            content: r.content || r.snippet || '',
            score: r.score || 0.9,
            source: 'tavily'
        }));
        return results;
    }

    // Hybrid helpers and credit tracking
    isCreditLimitExceeded(nextCredits = 0) {
        const monthKey = this.getCurrentMonthKey();
        const used = this.usage.monthly?.[monthKey]?.creditsUsed || 0;
        return used + nextCredits > this.config.monthlyCreditLimit;
    }

    trackCredits(operation, credits) {
        const monthKey = this.getCurrentMonthKey();
        if (!this.usage.monthly[monthKey]) {
            this.usage.monthly[monthKey] = { creditsUsed: 0, breakdown: { search: 0, extract: 0, map: 0, crawl: 0 } };
        }
        this.usage.monthly[monthKey].creditsUsed += credits;
        if (this.usage.monthly[monthKey].breakdown[operation] === undefined) {
            this.usage.monthly[monthKey].breakdown[operation] = 0;
        }
        this.usage.monthly[monthKey].breakdown[operation] += credits;
        this.saveUsage();
        logger.info(`[ResearchEngine] Tavily credits used: +${credits} for ${operation} → Month total: ${this.usage.monthly[monthKey].creditsUsed}/${this.config.monthlyCreditLimit}`);
    }

    getCurrentMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    loadUsage() {
        try {
            if (fsBase.existsSync(this.usageFile)) {
                const data = JSON.parse(fsBase.readFileSync(this.usageFile, 'utf-8'));
                return { monthly: data.monthly || {} };
            }
        } catch (err) {
            logger.warn('[ResearchEngine] Failed to load Tavily usage, starting fresh:', err.message);
        }
        return { monthly: {} };
    }

    saveUsage() {
        try {
            fsBase.mkdirSync(path.dirname(this.usageFile), { recursive: true });
            fsBase.writeFileSync(this.usageFile, JSON.stringify(this.usage, null, 2));
        } catch (err) {
            logger.warn('[ResearchEngine] Failed to persist Tavily usage:', err.message);
        }
    }

    // Extended Tavily operations with hybrid routing and credit model
    async extract(urls = [], { advanced = false } = {}) {
        const batchSize = 5;
        const credits = advanced ? 2 : 1; // per 5 URLs
        const batches = Math.ceil((urls.length || 0) / batchSize) || 1;
        const creditsNeeded = batches * credits;

        if (this.isCreditLimitExceeded(creditsNeeded) && this.config.mode === 'hybrid') {
            logger.warn('[ResearchEngine] Credit limit reached, performing onboard fetch/parse');
            const results = await Promise.all(urls.slice(0, batchSize).map(u => this.onboardFetchAndParse(u)));
            return { source: 'onboard', results };
        }

        // Use Tavily extract endpoint
        const apiKey = this.config.tavilyMcpKey || this.config.tavilyApiKey;
        const response = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, urls, advanced })
        });
        if (!response.ok) {
            logger.warn('[ResearchEngine] Tavily extract failed, onboard fallback');
            const results = await Promise.all(urls.slice(0, batchSize).map(u => this.onboardFetchAndParse(u)));
            return { source: 'onboard', results };
        }
        const json = await response.json();
        this.trackCredits('extract', creditsNeeded);
        return { source: 'tavily', results: json.results || json.data || [] };
    }

    async map(urls = [], { instructions = null } = {}) {
        // Basic: 1 credit per 10 URLs; With instructions: 1 credit per 5 URLs
        const hasInstructions = !!instructions;
        const batchSize = hasInstructions ? 5 : 10;
        const credits = 1; // per batch
        const batches = Math.ceil((urls.length || 0) / batchSize) || 1;
        const creditsNeeded = batches * credits;

        if (this.isCreditLimitExceeded(creditsNeeded) && this.config.mode === 'hybrid') {
            logger.warn('[ResearchEngine] Credit limit reached, performing onboard map (titles + text snippets)');
            const results = await Promise.all(urls.slice(0, batchSize).map(u => this.onboardFetchAndParse(u)));
            return { source: 'onboard', results };
        }

        const apiKey = this.config.tavilyMcpKey || this.config.tavilyApiKey;
        const response = await fetch('https://api.tavily.com/map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, urls, instructions })
        });
        if (!response.ok) {
            logger.warn('[ResearchEngine] Tavily map failed, onboard fallback');
            const results = await Promise.all(urls.slice(0, batchSize).map(u => this.onboardFetchAndParse(u)));
            return { source: 'onboard', results };
        }
        const json = await response.json();
        this.trackCredits('map', creditsNeeded);
        return { source: 'tavily', results: json.results || json.data || [] };
    }

    async crawl(urls = [], { advancedExtract = false, instructions = null } = {}) {
        // Crawl pricing = Map pricing + Extract pricing
        const mapResult = await this.map(urls, { instructions });
        const extractResult = await this.extract(urls, { advanced: advancedExtract });
        return {
            source: mapResult.source === 'tavily' && extractResult.source === 'tavily' ? 'tavily' : 'onboard',
            map: mapResult.results,
            extract: extractResult.results
        };
    }

    extractInsights(results = []) {
        return results.slice(0, 5).map(r => ({
            insight: r.title || (r.content || '').slice(0, 80),
            source: r.url,
            score: r.score || 0.5
        }));
    }

    generateRecommendations(results = []) {
        if (results.length === 0) return ['Expand search scope', 'Try onboard web search'];
        return ['Prioritize high-score sources', 'Cross-validate with onboard parsing'];
    }

    assessConfidence(results = []) {
        if (results.length === 0) return 0.2;
        const avg = results.reduce((s, r) => s + (r.score || 0.5), 0) / results.length;
        return Math.min(1, Math.max(0, avg));
    }

    updateKnowledgeBase(query, research) {
        this.knowledgeBase.set(query, research);
        if (this.knowledgeBase.size > 100) {
            const firstKey = this.knowledgeBase.keys().next().value;
            this.knowledgeBase.delete(firstKey);
        }
    }

    importKnowledge(data) {
        if (!data || !data.researchHistory) return false;
        this.researchHistory = [...this.researchHistory, ...data.researchHistory].slice(-200);
        return true;
    }

    exportKnowledge() {
        return { researchHistory: this.researchHistory.slice(-50) };
    }

    getStats() {
        return {
            onboardCount: this.onboardCount,
            tavilyCount: this.tavilyCount,
            totalResearches: this.researchHistory.length
        };
    }
}

export default ResearchEngine;
