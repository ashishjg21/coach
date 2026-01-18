import { Command } from 'commander'
import listCommand from './list'
import getCommand from './get'

const triggerCommand = new Command('trigger')

triggerCommand.description('Trigger.dev management commands')

triggerCommand.addCommand(listCommand)
triggerCommand.addCommand(getCommand)

export default triggerCommand
