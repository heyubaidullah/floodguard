import { prisma } from '../db/prisma.js';
import { stopwatch } from '../lib/stopwatch.js';
import { sendA2A } from '../a2a/bus.js';

function sleep(ms, signal) {
  return new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('aborted')); });
  });
}

export class OrchestratorAgent {
  constructor() { this.loopController = null; }

  async log(cycleId, step, status, durationMs) {
    return prisma.opsLog.create({ data: { cycleId, step, status, durationMs } });
  }

  // One autonomous cycle
  async runOnce(params = {}) {
    const normalized = normalizeAgentParams(params)
    const cycleId = `cycle-${Date.now()}`;

    // A1 + A2 + A3 in PARALLEL via A2A envelopes
    let sw = stopwatch();
    const [w, d, s] = await Promise.all([
      sendA2A({ from: 'A0', to: 'A1', payload: { params: normalized } }),
      sendA2A({ from: 'A0', to: 'A2', payload: { params: normalized } }),
      sendA2A({ from: 'A0', to: 'A3', payload: { params: normalized } })
    ]);
    await this.log(cycleId, 'A1+A2+A3', 'ok', sw());

    // A4 fuse
    sw = stopwatch();
    const fused = await sendA2A({
      from: 'A0', to: 'A4',
      payload: {
        weather: w.weather,
        incidents: d.incidents,
        social: s.social,
        params: normalized,
        meta: { A1: w.meta, A2: d.meta, A3: s.meta }
      }
    });
    await this.log(cycleId, 'A4', 'ok', sw());

    // A6 comms
    sw = stopwatch();
    const alerts = await sendA2A({ from: 'A0', to: 'A6', payload: { scores: fused.scores, params: normalized } });
    await this.log(cycleId, 'A6', 'ok', sw());

    return {
      cycleId,
      scores: fused.scores,
      alerts: alerts.alerts,
      meta: {
        A1: w.meta,
        A2: d.meta,
        A3: s.meta,
        A4: fused.meta,
        A6: alerts.meta,
        location: extractLocationMeta(normalized),
      },
    };
  }

  // Continuous loop
  async startLoop({ intervalMs = 5000, ...params } = {}) {
    if (this.loopController) return { ok: false, message: 'loop already running' };
    this.loopController = new AbortController();
    const { signal } = this.loopController;
    const normalized = normalizeAgentParams(params)

    ;(async () => {
      while (!signal.aborted) {
        try {
          await this.runOnce({ ...normalized })
        } catch (error) {
          if (error?.message !== 'aborted') {
            console.error('Cycle error:', error)
          }
        }
        try {
          await sleep(intervalMs, signal)
        } catch (sleepErr) {
          if (sleepErr?.message !== 'aborted') console.error('Loop sleep interrupted:', sleepErr)
        }
      }
    })()

    return { ok: true, running: true };
  }

  async stopLoop() {
    if (!this.loopController) return { ok: false, message: 'no loop running' };
    this.loopController.abort();
    this.loopController = null;
    return { ok: true, running: false };
  }
}

function normalizeAgentParams(params = {}) {
  const out = { ...params }
  out.simulateIncidents = Number(out.simulateIncidents ?? out.inc ?? 1) || 1
  out.simulateSocial = Number(out.simulateSocial ?? out.soc ?? 2) || 2

  const lat = Number(out.latitude ?? out.lat)
  const lon = Number(out.longitude ?? out.lon)
  if (Number.isFinite(lat)) out.latitude = lat
  if (Number.isFinite(lon)) out.longitude = lon

  if (!out.zoneId) {
    if (out.postalCode) out.zoneId = String(out.postalCode).toUpperCase()
    else if (Number.isFinite(lat) && Number.isFinite(lon)) out.zoneId = `LOC-${lat.toFixed(3)}-${lon.toFixed(3)}`
  }
  if (!out.postalCode && typeof out.zoneId === 'string' && /^\d{4,}$/.test(out.zoneId)) {
    out.postalCode = out.zoneId
  }
  if (!out.locationName && out.zoneId) {
    out.locationName = `Zone ${out.zoneId}`
  }
  return out
}

function extractLocationMeta(params) {
  return {
    locationName: params.locationName,
    latitude: params.latitude,
    longitude: params.longitude,
    zoneId: params.zoneId,
    postalCode: params.postalCode,
  }
}
