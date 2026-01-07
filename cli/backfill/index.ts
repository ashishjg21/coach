
import { Command } from 'commander';
import backfillMetricsCommand from './metrics';
import backfillTssCommand from './tss';
import backfillPlannedWorkoutsCommand from './planned-workouts';

const backfillCommand = new Command('backfill')
    .description('Backfill data/metrics from raw sources');

backfillCommand.addCommand(backfillMetricsCommand);
backfillCommand.addCommand(backfillTssCommand);
backfillCommand.addCommand(backfillPlannedWorkoutsCommand);

export default backfillCommand;
