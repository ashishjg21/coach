import { getServerSession } from '../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'List athletes',
    description: 'Returns the list of athletes coached by the authenticated user.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  status: { type: 'string' }
                }
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

  const coachId = (session.user as any).id
  return await coachingRepository.getAthletesForCoach(coachId)
})
