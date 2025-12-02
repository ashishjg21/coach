import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Report ID is required'
    })
  }
  
  const report = await prisma.report.findFirst({
    where: {
      id,
      userId: (session.user as any).id
    }
  })
  
  if (!report) {
    throw createError({
      statusCode: 404,
      message: 'Report not found'
    })
  }
  
  return report
})