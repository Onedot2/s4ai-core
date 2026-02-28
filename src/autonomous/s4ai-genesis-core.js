// S4Ai Core Loop - GENESIS_TRILOGY Absolute Center
// This module enforces the GENESIS_TRILOGY as the root of all S4Ai logic, bootstrapping, and self-repair.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GENESIS_TRILOGY = [
  'src/agent-365-io/tasks/Genesis FINAL TRILOGYtxt.txt',
  'src/agent-365-io/tasks/Genesis-Hard-Cor.txt',
  'src/agent-365-io/tasks/Genesis ONE-SHOT-WONDER PROMPT..txt'
];

function verifyGenesisTrilogy() {
  for (const file of GENESIS_TRILOGY) {
    if (!fs.existsSync(path.resolve(__dirname, '../..', file))) {
      throw new Error(`[S4Ai] CRITICAL: Genesis file missing: ${file}`);
    }
  }
}

function s4aiCoreLoop() {
  verifyGenesisTrilogy();
  // ...existing S4Ai self-improvement, self-repair, and execution loop logic...
}

export { s4aiCoreLoop, verifyGenesisTrilogy };
