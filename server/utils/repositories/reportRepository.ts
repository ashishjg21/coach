import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const reportRepository = {
  async findById(id: string, userId: string) {
    return prisma.report.findUnique({
      where: { id, userId },
      include: {
        workouts: {
          include: {
            workout: true
          }
        },
        nutrition: {
          include: {
            nutrition: true
          }
        }
      }
    })
  },

  async list(
    userId: string,
    filters: {
      type?: string
      status?: string
      limit?: number
    }
  ) {
    const where: Prisma.ReportWhereInput = { userId }
    if (filters.type) where.type = filters.type
    if (filters.status) where.status = filters.status

    return prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50
    })
  },

  async create(data: Prisma.ReportCreateInput) {
    return prisma.report.create({
      data
    })
  },

  async update(id: string, userId: string, data: Prisma.ReportUpdateInput) {
    return prisma.report.update({
      where: { id, userId },
      data
    })
  },

  async deleteMany(userId: string, types?: string[]) {
    const where: Prisma.ReportWhereInput = { userId }
    if (types && types.length > 0) {
      where.type = { in: types }
    }
    return prisma.report.deleteMany({
      where
    })
  },

  async syncFeedback(entityId: string, feedback: string | null, feedbackText: string | null) {
    return prisma.report.update({
      where: { id: entityId },
      data: { feedback, feedbackText }
    })
  }
}
