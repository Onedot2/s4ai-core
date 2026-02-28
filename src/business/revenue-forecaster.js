/**
 * Phase 4: Revenue Forecaster
 * Simple exponential smoothing on daily revenue events.
 */

import pool from '../db/pool.js';

class RevenueForecaster {
  constructor() {
    this.alpha = 0.4; // smoothing factor
    this.forecastDays = 30;
  }

  async getDailyRevenue(lookbackDays = 90) {
    const query = `
      SELECT
        DATE(created_at) as day,
        SUM(amount) as revenue
      FROM revenue_events
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const result = await pool.query(query, [lookbackDays]);
    return result.rows.map(r => ({
      day: r.day,
      revenue: Number(r.revenue || 0)
    }));
  }

  smoothSeries(values) {
    if (values.length === 0) return [];

    const smoothed = [values[0]];
    for (let i = 1; i < values.length; i++) {
      const next = this.alpha * values[i] + (1 - this.alpha) * smoothed[i - 1];
      smoothed.push(next);
    }

    return smoothed;
  }

  generateForecast(lastValue) {
    const forecast = [];
    for (let i = 1; i <= this.forecastDays; i++) {
      forecast.push({
        day_offset: i,
        predicted_revenue: Number(lastValue.toFixed(2))
      });
    }
    return forecast;
  }

  async forecast() {
    const dailyRevenue = await this.getDailyRevenue(90);
    const series = dailyRevenue.map(r => r.revenue);

    if (series.length === 0) {
      return {
        forecast: [],
        confidence: 0.3,
        message: 'Insufficient revenue data to forecast'
      };
    }

    const smoothed = this.smoothSeries(series);
    const lastValue = smoothed[smoothed.length - 1];
    const forecast = this.generateForecast(lastValue);

    const confidence = series.length >= 60 ? 0.85 : series.length >= 30 ? 0.7 : 0.5;

    await this.recordForecast(forecast, confidence);

    return {
      forecast,
      confidence,
      last_smoothed_value: Number(lastValue.toFixed(2)),
      history_days: series.length
    };
  }

  async recordForecast(forecast, confidence) {
    const query = `
      INSERT INTO revenue_forecasts (forecast_date, predicted_revenue, confidence)
      VALUES ($1, $2, $3)
    `;

    const today = new Date();
    for (const entry of forecast) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + entry.day_offset);
      await pool.query(query, [forecastDate, entry.predicted_revenue, confidence]);
    }
  }
}

let forecasterInstance = null;

export function getRevenueForecaster() {
  if (!forecasterInstance) {
    forecasterInstance = new RevenueForecaster();
  }
  return forecasterInstance;
}

export default RevenueForecaster;
