// scripts/pubsub_setup.mjs
import 'dotenv/config'
import { PubSub } from '@google-cloud/pubsub'

const projectId = process.env.GCP_PROJECT_ID || 'floodguard-project'
const topicName = process.env.PUBSUB_TOPIC_WEATHER || 'weatherAlert'
const subName   = process.env.PUBSUB_SUB_DRAIN  || 'drainWatchSubscription'

async function ensurePubSub() {
  const pubsub = new PubSub({ projectId })

  // ensure topic
  const [topics] = await pubsub.getTopics()
  const haveTopic = topics.some(t => t.name.endsWith(`/topics/${topicName}`))
  if (!haveTopic) {
    console.log(`Creating topic: ${topicName}`)
    await pubsub.createTopic(topicName)
  } else {
    console.log(`Topic exists: ${topicName}`)
  }

  // ensure subscription on that topic
  const topic = pubsub.topic(topicName)
  const [subs] = await topic.getSubscriptions()
  const haveSub = subs.some(s => s.name.endsWith(`/subscriptions/${subName}`))
  if (!haveSub) {
    console.log(`Creating subscription: ${subName}`)
    await topic.createSubscription(subName, { ackDeadlineSeconds: 30 })
  } else {
    console.log(`Subscription exists: ${subName}`)
  }

  console.log('✅ Pub/Sub ready.')
}

ensurePubSub().catch(err => {
  console.error('Pub/Sub setup failed:', err?.message || err)
  process.exit(1)
})
