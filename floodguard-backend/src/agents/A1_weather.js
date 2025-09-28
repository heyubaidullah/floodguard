import axios from 'axios'
import { prisma } from '../db/prisma.js'
import { resolveZones } from '../lib/zones.js'
import { Task } from '../adk/runtime.js'
import { generateStructuredJson, LlmDisabledError } from './ai/llmClient.js'

export const A1_WeatherIngest = new Task('A1_WeatherIngest', async (input, ctx) => {
  const params = ctx?.params ?? {}
  const zones = resolveZones(params)
  let mode = 'ai'
  let weatherRows

  if (zones.length === 1 && params?.latitude && params?.longitude) {
    try {
      const [lon, lat] = zones[0].center
      const realtime = await fetchRealtimeForecast(lat, lon)
      weatherRows = [{ zone: zones[0].id, ...realtime }]
      mode = 'realtime'
    } catch (error) {
      console.warn('A1_WeatherIngest realtime fetch failed:', error?.message ?? error)
    }
  }

  if (!weatherRows || weatherRows.length === 0) {
    try {
      weatherRows = await requestForecastsFromAi(params, zones)
      mode = mode === 'realtime' ? 'realtime+ai' : 'ai'
    } catch (error) {
      mode = mode === 'realtime' ? 'realtime+fallback' : 'fallback'
      weatherRows = fallbackForecasts(params, zones)
      if (!(error instanceof LlmDisabledError)) {
        console.warn('A1_WeatherIngest falling back to heuristic forecasts:', error?.message ?? error)
      }
    }
  }

  const created = []
  for (const forecast of weatherRows) {
    const rainProb = clamp(Number(forecast.rainProb ?? 0), 0, 1)
    const rainAmount = normalizeAmount(forecast.rainAmount)
    const record = await prisma.forecast.create({
      data: { zone: forecast.zone, rainProb, rainAmount, riskScore: 0 },
    })
    created.push(record)
  }

  return { ...input, weather: created, meta: { agent: 'A1', mode } }
})

async function requestForecastsFromAi(params, zones) {
  const instructions = [
    'You are FloodGuard Weather, an autonomous hydrology agent.',
    'Given monitoring zones with coordinates, estimate rainfall probability (0-1) and precipitation in millimetres for the next six hours.',
    'Return JSON { "forecasts": [ { "zoneId": "Z1", "rainProb": 0.42, "rainAmountMm": 7.2 } ] }.',
    'Include every zone exactly once and keep probabilities between 0 and 1.',
    'Prefer conservative outputs and avoid null values.',
  ].join(' ')

  const response = await generateStructuredJson({
    instructions,
    input: { zones, params },
    temperature: 0.15,
  })

  const items = Array.isArray(response?.forecasts) ? response.forecasts : []
  if (items.length === 0) throw new Error('AI weather response missing forecasts array')

  return zones.map((zone) => {
    const match = items.find((item) => (item.zoneId ?? item.zone)?.toString().toUpperCase() === zone.id.toUpperCase())
    const rainProb = clamp(Number(match?.rainProb ?? match?.rainProbability ?? 0), 0, 1)
    const rainAmount = Number(match?.rainAmountMm ?? match?.rainAmount ?? 0)
    return {
      zone: zone.id,
      rainProb: Number.isFinite(rainProb) ? Number(rainProb.toFixed(2)) : 0,
      rainAmount: Number.isFinite(rainAmount) ? Number(rainAmount.toFixed(1)) : 0,
    }
  })
}

function fallbackForecasts(params = {}, zones) {
  const { simulateWeatherVariance = 0.25 } = params
  const baseProb = 0.35
  const now = Date.now()
  return zones.map((zone, idx) => {
    const variance = Math.sin(now / 3.6e6 + idx) * simulateWeatherVariance
    const rainProb = clamp(baseProb + variance, 0.05, 0.95)
    const rainAmount = Math.max(0, Number(((rainProb * 18) + idx).toFixed(1)))
    return { zone: zone.id, rainProb: Number(rainProb.toFixed(2)), rainAmount }
  })
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normalizeAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Number(num.toFixed(1))
}

async function fetchRealtimeForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability,precipitation&forecast_days=1`
  const { data } = await axios.get(url, { timeout: 7000 })
  const hours = data?.hourly?.time?.length || 0
  if (!hours) return { rainProb: 0, rainAmount: 0 }

  const idxs = Array.from({ length: Math.min(6, hours) }, (_, i) => i)
  const probs = idxs.map(i => data.hourly.precipitation_probability?.[i] ?? 0)
  const precs = idxs.map(i => data.hourly.precipitation?.[i] ?? 0)

  const avgProb = probs.reduce((a, b) => a + b, 0) / (probs.length || 1)
  const sumPrec = precs.reduce((a, b) => a + b, 0)

  return {
    rainProb: Math.min(1, Number((avgProb / 100).toFixed(2))),
    rainAmount: Number(sumPrec.toFixed(1)),
  }
}
