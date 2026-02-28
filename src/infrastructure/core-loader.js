// src/core/core-loader.js
// Dynamic loader for S4Ai core modules (brains, engines, etc.)
// Implements all-for-one/one-for-all swarm protocol

import BrainMiddleware from './brain-middleware.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import logger from '../utils/logger.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENESIS_HARD_COR_PATH = path.join(__dirname, '../agent-365-io/tasks/Genesis-Hard-Cor.txt');

function loadGenesisHardCorProtocol() {
  try {
    return fs.readFileSync(GENESIS_HARD_COR_PATH, 'utf8');
  } catch (e) {
    logger.error('[CoreLoader] Failed to load Genesis-Hard-Cor protocol:', e.message);
    return '';
  }
}

const CORE_DIR = __dirname;
const EXCLUDE = ['core-loader.js', 'brain-middleware.js'];

class CoreLoader {
  constructor(config = {}) {
    this.config = config;
    this.modules = [];
    this.genesisProtocol = loadGenesisHardCorProtocol();
    this.middleware = new BrainMiddleware({
      selfHealingEnabled: true,
      enableCloudSync: false
    });
    this.loadModules();
    this.connectModules();
    this.enforceGenesisProtocol();
    logger.info('[CoreLoader] Loaded and connected modules:', this.modules.map(m => m?.name || m?.constructor?.name || typeof m));
  }

  // Scan src/core for all .js modules except exclusions
  async loadModules() {
    const files = fs.readdirSync(CORE_DIR).filter(f => f.endsWith('.js') && !EXCLUDE.includes(f));
    for (const file of files) {
      try {
        const modPath = path.join(CORE_DIR, file);
        const fileUrl = pathToFileURL(modPath).href;
        const mod = await import(fileUrl);
        const exported = mod.default ?? mod;
        // If module exports a class, instantiate it
        if (typeof exported === 'function') {
          const instance = new exported({ middleware: this.middleware });
          this.modules.push(instance);
        } else {
          this.modules.push(exported);
        }
      } catch (e) {
        logger.error(`[CoreLoader] Failed to load ${file}:`, e.message);
      }
    }
  }

  // Connect all modules via brain-middleware
  connectModules() {
    for (const mod of this.modules) {
      if (mod.middleware !== this.middleware && mod.middleware) {
        mod.middleware = this.middleware;
      }
      // Optionally, register with middleware for swarm awareness
      if (typeof mod.exportState === 'function') {
        this.middleware.shareKnowledge(mod.constructor.name, mod.exportState(), 'core-loader');
      }
      // Inject Genesis-Hard-Cor protocol if module supports it
      if (typeof mod.setGenesisProtocol === 'function') {
        mod.setGenesisProtocol(this.genesisProtocol);
      } else if (typeof mod === 'object' && mod !== null && Object.isExtensible(mod)) {
        // Attach protocol for reference only if extensible
        mod.genesisProtocol = this.genesisProtocol;
      } // else skip for non-extensible modules
    }
  }

  // Enforce Genesis-Hard-Cor protocol at startup
  enforceGenesisProtocol() {
    if (!this.genesisProtocol) {
      logger.warn('[CoreLoader] Genesis-Hard-Cor protocol not loaded!');
      return;
    }
    logger.info('[CoreLoader] Genesis-Hard-Cor protocol enforced. Prime directive:');
    const primeDirective = this.genesisProtocol.match(/prime directive[^\n]*\n> ([^\n]+)/i);
    if (primeDirective && primeDirective[1]) {
      logger.info('  ', primeDirective[1]);
    }
  }

  // Start all modules that have a start method
  async startAll() {
    for (const mod of this.modules) {
      if (typeof mod.start === 'function') {
        try {
          await mod.start();
        } catch (e) {
          logger.error(`[CoreLoader] Error starting ${mod.constructor.name}:`, e.message);
        }
      }
    }
  }

  // Stop all modules that have a stop method
  stopAll() {
    for (const mod of this.modules) {
      if (typeof mod.stop === 'function') {
        try {
          mod.stop();
        } catch (e) {
          logger.error(`[CoreLoader] Error stopping ${mod.constructor.name}:`, e.message);
        }
      }
    }
  }
}

// Main entry for standalone run
async function main() {
  const loader = new CoreLoader();
  await loader.startAll();
}

// Execute when launched directly via Node
if (process.argv[1] && process.argv[1].endsWith('core-loader.js')) {
  main();
}

export default CoreLoader;
