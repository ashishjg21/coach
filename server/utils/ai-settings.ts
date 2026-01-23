import { prisma } from './db'
import type { GeminiModel } from './gemini'

export interface AiSettings {
  aiPersona: string
  aiModelPreference: GeminiModel
  aiAutoAnalyzeWorkouts: boolean
  aiAutoAnalyzeNutrition: boolean
  nutritionTrackingEnabled: boolean
}

const DEFAULT_SETTINGS: AiSettings = {
  aiPersona: 'Supportive',
  aiModelPreference: 'flash',
  aiAutoAnalyzeWorkouts: false,
  aiAutoAnalyzeNutrition: false,
  nutritionTrackingEnabled: true
}

export async function getUserAiSettings(userId: string): Promise<AiSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiPersona: true,
      aiModelPreference: true,
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true,
      nutritionTrackingEnabled: true
    }
  })

  if (!user) {
    return DEFAULT_SETTINGS
  }

  return {
    aiPersona: user.aiPersona || DEFAULT_SETTINGS.aiPersona,
    aiModelPreference:
      (user.aiModelPreference as GeminiModel) || DEFAULT_SETTINGS.aiModelPreference,
    aiAutoAnalyzeWorkouts: user.aiAutoAnalyzeWorkouts ?? DEFAULT_SETTINGS.aiAutoAnalyzeWorkouts,
    aiAutoAnalyzeNutrition: user.aiAutoAnalyzeNutrition ?? DEFAULT_SETTINGS.aiAutoAnalyzeNutrition,
    nutritionTrackingEnabled: user.nutritionTrackingEnabled ?? DEFAULT_SETTINGS.nutritionTrackingEnabled
  }
}
