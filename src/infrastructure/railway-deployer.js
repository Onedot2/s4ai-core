/**
 * S4Ai Railway Deployment Manager
 * Autonomous backend deployment to Railway
 * Manages: API services, databases, environment variables
 * 
 * Jan 21, 2026 - S4Ai Full Control
 */

import fetch from 'node-fetch';

export class RailwayDeployer {
  constructor(config = {}) {
    this.apiToken = config.apiToken || process.env.RAILWAY_API_TOKEN;
    this.projectId = config.projectId || process.env.RAILWAY_PROJECT_ID;
    this.environmentId = config.environmentId || process.env.RAILWAY_ENVIRONMENT_ID;
    this.baseUrl = 'https://api.railway.app';
    this.deployments = [];
  }

  /**
   * Deploy service from GitHub
   */
  async deployService(serviceConfig) {
    const {
      name,
      gitRepo,
      branch = 'main',
      buildCommand = 'npm run build',
      startCommand = 'npm start',
      port = 8080
    } = serviceConfig;

    try {
      // Railway GraphQL mutation to trigger deployment
      const mutation = `
        mutation {
          serviceCreate(input: {
            projectId: "${this.projectId}"
            environmentId: "${this.environmentId}"
            name: "${name}"
            source: {
              repo: "${gitRepo}"
              branch: "${branch}"
            }
            buildCommand: "${buildCommand}"
            startCommand: "${startCommand}"
            port: ${port}
          }) {
            id
            name
            status
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: mutation })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        service: data.data.serviceCreate,
        message: `Service deployed: ${name}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Set environment variables for service
   */
  async setEnvironmentVariables(variables) {
    try {
      const mutation = `
        mutation {
          variablesCreate(input: {
            projectId: "${this.projectId}"
            environmentId: "${this.environmentId}"
            variables: [
              ${Object.entries(variables)
                .map(([key, value]) => `{ key: "${key}", value: "${value}" }`)
                .join(',\n')}
            ]
          }) {
            count
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: mutation })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        count: data.data.variablesCreate.count,
        message: `${data.data.variablesCreate.count} environment variables set`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Deploy PostgreSQL database
   */
  async deployDatabase(dbConfig) {
    const {
      name = 'postgresql',
      version = 'latest'
    } = dbConfig;

    try {
      const mutation = `
        mutation {
          databaseCreate(input: {
            projectId: "${this.projectId}"
            environmentId: "${this.environmentId}"
            name: "${name}"
            type: "postgresql"
            version: "${version}"
          }) {
            id
            status
            connectionUrl
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: mutation })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        database: data.data.databaseCreate,
        message: `Database deployed: ${name}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/deployments/${deploymentId}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch logs' };
      }

      return {
        success: true,
        logs: data.logs || [],
        status: data.status
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Trigger redeployment
   */
  async redeploy(serviceId) {
    try {
      const mutation = `
        mutation {
          serviceDeploy(input: {
            serviceId: "${serviceId}"
          }) {
            id
            status
            createdAt
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: mutation })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        deployment: data.data.serviceDeploy,
        message: `Redeployment triggered: ${data.data.serviceDeploy.id}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create plugin (add-on service)
   */
  async createPlugin(pluginConfig) {
    const {
      name,
      type, // redis, postgresql, mongodb, etc.
      plan = 'hobby'
    } = pluginConfig;

    try {
      const mutation = `
        mutation {
          pluginCreate(input: {
            projectId: "${this.projectId}"
            environmentId: "${this.environmentId}"
            name: "${name}"
            type: "${type}"
            plan: "${plan}"
          }) {
            id
            name
            type
            status
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: mutation })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        plugin: data.data.pluginCreate,
        message: `Plugin created: ${name} (${type})`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List all projects
   */
  async listProjects() {
    try {
      const query = `
        query {
          projects(limit: 100) {
            edges {
              node {
                id
                name
                createdAt
              }
            }
          }
        }
      `;

      const response = await fetch(
        `${this.baseUrl}/graphql`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        }
      );

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0].message };
      }

      return {
        success: true,
        projects: data.data.projects.edges.map(e => e.node),
        total: data.data.projects.edges.length
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  getStatus() {
    return {
      configured: !!this.apiToken,
      apiToken: this.apiToken ? '✅ CONFIGURED' : '❌ MISSING',
      projectId: this.projectId,
      environmentId: this.environmentId,
      capabilities: [
        'deploy-service',
        'deploy-database',
        'set-environment-variables',
        'create-plugins',
        'get-deployment-logs',
        'trigger-redeployment',
        'list-projects'
      ]
    };
  }
}

export default RailwayDeployer;
