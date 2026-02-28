/**
 * Phase 4: Customer Lifetime Value (CLV) Optimizer
 * Calculates CLV using revenue history, retention signals, and churn risk.
 */

import pool from '../db/pool.js';

class CLVOptimizer {
  constructor() {
    this.defaultChurnRate = 0.05; // 5% monthly churn fallback
    this.defaultMargin = 0.8; // 80% gross margin assumption
  }

  async getRevenueHistory(userId, lookbackDays = 180) {
    const query = `
      SELECT
        DATE(created_at) as day,
        SUM(amount) as revenue
      FROM revenue_events
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const result = await pool.query(query, [userId, lookbackDays]);
    return result.rows.map(r => ({
      day: r.day,
      revenue: Number(r.revenue || 0)
    }));
  }

  async getChurnRate(userId) {
    const query = `
      SELECT risk_score
      FROM churn_risk
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return this.defaultChurnRate;
    }

    const riskScore = Number(result.rows[0].risk_score || 0);
    return Math.min(Math.max(riskScore, 0.01), 0.3);
  }

  calculateARPU(revenueHistory, months = 6) {
    const totalRevenue = revenueHistory.reduce((sum, r) => sum + r.revenue, 0);
    const avgMonthly = totalRevenue / Math.max(months, 1);
    return avgMonthly;
  }

  async calculateCLV(userId) {
    const revenueHistory = await this.getRevenueHistory(userId, 180);
    const churnRate = await this.getChurnRate(userId);

    const arpu = this.calculateARPU(revenueHistory, 6);
    const retentionMonths = 1 / churnRate;
    const clv = arpu * this.defaultMargin * retentionMonths;

    const confidence = revenueHistory.length >= 30 ? 0.9 : revenueHistory.length >= 10 ? 0.7 : 0.5;

    await this.recordSnapshot(userId, {
      arpu,
      churn_rate: churnRate,
      retention_months: retentionMonths,
      clv,
      confidence
    });

    return {
      user_id: userId,
      arpu: Number(arpu.toFixed(2)),
      churn_rate: Number(churnRate.toFixed(4)),
      retention_months: Number(retentionMonths.toFixed(2)),
      clv: Number(clv.toFixed(2)),
      confidence
    };
  }

  async recordSnapshot(userId, snapshot) {
    const query = `
      INSERT INTO customer_ltv
        (user_id, arpu, churn_rate, retention_months, clv, confidence)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(query, [
      userId,
      snapshot.arpu,
      snapshot.churn_rate,
      snapshot.retention_months,
      snapshot.clv,
      snapshot.confidence
    ]);
  }

  async getSegmentCLV() {
    const query = `
      SELECT
        tier_id,
        AVG(clv) as avg_clv,
        AVG(arpu) as avg_arpu,
        AVG(churn_rate) as avg_churn,
        COUNT(*) as sample_size
      FROM customer_ltv
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY tier_id
      ORDER BY avg_clv DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      tier_id: row.tier_id,
      avg_clv: Number(row.avg_clv || 0),
      avg_arpu: Number(row.avg_arpu || 0),
      avg_churn: Number(row.avg_churn || 0),
      sample_size: Number(row.sample_size || 0)
    }));
  }
}

let optimizerInstance = null;

export function getCLVOptimizer() {
  if (!optimizerInstance) {
    optimizerInstance = new CLVOptimizer();
  }
  return optimizerInstance;
}

export default CLVOptimizer;
