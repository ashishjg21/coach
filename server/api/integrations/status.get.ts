import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      integrations: {
        select: {
          id: true,
          provider: true,
          lastSyncAt: true,
          syncStatus: true,
          externalUserId: true
        }
      }
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    integrations: user.integrations
  }
})