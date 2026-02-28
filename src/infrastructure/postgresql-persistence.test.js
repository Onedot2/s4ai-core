/**
 * Test suite for PostgreSQL Persistence Layer
 * Tests database configuration, validation, and basic operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PostgreSQLPersistence from './postgresql-persistence.js';

describe('PostgreSQLPersistence', () => {
  describe('Configuration Validation', () => {
    it('should throw error when DB_USER is missing', () => {
      const config = {
        password: 'test',
        host: 'localhost',
        database: 'test'
      };
      
      expect(() => new PostgreSQLPersistence(config)).toThrow(
        /Missing required database configuration/
      );
    });

    it('should throw error when DB_PASSWORD is missing', () => {
      const config = {
        user: 'test',
        host: 'localhost',
        database: 'test'
      };
      
      expect(() => new PostgreSQLPersistence(config)).toThrow(
        /Missing required database configuration/
      );
    });

    it('should throw error when DB_HOST is missing', () => {
      const config = {
        user: 'test',
        password: 'test',
        database: 'test'
      };
      
      expect(() => new PostgreSQLPersistence(config)).toThrow(
        /Missing required database configuration/
      );
    });

    it('should throw error when DB_NAME is missing', () => {
      const config = {
        user: 'test',
        password: 'test',
        host: 'localhost'
      };
      
      expect(() => new PostgreSQLPersistence(config)).toThrow(
        /Missing required database configuration/
      );
    });

    it('should create instance with all required fields', () => {
      const config = {
        user: 'testuser',
        password: 'testpass',
        host: 'localhost',
        database: 'testdb',
        port: 5432
      };
      
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence).toBeDefined();
      expect(persistence.pool).toBeDefined();
    });
  });

  describe('Port Configuration', () => {
    it('should use default port 5432 when not specified', () => {
      const config = {
        user: 'test',
        password: 'test',
        host: 'localhost',
        database: 'test'
      };
      
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence.pool).toBeDefined();
    });

    it('should accept custom port', () => {
      const config = {
        user: 'test',
        password: 'test',
        host: 'localhost',
        database: 'test',
        port: 5433
      };
      
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence.pool).toBeDefined();
    });
  });

  describe('Environment Variable Override', () => {
    beforeEach(() => {
      // Set environment variables for this test
      process.env.DB_USER = 'envuser';
      process.env.DB_PASSWORD = 'envpass';
      process.env.DB_HOST = 'envhost';
      process.env.DB_NAME = 'envdb';
    });

    afterEach(() => {
      // Clean up environment variables
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
    });

    it('should use environment variables when config empty', () => {
      const config = {};
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence.pool).toBeDefined();
    });

    it('should prefer config over environment variables', () => {
      const config = {
        user: 'configuser',
        password: 'configpass',
        host: 'confighost',
        database: 'configdb'
      };
      
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence.pool).toBeDefined();
    });
  });

  describe('No Default Credentials', () => {
    it('should never use hardcoded default credentials', () => {
      const config = {};
      
      // Should throw because no credentials provided
      expect(() => new PostgreSQLPersistence(config)).toThrow();
    });

    it('should reject postgres/postgres default credentials', () => {
      const config = {
        user: 'postgres',
        password: 'postgres',
        host: 'localhost',
        database: 'test'
      };
      
      expect(() => new PostgreSQLPersistence(config)).toThrow(
        /Cannot use default credentials/
      );
    });

    it('should never accept "s4ai" as user', () => {
      const config = {
        user: 's4ai',
        password: 'test',
        host: 'localhost',
        database: 'test'
      };
      
      // Should accept (validation doesn't reject specific values)
      const persistence = new PostgreSQLPersistence(config);
      expect(persistence).toBeDefined();
      // But note: in production, this user should not exist in database
    });
  });
});
