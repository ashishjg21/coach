import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Get Authorization Details',
    description: 'Returns public details for an application to be shown on the consent screen.',
    parameters: [{ name: 'client_id', in: 'query', required: true, schema: { type: 'string' } }],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                logoUrl: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true }
              }
            }
          }
        }
      },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const clientId = query.client_id as string

  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Missing client_id' })
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId },
    select: {
      name: true,
      logoUrl: true,
      description: true
    }
  })

  if (!app) {
    throw createError({ statusCode: 404, message: 'Application not found' })
  }

  return app
})
