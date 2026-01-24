import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const trainingWeekRepository = {
  async getById<T extends Prisma.TrainingWeekInclude>(
    id: string,
    options: {
      include?: T
      select?: Prisma.TrainingWeekSelect
    } = {}
  ) {
    if (options.select) {
      return prisma.trainingWeek.findUnique({
        where: { id },
        select: options.select
      })
    }
    return prisma.trainingWeek.findUnique({
      where: { id },
      include: options.include
    }) as unknown as Promise<Prisma.TrainingWeekGetPayload<{ include: T }> | null>
  },

  async create(
    data: Prisma.TrainingWeekUncheckedCreateInput,
    tx: Prisma.TransactionClient = prisma
  ) {
    return tx.trainingWeek.create({
      data
    })
  },

  async update(
    id: string,
    data: Prisma.TrainingWeekUpdateInput,
    tx: Prisma.TransactionClient = prisma
  ) {
    return tx.trainingWeek.update({
      where: { id },
      data
    })
  },

  async delete(id: string, tx: Prisma.TransactionClient = prisma) {
    return tx.trainingWeek.delete({
      where: { id }
    })
  },

  async deleteMany(where: Prisma.TrainingWeekWhereInput, tx: Prisma.TransactionClient = prisma) {
    return tx.trainingWeek.deleteMany({
      where
    })
  }
}
