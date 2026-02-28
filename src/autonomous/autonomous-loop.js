/**
 * Autonomous Loop Controller
 * Orchestrates continuous evolution and self-improvement of the S4 system
 */

import logger from '../utils/logger.js';

class AutonomousLoop {
    constructor(config = {}) {
        this.config = {
            loopInterval: config.loopInterval || 10000, // 10 seconds default
            evolutionThreshold: config.evolutionThreshold || 0.75,
            maxConsecutiveFailures: config.maxConsecutiveFailures || 3,
            adaptiveThrottling: config.adaptiveThrottling !== false
        };

        this.state = {
            running: false,
            iteration: 0,
            consecutiveFailures: 0,
            lastSuccess: null,
            evolutionScore: 0,
            performance: {
                avgCycleTime: 0,
                successRate: 0,
                totalCycles: 0
            }
        };

        this.components = new Map();
        this.evolutionHistory = [];
        this.cycleMetrics = [];

        logger.info('[AutonomousLoop] Controller initialized');
    }

    /**
     * Register a component for autonomous operation
     */
    registerComponent(name, component) {
        this.components.set(name, {
            instance: component,
            status: 'registered',
            lastExecution: null,
            successCount: 0,
            failureCount: 0
        });
        logger.info(`[AutonomousLoop] Registered component: ${name}`);
    }

    /**
     * Start the autonomous loop
     */
    async start() {
        if (this.state.running) {
            logger.warn('[AutonomousLoop] Already running');
            return;
        }

        logger.info('[AutonomousLoop] Starting autonomous operation...');
        this.state.running = true;
        this.state.startTime = Date.now();

        // Start the main loop
        this.loop();
    }

    /**
     * Main autonomous loop
     */
    async loop() {
        while (this.state.running) {
            const cycleStart = Date.now();
            this.state.iteration++;

            logger.info(`\n[AutonomousLoop] === Cycle ${this.state.iteration} ===`);

            try {
                // Execute one iteration
                await this.executeIteration();

                // Record success
                this.state.consecutiveFailures = 0;
                this.state.lastSuccess = Date.now();
                this.state.performance.totalCycles++;

                // Calculate cycle time
                const cycleTime = Date.now() - cycleStart;
                this.recordCycleMetric(cycleTime, true);

                // Adaptive throttling based on performance
                const waitTime = this.calculateWaitTime(cycleTime);
                logger.info(`[AutonomousLoop] Cycle completed in ${cycleTime}ms. Waiting ${waitTime}ms...`);
                
                await this.wait(waitTime);

            } catch (error) {
                logger.error('[AutonomousLoop] Cycle failed:', error.message);
                
                this.state.consecutiveFailures++;
                this.recordCycleMetric(Date.now() - cycleStart, false);

                // Handle consecutive failures
                if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
                    logger.error('[AutonomousLoop] Max consecutive failures reached. Entering recovery mode...');
                    await this.enterRecoveryMode();
                }

                // Wait before retry
                await this.wait(this.config.loopInterval);
            }
        }

        logger.info('[AutonomousLoop] Loop stopped');
    }

    /**
     * Execute one iteration of the autonomous loop
     */
    async executeIteration() {
        const iteration = {
            number: this.state.iteration,
            timestamp: Date.now(),
            actions: [],
            decisions: [],
            research: [],
            improvements: []
        };

        // 1. Self-assessment
        const assessment = await this.performSelfAssessment();
        iteration.assessment = assessment;

        // 2. Research phase - Learn from external sources
        const researchNeeds = this.identifyResearchNeeds(assessment);
        if (researchNeeds.length > 0) {
            const research = await this.conductResearch(researchNeeds);
            iteration.research = research;
        }

        // 3. Decision phase - Determine what to evolve
        const decisions = await this.makeEvolutionDecisions(assessment, iteration.research);
        iteration.decisions = decisions;

        // 4. Action phase - Execute improvements
        const actions = await this.executeEvolutionActions(decisions);
        iteration.actions = actions;

        // 5. Reflection phase - Learn from outcomes
        const reflection = await this.reflectOnIteration(iteration);
        iteration.reflection = reflection;

        // Store iteration
        this.evolutionHistory.push(iteration);

        // Trim history
        if (this.evolutionHistory.length > 100) {
            this.evolutionHistory.shift();
        }

        return iteration;
    }

    /**
     * Perform self-assessment
     */
    async performSelfAssessment() {
        const assessment = {
            timestamp: Date.now(),
            components: {},
            systemHealth: 0,
            capabilities: [],
            gaps: [],
            opportunities: []
        };

        // Assess each component
        for (const [name, component] of this.components.entries()) {
            try {
                const status = await this.assessComponent(name, component);
                assessment.components[name] = status;
            } catch (error) {
                assessment.components[name] = {
                    status: 'error',
                    error: error.message
                };
            }
        }

        // Calculate overall system health
        const healthScores = Object.values(assessment.components)
            .filter(c => c.health !== undefined)
            .map(c => c.health);

        assessment.systemHealth = healthScores.length > 0
            ? healthScores.reduce((sum, h) => sum + h, 0) / healthScores.length
            : 0;

        // Identify capabilities
        assessment.capabilities = this.identifyCapabilities();

        // Identify gaps
        assessment.gaps = this.identifyGaps(assessment);

        // Identify opportunities
        assessment.opportunities = this.identifyOpportunities(assessment);

        logger.info(`[AutonomousLoop] Assessment: Health=${assessment.systemHealth.toFixed(2)}, ` +
                   `Capabilities=${assessment.capabilities.length}, ` +
                   `Gaps=${assessment.gaps.length}, ` +
                   `Opportunities=${assessment.opportunities.length}`);

        return assessment;
    }

    /**
     * Assess a single component
     */
    async assessComponent(name, component) {
        const status = {
            name,
            active: true,
            health: 0.8,
            lastExecution: component.lastExecution,
            successRate: 0
        };

        // Calculate success rate
        const total = component.successCount + component.failureCount;
        if (total > 0) {
            status.successRate = component.successCount / total;
            status.health = status.successRate;
        }

        // Check if component has getStatus method
        if (component.instance && typeof component.instance.getStatus === 'function') {
            try {
                const componentStatus = await component.instance.getStatus();
                status.details = componentStatus;
            } catch (error) {
                status.error = error.message;
                status.health = 0.5;
            }
        }

        return status;
    }

    /**
     * Identify current capabilities
     */
    identifyCapabilities() {
        const capabilities = [];

        for (const [name, component] of this.components.entries()) {
            if (component.status === 'registered' || component.status === 'active') {
                capabilities.push({
                    component: name,
                    type: this.getComponentType(name),
                    maturity: this.getComponentMaturity(component)
                });
            }
        }

        return capabilities;
    }

    /**
     * Get component type
     */
    getComponentType(name) {
        const types = {
            'agenticCore': 'reasoning',
            'researchEngine': 'learning',
            'selfMonitor': 'monitoring',
            'selfHealer': 'recovery',
            'codeGenerator': 'evolution',
            'autonomicEngine': 'control'
        };
        return types[name] || 'unknown';
    }

    /**
     * Get component maturity level
     */
    getComponentMaturity(component) {
        const successRate = component.successCount / (component.successCount + component.failureCount + 1);
        
        if (successRate > 0.95) return 'mature';
        if (successRate > 0.80) return 'stable';
        if (successRate > 0.60) return 'developing';
        return 'experimental';
    }

    /**
     * Identify gaps in capabilities
     */
    identifyGaps(assessment) {
        const gaps = [];

        // Check for low health components
        for (const [name, status] of Object.entries(assessment.components)) {
            if (status.health < 0.7) {
                gaps.push({
                    type: 'component_health',
                    component: name,
                    severity: 'high',
                    description: `Component ${name} health is low: ${status.health.toFixed(2)}`
                });
            }
        }

        // Check for missing capabilities
        const requiredCapabilities = ['reasoning', 'learning', 'monitoring', 'recovery', 'evolution'];
        const currentTypes = assessment.capabilities.map(c => c.type);
        
        for (const required of requiredCapabilities) {
            if (!currentTypes.includes(required)) {
                gaps.push({
                    type: 'missing_capability',
                    capability: required,
                    severity: 'medium',
                    description: `Missing ${required} capability`
                });
            }
        }

        return gaps;
    }

    /**
     * Identify improvement opportunities
     */
    identifyOpportunities(assessment) {
        const opportunities = [];

        // Opportunities from high-health components
        for (const [name, status] of Object.entries(assessment.components)) {
            if (status.health > 0.9 && status.successRate > 0.9) {
                opportunities.push({
                    type: 'scale',
                    component: name,
                    priority: 'medium',
                    description: `Component ${name} is performing well - consider scaling`
                });
            }
        }

        // Opportunities from gaps
        if (assessment.gaps.length > 0) {
            opportunities.push({
                type: 'improvement',
                priority: 'high',
                description: `Address ${assessment.gaps.length} identified gaps`
            });
        }

        return opportunities;
    }

    /**
     * Identify research needs
     */
    identifyResearchNeeds(assessment) {
        const needs = [];

        // Research for gaps
        assessment.gaps.forEach(gap => {
            if (gap.type === 'missing_capability') {
                needs.push({
                    query: `best practices for ${gap.capability} in autonomous systems`,
                    priority: 'high',
                    reason: gap.description
                });
            }
        });

        // Research for opportunities
        assessment.opportunities.forEach(opp => {
            if (opp.type === 'improvement') {
                needs.push({
                    query: `latest techniques for system self-improvement`,
                    priority: 'medium',
                    reason: opp.description
                });
            }
        });

        // General research for evolution
        if (this.state.iteration % 10 === 0) {
            needs.push({
                query: 'emerging trends in autonomous software systems',
                priority: 'low',
                reason: 'Periodic trend analysis'
            });
        }

        return needs.slice(0, 3); // Limit to top 3
    }

    /**
     * Conduct research
     */
    async conductResearch(needs) {
        const research = [];
        const researchEngine = this.components.get('researchEngine')?.instance;

        if (!researchEngine) {
            logger.warn('[AutonomousLoop] Research engine not available');
            return research;
        }

        for (const need of needs) {
            try {
                logger.info(`[AutonomousLoop] Researching: ${need.query}`);
                const result = await researchEngine.research(need.query);
                research.push({
                    need,
                    result,
                    timestamp: Date.now()
                });
            } catch (error) {
                logger.error(`[AutonomousLoop] Research failed: ${error.message}`);
            }
        }

        return research;
    }

    /**
     * Make evolution decisions
     */
    async makeEvolutionDecisions(assessment, research) {
        const decisions = [];

        // Decision based on gaps
        assessment.gaps.forEach(gap => {
            if (gap.severity === 'high') {
                decisions.push({
                    action: 'FIX_GAP',
                    target: gap.component || gap.capability,
                    priority: 'high',
                    reasoning: gap.description,
                    confidence: 0.8
                });
            }
        });

        // Decision based on opportunities
        assessment.opportunities.forEach(opp => {
            if (opp.priority === 'high') {
                decisions.push({
                    action: 'PURSUE_OPPORTUNITY',
                    target: opp.component || 'system',
                    priority: opp.priority,
                    reasoning: opp.description,
                    confidence: 0.7
                });
            }
        });

        // Decision based on research
        research.forEach(r => {
            if (r.result.confidence > 0.7) {
                decisions.push({
                    action: 'APPLY_RESEARCH',
                    target: 'system',
                    priority: 'medium',
                    reasoning: `Apply insights from: ${r.need.query}`,
                    insights: r.result.insights,
                    confidence: r.result.confidence
                });
            }
        });

        logger.info(`[AutonomousLoop] Made ${decisions.length} evolution decisions`);
        return decisions;
    }

    /**
     * Execute evolution actions
     */
    async executeEvolutionActions(decisions) {
        const actions = [];

        for (const decision of decisions) {
            try {
                logger.info(`[AutonomousLoop] Executing: ${decision.action} on ${decision.target}`);
                
                const result = await this.executeAction(decision);
                actions.push({
                    decision,
                    result,
                    success: true,
                    timestamp: Date.now()
                });

                // Update component stats
                this.updateComponentStats(decision.target, true);

            } catch (error) {
                logger.error(`[AutonomousLoop] Action failed: ${error.message}`);
                actions.push({
                    decision,
                    error: error.message,
                    success: false,
                    timestamp: Date.now()
                });

                this.updateComponentStats(decision.target, false);
            }
        }

        return actions;
    }

    /**
     * Execute a single action
     */
    async executeAction(decision) {
        // Simulate action execution
        // In a real implementation, this would call specific component methods
        
        const result = {
            action: decision.action,
            target: decision.target,
            executed: true,
            timestamp: Date.now()
        };

        switch (decision.action) {
            case 'FIX_GAP':
                result.details = 'Initiated gap remediation';
                break;
            case 'PURSUE_OPPORTUNITY':
                result.details = 'Pursuing improvement opportunity';
                break;
            case 'APPLY_RESEARCH':
                result.details = 'Applied research insights';
                result.insights = decision.insights;
                break;
            default:
                result.details = 'Action executed';
        }

        return result;
    }

    /**
     * Update component statistics
     */
    updateComponentStats(componentName, success) {
        const component = this.components.get(componentName);
        if (component) {
            component.lastExecution = Date.now();
            if (success) {
                component.successCount++;
            } else {
                component.failureCount++;
            }
        }
    }

    /**
     * Reflect on iteration outcomes
     */
    async reflectOnIteration(iteration) {
        const reflection = {
            successRate: 0,
            improvements: [],
            learnings: [],
            nextFocus: []
        };

        // Calculate success rate
        const successfulActions = iteration.actions.filter(a => a.success).length;
        reflection.successRate = iteration.actions.length > 0
            ? successfulActions / iteration.actions.length
            : 0;

        // Identify improvements
        if (reflection.successRate > 0.8) {
            reflection.improvements.push('High success rate maintained');
        }

        // Identify learnings
        iteration.research.forEach(r => {
            if (r.result.insights && r.result.insights.length > 0) {
                reflection.learnings.push({
                    query: r.need.query,
                    insightCount: r.result.insights.length
                });
            }
        });

        // Determine next focus
        if (iteration.assessment.gaps.length > 0) {
            reflection.nextFocus.push('Address remaining gaps');
        }
        if (iteration.assessment.opportunities.length > 0) {
            reflection.nextFocus.push('Pursue top opportunities');
        }

        return reflection;
    }

    /**
     * Calculate adaptive wait time
     */
    calculateWaitTime(cycleTime) {
        if (!this.config.adaptiveThrottling) {
            return this.config.loopInterval;
        }

        // If cycle was fast, we can iterate more frequently
        // If cycle was slow, we should wait longer
        const targetCycleTime = 5000; // 5 seconds
        const adjustment = Math.max(0, targetCycleTime - cycleTime);
        
        return Math.min(
            this.config.loopInterval + adjustment,
            this.config.loopInterval * 2
        );
    }

    /**
     * Record cycle metrics
     */
    recordCycleMetric(cycleTime, success) {
        this.cycleMetrics.push({
            timestamp: Date.now(),
            cycleTime,
            success
        });

        // Keep last 100 metrics
        if (this.cycleMetrics.length > 100) {
            this.cycleMetrics.shift();
        }

        // Update performance stats
        const successCount = this.cycleMetrics.filter(m => m.success).length;
        this.state.performance.successRate = successCount / this.cycleMetrics.length;
        
        const avgCycleTime = this.cycleMetrics.reduce((sum, m) => sum + m.cycleTime, 0) / this.cycleMetrics.length;
        this.state.performance.avgCycleTime = avgCycleTime;
    }

    /**
     * Enter recovery mode after consecutive failures
     */
    async enterRecoveryMode() {
        logger.info('[AutonomousLoop] Entering recovery mode...');

        // Reset failure counter
        this.state.consecutiveFailures = 0;

        // Attempt to heal components
        const selfHealer = this.components.get('selfHealer')?.instance;
        if (selfHealer && typeof selfHealer.heal === 'function') {
            try {
                await selfHealer.heal();
                logger.info('[AutonomousLoop] Self-healing completed');
            } catch (error) {
                logger.error('[AutonomousLoop] Self-healing failed:', error.message);
            }
        }

        // Reduce loop frequency temporarily
        const originalInterval = this.config.loopInterval;
        this.config.loopInterval = originalInterval * 2;
        
        logger.info('[AutonomousLoop] Recovery mode: Reduced loop frequency');

        // Wait before resuming
        await this.wait(5000);

        // Restore original frequency
        this.config.loopInterval = originalInterval;
    }

    /**
     * Stop the autonomous loop
     */
    stop() {
        logger.info('[AutonomousLoop] Stopping autonomous operation...');
        this.state.running = false;
    }

    /**
     * Wait for specified duration
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get loop status
     */
    getStatus() {
        return {
            running: this.state.running,
            iteration: this.state.iteration,
            uptime: Date.now() - (this.state.startTime || Date.now()),
            consecutiveFailures: this.state.consecutiveFailures,
            performance: this.state.performance,
            componentCount: this.components.size,
            evolutionHistorySize: this.evolutionHistory.length
        };
    }

    /**
     * Get evolution history
     */
    getEvolutionHistory(limit = 10) {
        return this.evolutionHistory.slice(-limit);
    }

    /**
     * Export state for persistence
     */
    exportState() {
        return {
            state: this.state,
            evolutionHistory: this.evolutionHistory.slice(-50),
            cycleMetrics: this.cycleMetrics.slice(-100),
            timestamp: Date.now()
        };
    }

    /**
     * Import state from persistence
     */
    importState(data) {
        if (data.evolutionHistory) {
            this.evolutionHistory = data.evolutionHistory;
        }
        if (data.cycleMetrics) {
            this.cycleMetrics = data.cycleMetrics;
        }
        logger.info('[AutonomousLoop] State imported successfully');
    }
}

export default AutonomousLoop;
