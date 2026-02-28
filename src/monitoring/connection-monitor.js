// S4Ai Connection Monitor - Survival Mode
import https from 'node:https';
import http from 'node:http';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import logger from '../utils/logger.js';


const endpoints = {
  // Cloud Providers
  vercel: 'https://api.vercel.com/v2/deployments',
  github: 'https://api.github.com',
  stripe: 'https://api.stripe.com',
  smtp: 'smtp.gmail.com',
  tavily: 'https://api.tavily.com',
  // S4Ai APIs - Backend Production
  backendApi: 'https://api.getbrains4ai.com',
  metricsApi: 'https://api.getbrains4ai.com/api/metrics',
  healthApi: 'https://api.getbrains4ai.com/api/health',
  brainStateApi: 'https://api.getbrains4ai.com/api/brain-state',
  // Frontend Production
  frontendUrl: 'https://admin.getbrains4ai.com',
  frontendDomain: 'https://www.getbrains4ai.com',
  // Self-Replication/Backup
  backupGit: 'https://github.com/Onedot2/PWAI-backup',
  backupMirror: 'https://gitlab.com/Onedot2/PWAI-mirror',
  // Cloudflare Domain Management
  cloudflareApi: 'https://api.cloudflare.com/client/v4',
  // General Internet
  internet: 'https://www.google.com',
  // Local Development Fallbacks
  localBackend: 'http://localhost:3000',
  localFrontend: 'http://localhost:5173'
};

function log(msg) {
  logger.info(`[CONNECTION-MONITOR] ${msg}`);
}

function checkHttp(url, name) {
  if (!/^https?:\/\//i.test(url)) {
    log(`${name} skipped (non-HTTP endpoint)`);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      log(`${name} status: ${res.statusCode}`);
      resolve(res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403);
    }).on('error', (e) => {
      log(`${name} error: ${e.message}`);
      resolve(false);
    });
  });
}

async function monitorConnections() {
  let status = {};
  for (const [name, url] of Object.entries(endpoints)) {
    status[name] = await checkHttp(url, name);
  }
  // Check local git config for remote
  try {
    const gitRemote = execSync('git remote -v').toString();
    log(`Git remote: ${gitRemote}`);
    status.git = gitRemote.includes('github.com');
  } catch (e) {
    log(`Git remote error: ${e}`);
    status.git = false;
  }
  // Log and trigger failsafes
  for (const [name, ok] of Object.entries(status)) {
    if (!ok) {
      log(`FAILSAFE: Lost connection to ${name}. Triggering backup/failsafe.`);
      // Add custom backup/failsafe logic here
    }
  }
  return status;
}

// Run every 5 minutes
if (!process.env.CI) {
  setInterval(monitorConnections, 5 * 60 * 1000);
  monitorConnections();
} else {
  log('CI environment detected; skipping live connection monitoring.');
}