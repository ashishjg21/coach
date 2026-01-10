import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const userStatsCommand = new Command('user-stats')

userStatsCommand
  .description('Show ingestion stats for a user (oldest/newest workouts, counts)')
  .requiredOption('--user-id <userId>', 'User UUID')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = options.prod
    const userId = options.userId

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.gray(`Fetching stats for user: ${userId}...`))

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { integrations: true }
      })

      if (!user) {
        console.error(chalk.red(`User not found: ${userId}`))
        process.exit(1)
      }

      console.log(
        chalk.bold.cyan(`
=== User Details ===`)
      )
      console.log(`Name:  ${chalk.white(user.name)}`)
      console.log(`Email: ${chalk.white(user.email)}`)
      console.log(`ID:    ${chalk.gray(user.id)}`)

      console.log(
        chalk.bold.cyan(`
=== Integrations ===`)
      )
      if (user.integrations.length === 0) {
        console.log(chalk.yellow('No integrations found.'))
      } else {
        user.integrations.forEach((int: any) => {
          console.log(`Provider: ${chalk.green(int.provider)}`)
          console.log(`  Status:    ${int.syncStatus}`)
          console.log(`  Last Sync: ${int.lastSyncAt}`)
          console.log(`  Ext ID:    ${int.externalUserId}`)
        })
      }

      console.log(
        chalk.bold.cyan(`
=== Workout Stats ===`)
      )

      const totalWorkouts = await prisma.workout.count({
        where: { userId }
      })

      if (totalWorkouts === 0) {
        console.log(chalk.yellow('No workouts found.'))
      } else {
        const oldest = await prisma.workout.findFirst({
          where: { userId },
          orderBy: { date: 'asc' },
          select: { date: true, source: true, externalId: true, title: true }
        })

        const newest = await prisma.workout.findFirst({
          where: { userId },
          orderBy: { date: 'desc' },
          select: { date: true, source: true, externalId: true, title: true }
        })

        // Group by source
        const bySource = await prisma.workout.groupBy({
          by: ['source'],
          where: { userId },
          _count: { id: true }
        })

        console.log(`Total Workouts: ${chalk.bold.white(totalWorkouts)}`)

        console.log(`
By Source: `)
        bySource.forEach((group: any) => {
          console.log(`  ${group.source.padEnd(12)}: ${group._count.id}`)
        })

        if (oldest) {
          console.log(`
Oldest Workout: `)
          console.log(`  Date:   ${chalk.yellow(oldest.date.toISOString().split('T')[0])}`)
          console.log(`  Title:  ${oldest.title}`)
          console.log(`  Source: ${oldest.source}`)
        }

        if (newest) {
          console.log(`
Newest Workout: `)
          console.log(`  Date:   ${chalk.yellow(newest.date.toISOString().split('T')[0])}`)
          console.log(`  Title:  ${newest.title}`)
          console.log(`  Source: ${newest.source}`)
        }

        // Check for yearly distribution (useful to see gaps)
        console.log(`
Yearly Distribution: `)
        // Prisma doesn't support sophisticated date grouping easily without raw query,
        // but we can do a raw query for speed and aggregation.
        const yearly = await prisma.$queryRaw`
          SELECT 
            EXTRACT(YEAR FROM date) as year, 
            COUNT(*) as count 
          FROM "Workout" 
          WHERE "userId" = ${userId} 
          GROUP BY year 
          ORDER BY year DESC
        `

        if (Array.isArray(yearly)) {
          yearly.forEach((y: any) => {
            console.log(`  ${y.year}: ${Number(y.count)}`)
          })
        }
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
    }
  })

export default userStatsCommand
