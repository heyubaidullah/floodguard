import dotenv from 'dotenv';
dotenv.config();

/**
 * Parses CORS_ORIGIN into a value accepted by @fastify/cors:
 *  - "*"                → allow all (string)
 *  - single URL         → that origin (string)
 *  - comma-separated    → array of origins
 *
 * This lets you set, e.g.:
 *   CORS_ORIGIN=https://floodguard.netlify.app,https://floodguard-web.onrender.com
 */
function parseCorsOrigin(raw) {
  const val = (raw || '*').trim();
  if (val === '*') return '*';
  const parts = val.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length === 1 ? parts[0] : parts;
}

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  CORS_ORIGIN: parseCorsOrigin(process.env.CORS_ORIGIN),
  DATABASE_URL: process.env.DATABASE_URL || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  TWITTER_BEARER: process.env.TWITTER_BEARER || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
