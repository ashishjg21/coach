import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const command = new Command('kilojoules')
  .description('Fix Kilojoules stored as Joules (divide by 1000)')
  .option('-d, --dry-run', 'Dry run (do not update database)', false)
  .option('--prod', 'Use production database', false)
  .action(async (options) => {
    console.log(chalk.blue('=== Migrate Kilojoules (Joules -> kJ) ==='))
    console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`)

    // Database selection logic
    const isProd = options.prod
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

    if (!connectionString) {
      console.error(chalk.red('DATABASE_URL is not defined.'))
      process.exit(1)
    }

    // Initialize Prisma Client dynamically
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      // Threshold: 20,000. 20,000 kJ is insane (typical TDF stage is ~4000-5000kJ).
      // 20,000 J is 20 kJ (tiny).
      // So if value is > 20,000, it's definitely Joules.
      const threshold = 20000

      const workouts = await prisma.workout.findMany({
        where: {
          kilojoules: {
            gt: threshold
          }
        },
        select: {
          id: true,
          title: true,
          kilojoules: true,
          date: true
        }
      })

      console.log(chalk.yellow(`Found ${workouts.length} workouts with kilojoules > ${threshold}`))

      if (workouts.length === 0) {
        console.log(chalk.green('No workouts need migration.'))
        return
      }

      if (options.dryRun) {
        console.log(chalk.blue('Dry run enabled. No changes will be made.'))
        workouts.slice(0, 5).forEach((w) => {
          console.log(
            `[Dry Run] Would update ${w.title} (${w.date.toISOString().split('T')[0]}): ${w.kilojoules} -> ${Math.round(w.kilojoules! / 1000)}`
          )
        })
        return
      }

      let updatedCount = 0
      for (const w of workouts) {
        const newKj = Math.round(w.kilojoules! / 1000)
        await prisma.workout.update({
          where: { id: w.id },
          data: { kilojoules: newKj }
        })
        updatedCount++
        if (updatedCount % 100 === 0) {
          process.stdout.write('.')
        }
      }

      console.log('\n' + chalk.green(`Successfully updated ${updatedCount} workouts.`))
    } catch (error) {
      console.error(chalk.red('Error during migration:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  })

export default command
