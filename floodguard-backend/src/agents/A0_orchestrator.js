// src/agents/A0_orchestrator.js
import { WeatherIngestAgent } from './A1_weather.js'

export class OrchestratorAgent {
  constructor() {
    this.weather = new WeatherIngestAgent()
  }

  async runCycle() {
    // Trigger A1 (which will publish to Pub/Sub); A2 listens and reacts
    const published = await this.weather.ingestWeatherData()
    return { message: 'Demo cycle complete', published, ts: Date.now() }
  }
}
