import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const fixCheckinsCommand = new Command('fix-checkins')
  .description('Fix stuck PENDING/PROCESSING daily check-ins')
  .option('--prod', 'Run in production mode (requires DATABASE_URL_PROD)')
  .option('--dry-run', 'Analyze without making changes', false)
  .action(async (options) => {
    const connectionString = options.prod ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string not found.'))
      if (options.prod) {
        console.error(chalk.yellow('Make sure DATABASE_URL_PROD is set in your .env file.'))
      }
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.blue(`🔍 Checking for stuck PENDING/PROCESSING daily check-ins...`))
      if (options.dryRun) {
        console.log(chalk.yellow('🚧 DRY RUN: No changes will be made.'))
      }

      // Find all pending/processing records created more than 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

      const stuckRecords = await prisma.dailyCheckin.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          updatedAt: { lt: fiveMinutesAgo }
        },
        include: {
          user: {
            select: { email: true }
          }
        }
      })

      console.log(`Found ${stuckRecords.length} stuck records.`)

      for (const record of stuckRecords) {
        const hasQuestions =
          Array.isArray(record.questions) && (record.questions as any[]).length > 0
        const userEmail = record.user.email

        if (hasQuestions) {
          console.log(
            chalk.green(
              `✅ Record ${record.id} (${userEmail}) has questions. Reverting to COMPLETED.`
            )
          )
          if (!options.dryRun) {
            await prisma.dailyCheckin.update({
              where: { id: record.id },
              data: { status: 'COMPLETED' }
            })
          }
        } else {
          console.log(chalk.red(`❌ Record ${record.id} (${userEmail}) is empty. Deleting...`))
          if (!options.dryRun) {
            await prisma.dailyCheckin.delete({
              where: { id: record.id }
            })
          }
        }
      }

      console.log(chalk.blue('Done.'))
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default fixCheckinsCommand
