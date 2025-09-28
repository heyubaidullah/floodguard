// scripts/a2a_send.mjs
import 'dotenv/config'

// A2A default message endpoint exposed by A2AExpressApp
const A2A_URL = process.env.A2A_PUBLIC_URL || 'http://localhost:4500'

// helper to POST JSON
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

// Build a minimal A2A message with a single text part.
// Try texts like: "ingest weather", "list incidents", or anything to run cycle.
const text = process.argv[2] || 'ingest weather'

// According to the A2A SDK server, messages are posted to /a2a/message
const endpoint = `${A2A_URL}/a2a/message`

const message = {
  // a bare-minimum message envelope
  kind: 'message',
  role: 'user',
  parts: [{ kind: 'text', text }],
}

try {
  const reply = await postJson(endpoint, message)
  console.log('A2A reply:', JSON.stringify(reply, null, 2))
} catch (e) {
  console.error('A2A send failed:', e.message)
  process.exit(1)
}
