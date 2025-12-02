import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  try {
    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    // Get the user's Intervals.icu integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'intervals'
      }
    })
    
    if (!integration) {
      return {
        connected: false,
        profile: null
      }
    }
    
    // Fetch profile data from Intervals.icu
    const profile = await fetchIntervalsAthleteProfile(integration)
    
    return {
      connected: true,
      profile
    }
  } catch (error) {
    console.error('Error fetching athlete profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch athlete profile'
    })
  }
})