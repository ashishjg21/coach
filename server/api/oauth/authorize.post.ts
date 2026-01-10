import { oauthRepository } from '../../utils/repositories/oauthRepository'
import { getEffectiveUserId } from '../../utils/coaching'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Approve Authorization Request',
    description: 'Called by the consent screen to approve or deny an authorization request.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['client_id', 'redirect_uri', 'action'],
            properties: {
              client_id: { type: 'string' },
              redirect_uri: { type: 'string', format: 'uri' },
              scope: { type: 'string' },
              state: { type: 'string' },
              code_challenge: { type: 'string' },
              code_challenge_method: { type: 'string' },
              action: { type: 'string', enum: ['approve', 'deny'] }
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
                redirect: { type: 'string', format: 'uri' }
              }
            }
          }
        }
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const body = await readBody(event)
  const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, action } =
    body

  if (!client_id || !redirect_uri || !action) {
    throw createError({ statusCode: 400, message: 'Missing required fields.' })
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: client_id }
  })

  if (!app) {
    throw createError({ statusCode: 400, message: 'Invalid client_id.' })
  }

  // Handle Denial
  if (action !== 'approve') {
    const errorUrl = new URL(redirect_uri)
    errorUrl.searchParams.set('error', 'access_denied')
    errorUrl.searchParams.set('error_description', 'The user denied the request.')
    if (state) errorUrl.searchParams.set('state', state)

    return { redirect: errorUrl.toString() }
  }

  // Handle Approval
  const scopes = scope ? scope.split(/[\s,]+/) : ['profile:read']

  const authCode = await oauthRepository.createAuthCode({
    appId: app.id,
    userId,
    redirectUri: redirect_uri,
    scopes,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method
  })

  const successUrl = new URL(redirect_uri)
  successUrl.searchParams.set('code', authCode.code)
  if (state) successUrl.searchParams.set('state', state)

  return { redirect: successUrl.toString() }
})
