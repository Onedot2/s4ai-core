
// Analytics Dashboard Data Engine
// Added to: src/core/analytics-dashboard-engine.js

export class AnalyticsDashboardEngine {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.db = await import('../../../db/db.js').then(m => m.default);
      this.initialized = true;
      console.log('[AnalyticsDashboard] Initialized');
    } catch (error) {
      console.error('[AnalyticsDashboard] Init error:', error.message);
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData() {
    await this.initialize();
    
    try {
      const [users, revenue, apiUsage, tasks, mlm, quantum] = await Promise.all([
        this.getUserMetrics(),
        this.getRevenueMetrics(),
        this.getAPIUsageMetrics(),
        this.getTaskMetrics(),
        this.getMLMMetrics(),
        this.getQuantumMetrics()
      ]);
      
      return {
        timestamp: new Date().toISOString(),
        users,
        revenue,
        apiUsage,
        tasks,
        mlm,
        quantum,
        health: this.calculateHealthScore({ users, revenue, apiUsage, tasks })
      };
    } catch (error) {
      console.error('[AnalyticsDashboard] Dashboard data error:', error.message);
      return { error: error.message };
    }
  }

  async getUserMetrics() {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        COUNT(DISTINCT plan) as plan_count
      FROM users
    `);
    
    return result.rows[0];
  }

  async getRevenueMetrics() {
    const result = await this.db.query(`
      SELECT 
        SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as revenue_24h,
        SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as revenue_7d,
        SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as revenue_30d,
        COUNT(DISTINCT stripe_customer_id) as paying_customers
      FROM revenue_log
    `);
    
    return {
      ...result.rows[0],
      mrr_estimate: parseInt(result.rows[0].revenue_30d || 0) // Monthly recurring revenue estimate
    };
  }

  async getAPIUsageMetrics() {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as calls_1h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as calls_24h,
        AVG(response_time_ms) as avg_response_ms,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_count
      FROM api_usage
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    return result.rows[0];
  }

  async getTaskMetrics() {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '24 hours') as completed_24h,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM autonomous_tasks
    `);
    
    return result.rows[0];
  }

  async getMLMMetrics() {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total_learnings,
        AVG(confidence) as avg_confidence,
        COUNT(DISTINCT context) as unique_contexts
      FROM mlm_learnings
      WHERE learned_at >= NOW() - INTERVAL '7 days'
    `);
    
    return result.rows[0];
  }

  async getQuantumMetrics() {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total_decisions,
        AVG(confidence) as avg_confidence,
        COUNT(*) FILTER (WHERE outcome = 'success') as successful_decisions
      FROM q_dd_decisions
      WHERE decided_at >= NOW() - INTERVAL '7 days'
    `);
    
    const successRate = result.rows[0].total_decisions > 0 
      ? (result.rows[0].successful_decisions / result.rows[0].total_decisions) * 100 
      : 0;
    
    return {
      ...result.rows[0],
      success_rate: successRate.toFixed(1)
    };
  }

  calculateHealthScore(metrics) {
    let score = 100;
    
    // Deduct for issues
    if (parseInt(metrics.apiUsage.error_count) > 100) score -= 20;
    if (parseInt(metrics.tasks.failed) > 10) score -= 15;
    if (parseInt(metrics.revenue.revenue_24h || 0) === 0) score -= 10;
    
    return Math.max(0, score);
  }
}

export default new AnalyticsDashboardEngine();
