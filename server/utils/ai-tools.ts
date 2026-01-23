import { workoutTools } from './ai-tools/workouts'
import { planningTools } from './ai-tools/planning'
import { recommendationTools } from './ai-tools/recommendations'
import { analysisTools } from './ai-tools/analysis'
import { profileTools } from './ai-tools/profile'
import { AiSettings, getUserAiSettings } from './ai-settings'

export const getToolsWithContext = (userId: string, timezone: string, settings: AiSettings) => {
  return {
    ...workoutTools(userId, timezone),
    ...planningTools(userId, timezone),
    ...recommendationTools(userId, timezone),
    ...analysisTools(userId, timezone, settings),
    ...profileTools(userId, timezone)
  }
}
