import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Remove coach',
    description: 'Removes a coaching relationship, disconnecting from the specified coach.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The ID of the coach to remove'
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
                success: { type: 'boolean' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Coach not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const athleteId = (session.user as any).id
  const coachId = getRouterParam(event, 'id')

  if (!coachId) {
    throw createError({ statusCode: 400, message: 'Coach ID is required' })
  }

  return await coachingRepository.removeRelationship(coachId, athleteId)
})
