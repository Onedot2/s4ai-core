// S4Ai Journey Map: Backend logic for milestones, phases, and cuBITS
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../utils/logger.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../backend/s4ai-knowledge-base/journey-map-state.json');

// Default journey map structure
const defaultJourney = {
  phases: [
    {
      name: 'Genesis',
      milestones: [
        { id: 'init', label: 'Initialization', complete: false },
        { id: 'autonomy', label: 'Autonomy Activated', complete: false },
        { id: 'firstRevenue', label: 'First Revenue', complete: false }
      ]
    },
    {
      name: 'Growth',
      milestones: [
        { id: 'marketplace', label: 'Marketplace Live', complete: false },
        { id: 'apiAuto', label: 'APIs Auto-Generated', complete: false },
        { id: 'userScale', label: 'User Scaling', complete: false }
      ]
    },
    {
      name: 'Mastery',
      milestones: [
        { id: 'metaReason', label: 'Meta-Reasoning Online', complete: false },
        { id: 'redTeam', label: 'Red-Team Defense', complete: false },
        { id: 'profit', label: 'Sustained Profitability', complete: false }
      ]
    }
  ],
  cuBITS: [
    { id: 'cubit1', label: 'Quantum Cubit: Genesis Protocol', complete: false },
    { id: 'cubit2', label: 'Quantum Cubit: Ambition Engine', complete: false },
    { id: 'cubit3', label: 'Quantum Cubit: Curiosity Module', complete: false }
  ]
};

// Load or initialize journey state
function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { logger.error('Journey map load error:', e); }
  return JSON.parse(JSON.stringify(defaultJourney));
}

function saveState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) { logger.error('Journey map save error:', e); }
}

// API: Get journey map state
function getJourneyMap() {
  return loadState();
}

// API: Mark milestone or cuBIT complete
function completeItem(type, id) {
  const state = loadState();
  if (type === 'milestone') {
    for (const phase of state.phases) {
      for (const m of phase.milestones) {
        if (m.id === id) m.complete = true;
      }
    }
  } else if (type === 'cubit') {
    for (const c of state.cuBITS) {
      if (c.id === id) c.complete = true;
    }
  }
  saveState(state);
}

// API: Reset journey map
function resetJourney() {
  saveState(defaultJourney);
}

export { getJourneyMap, completeItem, resetJourney };