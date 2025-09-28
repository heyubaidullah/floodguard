import axios from 'axios'
import { prisma } from '../db/prisma.js'
import { resolveZones } from '../lib/zones.js'
import { Task } from '../adk/runtime.js'
import { generateStructuredJson, LlmDisabledError } from './ai/llmClient.js'

const FALLBACK_POSTS = [
  '#flood near central',
  'road blocked, heavy water',
  'waterlogging in my street',
  'cannot pass due to flooding',
  'city crews spotted pumping at 4th ave',
]

export const A3_Social = new Task('A3_Social', async (input, ctx) => {
  const params = ctx?.params ?? {}
  const zones = resolveZones(params)
  let usedMode = 'ai'
  let posts = []

  const target = Number(params?.simulateSocial ?? 2) || 2
  const external = await fetchExternalSocialSignals(target, params, zones)
  if (external.length) {
    usedMode = 'external'
    posts.push(...external.slice(0, target))
  }

  if (posts.length < target) {
    try {
      const aiPosts = await inferSocialSignals({ ...params, target: target - posts.length }, zones)
      posts.push(...aiPosts)
      usedMode = posts.length && external.length ? 'external+ai' : 'ai'
    } catch (error) {
      if (!(error instanceof LlmDisabledError)) {
        console.warn('A3_Social AI enrichment failed:', error?.message ?? error)
      }
    }
  }

  if (posts.length < target) {
    const fallback = fallbackPosts({ ...params, count: target - posts.length }, zones)
    posts.push(...fallback)
    if (usedMode === 'external') usedMode = 'external+fallback'
    else if (usedMode === 'ai') usedMode = 'ai+fallback'
    else if (!external.length) usedMode = 'fallback'
  }

  const persisted = []
  for (const post of posts) {
    const zone = validateZone(post.zone, zones)
    if (!zone) continue
    const record = await prisma.socialIncident.create({
      data: {
        text: post.text,
        user: post.user,
        zone,
        riskFlag: Boolean(post.riskFlag),
      },
    })
    persisted.push(record)
  }

  return { ...input, social: persisted, meta: { agent: 'A3', mode: usedMode } }
})

async function inferSocialSignals(params, zones) {
  const instructions = [
    'You are FloodGuard Social, an AI agent monitoring social media for flood signals.',
    'Return JSON { "posts": [ { "zoneId": "Z1", "userHandle": "@riverwatch", "text": "standing water on main st", "riskFlag": true } ] }.',
    'Create short human-like messages; riskFlag should be true if the text implies flooding or danger.',
    'Distribute posts across the provided zones and vary tone (alerts, questions, observations). Include location hints.',
  ].join(' ')

  const count = Number(params?.simulateSocial ?? params?.target ?? 2)

  const response = await generateStructuredJson({
    instructions,
    input: {
      zones,
      count,
      location: params?.locationName ?? params?.postalCode ?? params?.zoneId,
    },
    temperature: 0.45,
  })

  const posts = Array.isArray(response?.posts) ? response.posts : []
  if (!posts.length) throw new Error('AI social response empty')

  return posts.map((post, idx) => ({
    zone: (post.zoneId ?? post.zone ?? zones[0]?.id ?? '').toString().toUpperCase(),
    user: normaliseUser(post.userHandle ?? post.user ?? `observer${idx}`),
    text: post.text ?? 'Flood update pending',
    riskFlag: Boolean(post.riskFlag ?? /flood|water|overflow/i.test(post.text ?? '')),
  }))
}

function fallbackPosts(params = {}, zones) {
  const count = Number(params?.simulateSocial ?? params?.count ?? 2)
  const label = params?.locationName ?? zones[0]?.name ?? 'Selected location'
  const posts = []
  for (let i = 0; i < Math.max(1, count); i += 1) {
    const zone = zones[i % zones.length]
    const baseText = FALLBACK_POSTS[i % FALLBACK_POSTS.length]
    const text = `${label}: ${baseText}`
    posts.push({
      zone: zone.id,
      user: `user${(i + 13) * 7}`,
      text,
      riskFlag: /flood|water|blocked|pooling|pumping/i.test(text),
    })
  }
  return posts
}

function validateZone(zoneCandidate, zones) {
  const id = (zoneCandidate ?? '').toString().toUpperCase()
  return zones.some((z) => z.id === id) ? id : null
}

function normaliseUser(handle) {
  if (typeof handle !== 'string' || !handle.trim()) return '@observer'
  return handle.startsWith('@') ? handle : `@${handle.replace(/\s+/g, '').toLowerCase()}`
}

async function fetchExternalSocialSignals(target = 2, params = {}, zones) {
  try {
    const query = buildSearchQuery(params)
    const url = query
      ? `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=30&sort=new`
      : 'https://www.reddit.com/r/flood/new.json?limit=30'
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'FloodGuard/1.0 (+https://floodguard.local)' },
      timeout: 5000,
    })
    const children = Array.isArray(data?.data?.children) ? data.data.children : []
    if (!children.length) return []

    const zoneKeywords = zones.map((zone) => ({
      id: zone.id,
      tokens: [zone.id.toLowerCase(), zone.name?.toLowerCase() ?? zone.id.toLowerCase()],
    }))

    const posts = []
    for (const child of children) {
      const post = child?.data
      if (!post?.title && !post?.selftext) continue
      const text = `${post.title ?? ''} ${post.selftext ?? ''}`.trim()
      const assignedZone = detectZoneFromText(text, zoneKeywords)
      posts.push({
        zone: assignedZone,
        user: normaliseUser(post.author ? `@${post.author}` : '@reddit-user'),
        text: text.slice(0, 240) || 'Flood update',
        riskFlag: /flood|water|evac|overflow|road|storm/i.test(text),
      })
      if (posts.length >= target) break
    }
    return posts
  } catch (error) {
    console.warn('A3_Social external fetch failed:', error?.message ?? error)
    return []
  }
}

function detectZoneFromText(text, zoneKeywords) {
  const lower = text.toLowerCase()
  for (const zone of zoneKeywords) {
    if (zone.tokens.some((token) => token && lower.includes(token))) {
      return zone.id
    }
  }
  return zoneKeywords[Math.floor(Math.random() * zoneKeywords.length)].id
}

function buildSearchQuery(params = {}) {
  const terms = []
  if (params?.locationName) terms.push(params.locationName)
  if (params?.postalCode) terms.push(params.postalCode)
  if (params?.zoneId) terms.push(params.zoneId)
  return terms.filter(Boolean).join(' ') || ''
}
