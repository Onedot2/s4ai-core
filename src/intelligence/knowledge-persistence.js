/**
 * Knowledge Persistence System
 * Stores and manages the S4 system's accumulated knowledge
 * Enables learning across sessions and deployments
 */

import fs from 'node:fs';
import path from 'node:path';
import logger from '../utils/logger.js';


class KnowledgePersistence {
    constructor(config = {}) {
        this.config = {
            dataDir: config.dataDir || path.join(process.cwd(), 'data'),
            autoSaveInterval: config.autoSaveInterval || 300000, // 5 minutes
            maxBackups: config.maxBackups || 5,
            compressionEnabled: config.compressionEnabled !== false,
            maxResearchHistory: config.maxResearchHistory || 200,
            maxDecisionHistory: config.maxDecisionHistory || 500,
            maxEvolutionLog: config.maxEvolutionLog || 1000
        };

        this.knowledge = {
            researchHistory: [],
            decisionHistory: [],
            componentStates: {},
            metrics: {},
            evolutionLog: [],
            lastUpdated: null
        };

        this.autoSaveTimer = null;

        this.ensureDataDirectory();
        logger.info('[KnowledgePersistence] Initialized');
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDirectory() {
        if (!fs.existsSync(this.config.dataDir)) {
            fs.mkdirSync(this.config.dataDir, { recursive: true });
            logger.info(`[KnowledgePersistence] Created data directory: ${this.config.dataDir}`);
        }
    }

    /**
     * Save knowledge to disk
     */
    async save() {
        try {
            const filename = this.getKnowledgeFilename();
            const filepath = path.join(this.config.dataDir, filename);

            // Update timestamp
            this.knowledge.lastUpdated = Date.now();

            // Prepare data
            const data = JSON.stringify(this.knowledge, null, 2);

            // Create backup if file exists
            if (fs.existsSync(filepath)) {
                await this.createBackup(filepath);
            }

            // Write to disk
            fs.writeFileSync(filepath, data, 'utf8');

            logger.info(`[KnowledgePersistence] Knowledge saved to ${filename}`);
            return true;

        } catch (error) {
            logger.error('[KnowledgePersistence] Save failed:', error.message);
            return false;
        }
    }

    /**
     * Load knowledge from disk
     */
    async load() {
        try {
            const filename = this.getKnowledgeFilename();
            const filepath = path.join(this.config.dataDir, filename);

            if (!fs.existsSync(filepath)) {
                logger.info('[KnowledgePersistence] No existing knowledge file found');
                return false;
            }

            const data = fs.readFileSync(filepath, 'utf8');
            this.knowledge = JSON.parse(data);

            logger.info('[KnowledgePersistence] Knowledge loaded successfully');
            logger.info(`  - Research entries: ${this.knowledge.researchHistory?.length || 0}`);
            logger.info(`  - Decision entries: ${this.knowledge.decisionHistory?.length || 0}`);
            logger.info(`  - Last updated: ${new Date(this.knowledge.lastUpdated).toISOString()}`);

            return true;

        } catch (error) {
            logger.error('[KnowledgePersistence] Load failed:', error.message);
            
            // Try to load from backup
            return await this.loadFromBackup();
        }
    }

    /**
     * Create backup of current knowledge file
     */
    async createBackup(filepath) {
        try {
            const backupDir = path.join(this.config.dataDir, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `knowledge-${timestamp}.json`;
            const backupPath = path.join(backupDir, backupFilename);

            // Copy current file to backup
            fs.copyFileSync(filepath, backupPath);

            // Clean old backups
            await this.cleanOldBackups(backupDir);

            logger.info(`[KnowledgePersistence] Backup created: ${backupFilename}`);

        } catch (error) {
            logger.error('[KnowledgePersistence] Backup creation failed:', error.message);
        }
    }

    /**
     * Clean old backup files
     */
    async cleanOldBackups(backupDir) {
        try {
            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('knowledge-') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    path: path.join(backupDir, f),
                    mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Keep only the most recent backups
            if (files.length > this.config.maxBackups) {
                const filesToDelete = files.slice(this.config.maxBackups);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    logger.info(`[KnowledgePersistence] Deleted old backup: ${file.name}`);
                });
            }

        } catch (error) {
            logger.error('[KnowledgePersistence] Backup cleanup failed:', error.message);
        }
    }

    /**
     * Load knowledge from most recent backup
     */
    async loadFromBackup() {
        try {
            const backupDir = path.join(this.config.dataDir, 'backups');
            if (!fs.existsSync(backupDir)) {
                return false;
            }

            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('knowledge-') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    path: path.join(backupDir, f),
                    mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length === 0) {
                return false;
            }

            const mostRecent = files[0];
            const data = fs.readFileSync(mostRecent.path, 'utf8');
            this.knowledge = JSON.parse(data);

            logger.info(`[KnowledgePersistence] Loaded from backup: ${mostRecent.name}`);
            return true;

        } catch (error) {
            logger.error('[KnowledgePersistence] Backup load failed:', error.message);
            return false;
        }
    }

    /**
     * Get knowledge filename
     */
    getKnowledgeFilename() {
        return 'knowledge.json';
    }

    /**
     * Update research history
     */
    updateResearchHistory(research) {
        this.knowledge.researchHistory.push({
            ...research,
            timestamp: Date.now()
        });

        // Trim to configured limit
        if (this.knowledge.researchHistory.length > this.config.maxResearchHistory) {
            this.knowledge.researchHistory = this.knowledge.researchHistory.slice(-this.config.maxResearchHistory);
        }
    }

    /**
     * Update decision history
     */
    updateDecisionHistory(decision) {
        this.knowledge.decisionHistory.push({
            ...decision,
            timestamp: Date.now()
        });

        // Trim to configured limit
        if (this.knowledge.decisionHistory.length > this.config.maxDecisionHistory) {
            this.knowledge.decisionHistory = this.knowledge.decisionHistory.slice(-this.config.maxDecisionHistory);
        }
    }

    /**
     * Update component state
     */
    updateComponentState(componentName, state) {
        this.knowledge.componentStates[componentName] = {
            ...state,
            lastUpdated: Date.now()
        };
    }

    /**
     * Update metrics
     */
    updateMetrics(metrics) {
        this.knowledge.metrics = {
            ...this.knowledge.metrics,
            ...metrics,
            lastUpdated: Date.now()
        };
    }

    /**
     * Log evolution event
     */
    logEvolution(event) {
        this.knowledge.evolutionLog.push({
            ...event,
            timestamp: Date.now()
        });

        // Trim to configured limit
        if (this.knowledge.evolutionLog.length > this.config.maxEvolutionLog) {
            this.knowledge.evolutionLog = this.knowledge.evolutionLog.slice(-this.config.maxEvolutionLog);
        }
    }

    /**
     * Get research insights
     */
    getResearchInsights(query) {
        return this.knowledge.researchHistory
            .filter(r => r.query && r.query.toLowerCase().includes(query.toLowerCase()))
            .slice(-10);
    }

    /**
     * Get decision patterns
     */
    getDecisionPatterns() {
        const patterns = {};

        this.knowledge.decisionHistory.forEach(decision => {
            const action = decision.action || 'UNKNOWN';
            if (!patterns[action]) {
                patterns[action] = {
                    count: 0,
                    successCount: 0,
                    failureCount: 0,
                    avgConfidence: 0
                };
            }

            patterns[action].count++;
            if (decision.success) patterns[action].successCount++;
            else patterns[action].failureCount++;
            
            if (decision.confidence) {
                patterns[action].avgConfidence = 
                    (patterns[action].avgConfidence + decision.confidence) / 2;
            }
        });

        return patterns;
    }

    /**
     * Get evolution statistics
     */
    getEvolutionStats() {
        return {
            totalEvolutions: this.knowledge.evolutionLog.length,
            researchCount: this.knowledge.researchHistory.length,
            decisionCount: this.knowledge.decisionHistory.length,
            componentCount: Object.keys(this.knowledge.componentStates).length,
            patterns: this.getDecisionPatterns(),
            lastUpdated: this.knowledge.lastUpdated
        };
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            logger.warn('[KnowledgePersistence] Auto-save already running');
            return;
        }

        logger.info(`[KnowledgePersistence] Starting auto-save (interval: ${this.config.autoSaveInterval}ms)`);
        
        this.autoSaveTimer = setInterval(async () => {
            await this.save();
        }, this.config.autoSaveInterval);
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            logger.info('[KnowledgePersistence] Auto-save stopped');
        }
    }

    /**
     * Export knowledge for external use
     */
    exportKnowledge(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.knowledge, null, 2);
        } else if (format === 'summary') {
            return {
                stats: this.getEvolutionStats(),
                recentResearch: this.knowledge.researchHistory.slice(-10),
                recentDecisions: this.knowledge.decisionHistory.slice(-10),
                components: Object.keys(this.knowledge.componentStates)
            };
        }
        
        return this.knowledge;
    }

    /**
     * Import knowledge from external source
     */
    importKnowledge(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            // Merge with existing knowledge
            this.knowledge = {
                researchHistory: [
                    ...(this.knowledge.researchHistory || []),
                    ...(data.researchHistory || [])
                ].slice(-200),
                decisionHistory: [
                    ...(this.knowledge.decisionHistory || []),
                    ...(data.decisionHistory || [])
                ].slice(-500),
                componentStates: {
                    ...this.knowledge.componentStates,
                    ...data.componentStates
                },
                metrics: {
                    ...this.knowledge.metrics,
                    ...data.metrics
                },
                evolutionLog: [
                    ...(this.knowledge.evolutionLog || []),
                    ...(data.evolutionLog || [])
                ].slice(-1000),
                lastUpdated: Date.now()
            };

            logger.info('[KnowledgePersistence] Knowledge imported successfully');
            return true;

        } catch (error) {
            logger.error('[KnowledgePersistence] Import failed:', error.message);
            return false;
        }
    }

    /**
     * Reset knowledge (use with caution)
     */
    reset() {
        logger.warn('[KnowledgePersistence] Resetting all knowledge...');
        
        this.knowledge = {
            researchHistory: [],
            decisionHistory: [],
            componentStates: {},
            metrics: {},
            evolutionLog: [],
            lastUpdated: Date.now()
        };

        return this.save();
    }

    /**
     * Get knowledge summary
     */
    getSummary() {
        return {
            researchCount: this.knowledge.researchHistory.length,
            decisionCount: this.knowledge.decisionHistory.length,
            componentCount: Object.keys(this.knowledge.componentStates).length,
            evolutionEvents: this.knowledge.evolutionLog.length,
            lastUpdated: this.knowledge.lastUpdated,
            stats: this.getEvolutionStats()
        };
    }
}

export default KnowledgePersistence;
