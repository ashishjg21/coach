import { logger, task } from "@trigger.dev/sdk/v3";
import { fetchWithingsMeasures, normalizeWithingsMeasureGroup, WITHINGS_MEASURE_TYPES, fetchWithingsWorkouts, normalizeWithingsWorkout, fetchWithingsSleep, normalizeWithingsSleep } from "../server/utils/withings";
import { prisma } from "../server/utils/db";
import { wellnessRepository } from "../server/utils/repositories/wellnessRepository";
import { workoutRepository } from "../server/utils/repositories/workoutRepository";
import { normalizeTSS } from "../server/utils/normalize-tss";
import { calculateWorkoutStress } from "../server/utils/calculate-workout-stress";

export const ingestWithingsTask = task({
  id: "ingest-withings",
  run: async (payload: {
    userId: string;
    startDate: string;
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("[Withings Ingest] Starting ingestion", {
      userId,
      startDate,
      endDate,
      daysToSync: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000))
    });
    
    // Fetch integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'withings'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Withings integration not found for user');
    }
    
    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    });
    
    try {
      // 1. Fetch Measure Groups (Wellness)
      // Include Weight (1), Fat Ratio (6), Muscle Mass (76), Hydration (77), Bone Mass (88)
      const measureTypes = [
        WITHINGS_MEASURE_TYPES.WEIGHT,
        WITHINGS_MEASURE_TYPES.FAT_RATIO,
        WITHINGS_MEASURE_TYPES.MUSCLE_MASS,
        WITHINGS_MEASURE_TYPES.HYDRATION,
        WITHINGS_MEASURE_TYPES.BONE_MASS
      ];

      const measureGroups = await fetchWithingsMeasures(
        integration,
        new Date(startDate),
        new Date(endDate),
        measureTypes
      );
      
      logger.log(`[Withings Ingest] Fetched ${measureGroups.length} measure groups`);
      
      // Upsert wellness data (Measures)
      let upsertedCount = 0;
      let skippedCount = 0;
      
      for (const group of measureGroups) {
        const wellness = normalizeWithingsMeasureGroup(group, userId);
        
        if (!wellness) {
          skippedCount++;
          continue;
        }
        
        const cleanWellness: any = {};
        Object.entries(wellness).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            cleanWellness[key] = value;
          }
        });
        
        // Ensure userId and date are present
        cleanWellness.userId = userId;
        cleanWellness.date = wellness.date;

        // Fetch existing for rawJson merging
        const existingWellness = await prisma.wellness.findUnique({
          where: {
            userId_date: {
              userId,
              date: wellness.date
            }
          }
        });

        if (existingWellness && existingWellness.rawJson) {
           const existingRaw = existingWellness.rawJson as any;
           cleanWellness.rawJson = {
             ...existingRaw,
             ...cleanWellness.rawJson
           };
        }

        await wellnessRepository.upsert(
          userId,
          wellness.date,
          cleanWellness, 
          cleanWellness 
        );
        upsertedCount++;
        
        // Also update the User profile weight if this is the most recent measurement
        const isRecent = new Date().getTime() - wellness.date.getTime() < 7 * 24 * 60 * 60 * 1000; // within 7 days
        if (isRecent && wellness.weight) {
             await prisma.user.update({
                 where: { id: userId },
                 data: { weight: wellness.weight }
             });
        }
      }

      // 2. Fetch Sleep (Wellness)
      let sleepUpsertCount = 0;
      try {
          const sleepSummaries = await fetchWithingsSleep(
              integration,
              new Date(startDate),
              new Date(endDate)
          );
          
          logger.log(`[Withings Ingest] Fetched ${sleepSummaries.length} sleep summaries`);

          for (const summary of sleepSummaries) {
              const wellness = normalizeWithingsSleep(summary, userId);
              
              if (!wellness) {
                  continue;
              }

              const cleanWellness: any = {};
              Object.entries(wellness).forEach(([key, value]) => {
                  if (value !== null && value !== undefined) {
                      cleanWellness[key] = value;
                  }
              });

              // Ensure userId and date are present
              cleanWellness.userId = userId;
              cleanWellness.date = wellness.date;

              // Fetch existing for rawJson merging
              const existingWellness = await prisma.wellness.findUnique({
                  where: {
                      userId_date: {
                          userId,
                          date: wellness.date
                      }
                  }
              });

              if (existingWellness && existingWellness.rawJson) {
                  const existingRaw = existingWellness.rawJson as any;
                  cleanWellness.rawJson = {
                      ...existingRaw,
                      ...cleanWellness.rawJson
                  };
              }
              
              // If restingHr is present in sleep data, it might override measure data, or vice versa.
              // We'll trust sleep resting HR if measure resting HR is not present.
              // If we already have resting HR from measures (e.g. smart scale standing heart rate), we might want to keep that or prefer sleep.
              // Generally, sleeping HR is "true" resting HR.
              
              await wellnessRepository.upsert(
                  userId,
                  wellness.date,
                  cleanWellness,
                  cleanWellness
              );
              sleepUpsertCount++;
          }
      } catch (error) {
           logger.error('[Withings Ingest] Error fetching sleep', { error });
      }

      // 3. Fetch Workouts
      let workoutUpsertCount = 0;
      
      // Check if integration has activity scope before trying to fetch
      // But we requested both scopes in auth, so unless user unchecked it, we should have it.
      // We'll proceed and catch errors if scope is missing (API will return error).
      
      try {
        // Re-fetch integration to get any updated tokens
        const updatedIntegration = await prisma.integration.findUnique({ where: { id: integration.id } });
        if (!updatedIntegration) throw new Error('Integration lost');

        const workouts = await fetchWithingsWorkouts(
          updatedIntegration,
          new Date(startDate),
          new Date(endDate)
        );

        logger.log(`[Withings Ingest] Fetched ${workouts.length} workouts`);

        for (const wWorkout of workouts) {
          const normalizedWorkout = normalizeWithingsWorkout(wWorkout, userId);
          
          if (!normalizedWorkout) {
            continue;
          }

          const upsertedWorkout = await workoutRepository.upsert(
            userId,
            'withings',
            normalizedWorkout.externalId,
            normalizedWorkout,
            normalizedWorkout
          );
          workoutUpsertCount++;
          
          // Normalize TSS (if HR data available, we might estimate)
          try {
            const tssResult = await normalizeTSS(upsertedWorkout.id, userId);
            
            // Update CTL/ATL if TSS was set
            if (tssResult.tss !== null) {
              await calculateWorkoutStress(upsertedWorkout.id, userId);
            }
          } catch (error) {
            logger.error('[Withings Ingest] Failed to normalize TSS', {
              workoutId: upsertedWorkout.id,
              error
            });
          }
        }
      } catch (error) {
        logger.error('[Withings Ingest] Error fetching workouts', { error });
        // Don't fail the whole task if workouts fail but measures succeeded
      }
      
      logger.log(`[Withings Ingest] Complete - Wellness Saved: ${upsertedCount}, Sleep Saved: ${sleepUpsertCount}, Workouts Saved: ${workoutUpsertCount}`);
      
      // Update sync status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: null
        }
      });
      
      return {
        success: true,
        wellnessCount: upsertedCount,
        sleepCount: sleepUpsertCount,
        workoutCount: workoutUpsertCount,
        skipped: skippedCount,
        userId,
        startDate,
        endDate
      };
    } catch (error) {
      logger.error("[Withings Ingest] Error ingesting data", { error });
      
      // Update error status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }
});

