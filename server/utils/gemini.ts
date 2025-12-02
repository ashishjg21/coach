import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export type GeminiModel = 'flash' | 'pro'

const MODEL_NAMES = {
  flash: 'gemini-2.0-flash-exp',
  pro: 'gemini-2.0-flash-thinking-exp-1219'
} as const

export async function generateCoachAnalysis(
  prompt: string,
  modelType: GeminiModel = 'flash'
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAMES[modelType]
  })
  
  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text()
}

export async function generateStructuredAnalysis<T>(
  prompt: string,
  schema: any,
  modelType: GeminiModel = 'flash'
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAMES[modelType],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  })
  
  const result = await model.generateContent(prompt)
  const response = result.response
  return JSON.parse(response.text())
}

export function buildWorkoutSummary(workouts: any[]): string {
  return workouts.map(w => 
    `${w.date.toISOString()}: ${w.title} - ${w.durationSec}s, ${w.tss || 'N/A'} TSS, ${w.averageWatts || 'N/A'}W avg`
  ).join('\n')
}

export function buildMetricsSummary(metrics: any[]): string {
  return metrics.map(m =>
    `${m.date.toISOString()}: Recovery ${m.recoveryScore}%, HRV ${m.hrv}ms, Sleep ${m.hoursSlept}h`
  ).join('\n')
}