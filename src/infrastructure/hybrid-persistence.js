/**
 * Hybrid Knowledge Persistence Layer
 * Intelligently uses PostgreSQL when available, falls back to JSON files
 * Provides seamless transition without breaking existing code
 */

import { PostgreSQLPersistence } from './postgresql-persistence.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, '../../backend/s4ai-knowledge-base');

export class HybridPersistence {
  constructor() {
    this.mode = null; // 'postgresql' or 'json'
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize persistence layer - try PostgreSQL first, fallback to JSON
   */
  async initialize() {
    if (this.initialized) return this.mode;

    // Check if PostgreSQL is enabled and configured
    const enablePostgreSQL = process.env.ENABLE_POSTGRESQL === 'true';
    const hasPostgreSQLConfig = process.env.DB_HOST && 
                                 process.env.DB_NAME && 
                                 process.env.DB_USER && 
                                 process.env.DB_PASSWORD;

    if (enablePostgreSQL && hasPostgreSQLConfig) {
      try {
        logger.info('[HybridPersistence] Attempting PostgreSQL connection...');
        this.db = new PostgreSQLPersistence();
        await this.db.initialize();
        
        // Test connection
        await this.db.pool.query('SELECT 1');
        
        this.mode = 'postgresql';
        this.initialized = true;
        logger.info('[HybridPersistence] ✅ Using PostgreSQL mode');
        return 'postgresql';
      } catch (error) {
        logger.warn('[HybridPersistence] PostgreSQL unavailable, falling back to JSON:', error.message);
      }
    }

    // Fallback to JSON mode
    this.mode = 'json';
    this.initialized = true;
    logger.info('[HybridPersistence] ✅ Using JSON file mode');
    return 'json';
  }

  /**
   * Get knowledge by key
   */
  async getKnowledge(key) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.getKnowledge(key);
    }

    // JSON mode
    const filePath = path.join(KB_DIR, `${key.replace(/_/g, '-')}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug(`[HybridPersistence] Knowledge key not found: ${key}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Set knowledge by key
   */
  async setKnowledge(key, value) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.setKnowledge(key, value);
    }

    // JSON mode
    const filePath = path.join(KB_DIR, `${key.replace(/_/g, '-')}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
    
    logger.debug(`[HybridPersistence] Saved knowledge to JSON: ${key}`);
    return value;
  }

  /**
   * Update knowledge (merge with existing)
   */
  async updateKnowledge(key, updates) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.updateKnowledge(key, updates);
    }

    // JSON mode
    const existing = await this.getKnowledge(key) || {};
    const merged = { ...existing, ...updates };
    return await this.setKnowledge(key, merged);
  }

  /**
   * Delete knowledge by key
   */
  async deleteKnowledge(key) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.deleteKnowledge(key);
    }

    // JSON mode
    const filePath = path.join(KB_DIR, `${key.replace(/_/g, '-')}.json`);
    try {
      await fs.unlink(filePath);
      logger.debug(`[HybridPersistence] Deleted knowledge: ${key}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * List all knowledge keys
   */
  async listKnowledge() {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.listKnowledge();
    }

    // JSON mode
    try {
      const files = await fs.readdir(KB_DIR);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', '').replace(/-/g, '_'));
    } catch (error) {
      logger.error('[HybridPersistence] Error listing knowledge:', error);
      return [];
    }
  }

  /**
   * Save autonomous decision
   */
  async saveDecision(decision) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.saveDecision(decision);
    }

    // JSON mode - append to decisions log
    const logPath = path.join(__dirname, '../../logs/decisions.json');
    
    try {
      let decisions = [];
      try {
        const content = await fs.readFile(logPath, 'utf8');
        decisions = JSON.parse(content);
      } catch (error) {
        // File doesn't exist yet
      }

      decisions.push({
        ...decision,
        timestamp: new Date().toISOString()
      });

      // Keep only last 1000 decisions
      if (decisions.length > 1000) {
        decisions = decisions.slice(-1000);
      }

      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, JSON.stringify(decisions, null, 2), 'utf8');
      
      return decision;
    } catch (error) {
      logger.error('[HybridPersistence] Error saving decision:', error);
      throw error;
    }
  }

  /**
   * Get recent decisions
   */
  async getRecentDecisions(limit = 10) {
    await this.initialize();

    if (this.mode === 'postgresql') {
      return await this.db.getRecentDecisions(limit);
    }

    // JSON mode
    const logPath = path.join(__dirname, '../../logs/decisions.json');
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      const decisions = JSON.parse(content);
      return decisions.slice(-limit);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Get current persistence mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if PostgreSQL is available
   */
  isPostgreSQLMode() {
    return this.mode === 'postgresql';
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.db?.pool) {
      await this.db.pool.end();
      logger.info('[HybridPersistence] Database connection closed');
    }
  }
}

// Singleton instance
let instance = null;

export function getHybridPersistence() {
  if (!instance) {
    instance = new HybridPersistence();
  }
  return instance;
}

export default getHybridPersistence();
