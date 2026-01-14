import { Command } from 'commander'
import backupCommand from './backup'
import compareCommand from './compare'

const dbCommand = new Command('db').description('Database commands')

dbCommand.addCommand(backupCommand)
dbCommand.addCommand(compareCommand)

export default dbCommand
