import 'dotenv/config'
import pkg from 'pg'
import fs from 'fs'
import path from 'path'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  const client = await pool.connect()
  
  try {
    const sqlPath = path.resolve('scripts/fix_schema_drift.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('Applying schema fixes...')
    
    // Split into individual statements to handle potential errors better
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        
    for (const statement of statements) {
        try {
            console.log(`Executing: ${statement.substring(0, 50)}...`)
            await client.query(statement)
        } catch (e) {
            console.error(`Error executing statement: ${statement}`, e.message)
            // Continue with other statements - some might fail if they already exist
        }
    }
    
    console.log('✅ Schema fixes applied.')

  } catch (e) {
    console.error('Error:', e)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
