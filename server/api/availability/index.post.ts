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
  const body = await readBody(event)
  
  // Validate input
  if (!Array.isArray(body.availability)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request: availability must be an array'
    })
  }
  
  // Delete existing availability and create new ones
  await prisma.trainingAvailability.deleteMany({
    where: { userId }
  })
  
  const created = await prisma.trainingAvailability.createMany({
    data: body.availability.map((item: any) => ({
      userId,
      dayOfWeek: item.dayOfWeek,
      morning: item.morning || false,
      afternoon: item.afternoon || false,
      evening: item.evening || false,
      preferredTypes: item.preferredTypes || null,
      indoorOnly: item.indoorOnly || false,
      outdoorOnly: item.outdoorOnly || false,
      gymAccess: item.gymAccess || false,
      notes: item.notes || null
    }))
  })
  
  return {
    success: true,
    count: created.count
  }
})