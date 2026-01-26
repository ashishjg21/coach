import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import {
  calculatePMCForDateRange,
  getCurrentFitnessSummary,
  getInitialPMCValues
} from '../../server/utils/training-stress'

const pmcCommand = new Command('pmc')

pmcCommand
  .description('Debug PMC calculation for a user')
  .argument('[email]', 'User email')
  .option('--prod', 'Use production database')
  .option('--sample', 'Randomly check 20 users')
  .action(async (email, options) => {
    if (!email && !options.sample) {
      console.error(chalk.red('Error: Must provide email or --sample'))
      process.exit(1)
    }

    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      process.env.DATABASE_URL = connectionString
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      if (options.sample) {
        console.log(chalk.cyan('Fetching all users to sample 20...'))
        const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } })

        // Shuffle and take 20
        const shuffled = users.sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, 20)

        console.log(chalk.cyan(`Selected ${selected.length} users.`))

        let discrepancies = 0
        let matches = 0
        let skipped = 0 // No data

        for (const user of selected) {
          const result = await checkUser(user, prisma, false) // Silent mode
          if (result === 'MATCH') matches++
          else if (result === 'MISMATCH') discrepancies++
          else skipped++

          const icon = result === 'MATCH' ? '✅' : result === 'MISMATCH' ? '❌' : '⚪'
          console.log(`${icon} ${user.email.padEnd(30)} | ${result}`)
        }

        console.log(chalk.bold('\nSummary:'))
        console.log(`Matches: ${matches}`)
        console.log(`Discrepancies: ${discrepancies}`)
        console.log(`Skipped (No Data): ${skipped}`)
      } else {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          console.error(chalk.red(`User not found: ${email}`))
          process.exit(1)
        }
        await checkUser(user, prisma, true)
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
    }
  })

async function checkUser(user: any, prisma: any, verbose: boolean) {
  if (verbose) console.log(chalk.green(`User: ${user.name} (${user.id})`))

  // 1. Get Current Fitness Summary
  if (verbose) console.log(chalk.bold.cyan('\n=== Current Fitness Summary (DB "Latest") ==='))
  const summary = await getCurrentFitnessSummary(user.id, prisma)
  if (verbose) {
    console.log('Summary Result:', summary)
    if (summary.lastUpdated) {
      console.log(`Last Updated: ${summary.lastUpdated.toISOString()}`)
    } else {
      console.log(chalk.yellow('Last Updated is null!'))
    }
  }

  // 2. Check Raw "Latest" Records
  if (verbose) {
    console.log(chalk.bold.cyan('\n=== Raw Latest Records ==='))
    const latestWorkout = await prisma.workout.findFirst({
      where: { userId: user.id, isDuplicate: false, ctl: { not: null } },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, ctl: true, atl: true, title: true }
    })
    console.log('Latest Workout:', latestWorkout)

    const latestWellness = await prisma.wellness.findFirst({
      where: { userId: user.id, ctl: { not: null } },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, ctl: true, atl: true }
    })
    console.log('Latest Wellness:', latestWellness)
  }

  // 3. Run Calculation for last 30 days
  if (verbose) console.log(chalk.bold.cyan('\n=== Calculated PMC (Last 30 Days) ==='))

  const endDate = new Date() // Today
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 30)

  if (verbose) console.log(`Range: ${startDate.toISOString()} -> ${endDate.toISOString()}`)

  // Get initial values first to debug
  const initial = await getInitialPMCValues(user.id, startDate, prisma)
  if (verbose) console.log('Initial Values (before start date):', initial)

  const metrics = await calculatePMCForDateRange(
    startDate,
    endDate,
    user.id,
    initial.ctl,
    initial.atl,
    prisma
  )

  if (summary.lastUpdated) {
    // Find the metric corresponding to the summary lastUpdated date
    const summaryDateStr = summary.lastUpdated.toISOString().split('T')[0]
    const matchingMetric = metrics.find(
      (m) => m.date.toISOString().split('T')[0] === summaryDateStr
    )

    if (matchingMetric) {
      if (verbose) {
        console.log('\nComparison:')
        console.log(`Summary CTL: ${summary.ctl} (from ${summaryDateStr})`)
        console.log(
          `Chart CTL:   ${matchingMetric.ctl} (from ${matchingMetric.date.toISOString().split('T')[0]})`
        )
      }

      if (Math.abs(summary.ctl - matchingMetric.ctl) > 0.1) {
        if (verbose) console.log(chalk.red('❌ DISCREPANCY DETECTED'))
        return 'MISMATCH'
      } else {
        if (verbose) console.log(chalk.green('✅ Match'))
        return 'MATCH'
      }
    } else {
      // Summary date is outside the calculated range (e.g. older than 30 days or in the future??)
      // If summary is OLDER than 30 days, we can't compare with this range.
      if (verbose)
        console.log(chalk.yellow(`Summary date ${summaryDateStr} not in calculated range.`))
      return 'NO_DATA'
    }
  } else {
    if (verbose) console.log(chalk.gray('No summary data to compare'))
    return 'NO_DATA'
  }
}

export default pmcCommand
