import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const scoreTrendExplanationRepository = {
  async findByMetric(userId: string, type: string, period: number, metric: string) {
    return prisma.scoreTrendExplanation.findUnique({
      where: {
        userId_type_period_metric: {
          userId,
          type,
          period,
          metric
        }
      }
    })
  },

  async listValid(userId: string) {
    return prisma.scoreTrendExplanation.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      }
    })
  },

  async upsert(
    userId: string,
    type: string,
    period: number,
    metric: string,
    data: Omit<Prisma.ScoreTrendExplanationCreateInput, 'user' | 'type' | 'period' | 'metric'>
  ) {
    return prisma.scoreTrendExplanation.upsert({
      where: {
        userId_type_period_metric: {
          userId,
          type,
          period,
          metric
        }
      },
      update: data,
      create: {
        ...data,
        userId,
        type,
        period,
        metric
      }
    })
  },

  async deleteMany(userId: string) {
    return prisma.scoreTrendExplanation.deleteMany({
      where: { userId }
    })
  }
}
