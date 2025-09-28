import { makeEnvelope } from './envelope.js';

const handlers = new Map();
const trace = [];

/** Register a handler for agent name (e.g., 'A1') */
export function registerAgent(name, handler) { handlers.set(name, handler); }

/** In-process RPC using A2A envelopes + trace for demo */
export async function sendA2A({ from, to, payload }) {
  const req = makeEnvelope({ from, to, type: 'request', payload });
  trace.push({ dir: '→', env: req });

  const h = handlers.get(to);
  if (!h) throw new Error(`No agent handler for ${to}`);

  const resultPayload = await h(req.payload);
  const res = makeEnvelope({ from: to, to: from, type: 'response', payload: resultPayload });
  res.correlationId = req.id;
  trace.push({ dir: '←', env: res });

  return res.payload;
}

/** Return and clear the trace buffer */
export function getTraceAndClear() { const out = trace.slice(); trace.length = 0; return out; }
