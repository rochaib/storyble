import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL ?? process.env.storage_DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL or storage_DATABASE_URL environment variable is required')
}

export const sql = neon(databaseUrl)
