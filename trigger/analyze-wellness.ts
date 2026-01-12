import { task } from '@trigger.dev/sdk/v3'
import { analyzeWellness } from '../server/utils/services/wellness-analysis'

export const analyzeWellnessTask = task({
  id: 'analyze-wellness',
  run: async (payload: { wellnessId: string; userId: string }) => {
    return analyzeWellness(payload.wellnessId, payload.userId)
  }
})
