import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const userId = (session.user as any).id
  
  const availability = await prisma.trainingAvailability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: 'asc' }
  })
  
  return availability
})