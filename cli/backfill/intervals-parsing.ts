import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { normalizeIntervalsPlannedWorkout } from '../../server/utils/intervals'

const backfillIntervalsParsingCommand = new Command('intervals-parsing')

backfillIntervalsParsingCommand
  .description(
    'Re-parse Intervals.icu PlannedWorkouts to fix structured workout issues (cadence objects, missing power)'
  )
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--id <id>', 'Process a specific workout ID')
  .action(async (options) => {
    const isProd = options.prod
    const isDryRun = options.dryRun
    const specificId = options.id

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be saved.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.gray('Fetching PlannedWorkouts with rawJson...'))

      const where: any = {
        rawJson: { not: Prisma.JsonNull }
      }

      if (specificId) {
        where.id = specificId
      }

      const workouts = await prisma.plannedWorkout.findMany({
        where,
        select: { id: true, userId: true, rawJson: true, title: true }
      })

      console.log(chalk.gray(`Found ${workouts.length} workouts to process.`))

      let processedCount = 0
      let fixedCount = 0
      let errorCount = 0

      for (const w of workouts) {
        processedCount++
        try {
          const raw = w.rawJson as any

          // Re-normalize using the new logic
          const normalized = normalizeIntervalsPlannedWorkout(raw, w.userId)

          if (isDryRun) {
            // In dry run, maybe log something if it would change?
            // Hard to compare JSON equality deeply without expensive checks,
            // but we can just log that we processed it.
            // Or verify specific fixes like cadence type.
            const steps = normalized.structuredWorkout?.steps || []
            const hasCadenceObject = steps.some((s: any) => typeof s.cadence === 'object')
            const hasNestedPowerIssue = steps.some((s: any) =>
              s.steps?.some((child: any) => child.power?.units === '%ftp' && child.power.value > 5)
            )

            if (hasCadenceObject || hasNestedPowerIssue) {
              console.log(
                chalk.red(
                  `[DRY RUN] Workout ${w.id} (${w.title}) STILL HAS ISSUES after normalization!`
                )
              )
            } else {
              // console.log(chalk.green(`[DRY RUN] Workout ${w.id} normalized successfully.`))
            }
          } else {
            await prisma.plannedWorkout.update({
              where: { id: w.id },
              data: {
                structuredWorkout: normalized.structuredWorkout as any,
                durationSec: normalized.durationSec,
                distanceMeters: normalized.distanceMeters,
                tss: normalized.tss,
                workIntensity: normalized.workIntensity
              }
            })
            if (fixedCount % 100 === 0) process.stdout.write('.')
          }
          fixedCount++
        } catch (e) {
          console.error(chalk.red(`Error fixing workout ${w.id} (${w.title}):`), e)
          errorCount++
        }
      }

      console.log('\n')
      console.log(chalk.bold('Summary:'))
      console.log(`Total Processed: ${processedCount}`)
      console.log(`Fixed/Checked:   ${fixedCount}`)
      console.log(`Errors:          ${errorCount}`)

      if (isDryRun) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillIntervalsParsingCommand
