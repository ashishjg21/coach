export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'Authorization')

  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing Authorization header' })
  }

  try {
    // Proxy request to Coach Watts API
    const workouts = await $fetch(`${config.public.coachWattsUrl}/api/workouts`, {
      headers: {
        Authorization: authHeader
      },
      query: {
        limit: 5 // Just get recent 5
      }
    })

    return workouts
  } catch (error: any) {
    console.error('Workouts fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.data?.message || 'Failed to fetch workouts'
    })
  }
})
