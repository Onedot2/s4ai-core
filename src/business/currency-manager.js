/**
 * Phase 4: Multi-currency Manager
 * Stores conversion rates and provides currency conversion utilities.
 */

import pool from '../db/pool.js';

class CurrencyManager {
  constructor() {
    this.baseCurrency = 'USD';
  }

  async getRates() {
    const query = `
      SELECT currency, rate, updated_at
      FROM currency_rates
      ORDER BY currency ASC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      currency: row.currency,
      rate: Number(row.rate),
      updated_at: row.updated_at
    }));
  }

  async upsertRate(currency, rate) {
    const query = `
      INSERT INTO currency_rates (currency, rate)
      VALUES ($1, $2)
      ON CONFLICT (currency)
      DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW()
      RETURNING currency, rate, updated_at
    `;

    const result = await pool.query(query, [currency.toUpperCase(), rate]);
    return result.rows[0];
  }

  async convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getRates();
    const rateMap = new Map(rates.map(r => [r.currency, r.rate]));

    const fromRate = fromCurrency === this.baseCurrency ? 1 : rateMap.get(fromCurrency.toUpperCase());
    const toRate = toCurrency === this.baseCurrency ? 1 : rateMap.get(toCurrency.toUpperCase());

    if (!fromRate || !toRate) {
      throw new Error('Missing currency rate');
    }

    const amountInBase = amount / fromRate;
    return amountInBase * toRate;
  }
}

let currencyInstance = null;

export function getCurrencyManager() {
  if (!currencyInstance) {
    currencyInstance = new CurrencyManager();
  }
  return currencyInstance;
}

export default CurrencyManager;
