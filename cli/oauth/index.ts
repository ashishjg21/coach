import { Command } from 'commander'
import createSystemAppCommand from './create-system-app'
import rotateSecretCommand from './rotate-secret'

const oauthCommand = new Command('oauth').description('OAuth 2.0 Provider management')

oauthCommand.addCommand(createSystemAppCommand)
oauthCommand.addCommand(rotateSecretCommand)

export default oauthCommand
