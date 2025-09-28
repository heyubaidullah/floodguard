// floodguard-backend/src/agents/A0_orchestrator.js
import { WeatherIngestAgent } from './A1_weather.js'
import { DrainWatchAgent }   from './A2_drain_grid.js'
import { SocialMediaAgent }  from './A3_social.js'

export class OrchestratorAgent {
  constructor({ prisma, weather, drain, social } = {}) {
    // allow DI (use existing singletons from index.js)
    this.weather = weather || new WeatherIngestAgent()
    this.drain   = drain   || new DrainWatchAgent(prisma)
    this.social  = social  || new SocialMediaAgent(prisma)

    // ensure drain listener is alive once
    if (this.drain?.startListenerOnce) this.drain.startListenerOnce()
  }

  /**
   * Demo cycle:
   * 1) Ingest weather (A1)
   * 2) Simulate one social batch in Z1 (A3)
   * 3) Return a brief summary
   */
  async runCycle() {
    const weather = await this.weather.ingestWeatherData()
    const socials = await this.social.simulateBatch('Z1', 2)

    return {
      message: 'cycle complete',
      weatherPublished: weather,
      socialAdded: socials.map(s => ({ id: s.id, zone: s.zone, riskFlag: s.riskFlag })),
      ts: Date.now(),
    }
  }
}
