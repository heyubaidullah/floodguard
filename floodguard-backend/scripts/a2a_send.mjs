// scripts/a2a_send.mjs
import 'dotenv/config'

const A2A_URL = process.env.A2A_PUBLIC_URL || 'http://localhost:4500'
const endpoint = `${A2A_URL}/a2a/message`

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
// Examples: "ingest weather", "list incidents", "list social", "simulate social in z2"
const text = process.argv[2] || 'ingest weather'

const message = {
  kind: 'message',
  role: 'user',
  parts: [{ kind: 'text', text }],
}

try {
  const reply = await postJson(endpoint, message)

  // Try to parse the agent's JSON string (first text part) for nicer display
  const events = reply?.events || []
  const firstText = events[0]?.parts?.find(p => p?.kind === 'text')?.text
  let parsed = null
  try {
    parsed = firstText ? JSON.parse(firstText) : null
  } catch {
    // not JSON; leave parsed as null
  }

  console.log('A2A reply:', JSON.stringify(parsed ?? reply, null, 2))
} catch (e) {
  console.error('A2A send failed:', e.message)
  process.exit(1)
}
