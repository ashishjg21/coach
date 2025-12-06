import { logger, task } from "@trigger.dev/sdk/v3";
import { fetchWhoopRecovery, fetchWhoopSleep, normalizeWhoopRecovery } from "../server/utils/whoop";
import { prisma } from "../server/utils/db";

export const ingestWhoopTask = task({
  id: "ingest-whoop",
  run: async (payload: {
    userId: string;
    startDate: string;
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("[Whoop Ingest] Starting ingestion", {
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
          provider: 'whoop'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Whoop integration not found for user');
    }
    
    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    });
    
    try {
      // Fetch recovery data
      const recoveryData = await fetchWhoopRecovery(
        integration,
        new Date(startDate),
        new Date(endDate)
      );
      
      logger.log(`[Whoop Ingest] Fetched ${recoveryData.length} recovery records`);
      
      // Re-fetch integration to get any updated tokens from the recovery fetch
      const updatedIntegration = await prisma.integration.findUnique({
        where: { id: integration.id }
      });
      
      if (!updatedIntegration) {
        throw new Error('Integration not found after recovery fetch');
      }
      
      // Upsert wellness data
      let upsertedCount = 0;
      let skippedCount = 0;
      
      for (const recovery of recoveryData) {
        // Fetch corresponding sleep data if available
        let sleepData = null;
        if (recovery.sleep_id) {
          sleepData = await fetchWhoopSleep(updatedIntegration, recovery.sleep_id);
        }
        
        const wellness = normalizeWhoopRecovery(recovery, userId, sleepData);
        
        // Skip if recovery wasn't scored yet
        if (!wellness) {
          skippedCount++;
          continue;
        }
        
        await prisma.wellness.upsert({
          where: {
            userId_date: {
              userId,
              date: wellness.date
            }
          },
          update: wellness,
          create: wellness
        });
        upsertedCount++;
      }
      
      logger.log(`[Whoop Ingest] Complete - Saved: ${upsertedCount}, Skipped (unscored): ${skippedCount}`);
      
      if (skippedCount > 0) {
        logger.info(`[Whoop Ingest] Note: ${skippedCount} recovery records were skipped because they haven't been scored yet. This is normal for recent/current day data.`);
      }
      
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
        count: upsertedCount,
        skipped: skippedCount,
        userId,
        startDate,
        endDate
      };
    } catch (error) {
      logger.error("[Whoop Ingest] Error ingesting data", { error });
      
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