import { dailyCheckinRepository } from '../repositories/dailyCheckinRepository'
import { formatUserDate } from '../date'

/**
 * Fetches and formats completed daily check-ins for a given date range.
 * Returns a formatted string suitable for AI prompts.
 */
export async function getCheckinHistoryContext(
  userId: string,
  startDate: Date,
  endDate: Date,
  timezone: string
): Promise<string> {
  const checkins = await dailyCheckinRepository.getHistory(userId, startDate, endDate)

  if (checkins.length === 0) {
    return ''
  }

  return checkins
    .map((c) => {
      const qs = c.questions as any[]
      // Only include questions that have an answer
      const answeredQuestions = qs.filter((q) => q.answer)

      if (answeredQuestions.length === 0) return null

      const dateStr = formatUserDate(c.date, timezone, 'yyyy-MM-dd')
      const qa = answeredQuestions
        .map(
          (q) => `  * Q: "${q.text}"
    A: ${q.answer}`
        )
        .join('\n')

      return `[${dateStr}]
${qa}`
    })
    .filter(Boolean)
    .join('\n\n')
}
