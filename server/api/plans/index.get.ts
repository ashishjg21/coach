import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user ID from email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }

  const userId = user.id

  const plans = await trainingPlanRepository.list(userId, {
    // Custom filter for this specific list view
    include: {
      goal: { select: { title: true } },
      blocks: {
        select: {
          id: true,
          _count: { select: { weeks: true } }
        }
      },
      _count: { select: { blocks: true } }
    }
  })

  // Filter for non-active plans + templates as in original logic
  return plans.filter((p) => p.status !== 'ACTIVE' || p.isTemplate)
})
