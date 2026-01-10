import { prisma } from '../../../utils/db'
import { getEffectiveUserId } from '../../../utils/coaching'
import { logAction } from '../../../utils/audit'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Revoke Application Access',
    description: "Revokes a third-party application's access to the user's data.",
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const appId = getRouterParam(event, 'appId')

  if (!appId) {
    throw createError({ statusCode: 400, message: 'Missing appId' })
  }

  try {
    await prisma.oAuthConsent.delete({
      where: {
        userId_appId: {
          userId,
          appId
        }
      }
    })

    // Also delete associated tokens
    await prisma.oAuthToken.deleteMany({
      where: {
        userId,
        appId
      }
    })

    await logAction({
      userId,
      action: 'OAUTH_ACCESS_REVOKED',
      resourceType: 'OAuthApp',
      resourceId: appId,
      event
    })

    return { success: true }
  } catch (error) {
    throw createError({ statusCode: 404, message: 'Access record not found' })
  }
})
