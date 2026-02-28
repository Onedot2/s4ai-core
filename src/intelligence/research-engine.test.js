import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import ResearchEngine from './research-engine.js';

// Provide CommonJS require for modules that expect it
const require = createRequire(import.meta.url);
globalThis.require = require;

describe('ResearchEngine hybrid credits', () => {
  const usageFile = path.resolve('backend/s4ai-knowledge-base/tavily-usage.unit.json');
  const getMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  beforeEach(() => {
    // Ensure a clean usage file and env overrides for predictable config
    if (fs.existsSync(usageFile)) {
      fs.unlinkSync(usageFile);
    }
    process.env.TAVILY_USAGE_FILE = usageFile;
    process.env.TAVILY_MONTHLY_CREDIT_LIMIT = '';
    process.env.TAVILY_MODE = '';
  });

  afterEach(() => {
    if (fs.existsSync(usageFile)) {
      fs.unlinkSync(usageFile);
    }
    delete process.env.TAVILY_USAGE_FILE;
    delete process.env.TAVILY_MONTHLY_CREDIT_LIMIT;
    delete process.env.TAVILY_MODE;
  });

  it('tracks advanced search credits and falls back when limit is reached', async () => {
    const engine = new ResearchEngine({
      mode: 'hybrid',
      monthlyCreditLimit: 2, // small cap to trigger fallback
      monthlyBudgetUsd: 10,
      tavilyApiKey: 'stub-key',
      maxResults: 2,
      searchDepth: 'advanced'
    });

    // Stub Tavily and onboard to avoid network calls
    engine.performTavilySearch = async (query) => [{
      type: 'web_result',
      title: `Stub Tavily result for ${query}`,
      url: 'https://example.com/tavily-stub',
      content: 'Simulated Tavily result',
      score: 0.95,
      source: 'tavily'
    }];

    engine.onboardWebSearch = async (query) => [{
      type: 'search_result',
      title: `Stub onboard result for ${query}`,
      url: 'https://example.com/onboard-stub',
      content: 'Simulated onboard result',
      score: 0.5,
      source: 'onboard'
    }];

    const monthKey = getMonthKey();

    // First advanced search should consume 2 credits and use Tavily
    const first = await engine.research('hybrid advanced test', { searchDepth: 'advanced' });
    expect(first.source).toBe('tavily');
    const usageAfterFirst = engine.usage.monthly[monthKey];
    expect(usageAfterFirst.creditsUsed).toBe(2);
    expect(usageAfterFirst.breakdown.search).toBe(2);

    // Second advanced search should detect limit and fallback to onboard (no extra credits)
    const second = await engine.research('hybrid advanced test fallback', { searchDepth: 'advanced' });
    expect(second.source).toBe('onboard');
    const usageAfterSecond = engine.usage.monthly[monthKey];
    expect(usageAfterSecond.creditsUsed).toBe(2);
    expect(usageAfterSecond.breakdown.search).toBe(2);

    // Usage file should be persisted with the same totals
    const persisted = JSON.parse(fs.readFileSync(usageFile, 'utf-8'));
    expect(persisted.monthly[monthKey].creditsUsed).toBe(2);
    expect(persisted.monthly[monthKey].breakdown.search).toBe(2);
  });
});
