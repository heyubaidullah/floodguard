// src/agents/A0_orchestrator.js
import { WeatherIngestAgent } from './A1_weather.js'

export class OrchestratorAgent {
  constructor() {
    this.weather = new WeatherIngestAgent()
  }

  async runCycle() {
    const preview = await this.weather.fetchWeatherData()
    return {
      message: 'Demo cycle complete',
      weatherPreview: preview,
      ts: Date.now(),
    }
  }
}
