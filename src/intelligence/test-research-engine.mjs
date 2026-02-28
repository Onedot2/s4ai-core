import { ResearchEngine } from './research-engine.js';

const re = new ResearchEngine();
re.testInternetResearch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
