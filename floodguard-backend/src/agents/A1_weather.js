import { PubSub } from '@google-cloud/pubsub'
import 'dotenv/config'

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID })
const topicName = process.env.PUBSUB_TOPIC_WEATHER || 'weatherAlert'

export class WeatherIngestAgent {
  async fetchWeatherData() {
    // mock data for now
    return { zone: 'Z1', rainProb: 85, rainAmount: 12, riskScore: 0.9 }
  }

  async ingestWeatherData() {
    const data = await this.fetchWeatherData()
    const buf = Buffer.from(JSON.stringify(data))
    await pubsub.topic(topicName).publishMessage({ data: buf })
    console.log('📣 Published weatherAlert:', data)
    return data
  }
}
