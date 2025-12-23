import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Connect athlete',
    description: 'Connects a coach to an athlete using an invite code.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string', description: 'The 6-character invite code' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                athlete: { type: 'object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid code or request' },
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
  const { code } = await readBody(event)

  if (!code) {
    throw createError({ statusCode: 400, message: 'Invite code is required' })
  }

  try {
    return await coachingRepository.connectAthleteWithCode(coachId, code)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
