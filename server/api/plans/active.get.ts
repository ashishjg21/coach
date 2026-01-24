import { prisma } from '../../utils/db'
import { getServerSession } from '../../utils/session'
import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, ftp: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const plan = await trainingPlanRepository.getActive(user.id, {
    include: {
      goal: {
        include: { events: true }
      },
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: { date: 'asc' }
              }
            }
          }
        }
      }
    }
  })

  return { plan, userFtp: user.ftp }
})
