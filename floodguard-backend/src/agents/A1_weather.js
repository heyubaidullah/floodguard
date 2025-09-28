import { PubSub } from '@google-cloud/pubsub'
import 'dotenv/config'

const projectId = process.env.GCP_PROJECT_ID
const pubsub = projectId ? new PubSub({ projectId }) : null
const topicName = process.env.PUBSUB_TOPIC_WEATHER || 'weatherAlert'

export class WeatherIngestAgent {
  async fetchWeatherData() {
    // mock data emphasising Miami for demo purposes
    return { zone: 'Miami Beach', rainProb: 78, rainAmount: 18, riskScore: 0.82 }
  }

  async ingestWeatherData() {
    const data = await this.fetchWeatherData()
    const buf = Buffer.from(JSON.stringify(data))

    if (!pubsub) {
      console.log('⚙️  Pub/Sub disabled — returning local weather data for demo', data)
      return data
    }

    try {
      await pubsub.topic(topicName).publishMessage({ data: buf })
      console.log('📣 Published weatherAlert:', data)
    } catch (error) {
      console.warn('⚠️  Weather ingest fallback — unable to publish to Pub/Sub:', error.message)
    }
    return data
  }
}
