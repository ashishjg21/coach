import { getServerSession } from '../../utils/session'
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

  // Fetch all system templates and user-specific templates
  const templates = await prisma.reportTemplate.findMany({
    where: {
      OR: [{ isSystem: true }, { userId: userId }]
    },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      isSystem: true
    }
  })

  return templates
})
