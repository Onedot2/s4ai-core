/**
 * Cloudflare DNS Manager
 * S4Ai Autonomous DNS & Subdomain Management
 * 
 * Full authority to create/update/delete DNS records for getbrains4ai.com
 * Jan 21, 2026 - CLOUDFLARE CREDENTIALS LOCKED
 */

import https from 'https';

export class CloudflareDNSManager {
  constructor(config = {}) {
    this.apiToken = config.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = config.zoneId || process.env.CLOUDFLARE_ZONE_ID;
    this.accountId = config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    this.baseUrl = 'api.cloudflare.com';
    
    if (!this.apiToken || !this.zoneId) {
      throw new Error('[CloudflareDNS] Missing credentials: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID required');
    }
  }

  /**
   * Make authenticated request to Cloudflare API
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: `/client/v4${path}`,
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.success) {
              resolve(parsed.result);
            } else {
              reject(new Error(parsed.errors?.[0]?.message || 'Cloudflare API error'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * Create a new subdomain (CNAME or A record)
   * 
   * @param {string} subdomain - Subdomain name (e.g., 'app1', 'dashboard2')
   * @param {string} target - Target (CNAME) or IP (A record)
   * @param {string} type - Record type: 'CNAME' or 'A'
   * @param {boolean} proxied - Cloudflare proxy (orange cloud)
   */
  async createSubdomain(subdomain, target, type = 'CNAME', proxied = false) {
    try {
      const record = await this.request('POST', `/zones/${this.zoneId}/dns_records`, {
        type,
        name: subdomain,
        content: target,
        ttl: 1, // Auto
        proxied
      });

      console.log(`[CloudflareDNS] ✅ Created subdomain: ${subdomain}.getbrains4ai.com → ${target}`);
      return { success: true, record, subdomain: `${subdomain}.getbrains4ai.com` };
    } catch (err) {
      console.error(`[CloudflareDNS] ❌ Failed to create subdomain:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * List all DNS records for the zone
   */
  async listRecords() {
    try {
      const records = await this.request('GET', `/zones/${this.zoneId}/dns_records`);
      return { success: true, records };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a DNS record by ID
   */
  async deleteRecord(recordId) {
    try {
      await this.request('DELETE', `/zones/${this.zoneId}/dns_records/${recordId}`);
      console.log(`[CloudflareDNS] ✅ Deleted record: ${recordId}`);
      return { success: true };
    } catch (err) {
      console.error(`[CloudflareDNS] ❌ Failed to delete record:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update an existing DNS record
   */
  async updateRecord(recordId, updates) {
    try {
      const record = await this.request('PATCH', `/zones/${this.zoneId}/dns_records/${recordId}`, updates);
      console.log(`[CloudflareDNS] ✅ Updated record: ${recordId}`);
      return { success: true, record };
    } catch (err) {
      console.error(`[CloudflareDNS] ❌ Failed to update record:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create subdomain for new S4Ai application
   * Auto-determines target based on app type
   */
  async provisionAppSubdomain(appName, appType = 'frontend') {
    const subdomain = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Determine target based on app type
    let target, proxied;
    if (appType === 'frontend' || appType === 'pwa') {
      // Point to Vercel
      target = 'cname.vercel-dns.com';
      proxied = false; // Let Vercel handle SSL
    } else if (appType === 'api' || appType === 'backend') {
      // Point to Railway (use existing api subdomain as template)
      target = 'zzl99i9s.up.railway.app';
      proxied = false;
    } else {
      // Default to Vercel
      target = 'cname.vercel-dns.com';
      proxied = false;
    }

    const result = await this.createSubdomain(subdomain, target, 'CNAME', proxied);
    
    if (result.success) {
      console.log(`[S4Ai] 🚀 Provisioned: ${subdomain}.getbrains4ai.com (${appType})`);
    }
    
    return result;
  }

  /**
   * Verify DNS record exists
   */
  async verifySubdomain(subdomain) {
    try {
      const { records } = await this.listRecords();
      const found = records.find(r => r.name === `${subdomain}.getbrains4ai.com`);
      return { success: !!found, record: found };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get status of DNS manager
   */
  getStatus() {
    return {
      configured: !!(this.apiToken && this.zoneId),
      zoneId: this.zoneId,
      accountId: this.accountId,
      domain: 'getbrains4ai.com',
      authority: 'FULL (S4Ai can create/update/delete DNS records at will)'
    };
  }
}

export default CloudflareDNSManager;
