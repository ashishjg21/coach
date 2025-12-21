import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: "postgresql://coach:3JXkrGaUZURywjZk@185.112.156.142:4426/coach" })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Checking for PlannedWorkout issues...')
  
  try {
    // Check columns in PlannedWorkout
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'PlannedWorkout';
    ` as any[]
    
    console.log('Columns in PlannedWorkout:', columns.map(c => c.column_name))
    
    // Check missing columns from recent schema updates
    const requiredColumns = [
        'category',
        'rawJson',
        'syncStatus',
        'lastSyncedAt',
        'syncError',
        'modifiedLocally',
        'shareToken'
    ]

    for (const col of requiredColumns) {
        if (!columns.find(c => c.column_name === col)) {
            console.log(`Adding missing column: ${col} to PlannedWorkout`)
            if (col === 'rawJson') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" JSONB;`)
            } else if (col === 'shareToken') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`)
                 await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PlannedWorkout_shareToken_key" ON "PlannedWorkout"("shareToken");`)
            } else if (col === 'syncStatus') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" TEXT DEFAULT 'SYNCED';`)
                 await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PlannedWorkout_userId_syncStatus_idx" ON "PlannedWorkout"("userId", "syncStatus");`)
            } else if (col === 'lastSyncedAt') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" TIMESTAMP(3);`)
            } else if (col === 'syncError') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`)
            } else if (col === 'modifiedLocally') {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" BOOLEAN DEFAULT false;`)
            } else {
                 await prisma.$executeRawUnsafe(`ALTER TABLE "PlannedWorkout" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`)
            }
            console.log(`Added ${col}`)
        }
    }

  } catch (error) {
    console.error('Error applying fixes:', error)
  }
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
