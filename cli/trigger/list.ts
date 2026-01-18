import { Command } from 'commander'
import chalk from 'chalk'

const listCommand = new Command('list')

listCommand
  .description('List latest trigger runs')
  .option('--prod', 'Use production environment')
  .option('-l, --limit <number>', 'Number of runs to show', '20')
  .option('--status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      if (options.prod) {
        if (!process.env.TRIGGER_PROD_SECRET_KEY) {
          console.error(chalk.red('Error: TRIGGER_PROD_SECRET_KEY is not set in .env'))
          process.exit(1)
        }
        process.env.TRIGGER_SECRET_KEY = process.env.TRIGGER_PROD_SECRET_KEY

        if (process.env.TRIGGER_PROD_API_URL) {
          process.env.TRIGGER_API_URL = process.env.TRIGGER_PROD_API_URL
        }

        if (process.env.TRIGGER_PROD_PROJECT_REF) {
          process.env.TRIGGER_PROJECT_REF = process.env.TRIGGER_PROD_PROJECT_REF
        }

        console.log(chalk.yellow('Using PRODUCTION environment'))
      } else {
        console.log(chalk.blue('Using DEVELOPMENT environment'))
      }

      // Dynamic import to ensure env vars are picked up
      const { runs } = await import('@trigger.dev/sdk/v3')

      const limit = parseInt(options.limit)
      console.log(`Fetching last ${limit} runs...`)

      const response = await runs.list({
        limit: limit,
        filter: options.status ? { status: [options.status] } : undefined
      })

      if (response.data.length === 0) {
        console.log(chalk.gray('No runs found.'))
        return
      }

      console.table(
        response.data.map((run) => ({
          ID: run.id,
          Task: run.taskIdentifier,
          Status: run.status,
          'Started At': run.startedAt ? new Date(run.startedAt).toLocaleString() : '-',
          Duration: run.durationMs ? `${(run.durationMs / 1000).toFixed(2)}s` : '-',
          IsTest: run.isTest
        }))
      )
    } catch (error) {
      console.error(chalk.red('Failed to fetch runs:'), error)
      process.exit(1)
    }
  })

export default listCommand
