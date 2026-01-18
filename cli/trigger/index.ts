import { Command } from 'commander'
import listCommand from './list'

const triggerCommand = new Command('trigger')

triggerCommand.description('Trigger.dev management commands')

triggerCommand.addCommand(listCommand)

export default triggerCommand
