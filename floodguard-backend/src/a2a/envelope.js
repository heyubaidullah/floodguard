// Agent2Agent (A2A) envelope used for all agent calls.
export function makeEnvelope({ from, to, type, payload }) {
    return {
      a2a: '1.0',
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      from, to, type, timestamp: new Date().toISOString(),
      payload
    };
  }
  export function isForAgent(env, agent) { return env?.to === agent; }
  