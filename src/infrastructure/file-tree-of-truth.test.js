/**
 * FToT Integration Test
 * Validates the File-Tree-of-Truth system components
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('File-Tree-of-Truth Integration', () => {
  it('should export getFileTreeOfTruth function', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    expect(getFileTreeOfTruth).toBeDefined();
    expect(typeof getFileTreeOfTruth).toBe('function');
  });

  it('should export getGitHubService function', async () => {
    const { getGitHubService } = await import('../services/github-service.js');
    expect(getGitHubService).toBeDefined();
    expect(typeof getGitHubService).toBe('function');
  });

  it('should create FToT instance', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    expect(ftot).toBeDefined();
    expect(ftot.repositories).toBeDefined();
    expect(ftot.repositories.length).toBe(5);
  });

  it('should have correct repository configuration', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    
    expect(ftot.repositories).toContain('Onedot2/pwai-api-service');
    expect(ftot.repositories).toContain('Onedot2/pwai-ai-worker');
    expect(ftot.repositories).toContain('Onedot2/ai-worker-queue');
    expect(ftot.repositories).toContain('Onedot2/pwai-controller');
    expect(ftot.repositories).toContain('Onedot2/pwai-frontend');
  });

  it('should have correct configuration defaults', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    
    expect(ftot.config.cacheTTL).toBe(300);
    expect(ftot.config.scanInterval).toBe(3600);
    expect(ftot.config.maxDepth).toBe(10);
  });

  it('should have stats object initialized', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    
    expect(ftot.stats).toBeDefined();
    expect(ftot.stats.totalScans).toBeDefined();
    expect(ftot.stats.totalQueries).toBeDefined();
    expect(ftot.stats.cacheHits).toBeDefined();
    expect(ftot.stats.cacheMisses).toBeDefined();
  });

  it('should have getStats method', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    
    const stats = ftot.getStats();
    expect(stats).toBeDefined();
    expect(stats.repositories).toBeDefined();
    expect(stats.config).toBeDefined();
    expect(stats.cacheHitRate).toBeDefined();
  });

  it('should have healthCheck method', async () => {
    const { getFileTreeOfTruth } = await import('./file-tree-of-truth.js');
    const ftot = await getFileTreeOfTruth();
    
    const health = await ftot.healthCheck();
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.initialized).toBe(true);
  });
});

describe('GitHub Service', () => {
  it('should create GitHub service instance', async () => {
    const { getGitHubService } = await import('../services/github-service.js');
    const service = getGitHubService();
    expect(service).toBeDefined();
  });

  it('should have getStatus method', async () => {
    const { getGitHubService } = await import('../services/github-service.js');
    const service = getGitHubService();
    
    const status = service.getStatus();
    expect(status).toBeDefined();
    expect(status.initialized).toBeDefined();
    expect(status.hasToken).toBeDefined();
  });

  it('should handle missing token gracefully', async () => {
    const { getGitHubService } = await import('../services/github-service.js');
    const service = getGitHubService();
    
    // Service should initialize but indicate no token
    const status = service.getStatus();
    expect(status).toBeDefined();
  });
});

describe('Truth Seeker FToT Integration', () => {
  it('should have FToT enhancement methods', async () => {
    const { getTruthSeeker } = await import('./truth-seeker-module.js');
    const truthSeeker = await getTruthSeeker();
    
    expect(truthSeeker.enhanceWithFToT).toBeDefined();
    expect(typeof truthSeeker.enhanceWithFToT).toBe('function');
    
    expect(truthSeeker.instantRecall).toBeDefined();
    expect(typeof truthSeeker.instantRecall).toBe('function');
    
    expect(truthSeeker.selfEnhance).toBeDefined();
    expect(typeof truthSeeker.selfEnhance).toBe('function');
    
    expect(truthSeeker.detectCrossRepoDrift).toBeDefined();
    expect(typeof truthSeeker.detectCrossRepoDrift).toBe('function');
  });
});

describe('MLM FToT Integration', () => {
  it('should have FToT storage methods', async () => {
    const { getS4AiMLM } = await import('./s4ai-mlm-massive-learning-model.js');
    const mlm = await getS4AiMLM();
    
    expect(mlm.storeFToTData).toBeDefined();
    expect(typeof mlm.storeFToTData).toBe('function');
    
    expect(mlm.getFToTHistory).toBeDefined();
    expect(typeof mlm.getFToTHistory).toBe('function');
    
    expect(mlm.analyzeArchitecturalChanges).toBeDefined();
    expect(typeof mlm.analyzeArchitecturalChanges).toBe('function');
  });

  it('should return empty history when no data', async () => {
    const { getS4AiMLM } = await import('./s4ai-mlm-massive-learning-model.js');
    const mlm = await getS4AiMLM();
    
    const history = await mlm.getFToTHistory(30);
    expect(history).toBeDefined();
    expect(history.success).toBe(true);
    expect(history.scans).toBeDefined();
    expect(Array.isArray(history.scans)).toBe(true);
  });
});
