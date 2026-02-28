
// Autonomous Task System
// Added to: src/core/autonomous-task-system.js

export class AutonomousTaskSystem {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.db = await import('../../../db/db.js').then(m => m.default);
      this.initialized = true;
      console.log('[AutonomousTask] Initialized');
    } catch (error) {
      console.error('[AutonomousTask] Init error:', error.message);
    }
  }

  /**
   * Create autonomous task
   */
  async createTask(taskData) {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        INSERT INTO autonomous_tasks 
        (task_type, priority, payload, status, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [
        taskData.type,
        taskData.priority || 'medium',
        JSON.stringify(taskData.payload || {}),
        'pending'
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('[AutonomousTask] Create error:', error.message);
      return null;
    }
  }

  /**
   * Get next task to execute
   */
  async getNextTask() {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        SELECT * FROM autonomous_tasks
        WHERE status = 'pending'
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        ORDER BY 
          CASE priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          created_at ASC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        // Mark as in_progress
        await this.db.query(`
          UPDATE autonomous_tasks
          SET status = 'in_progress', started_at = NOW()
          WHERE id = $1
        `, [result.rows[0].id]);
        
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('[AutonomousTask] Get next error:', error.message);
      return null;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId, result) {
    await this.initialize();
    
    try {
      await this.db.query(`
        UPDATE autonomous_tasks
        SET 
          status = 'completed',
          completed_at = NOW(),
          result = $2
        WHERE id = $1
      `, [taskId, JSON.stringify(result)]);
      
      return { success: true };
    } catch (error) {
      console.error('[AutonomousTask] Complete error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Fail task
   */
  async failTask(taskId, error) {
    await this.initialize();
    
    try {
      await this.db.query(`
        UPDATE autonomous_tasks
        SET 
          status = 'failed',
          completed_at = NOW(),
          error_message = $2,
          retry_count = retry_count + 1
        WHERE id = $1
      `, [taskId, error]);
      
      // Check if should retry
      const task = await this.db.query(
        'SELECT * FROM autonomous_tasks WHERE id = $1',
        [taskId]
      );
      
      if (task.rows[0] && task.rows[0].retry_count < 3) {
        // Reschedule
        await this.db.query(`
          UPDATE autonomous_tasks
          SET 
            status = 'pending',
            scheduled_for = NOW() + INTERVAL '5 minutes'
          WHERE id = $1
        `, [taskId]);
      }
      
      return { success: true, retried: task.rows[0]?.retry_count < 3 };
    } catch (error) {
      console.error('[AutonomousTask] Fail error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get task statistics
   */
  async getStatistics() {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
        FROM autonomous_tasks
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `);
      
      const stats = {
        by_status: {},
        total: 0
      };
      
      result.rows.forEach(row => {
        stats.by_status[row.status] = {
          count: parseInt(row.count),
          avg_duration: parseFloat(row.avg_duration_seconds || 0)
        };
        stats.total += parseInt(row.count);
      });
      
      return stats;
    } catch (error) {
      console.error('[AutonomousTask] Statistics error:', error.message);
      return { error: error.message };
    }
  }
}

export default new AutonomousTaskSystem();
