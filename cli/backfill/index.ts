
import { Command } from 'commander';
import backfillMetricsCommand from './metrics';
import backfillTssCommand from './tss';

const backfillCommand = new Command('backfill')
    .description('Backfill data/metrics from raw sources');

backfillCommand.addCommand(backfillMetricsCommand);
backfillCommand.addCommand(backfillTssCommand);

export default backfillCommand;
