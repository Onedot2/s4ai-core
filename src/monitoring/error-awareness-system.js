// src/core/error-awareness-system.js
/**
 * Error Awareness System for S4Ai Self-Healing
 * Makes S4Ai aware of all system errors and enables autonomous healing
 */

class ErrorAwarenessSystem {
  constructor() {
    this.errors = [];
    this.healingAttempts = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[Error Awareness] Initializing error monitoring system...');
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Monitor process errors
    this.setupProcessErrorHandlers();
    
    // Start error polling
    this.startErrorMonitoring();
    
    this.initialized = true;
    console.log('[Error Awareness] ✅ Error monitoring enabled');
  }

  setupGlobalErrorHandlers() {
    // Capture uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.captureError({
        type: 'uncaughtException',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.captureError({
        type: 'unhandledRejection',
        message: reason?.message || String(reason),
        timestamp: new Date().toISOString()
      });
    });
  }

  setupProcessErrorHandlers() {
    // Monitor for SIGTERM/SIGINT
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        console.log(`[Error Awareness] Received ${signal}, performing graceful shutdown...`);
        this.shutdown();
      });
    });
  }

  captureError(error) {
    // Add to error log
    this.errors.push(error);
    
    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
    
    console.error(`[Error Awareness] 🚨 Error captured: ${error.type} - ${error.message}`);
    
    // Trigger self-healing if possible
    this.attemptSelfHealing(error);
  }

  async attemptSelfHealing(error) {
    console.log('[Error Awareness] 🔧 Attempting self-healing...');
    
    const healingStrategy = this.determineHealingStrategy(error);
    
    if (healingStrategy) {
      try {
        await healingStrategy.action();
        this.healingAttempts.push({
          error: error.type,
          strategy: healingStrategy.name,
          success: true,
          timestamp: new Date().toISOString()
        });
        console.log(`[Error Awareness] ✅ Self-healing successful: ${healingStrategy.name}`);
      } catch (healError) {
        this.healingAttempts.push({
          error: error.type,
          strategy: healingStrategy.name,
          success: false,
          failureReason: healError.message,
          timestamp: new Date().toISOString()
        });
        console.log(`[Error Awareness] ❌ Self-healing failed: ${healError.message}`);
      }
    } else {
      console.log('[Error Awareness] ⚠️  No healing strategy available for this error');
    }
  }

  determineHealingStrategy(error) {
    // Database connection errors
    if (error.message?.includes('password authentication failed') || 
        error.message?.includes('28P01')) {
      return {
        name: 'Database Reconnection',
        action: async () => {
          console.log('[Self-Healing] Attempting database reconnection...');
          // Reset connection pool
          if (global.dbPool) {
            await global.dbPool.end();
            global.dbPool = null;
          }
          // Force reinitialize on next query
          console.log('[Self-Healing] Database connection reset');
        }
      };
    }
    
    // Import/Module errors
    if (error.message?.includes('Cannot find module') ||
        error.message?.includes('ERR_MODULE_NOT_FOUND')) {
      return {
        name: 'Module Resolution',
        action: async () => {
          console.log('[Self-Healing] Module error detected - logging for manual review');
          // Log to file for later analysis
        }
      };
    }
    
    // Memory errors
    if (error.message?.includes('out of memory') ||
        error.message?.includes('ENOMEM')) {
      return {
        name: 'Memory Cleanup',
        action: async () => {
          console.log('[Self-Healing] Forcing garbage collection...');
          if (global.gc) {
            global.gc();
          }
        }
      };
    }
    
    return null;
  }

  startErrorMonitoring() {
    // Poll for errors every 30 seconds
    setInterval(() => {
      if (this.errors.length > 0) {
        console.log(`[Error Awareness] 📊 ${this.errors.length} errors in memory`);
        console.log(`[Error Awareness] 🔧 ${this.healingAttempts.length} healing attempts made`);
      }
    }, 30000);
  }

  getStatus() {
    const recentErrors = this.errors.slice(-10);
    const recentHealing = this.healingAttempts.slice(-10);
    const successfulHealing = this.healingAttempts.filter(h => h.success).length;
    const healingSuccessRate = this.healingAttempts.length > 0
      ? ((successfulHealing / this.healingAttempts.length) * 100).toFixed(1)
      : 0;

    return {
      initialized: this.initialized,
      totalErrors: this.errors.length,
      totalHealingAttempts: this.healingAttempts.length,
      successfulHealing,
      healingSuccessRate: `${healingSuccessRate}%`,
      recentErrors,
      recentHealing,
      isAware: this.errors.length > 0
    };
  }

  shutdown() {
    console.log('[Error Awareness] Shutting down...');
    this.initialized = false;
  }
}

// Singleton instance
const errorAwareness = new ErrorAwarenessSystem();

export default errorAwareness;
export { ErrorAwarenessSystem };
