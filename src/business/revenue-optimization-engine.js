
// Revenue Optimization Engine
// Added to: src/core/revenue-optimization-engine.js

export class RevenueOptimizationEngine {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.db = await import('../../../db/db.js').then(m => m.default);
      this.initialized = true;
      console.log('[RevenueOpt] Initialized');
    } catch (error) {
      console.error('[RevenueOpt] Init error:', error.message);
    }
  }

  /**
   * Analyze revenue trends
   */
  async analyzeTrends(days = 30) {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          SUM(amount_cents) as daily_revenue,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT stripe_customer_id) as unique_customers
        FROM revenue_log
        WHERE created_at >= NOW() - INTERVAL '$1 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `, [days]);
      
      const trends = {
        daily_data: result.rows,
        total_revenue: 0,
        avg_daily_revenue: 0,
        growth_rate: 0,
        insights: []
      };
      
      if (result.rows.length > 0) {
        trends.total_revenue = result.rows.reduce((sum, row) => 
          sum + parseInt(row.daily_revenue || 0), 0
        );
        trends.avg_daily_revenue = trends.total_revenue / result.rows.length;
        
        // Calculate growth rate
        if (result.rows.length >= 7) {
          const recentWeek = result.rows.slice(0, 7).reduce((sum, row) => 
            sum + parseInt(row.daily_revenue || 0), 0
          );
          const previousWeek = result.rows.slice(7, 14).reduce((sum, row) => 
            sum + parseInt(row.daily_revenue || 0), 0
          );
          
          if (previousWeek > 0) {
            trends.growth_rate = ((recentWeek - previousWeek) / previousWeek) * 100;
          }
        }
        
        // Generate insights
        if (trends.growth_rate > 10) {
          trends.insights.push({
            type: 'positive',
            message: `Strong growth: ${trends.growth_rate.toFixed(1)}% week-over-week`,
            confidence: 0.9
          });
        } else if (trends.growth_rate < -10) {
          trends.insights.push({
            type: 'warning',
            message: `Revenue decline: ${trends.growth_rate.toFixed(1)}% week-over-week`,
            confidence: 0.85,
            action: 'Review pricing and user engagement'
          });
        }
      }
      
      return trends;
    } catch (error) {
      console.error('[RevenueOpt] Trend analysis error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Identify upsell opportunities
   */
  async identifyUpsellOpportunities() {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        SELECT 
          u.id,
          u.email,
          u.plan,
          s.api_calls_used,
          s.api_call_limit,
          (s.api_calls_used::float / NULLIF(s.api_call_limit, 0)) as usage_ratio
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE 
          u.status = 'active'
          AND s.status = 'active'
          AND s.api_call_limit > 0
          AND (s.api_calls_used::float / s.api_call_limit) > 0.8
        ORDER BY usage_ratio DESC
        LIMIT 50
      `);
      
      const opportunities = result.rows.map(row => ({
        user_id: row.id,
        email: row.email,
        current_plan: row.plan,
        usage_percent: (parseFloat(row.usage_ratio) * 100).toFixed(1),
        recommended_action: parseFloat(row.usage_ratio) > 0.9 
          ? 'Immediate upsell' 
          : 'Nurture campaign',
        confidence: parseFloat(row.usage_ratio)
      }));
      
      return {
        total_opportunities: opportunities.length,
        high_priority: opportunities.filter(o => o.confidence > 0.9).length,
        opportunities: opportunities
      };
    } catch (error) {
      console.error('[RevenueOpt] Upsell identification error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Calculate customer lifetime value
   */
  async calculateCLTV() {
    await this.initialize();
    
    try {
      const result = await this.db.query(`
        SELECT 
          u.plan,
          COUNT(DISTINCT u.id) as customer_count,
          AVG(EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400) as avg_lifetime_days,
          SUM(r.amount_cents) / COUNT(DISTINCT u.id) as avg_revenue_per_customer
        FROM users u
        LEFT JOIN revenue_log r ON r.stripe_customer_id = u.stripe_customer_id
        WHERE u.status = 'active'
        GROUP BY u.plan
      `);
      
      const cltvData = {
        by_plan: {},
        overall_cltv: 0
      };
      
      result.rows.forEach(row => {
        const avgRevenue = parseFloat(row.avg_revenue_per_customer || 0);
        const avgLifetime = parseFloat(row.avg_lifetime_days || 0);
        
        // Estimate CLTV (simplified)
        const cltv = (avgRevenue / avgLifetime) * 365 * 2; // 2-year projection
        
        cltvData.by_plan[row.plan] = {
          customers: parseInt(row.customer_count),
          avg_lifetime_days: avgLifetime.toFixed(0),
          avg_revenue: avgRevenue.toFixed(2),
          estimated_cltv: cltv.toFixed(2)
        };
      });
      
      return cltvData;
    } catch (error) {
      console.error('[RevenueOpt] CLTV calculation error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Generate revenue recommendations
   */
  async generateRecommendations() {
    await this.initialize();
    
    const trends = await this.analyzeTrends();
    const upsell = await this.identifyUpsellOpportunities();
    const cltv = await this.calculateCLTV();
    
    const recommendations = [];
    
    // Trend-based recommendations
    if (trends.growth_rate < 0) {
      recommendations.push({
        priority: 'high',
        type: 'retention',
        message: 'Revenue declining - focus on retention',
        action: 'Launch re-engagement campaign'
      });
    }
    
    // Upsell recommendations
    if (upsell.high_priority > 0) {
      recommendations.push({
        priority: 'high',
        type: 'upsell',
        message: `${upsell.high_priority} users ready for upsell`,
        action: 'Send upgrade offers'
      });
    }
    
    // CLTV recommendations
    Object.entries(cltv.by_plan || {}).forEach(([plan, data]) => {
      if (parseFloat(data.estimated_cltv) < 10000) {
        recommendations.push({
          priority: 'medium',
          type: 'value_increase',
          message: `Low CLTV for ${plan} plan: $${data.estimated_cltv}`,
          action: 'Add premium features or increase pricing'
        });
      }
    });
    
    return {
      recommendations,
      data_sources: {
        trends: trends.insights,
        upsell_opportunities: upsell.total_opportunities,
        cltv_analysis: Object.keys(cltv.by_plan || {}).length
      }
    };
  }
}

export default new RevenueOptimizationEngine();
