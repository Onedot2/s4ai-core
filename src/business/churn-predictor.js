/**
 * Phase 4: Churn Predictor
 * Heuristic-based churn risk scoring using engagement and billing signals.
 */

import pool from '../db/pool.js';

class ChurnPredictor {
  constructor() {
    this.highRiskThreshold = 0.7;
  }

  async getLatestUsage(userId) {
    const query = `
      SELECT MAX(created_at) as last_usage, SUM(usage_count) as usage_count
      FROM feature_usage
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return { last_usage: null, usage_count: 0 };
    }

    return {
      last_usage: result.rows[0].last_usage,
      usage_count: Number(result.rows[0].usage_count || 0)
    };
  }

  async getSubscriptionStatus(userId) {
    const query = `
      SELECT status, current_period_end
      FROM user_subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return { status: 'inactive', current_period_end: null };
    }

    return result.rows[0];
  }

  async getPaymentHealth(userId) {
    const query = `
      SELECT
        COUNT(*) as total_charges,
        COUNT(CASE WHEN status != 'succeeded' THEN 1 END) as failed_charges
      FROM stripe_charges
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '90 days'
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return { total_charges: 0, failed_charges: 0 };
    }

    return {
      total_charges: Number(result.rows[0].total_charges || 0),
      failed_charges: Number(result.rows[0].failed_charges || 0)
    };
  }

  calculateRiskScore({ usageDaysAgo, usageCount, subscriptionStatus, failedChargeRate }) {
    let score = 0.2;

    if (usageDaysAgo === null || usageDaysAgo > 30) score += 0.4;
    else if (usageDaysAgo > 14) score += 0.2;

    if (usageCount === 0) score += 0.2;

    if (subscriptionStatus !== 'active') score += 0.3;

    if (failedChargeRate > 0.2) score += 0.2;
    else if (failedChargeRate > 0) score += 0.1;

    return Math.min(score, 0.99);
  }

  async predict(userId) {
    const [usage, subscription, payment] = await Promise.all([
      this.getLatestUsage(userId),
      this.getSubscriptionStatus(userId),
      this.getPaymentHealth(userId)
    ]);

    const usageDaysAgo = usage.last_usage
      ? Math.floor((Date.now() - new Date(usage.last_usage).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const failedChargeRate = payment.total_charges > 0
      ? payment.failed_charges / payment.total_charges
      : 0;

    const riskScore = this.calculateRiskScore({
      usageDaysAgo,
      usageCount: usage.usage_count,
      subscriptionStatus: subscription.status,
      failedChargeRate
    });

    const riskLevel = riskScore >= 0.8 ? 'CRITICAL' : riskScore >= this.highRiskThreshold ? 'HIGH' : riskScore >= 0.4 ? 'MEDIUM' : 'LOW';

    await this.recordRisk(userId, riskScore, riskLevel);

    return {
      user_id: userId,
      risk_score: Number(riskScore.toFixed(3)),
      risk_level: riskLevel,
      usage_days_ago: usageDaysAgo,
      usage_count_30d: usage.usage_count,
      subscription_status: subscription.status,
      failed_charge_rate: Number(failedChargeRate.toFixed(2))
    };
  }

  async recordRisk(userId, riskScore, riskLevel) {
    const query = `
      INSERT INTO churn_risk (user_id, risk_score, risk_level)
      VALUES ($1, $2, $3)
    `;

    await pool.query(query, [userId, riskScore, riskLevel]);
  }
}

let predictorInstance = null;

export function getChurnPredictor() {
  if (!predictorInstance) {
    predictorInstance = new ChurnPredictor();
  }
  return predictorInstance;
}

export default ChurnPredictor;
