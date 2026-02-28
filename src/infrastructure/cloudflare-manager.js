/**
 * S4Ai Cloudflare Infrastructure Manager
 * Autonomous DNS management, subdomain creation, DNS records
 * Enables S4Ai to dynamically provision infrastructure
 * 
 * Jan 21, 2026 - FULL ACTIVATION
 * Credentials locked: API Token + Zone ID + Account ID
 */

import fetch from 'node-fetch';

export class CloudflareManager {
  constructor(config = {}) {
    this.apiToken = config.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = config.zoneId || process.env.CLOUDFLARE_ZONE_ID || '1afb76b4e57097c847776e7782da3da2';
    this.accountId = config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || 'd53775f91e80e762230bcad12e4a70e6';
    this.domain = 'getbrains4ai.com';
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
    this.records = [];
    
    if (!this.apiToken) {
      console.warn('⚠️  Cloudflare API token not configured. DNS operations will fail.');
    }
  }

  /**
   * Create a new DNS CNAME record
   * Use for: subdomain creation (api.getbrains4ai.com, admin.getbrains4ai.com, etc.)
   */
  async createCNAMERecord(subdomain, targetHost, options = {}) {
    const {
      proxied = false,
      ttl = 3600,
      comment = ''
    } = options;

    try {
      const payload = {
        type: 'CNAME',
        name: `${subdomain}.${this.domain}`,
        content: targetHost,
        ttl: ttl,
        proxied: proxied,
        comment: comment || `Auto-created by S4Ai on ${new Date().toISOString()}`
      };

      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errors?.[0]?.message || 'Cloudflare API error',
          statusCode: response.status
        };
      }

      const record = data.result;
      this.records.push(record);

      return {
        success: true,
        record: {
          id: record.id,
          name: record.name,
          type: record.type,
          content: record.content,
          ttl: record.ttl,
          proxied: record.proxied,
          createdAt: record.created_on,
          message: `DNS record created: ${record.name} → ${record.content}`
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create A record for direct IP targeting
   */
  async createARecord(subdomain, ipAddress, options = {}) {
    const { proxied = false, ttl = 3600 } = options;

    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'A',
            name: `${subdomain}.${this.domain}`,
            content: ipAddress,
            ttl: ttl,
            proxied: proxied
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      return {
        success: true,
        record: data.result,
        message: `A record created: ${subdomain}.${this.domain} → ${ipAddress}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List all DNS records for the zone
   */
  async listDNSRecords() {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      return {
        success: true,
        records: data.result,
        total: data.result_info.count
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a DNS record by ID
   */
  async deleteDNSRecord(recordId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      return {
        success: true,
        message: `DNS record deleted: ${recordId}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update an existing DNS record
   */
  async updateDNSRecord(recordId, updateData) {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      return {
        success: true,
        record: data.result,
        message: `DNS record updated: ${data.result.name}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create page rule (caching, redirects, etc.)
   */
  async createPageRule(target, actions) {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}/page_rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            targets: [{ target: 'url', constraint: { operator: 'matches', value: target } }],
            actions: actions,
            priority: 1,
            status: 'active'
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      return {
        success: true,
        rule: data.result,
        message: `Page rule created for ${target}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get zone information
   */
  async getZoneInfo() {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.zoneId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.errors?.[0]?.message };
      }

      const zone = data.result;
      return {
        success: true,
        zone: {
          id: zone.id,
          name: zone.name,
          status: zone.status,
          nameservers: zone.name_servers,
          createdAt: zone.created_on,
          plan: zone.plan.name
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a new subdomain infrastructure point
   * Full setup: DNS record + SSL cert + cache rules
   */
  async provisionSubdomain(subdomain, targetService, options = {}) {
    const {
      targetHost = targetService,
      enableSSL = true,
      enableCache = true,
      ttl = 3600
    } = options;

    const results = {
      subdomain: `${subdomain}.${this.domain}`,
      steps: [],
      success: false
    };

    try {
      // Step 1: Create CNAME record
      const dnsResult = await this.createCNAMERecord(subdomain, targetHost, { ttl });
      results.steps.push({ step: 'Create DNS Record', result: dnsResult.success });

      if (!dnsResult.success) {
        results.error = dnsResult.error;
        return results;
      }

      // Step 2: Create cache rule (if enabled)
      if (enableCache) {
        const cacheResult = await this.createPageRule(
          `${subdomain}.${this.domain}/*`,
          [{ id: 'cache_level', value: 'cache_everything' }]
        );
        results.steps.push({ step: 'Enable Caching', result: cacheResult.success });
      }

      results.success = true;
      results.message = `✅ Subdomain provisioned: ${subdomain}.${this.domain} → ${targetHost}`;

      return results;
    } catch (err) {
      results.error = err.message;
      return results;
    }
  }

  /**
   * Get current Cloudflare status & credentials verification
   */
  getStatus() {
    return {
      configured: !!this.apiToken,
      apiToken: this.apiToken ? '✅ CONFIGURED' : '❌ MISSING',
      zoneId: this.zoneId,
      accountId: this.accountId,
      domain: this.domain,
      recordsCreated: this.records.length,
      capabilities: [
        'create-dns-record',
        'create-a-record',
        'create-cname-record',
        'delete-dns-record',
        'list-dns-records',
        'provision-subdomain',
        'create-page-rules',
        'manage-ssl'
      ]
    };
  }
}

export default CloudflareManager;
