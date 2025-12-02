import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const provider = getRouterParam(event, 'provider')
  
  if (!provider) {
    throw createError({
      statusCode: 400,
      message: 'Provider is required'
    })
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Find and delete the integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider
      }
    })

    if (!integration) {
      throw createError({
        statusCode: 404,
        message: 'Integration not found'
      })
    }

    await prisma.integration.delete({
      where: { id: integration.id }
    })

    return {
      success: true,
      message: `${provider} disconnected successfully`
    }
  } catch (error: any) {
    console.error(`Failed to disconnect ${provider}:`, error)
    throw createError({
      statusCode: 500,
      message: error.message || `Failed to disconnect ${provider}`
    })
  }
})