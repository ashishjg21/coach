defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'Get public workout',
    description: 'Returns details of a publicly shared workout via token.',
    parameters: [
      {
        name: 'token',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
                user: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', nullable: true },
                    image: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      404: { description: 'Workout not found or link invalid' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Share token is required'
    })
  }

  const workout = await prisma.workout.findUnique({
    where: {
      shareToken: token
    },
    include: {
      streams: true,
      user: {
        select: {
          name: true,
          image: true,
          hrZones: true,
          powerZones: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found or link is invalid'
    })
  }

  // Sanitize data before returning
  const { userId, externalId, ...safeWorkout } = workout
  return safeWorkout
})
