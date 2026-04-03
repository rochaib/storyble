import { neon, Pool } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

const TEST_DB_URL = process.env.TEST_DATABASE_URL

if (!TEST_DB_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests')
}

export const testSql = neon(TEST_DB_URL)

export async function setupTestDb() {
  const pool = new Pool({ connectionString: TEST_DB_URL })
  const client = await pool.connect()
  try {
    const migrationsDir = path.resolve(__dirname, '../../migrations')
    const files = fs.readdirSync(migrationsDir).sort()
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        await client.query(sql).catch(() => {})
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

export async function cleanupTestDb() {
  const pool = new Pool({ connectionString: TEST_DB_URL })
  const client = await pool.connect()
  try {
    await client.query('TRUNCATE push_subscriptions, turns, players, games, nps_responses CASCADE')
  } finally {
    client.release()
    await pool.end()
  }
}
