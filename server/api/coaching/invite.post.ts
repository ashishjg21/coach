import { getServerSession } from '../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Create invite',
    description: 'Generates a new coaching invite code for the authenticated athlete.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' },
                status: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const athleteId = (session.user as any).id
  return await coachingRepository.createInvite(athleteId)
})
