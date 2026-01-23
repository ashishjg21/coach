import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'

const testWebhookCommand = new Command('test-webhook')

testWebhookCommand
  .description('Test webhook rate limiting by sending multiple requests')
  .option('-c, --count <number>', 'Number of requests to send', '5')
  .option('-i, --interval <ms>', 'Interval between requests in ms', '100')
  .option('-p, --port <number>', 'Server port', process.env.PORT || '3099')
  .action(async (options) => {
    const port = options.port
    const url = `http://localhost:${port}/api/integrations/intervals/webhook`
    const secret = process.env.INTERVALS_WEBHOOK_SECRET
    const count = parseInt(options.count)
    const interval = parseInt(options.interval)

    if (!secret) {
      console.error(
        chalk.red('Error: INTERVALS_WEBHOOK_SECRET not found in environment variables.')
      )
      process.exit(1)
    }

    console.log(chalk.blue(`Starting webhook rate limit test to ${url}`))
    console.log(chalk.gray(`Sending ${count} requests with ${interval}ms delay...\n`))

    const payload = {
      secret: secret,
      events: [
        {
          athlete_id: 'test_athlete_id',
          type: 'TEST_EVENT',
          timestamp: new Date().toISOString()
        }
      ]
    }

    for (let i = 1; i <= count; i++) {
      try {
        const start = Date.now()
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        const duration = Date.now() - start

        let statusText = `${response.status} ${response.statusText}`
        if (response.status === 200 || response.status === 204) {
          statusText = chalk.green(statusText)
        } else if (response.status === 429) {
          statusText = chalk.red.bold(statusText)
          const retryAfter = response.headers.get('retry-after')
          if (retryAfter) {
            statusText += ` (Retry-After: ${retryAfter}s)`
          }
        } else {
          statusText = chalk.yellow(statusText)
        }

        console.log(`Request #${i}: ${statusText} [${duration}ms]`)

        if (i < count) {
          await new Promise((resolve) => setTimeout(resolve, interval))
        }
      } catch (error: any) {
        console.error(chalk.red(`Request #${i} failed:`), error.message)
      }
    }

    console.log(chalk.blue('\nTest complete.'))
  })

export default testWebhookCommand
