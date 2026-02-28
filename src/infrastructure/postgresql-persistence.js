/**
 * PostgreSQL Knowledge Persistence Layer
 * Replaces filesystem JSON with relational database
 * Provides transactions, query optimization, and data integrity
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PostgreSQLPersistence {
  constructor(config = {}) {
    // Support both DATABASE_URL (Railway) and individual env vars
    let dbConfig;
    
    if (process.env.DATABASE_URL) {
      // Parse Railway DATABASE_URL connection string
      dbConfig = {
        connectionString: process.env.DATABASE_URL,
        max: config.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      };
      logger.info('[PostgreSQL] Using DATABASE_URL connection string');
    } else {
      // Fallback to individual env variables
      const user = config.user || process.env.DB_USER;
      const password = config.password || process.env.DB_PASSWORD;
      const host = config.host || process.env.DB_HOST;
      const database = config.database || process.env.DB_NAME;

      // Validate required fields
      const missing = [];
      if (!user) missing.push('DB_USER');
      if (!password) missing.push('DB_PASSWORD');
      if (!host) missing.push('DB_HOST');
      if (!database) missing.push('DB_NAME');

      if (missing.length > 0) {
        const error = `Missing required database configuration: ${missing.join(', ')}`;
        logger.error('[PostgreSQL] Configuration error:', error);
        throw new Error(error);
      }

      // Prevent default credentials
      if (user === 'postgres' && password === 'postgres') {
        const error = 'Cannot use default credentials (postgres/postgres)';
        logger.error('[PostgreSQL] Configuration error:', error);
        throw new Error(error);
      }

      dbConfig = {
        user,
        password,
        host,
        port: config.port || parseInt(process.env.DB_PORT || '5432'),
        database
      };
    }

    this.pool = new pg.Pool(dbConfig);
    this.initialized = false;
    
    logger.info('[PostgreSQL] Pool created:', {
      database: dbConfig.database || 'from DATABASE_URL',
      user: dbConfig.user || 'from DATABASE_URL'
    });
  }

  /**
   * Initialize database schema
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Knowledge base table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          indexed_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_key ON knowledge_base(key);
        CREATE INDEX IF NOT EXISTS idx_knowledge_updated ON knowledge_base(updated_at);
      `);

      // Journey map (milestones, phases, progress)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS journey_map (
          id SERIAL PRIMARY KEY,
          phase VARCHAR(50) NOT NULL,
          milestone VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          progress_percent INT DEFAULT 0,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_journey_phase ON journey_map(phase);
        CREATE INDEX IF NOT EXISTS idx_journey_status ON journey_map(status);
      `);

      // Autonomous decisions (audit trail)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS autonomous_decisions (
          id SERIAL PRIMARY KEY,
          decision_type VARCHAR(100) NOT NULL,
          decision_data JSONB NOT NULL,
          confidence DECIMAL(3,2),
          outcome VARCHAR(50),
          result_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_decisions_type ON autonomous_decisions(decision_type);
        CREATE INDEX IF NOT EXISTS idx_decisions_created ON autonomous_decisions(created_at);
      `);

      // Goals and quests (ambition + curiosity)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS goals_and_quests (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL, -- 'ambition' or 'curiosity_quest'
          goal_text TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          priority INT DEFAULT 0,
          confidence DECIMAL(3,2),
          achieved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_goals_type ON goals_and_quests(type);
        CREATE INDEX IF NOT EXISTS idx_goals_status ON goals_and_quests(status);
      `);

      // Learning logs (meta-reasoning insights)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS learning_logs (
          id SERIAL PRIMARY KEY,
          insight_type VARCHAR(100) NOT NULL,
          insight_text TEXT NOT NULL,
          confidence DECIMAL(3,2),
          source VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_learning_type ON learning_logs(insight_type);
        CREATE INDEX IF NOT EXISTS idx_learning_created ON learning_logs(created_at);
      `);

      // Cross-repository learning graph
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS learning_graph (
          id SERIAL PRIMARY KEY,
          source_repo VARCHAR(255) NOT NULL,
          target_repo VARCHAR(255),
          pattern_type VARCHAR(100) NOT NULL,
          pattern_data JSONB NOT NULL,
          confidence DECIMAL(3,2),
          transferability_score DECIMAL(3,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_graph_source ON learning_graph(source_repo);
        CREATE INDEX IF NOT EXISTS idx_graph_pattern ON learning_graph(pattern_type);
      `);

      this.initialized = true;
      logger.info('[PostgreSQL] Schema initialized successfully');
    } catch (error) {
      logger.error('[PostgreSQL] Schema initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Store knowledge in database
   */
  async set(key, value) {
    try {
      const query = `
        INSERT INTO knowledge_base (key, value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE
        SET value = $2, updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const result = await this.pool.query(query, [key, JSON.stringify(value)]);
      logger.info(`[PostgreSQL] Stored key: ${key}`);
      return result.rows[0];
    } catch (error) {
      logger.error('[PostgreSQL] Error storing key:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve knowledge from database
   */
  async get(key) {
    try {
      const query = 'SELECT value FROM knowledge_base WHERE key = $1;';
      const result = await this.pool.query(query, [key]);
      if (result.rows.length === 0) return null;
      return JSON.parse(result.rows[0].value);
    } catch (error) {
      logger.error('[PostgreSQL] Error retrieving key:', error.message);
      throw error;
    }
  }

  /**
   * Query knowledge by pattern
   */
  async query(pattern) {
    try {
      const query = `
        SELECT key, value FROM knowledge_base
        WHERE key ILIKE $1
        ORDER BY updated_at DESC;
      `;
      const result = await this.pool.query(query, [`%${pattern}%`]);
      return result.rows.map(row => ({
        key: row.key,
        value: JSON.parse(row.value)
      }));
    } catch (error) {
      logger.error('[PostgreSQL] Query error:', error.message);
      throw error;
    }
  }

  /**
   * Log autonomous decision
   */
  async logDecision(decisionType, decisionData, confidence = 0.8) {
    try {
      const query = `
        INSERT INTO autonomous_decisions (decision_type, decision_data, confidence)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const result = await this.pool.query(query, [
        decisionType,
        JSON.stringify(decisionData),
        confidence
      ]);
      return result.rows[0].id;
    } catch (error) {
      logger.error('[PostgreSQL] Decision logging error:', error.message);
      throw error;
    }
  }

  /**
   * Log learning insight
   */
  async logInsight(insightType, insightText, confidence = 0.8) {
    try {
      const query = `
        INSERT INTO learning_logs (insight_type, insight_text, confidence)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const result = await this.pool.query(query, [
        insightType,
        insightText,
        confidence
      ]);
      return result.rows[0].id;
    } catch (error) {
      logger.error('[PostgreSQL] Insight logging error:', error.message);
      throw error;
    }
  }

  /**
   * Migrate from JSON files to database
   */
  async migrateFromJSON(jsonDir = './backend/s4ai-knowledge-base/') {
    try {
      logger.info('[PostgreSQL] Starting migration from JSON files...');
      const files = await fs.readdir(jsonDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(jsonDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const key = file.replace('.json', '');
        const value = JSON.parse(content);

        await this.set(key, value);
        logger.info(`[PostgreSQL] Migrated: ${key}`);
      }

      logger.info('[PostgreSQL] Migration complete');
    } catch (error) {
      logger.error('[PostgreSQL] Migration error:', error.message);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const queries = {
        totalKeys: 'SELECT COUNT(*) as count FROM knowledge_base;',
        decisionCount: 'SELECT COUNT(*) as count FROM autonomous_decisions;',
        insightCount: 'SELECT COUNT(*) as count FROM learning_logs;',
        goalCount: 'SELECT COUNT(*) as count FROM goals_and_quests WHERE status = \'active\';'
      };

      const stats = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.pool.query(query);
        stats[key] = parseInt(result.rows[0].count);
      }

      return stats;
    } catch (error) {
      logger.error('[PostgreSQL] Stats error:', error.message);
      return {};
    }
  }

  /**
   * Close connection pool
   */
  async close() {
    await this.pool.end();
    logger.info('[PostgreSQL] Connection pool closed');
  }
}

export default PostgreSQLPersistence;
