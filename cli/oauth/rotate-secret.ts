import { Command } from 'commander'
import { prisma } from '../../server/utils/db'
import { oauthRepository } from '../../server/utils/repositories/oauthRepository'
import chalk from 'chalk'

const rotateSecretCommand = new Command('rotate-secret')
  .description('Rotate the client secret for an OAuth application')
  .requiredOption('--client-id <id>', 'Client ID of the application')
  .action(async (options) => {
    try {
      const app = await prisma.oAuthApp.findUnique({
        where: { clientId: options.clientId }
      })

      if (!app) {
        console.error(chalk.red(`Application with Client ID ${options.clientId} not found`))
        process.exit(1)
      }

      const newSecret = await oauthRepository.regenerateSecret(app.id, app.ownerId)

      console.log(chalk.green('\n✅ Client secret rotated successfully!'))
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(`${chalk.bold('Name:')}          ${app.name}`)
      console.log(`${chalk.bold('Client ID:')}     ${app.clientId}`)
      console.log(`${chalk.bold('New Secret:')}    ${chalk.yellow(newSecret)}`)
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(chalk.red('IMPORTANT: Copy the secret now, it will not be shown again.'))
      console.log(chalk.gray('--------------------------------------------------\n'))
    } catch (error) {
      console.error(chalk.red('Failed to rotate client secret:'), error)
    } finally {
      await prisma.$disconnect()
    }
  })

export default rotateSecretCommand
