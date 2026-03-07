/**
 * S4 System Integrator
 * Integrates all autonomous components into a unified system
 * Orchestrates the complete self-sustaining software system
 */

import AgenticCore from './agentic-core.js';
import ResearchEngine from '../intelligence/research-engine.js';
import AutonomousLoop from './autonomous-loop.js';
import KnowledgePersistence from '../intelligence/knowledge-persistence.js';
import logger from '../utils/logger.js';


class S4Integrator {
    constructor(config = {}) {
        this.config = {
            enableAutoSave: config.enableAutoSave !== false,
            enableResearch: config.enableResearch !== false,
            enableAutonomousLoop: config.enableAutonomousLoop !== false,
            loopInterval: config.loopInterval || 10000,
            ...config
        };

        // Initialize core components
        this.agenticCore = new AgenticCore({
            apiKey: config.agenticApiKey || process.env.AGENTIC_API_KEY,
            autonomousMode: true,
            decisionThreshold: config.decisionThreshold || 0.7
        });

        this.researchEngine = new ResearchEngine({
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
                process.env.tavilyapikey_mcp
        });

        this.knowledgePersistence = new KnowledgePersistence({
            dataDir: config.dataDir || './data',
            autoSaveInterval: config.autoSaveInterval || 300000 // 5 minutes
        });

        this.autonomousLoop = new AutonomousLoop({
            loopInterval: this.config.loopInterval,
            evolutionThreshold: config.evolutionThreshold || 0.75,
            adaptiveThrottling: true
        });

        this.state = {
            initialized: false,
            running: false,
            startTime: null,
            cycles: 0
        };

        logger.info('[S4Integrator] System initialized');
    }

    /**
     * Initialize the S4 system
     */
    async initialize() {
        if (this.state.initialized) {
            logger.warn('[S4Integrator] Already initialized');
            return;
        }

        logger.info('[S4Integrator] Initializing S4 system...');

        try {
            // Load persisted knowledge
            await this.knowledgePersistence.load();

            // Import knowledge into components
            const knowledgeData = this.knowledgePersistence.knowledge;
            
            if (knowledgeData.decisionHistory && knowledgeData.decisionHistory.length > 0) {
                this.agenticCore.importKnowledge({
                    decisionHistory: knowledgeData.decisionHistory
                });
            }

            if (knowledgeData.researchHistory && knowledgeData.researchHistory.length > 0) {
                this.researchEngine.importKnowledge({
                    researchHistory: knowledgeData.researchHistory
                });
            }

            // Register components with autonomous loop
            this.autonomousLoop.registerComponent('agenticCore', this.agenticCore);
            this.autonomousLoop.registerComponent('researchEngine', this.researchEngine);

            // Start auto-save if enabled
            if (this.config.enableAutoSave) {
                this.knowledgePersistence.startAutoSave();
            }

            this.state.initialized = true;
            logger.info('[S4Integrator] System initialized successfully');

        } catch (error) {
            logger.error('[S4Integrator] Initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Start the S4 system
     */
    async start() {
        if (!this.state.initialized) {
            await this.initialize();
        }

        if (this.state.running) {
            logger.warn('[S4Integrator] Already running');
            return;
        }

        logger.info('[S4Integrator] Starting S4 autonomous system...');
        this.state.running = true;
        this.state.startTime = Date.now();

        // Start autonomous loop if enabled
        if (this.config.enableAutonomousLoop) {
            await this.autonomousLoop.start();
        }
    }

    /**
     * Stop the S4 system
     */
    async stop() {
        if (!this.state.running) {
            return;
        }

        logger.info('[S4Integrator] Stopping S4 system...');

        // Stop autonomous loop
        if (this.config.enableAutonomousLoop) {
            this.autonomousLoop.stop();
        }

        // Stop auto-save
        this.knowledgePersistence.stopAutoSave();

        // Save final state
        await this.saveState();

        this.state.running = false;
        logger.info('[S4Integrator] System stopped');
    }

    /**
     * Perform autonomous research
     */
    async research(query, options = {}) {
        if (!this.config.enableResearch) {
            logger.warn('[S4Integrator] Research is disabled');
            return null;
        }

        logger.info(`[S4Integrator] Researching: ${query}`);

        const result = await this.researchEngine.research(query, options);

        // Store in knowledge base
        this.knowledgePersistence.updateResearchHistory(result);

        return result;
    }

    /**
     * Make an autonomous decision
     */
    async decide(context) {
        logger.info('[S4Integrator] Making autonomous decision...');

        const decision = await this.agenticCore.reason(context);

        // Store in knowledge base
        this.knowledgePersistence.updateDecisionHistory(decision);

        return decision;
    }

    /**
     * Execute autonomous evolution cycle
     */
    async evolve() {
        logger.info('[S4Integrator] Executing evolution cycle...');

        this.state.cycles++;

        try {
            // 1. Research current trends
            if (this.config.enableResearch && this.state.cycles % 5 === 0) {
                await this.research('latest trends in autonomous software systems');
            }

            // 2. Self-assessment
            const assessment = await this.assessSystem();

            // 3. Make decisions
            const decision = await this.decide({
                systemState: assessment,
                metrics: this.getMetrics(),
                timestamp: Date.now()
            });

            // 4. Log evolution
            this.knowledgePersistence.logEvolution({
                cycle: this.state.cycles,
                assessment,
                decision,
                timestamp: Date.now()
            });

            return {
                cycle: this.state.cycles,
                decision,
                assessment
            };

        } catch (error) {
            logger.error('[S4Integrator] Evolution cycle failed:', error.message);
            throw error;
        }
    }

    /**
     * Assess system health and capabilities
     */
    async assessSystem() {
        const assessment = {
            timestamp: Date.now(),
            components: {
                agenticCore: this.agenticCore.getStatus(),
                researchEngine: this.researchEngine.getStats(),
                autonomousLoop: this.autonomousLoop.getStatus(),
                knowledgePersistence: this.knowledgePersistence.getSummary()
            },
            systemHealth: 0,
            uptime: Date.now() - (this.state.startTime || Date.now())
        };

        // Calculate overall health
        const componentHealthScores = [
            assessment.components.agenticCore.active ? 1 : 0,
            assessment.components.researchEngine.totalResearches > 0 ? 1 : 0.5,
            assessment.components.autonomousLoop.running ? 1 : 0,
            assessment.components.knowledgePersistence.decisionCount > 0 ? 1 : 0.5
        ];

        assessment.systemHealth = 
            componentHealthScores.reduce((sum, score) => sum + score, 0) / componentHealthScores.length;

        return assessment;
    }

    /**
     * Get system metrics
     */
    getMetrics() {
            const agenticStatus = this.agenticCore.getStatus();
            const researchStats = this.researchEngine.getStats();
            const loopStatus = this.autonomousLoop.getStatus();

            return {
                uptime: Date.now() - (this.state.startTime || Date.now()),
                cycles: this.state.cycles,
                decisions: agenticStatus.decisionsCount,
                researchOnboard: researchStats.onboardCount,
                researchTavily: researchStats.tavilyCount,
                totalResearch: researchStats.totalResearches,
                evolutionIterations: loopStatus.iteration,
                knowledge: {
                    decisions: this.knowledgePersistence.knowledge.decisionHistory.length,
                    research: this.knowledgePersistence.knowledge.researchHistory.length,
                    evolutions: this.knowledgePersistence.knowledge.evolutionLog.length
                }
            };
    }

    /**
     * Get comprehensive system status
     */
    getStatus() {
        return {
            initialized: this.state.initialized,
            running: this.state.running,
            uptime: this.state.startTime ? Date.now() - this.state.startTime : 0,
            cycles: this.state.cycles,
            components: {
                agenticCore: this.agenticCore.getStatus(),
                researchEngine: this.researchEngine.getStats(),
                autonomousLoop: this.autonomousLoop.getStatus(),
                knowledgePersistence: this.knowledgePersistence.getSummary()
            },
            metrics: this.getMetrics()
        };
    }

    /**
     * Save system state
     */
    async saveState() {
        logger.info('[S4Integrator] Saving system state...');

        try {
            // Update component states in knowledge persistence
            this.knowledgePersistence.updateComponentState('agenticCore', 
                this.agenticCore.exportKnowledge());
            
            this.knowledgePersistence.updateComponentState('researchEngine', 
                this.researchEngine.exportKnowledge());
            
            this.knowledgePersistence.updateComponentState('autonomousLoop', 
                this.autonomousLoop.exportState());

            // Update metrics
            this.knowledgePersistence.updateMetrics(this.getMetrics());

            // Save to disk
            await this.knowledgePersistence.save();

            logger.info('[S4Integrator] State saved successfully');

        } catch (error) {
            logger.error('[S4Integrator] State save failed:', error.message);
            throw error;
        }
    }

    /**
     * Export system state for external use
     */
    exportState(format = 'json') {
        return this.knowledgePersistence.exportKnowledge(format);
    }

    /**
     * Import system state from external source
     */
    async importState(data) {
        return this.knowledgePersistence.importKnowledge(data);
    }

    /**
     * Get evolution history
     */
    getEvolutionHistory(limit = 10) {
        return this.knowledgePersistence.knowledge.evolutionLog.slice(-limit);
    }

    /**
     * Get research insights
     */
    getResearchInsights(query) {
        return this.knowledgePersistence.getResearchInsights(query);
    }

    /**
     * Get decision patterns
     */
    getDecisionPatterns() {
        return this.knowledgePersistence.getDecisionPatterns();
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const status = this.getStatus();
        const patterns = this.getDecisionPatterns();
        const evolution = this.getEvolutionHistory(5);

            return {
                timestamp: Date.now(),
                status,
                patterns,
                recentEvolution: evolution,
                summary: {
                    uptime: status.uptime,
                    totalCycles: status.cycles,
                    totalDecisions: status.metrics.decisions,
                    'Research-Onboard: Count': status.metrics.researchOnboard,
                    'Research-Tavily: Count': status.metrics.researchTavily,
                    totalResearch: status.metrics.totalResearch,
                    systemHealth: status.components.agenticCore.active ? 'healthy' : 'degraded'
                }
            };
    }
}

export default S4Integrator;
