/**
 * Phase 4: Enterprise Tier Customizer
 * Stores and retrieves enterprise policy configurations.
 */

import pool from '../db/pool.js';

class EnterpriseCustomizer {
  async getPolicy(orgId) {
    const query = `
      SELECT org_id, policy, updated_at
      FROM enterprise_policies
      WHERE org_id = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [orgId]);
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async upsertPolicy(orgId, policy) {
    const query = `
      INSERT INTO enterprise_policies (org_id, policy)
      VALUES ($1, $2)
      ON CONFLICT (org_id)
      DO UPDATE SET policy = EXCLUDED.policy, updated_at = NOW()
      RETURNING org_id, policy, updated_at
    `;

    const result = await pool.query(query, [orgId, policy]);
    return result.rows[0];
  }

  async listPolicies() {
    const query = `
      SELECT org_id, policy, updated_at
      FROM enterprise_policies
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}

let customizerInstance = null;

export function getEnterpriseCustomizer() {
  if (!customizerInstance) {
    customizerInstance = new EnterpriseCustomizer();
  }
  return customizerInstance;
}

export default EnterpriseCustomizer;
