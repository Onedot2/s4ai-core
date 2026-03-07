// Database connection pool for PostgreSQL (Phase 2.5)
import pkg from 'pg';
const { Pool } = pkg;

class DatabasePool {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.forceRailwayPort = null;
        this.failoverAttempted = false;
        this.lastConfig = null;
    }

    initialize() {
        if (this.pool) return this.pool;

        let dbConfig;
        let selectedUrl = null;
        const poolMax = parseInt(process.env.DB_POOL_MAX || '20', 10);
        const poolMin = parseInt(process.env.DB_POOL_MIN || '5', 10);
        const idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10);
        const connectionTimeoutMillis = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000', 10);

        // Priority: DATABASE_PUBLIC_URL (dev/external) → explicit DB_* (production override) → DATABASE_URL
        // This enables: local dev access, external tools, and production overrides when DB_* are provided.
        if (process.env.DATABASE_PUBLIC_URL && process.env.NODE_ENV !== 'production') {
            selectedUrl = process.env.DATABASE_PUBLIC_URL;
            console.log('[Database] Using DATABASE_PUBLIC_URL (dev/external access)');
        } else if (process.env.NODE_ENV === 'production' && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
            const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
            const requestedPort = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
            const isRailwayInternal = host.includes('railway.internal');
            const railwayPortOverride = this.forceRailwayPort;

            if (isRailwayInternal && requestedPort === 44874 && process.env.DATABASE_URL && !railwayPortOverride) {
                selectedUrl = process.env.DATABASE_URL;
                console.log('[Database] Using DATABASE_URL (production secure access override for Railway internal host)');
            } else {
                const port = railwayPortOverride
                    || (isRailwayInternal && requestedPort !== 5432 ? 5432 : requestedPort);

                dbConfig = {
                    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
                    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
                    host,
                    port,
                    database: process.env.DB_NAME || process.env.PGDATABASE || 'railway',
                    max: poolMax,
                    idleTimeoutMillis,
                    connectionTimeoutMillis,
                };
                console.log(`[Database] Using DB_* credentials (production override) host=${host} port=${port}`);
            }
        } else if (process.env.DATABASE_URL) {
            selectedUrl = process.env.DATABASE_URL;
            console.log('[Database] Using DATABASE_URL (production secure access)');
        }

        if (selectedUrl) {
            // Parse URL connection string
            const rawUrl = selectedUrl;
            let connectionString = rawUrl.startsWith('DATABASE_URL=') || rawUrl.startsWith('DATABASE_PUBLIC_URL=')
                ? rawUrl.replace(/^(DATABASE_URL|DATABASE_PUBLIC_URL)=/, '')
                : rawUrl;
            let parsedUrl = null;

            try {
                parsedUrl = new URL(connectionString);
                if (this.forceRailwayPort && parsedUrl.hostname.includes('railway.internal')) {
                    parsedUrl.port = String(this.forceRailwayPort);
                    connectionString = parsedUrl.toString();
                }
            } catch (error) {
                parsedUrl = null;
            }

            dbConfig = {
                connectionString,
                max: poolMax,
                idleTimeoutMillis,
                connectionTimeoutMillis,
                ssl: {
                    rejectUnauthorized: false,
                },
            };

            this.lastConfig = {
                host: parsedUrl?.hostname || null,
                port: parsedUrl?.port ? parseInt(parsedUrl.port, 10) : null,
                usingUrl: true
            };
        } else if (!dbConfig) {
            // Fallback to individual credentials (local dev without URLs)
            dbConfig = {
                user: process.env.DB_USER || process.env.PGUSER || 'postgres',
                password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
                host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
                port: parseInt(process.env.DB_PORT || process.env.PGPORT) || 5432,
                database: process.env.DB_NAME || process.env.PGDATABASE || 's4ai_platform',
                max: poolMax,
                idleTimeoutMillis,
                connectionTimeoutMillis,
            };
            console.log('[Database] Using individual credentials (local fallback)');
        }

        if (dbConfig && !this.lastConfig) {
            this.lastConfig = {
                host: dbConfig.host || null,
                port: dbConfig.port || null,
                usingUrl: false
            };
        }

        this.pool = new Pool(dbConfig);
        this.poolMin = poolMin;
        this.poolMax = poolMax;

        this.pool.on('error', (err) => {
            console.error('[Database] Unexpected error on idle client:', err);
        });

        this.pool.on('connect', () => {
            this.isConnected = true;
            console.log('[Database] Client connected to PostgreSQL');
        });

        this.warmupConnections().catch((error) => {
            console.warn('[Database] Pool warmup failed:', error.message);
        });

        return this.pool;
    }

    async warmupConnections() {
        if (!this.pool || !this.poolMin) return;
        const clients = [];
        const warmupCount = Math.min(this.poolMin, this.poolMax);

        for (let i = 0; i < warmupCount; i += 1) {
            const client = await this.pool.connect();
            clients.push(client);
        }

        clients.forEach((client) => client.release());
        // Mark as connected after successful warmup
        this.isConnected = true;
        console.log(`[Database] Pool warmup complete (${warmupCount} connections)`);
    }

    async query(text, params) {
        if (!this.pool) this.initialize();
        try {
            const result = await this.pool.query(text, params);
            return result;
        } catch (error) {
            const errorCode = error?.code || error?.errors?.[0]?.code;
            const lastHost = this.lastConfig?.host || '';
            const lastPort = this.lastConfig?.port;

            if (!this.failoverAttempted
                && errorCode === 'ECONNREFUSED'
                && lastHost.includes('railway.internal')
                && lastPort === 5432
                && process.env.DB_PORT === '44874') {
                console.warn('[Database] ECONNREFUSED on 5432 for railway.internal. Retrying with port 44874...');
                this.failoverAttempted = true;
                this.forceRailwayPort = 44874;
                if (this.pool) {
                    await this.pool.end();
                }
                this.pool = null;
                this.isConnected = false;
                this.lastConfig = null;
                this.initialize();
                return await this.pool.query(text, params);
            }

            // Suppress logging for error code 42710 (duplicate_object) - expected on re-deployments
            if (error.code !== '42710') {
                console.error('[Database] Query error:', error);
            }
            throw error;
        }
    }

    async getClient() {
        if (!this.pool) this.initialize();
        return await this.pool.connect();
    }

    async end() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('[Database] Connection pool closed');
        }
    }

    isHealthy() {
        return this.isConnected && this.pool !== null;
    }

    getPoolStats() {
        if (!this.pool) {
            return {
                total: 0,
                idle: 0,
                waiting: 0,
                max: this.poolMax || 0,
                min: this.poolMin || 0
            };
        }

        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
            max: this.poolMax || 0,
            min: this.poolMin || 0
        };
    }
}

export default new DatabasePool();
