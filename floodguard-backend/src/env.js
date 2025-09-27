import dotenv from 'dotenv';
dotenv.config();


export const env = {
PORT: process.env.PORT || 4000,
CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
DATABASE_URL: process.env.DATABASE_URL || '',
GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
TWITTER_BEARER: process.env.TWITTER_BEARER || ''
};