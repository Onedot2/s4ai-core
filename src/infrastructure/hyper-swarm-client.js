/**
 * HyperSwarm Integration Module for Node.js S4Ai API
 * Bridges Node.js API to Python HyperSwarm system
 */

import { spawn } from 'child_process';
import path from 'path';
import logger from '../utils/logger.js';
import pool from '../db/pool.js';

class HyperSwarmClient {
    constructor(config = {}) {
        this.pythonPath = config.pythonPath || 'python3';
        this.swarmDir = config.swarmDir || path.join(__dirname, '../../ai-worker/src/swarm');
        this.orchestratorScript = path.join(this.swarmDir, 'hyper_swarm_orchestrator.py');
        this.timeout = config.timeout || 300000; // 5 minutes default
        this.enabled = config.enabled !== false;
    }

    /**
     * Execute high-level goal using HyperSwarm
     * @param {string} goal - High-level goal description
     * @param {object} options - Execution options
     * @returns {Promise<object>} Execution result
     */
    async execute(goal, options = {}) {
        if (!this.enabled) {
            logger.warn('[HyperSwarm] Disabled - returning fallback response');
            return { success: false, error: 'HyperSwarm disabled' };
        }

        logger.info(`[HyperSwarm] Executing: ${goal}`);

        try {
            // Prepare execution parameters
            const params = {
                goal,
                max_agents: options.maxAgents || 155,
                framework: options.framework || 'react',
                priority: options.priority || 'normal'
            };

            // Spawn Python process
            const result = await this._spawnPython(params);

            // Log to database
            await this._logExecution(goal, result);

            return result;
        } catch (error) {
            logger.error('[HyperSwarm] Execution error:', error);
            throw error;
        }
    }

    /**
     * Convert screenshot to code
     * @param {string} screenshotPath - Path to screenshot file
     * @param {string} componentName - Component name
     * @param {string} framework - Target framework (react, vue, html)
     * @returns {Promise<object>} Generated code
     */
    async screenshotToCode(screenshotPath, componentName, framework = 'react') {
        logger.info(`[HyperSwarm] Converting screenshot to ${framework} code`);

        try {
            const script = path.join(this.swarmDir, 'visual_to_logic_mapper.py');

            const params = {
                action: 'screenshot_to_code',
                screenshot_path: screenshotPath,
                component_name: componentName,
                framework
            };

            const result = await this._spawnPython(params, script);

            return {
                success: true,
                components: result.components,
                styles: result.styles,
                types: result.types,
                tests: result.tests
            };
        } catch (error) {
            logger.error('[HyperSwarm] Screenshot conversion error:', error);
            throw error;
        }
    }

    /**
     * Private: Spawn Python process
     */
    _spawnPython(params, script = this.orchestratorScript) {
        return new Promise((resolve, reject) => {
            const args = [script, '--json', JSON.stringify(params)];

            const pythonProcess = spawn(this.pythonPath, args, {
                cwd: this.swarmDir,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                logger.debug(`[HyperSwarm] ${data.toString().trim()}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (error) {
                        reject(new Error(`Failed to parse result: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Python process exited with code ${code}: ${stderr}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn Python: ${error.message}`));
            });

            // Timeout handling
            setTimeout(() => {
                pythonProcess.kill('SIGTERM');
                reject(new Error(`HyperSwarm execution timeout (${this.timeout}ms)`));
            }, this.timeout);
        });
    }

    /**
     * Private: Log execution to database
     */
    async _logExecution(goal, result) {
        try {
            const client = await pool.connect();

            await client.query(`
        INSERT INTO hyper_swarm_tasks (
          task_id,
          description,
          status,
          result,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
                `task-${Date.now()}`,
                goal,
                result.success ? 'completed' : 'failed',
                JSON.stringify(result)
            ]);

            client.release();
        } catch (error) {
            logger.error('[HyperSwarm] Failed to log execution:', error);
            // Don't throw - logging failure shouldn't break execution
        }
    }

    /**
     * Get swarm metrics from database
     */
    async getMetrics() {
        try {
            const client = await pool.connect();

            const result = await client.query(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
          AVG((result->>'avg_confidence')::float) as avg_confidence
        FROM hyper_swarm_tasks
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

            client.release();

            return result.rows[0];
        } catch (error) {
            logger.error('[HyperSwarm] Failed to get metrics:', error);
            return {};
        }
    }
}

// Singleton instance
let hyperSwarmInstance = null;

export function getHyperSwarm(config = {}) {
    if (!hyperSwarmInstance) {
        hyperSwarmInstance = new HyperSwarmClient(config);
    }
    return hyperSwarmInstance;
}

export default HyperSwarmClient;
