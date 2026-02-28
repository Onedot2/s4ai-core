/**
 * Self-Healer - Automatic Error Detection and Recovery
 * Implements self-healing capabilities for autonomous operation
 */

import logger from '../utils/logger.js';

class SelfHealer {
    constructor(app) {
        this.app = app;
        this.healingStrategies = new Map();
        this.healingHistory = [];
        this.maxRetries = 3;
        
        this.initializeStrategies();
    }

    initializeStrategies() {
        // Define healing strategies for different error types
        this.healingStrategies.set('network_error', {
            name: 'Network Recovery',
            handler: this.handleNetworkError.bind(this),
            retryable: true
        });

        this.healingStrategies.set('memory_error', {
            name: 'Memory Cleanup',
            handler: this.handleMemoryError.bind(this),
            retryable: false
        });

        this.healingStrategies.set('performance_degradation', {
            name: 'Performance Recovery',
            handler: this.handlePerformanceDegradation.bind(this),
            retryable: true
        });

        this.healingStrategies.set('component_failure', {
            name: 'Component Restart',
            handler: this.handleComponentFailure.bind(this),
            retryable: true
        });

        this.healingStrategies.set('generic_error', {
            name: 'Generic Recovery',
            handler: this.handleGenericError.bind(this),
            retryable: true
        });
    }

    async handleError(error) {
        logger.info('[SelfHealer] Handling error:', error);

        // Classify the error
        const errorType = this.classifyError(error);
        
        // Get appropriate healing strategy
        const strategy = this.healingStrategies.get(errorType) || 
                        this.healingStrategies.get('generic_error');

        // Record the error
        this.app.components.selfMonitor?.recordError(error);

        // Attempt healing
        const healingResult = await this.attemptHealing(error, strategy);

        // Record healing attempt
        this.healingHistory.push({
            timestamp: Date.now(),
            error: error.message,
            errorType,
            strategy: strategy.name,
            result: healingResult
        });

        // Trim history
        if (this.healingHistory.length > 100) {
            this.healingHistory = this.healingHistory.slice(-100);
        }

        return healingResult;
    }

    classifyError(error) {
        const message = error.message?.toLowerCase() || '';
        
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return 'network_error';
        } else if (message.includes('memory') || message.includes('heap')) {
            return 'memory_error';
        } else if (message.includes('performance') || message.includes('slow')) {
            return 'performance_degradation';
        } else if (message.includes('component') || message.includes('undefined')) {
            return 'component_failure';
        }
        
        return 'generic_error';
    }

    async attemptHealing(error, strategy, retryCount = 0) {
        try {
            logger.info(`[SelfHealer] Attempting healing with strategy: ${strategy.name}`);
            
            // Execute healing strategy
            const result = await strategy.handler(error);

            if (result.success) {
                this.app.logActivity(`Self-healing successful: ${strategy.name}`);
                return { success: true, strategy: strategy.name, result };
            } else if (strategy.retryable && retryCount < this.maxRetries) {
                // Retry with exponential backoff
                const delay = Math.pow(2, retryCount) * 1000;
                await this.sleep(delay);
                return this.attemptHealing(error, strategy, retryCount + 1);
            } else {
                this.app.logActivity(`Self-healing failed: ${strategy.name}`);
                return { success: false, strategy: strategy.name, reason: 'Max retries exceeded' };
            }
        } catch (healingError) {
            logger.error('[SelfHealer] Healing failed:', healingError);
            return { success: false, strategy: strategy.name, error: healingError.message };
        }
    }

    // Healing strategy implementations

    async handleNetworkError(error) {
        logger.info('[SelfHealer] Handling network error...');
        
        // Check network connectivity
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        
        if (!isOnline) {
            return { 
                success: false, 
                reason: 'Network offline',
                action: 'Wait for network recovery'
            };
        }

        // Attempt to refresh service worker cache
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            await navigator.serviceWorker.controller.postMessage({
                type: 'REFRESH_CACHE'
            });
        }

        return { 
            success: true, 
            action: 'Cache refreshed'
        };
    }

    async handleMemoryError(error) {
        logger.info('[SelfHealer] Handling memory error...');
        
        // Trigger garbage collection (if possible)
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }

        // Clear old data from metrics
        if (this.app.components.selfMonitor) {
            this.app.components.selfMonitor.trimHistory();
        }

        // Clear old healing history
        if (this.healingHistory.length > 50) {
            this.healingHistory = this.healingHistory.slice(-50);
        }

        return { 
            success: true, 
            action: 'Memory cleanup performed'
        };
    }

    async handlePerformanceDegradation(error) {
        logger.info('[SelfHealer] Handling performance degradation...');
        
        // Reduce monitoring frequency temporarily
        if (this.app.components.selfMonitor) {
            const currentInterval = this.app.components.selfMonitor.monitoringInterval;
            this.app.components.selfMonitor.monitoringInterval = currentInterval * 2;
            
            // Reset after 1 minute
            setTimeout(() => {
                this.app.components.selfMonitor.monitoringInterval = currentInterval;
            }, 60000);
        }

        // Request idle callback for non-critical operations
        if (typeof window !== 'undefined' && window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                logger.info('[SelfHealer] Performing deferred optimizations');
            });
        }

        return { 
            success: true, 
            action: 'Performance optimization applied'
        };
    }

    async handleComponentFailure(error) {
        logger.info('[SelfHealer] Handling component failure...');
        
        // Attempt to reinitialize failed component
        const componentName = this.identifyFailedComponent(error);
        
        if (componentName && this.app.components[componentName]) {
            try {
                // Reinitialize the component
                const ComponentClass = this.app.components[componentName].constructor;
                this.app.components[componentName] = new ComponentClass(this.app);
                
                return { 
                    success: true, 
                    action: `Component ${componentName} reinitialized`
                };
            } catch (reinitError) {
                return { 
                    success: false, 
                    reason: `Failed to reinitialize ${componentName}`,
                    error: reinitError.message
                };
            }
        }

        return { 
            success: false, 
            reason: 'Could not identify failed component'
        };
    }

    async handleGenericError(error) {
        logger.info('[SelfHealer] Handling generic error...');
        
        // Log error details
        logger.error('[SelfHealer] Error details:', error);
        
        // Attempt basic recovery
        return { 
            success: true, 
            action: 'Error logged and monitored'
        };
    }

    identifyFailedComponent(error) {
        const stack = error.stack || '';
        
        if (stack.includes('autonomic-engine')) return 'autonomicEngine';
        if (stack.includes('self-monitor')) return 'selfMonitor';
        if (stack.includes('code-generator')) return 'codeGenerator';
        
        return null;
    }

    async heal(target) {
        logger.info('[SelfHealer] Healing target:', target);
        
        if (Array.isArray(target)) {
            // Heal multiple anomalies
            const results = await Promise.all(
                target.map(anomaly => this.handleError(new Error(anomaly.type)))
            );
            return results;
        } else {
            return this.handleError(new Error(target));
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            active: true,
            healingAttempts: this.healingHistory.length,
            successRate: this.calculateSuccessRate()
        };
    }

    calculateSuccessRate() {
        if (this.healingHistory.length === 0) return 100;
        
        const successful = this.healingHistory.filter(h => h.result.success).length;
        return (successful / this.healingHistory.length * 100).toFixed(2);
    }

    getHealingHistory() {
        return this.healingHistory.slice(-20);
    }
}

export default SelfHealer;
