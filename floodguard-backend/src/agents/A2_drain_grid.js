import { PubSub } from '@google-cloud/pubsub'
import 'dotenv/config'

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID })
const subscriptionName = process.env.PUBSUB_SUB_DRAIN || 'drainWatchSubscription'

export class DrainWatchAgent {
  constructor(prisma) {
    this.prisma = prisma
    this._started = false
  }

  startListenerOnce() {
    if (this._started) return
    const subscription = pubsub.subscription(subscriptionName)

    subscription.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.data.toString())
        console.log('📥 weatherAlert received:', payload)

        if (payload.rainProb > 80) {
          await this.simulateBatch(payload.zone || 'Miami Beach')
          console.log('✅ incidents simulated based on high rainfall')
        }
        message.ack()
      } catch (e) {
        console.error('Listener error:', e)
        message.nack()
      }
    })

    subscription.on('error', (err) => {
      console.error('Subscription error:', err)
    })

    this._started = true
    console.log('🟢 DrainWatch listener started')
  }

  async simulateBatch(zone = 'Miami Beach') {
    const batch = [
      { type: 'drain',   description: `Smart drain sensor detected blockage near ${zone}`, zone },
      { type: 'citizen', description: `Resident reported standing water building up in ${zone}`, zone }
    ]
    await this.prisma.incident.createMany({ data: batch })
    return this.prisma.incident.findMany({
      where: { zone },
      orderBy: { timestamp: 'desc' },
      take: 5
    })
  }

  async createIncident({ type, description, zone, photoUrl = null }) {
    return this.prisma.incident.create({ data: { type, description, zone, photoUrl } })
  }

  async listIncidents(params = {}) {
    const { zone, take = 50 } = params
    return this.prisma.incident.findMany({
      where: zone ? { zone } : undefined,
      orderBy: { timestamp: 'desc' },
      take
    })
  }
}
