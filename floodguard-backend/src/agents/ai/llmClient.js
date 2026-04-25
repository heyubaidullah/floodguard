import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../../env.js'
import { getRequestGeminiKey } from '../../lib/requestContext.js'

const MODEL_NAME = 'gemini-2.5-flash'

class LlmDisabledError extends Error {
  constructor(message = 'AI generation disabled: missing GEMINI_API_KEY') {
    super(message)
    this.name = 'LlmDisabledError'
  }
}

function extractJsonBlock(text) {
  if (!text) return null
  const directParse = safeParse(text)
  if (directParse) return directParse

  const fenced = text.match(/```json[\s\r\n]*([\s\S]*?)```/i)
  if (fenced) {
    const parsed = safeParse(fenced[1])
    if (parsed) return parsed
  }

  const loose = text.match(/\{[\s\S]*\}/)
  if (loose) {
    const parsed = safeParse(loose[0])
    if (parsed) return parsed
  }
  return null
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch (err) {
    return null
  }
}

export async function generateStructuredJson({ instructions, input = {}, temperature = 0.2 }) {
  // Priority: per-request BYOK key → server env key → error
  const apiKey = getRequestGeminiKey() || env.GEMINI_API_KEY
  if (!apiKey) {
    throw new LlmDisabledError()
  }

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `${instructions}\n\nInput:\n${JSON.stringify(input, null, 2)}`
  const result = await model.generateContent(prompt)
  const text = result?.response?.text?.()
  const parsed = extractJsonBlock(text)
  if (!parsed) {
    const err = new Error('AI response did not contain valid JSON payload')
    err.meta = { raw: text }
    throw err
  }
  return parsed
}

export { LlmDisabledError }
