import { getServerSession } from '../../utils/session'
import { isRunIdRunning } from '../../utils/trigger-check'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get profile generation status',
    description: 'Checks if profile generation tasks are currently running.',
    parameters: [
      {
        in: 'query',
        name: 'jobId',
        schema: { type: 'string' },
        description: 'Specific Job ID to check'
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
                isRunning: { type: 'boolean' }
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

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const jobId = query.jobId as string

  if (jobId) {
    const isRunning = await isRunIdRunning(jobId)
    return {
      isRunning
    }
  }

  return {
    isRunning: false
  }
})
