import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { getS4UserAcquisitionModule } from './s4-user-acquisition.js';

async function createTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 's4ai-acq-'));
  return dir;
}

describe('S4 User Acquisition Module', () => {
  let tempDir = null;
  let module = null;

  beforeEach(async () => {
    tempDir = await createTempDir();
    module = getS4UserAcquisitionModule({ dataDir: tempDir });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('captures a lead and returns normalized payload', async () => {
    const lead = await module.captureLead({
      email: 'Test@Example.com',
      source: 'Twitter',
      campaign: 'launch'
    });

    expect(lead.id).toBeTruthy();
    expect(lead.type).toBe('lead');
    expect(lead.email).toBe('test@example.com');
    expect(lead.source).toBe('twitter');
    expect(lead.campaign).toBe('launch');
  });

  it('records a conversion and updates summary', async () => {
    const lead = await module.captureLead({ email: 'buyer@example.com', source: 'stripe' });
    const conversion = await module.recordConversion({ leadId: lead.id, plan: 'pro', amount: 29 });

    expect(conversion.type).toBe('conversion');
    expect(conversion.leadId).toBe(lead.id);

    const summary = await module.getSummary();
    expect(summary.totals.leads).toBe(1);
    expect(summary.totals.conversions).toBe(1);
    expect(summary.totals.conversionRate).toBe(1);
  });

  it('returns recent events in reverse order', async () => {
    await module.captureLead({ email: 'one@example.com' });
    await module.captureLead({ email: 'two@example.com' });

    const recent = await module.getRecent(1);
    expect(recent.length).toBe(1);
    expect(recent[0].email).toBe('two@example.com');
  });
});
