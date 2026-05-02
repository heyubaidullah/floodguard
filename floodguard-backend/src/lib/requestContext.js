import { AsyncLocalStorage } from 'node:async_hooks'

export const requestContext = new AsyncLocalStorage()

/** Returns the per-request Gemini API key set by the route handler, or null. */
export function getRequestGeminiKey() {
  const store = requestContext.getStore()
  return store?.geminiApiKey ?? null
}
