import { prisma } from '../../utils/db'
import { getEffectiveUserId } from '../../utils/coaching'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'List Authorized Applications',
    description:
      'Returns a list of third-party applications that the user has authorized to access their data.',
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
                  app: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      logoUrl: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      homepageUrl: { type: 'string', nullable: true }
                    }
                  },
                  scopes: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string', format: 'date-time' }
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
  const userId = await getEffectiveUserId(event)

  return await prisma.oAuthConsent.findMany({
    where: { userId },
    include: {
      app: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          description: true,
          homepageUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
})
