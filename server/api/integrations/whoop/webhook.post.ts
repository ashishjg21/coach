import { logWebhookRequest, updateWebhookStatus } from '../../../utils/webhook-logger'
import { webhookQueue } from '../../../utils/queue'
import crypto from 'node:crypto'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Whoop webhook',
    description: 'Handles incoming webhook notifications from Whoop.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    },
    responses: {
      200: { description: 'OK' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)
  const headers = getRequestHeaders(event)
  const signature = headers['x-whoop-signature']
  const timestamp = headers['x-whoop-signature-timestamp']
  const clientSecret = process.env.WHOOP_CLIENT_SECRET

  // 1. Validate Signature
  if (!clientSecret) {
    console.error('[Whoop Webhook] Missing WHOOP_CLIENT_SECRET')
    throw createError({ statusCode: 500, statusMessage: 'Server Configuration Error' })
  }

  if (!signature || !timestamp || !rawBody) {
    console.warn('[Whoop Webhook] Missing signature headers or body')
    await logWebhookRequest({
      provider: 'whoop',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Missing signature headers'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payloadToSign = timestamp + rawBody
  const calculatedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(payloadToSign)
    .digest('base64')

  if (calculatedSignature !== signature) {
    console.warn('[Whoop Webhook] Invalid signature')
    await logWebhookRequest({
      provider: 'whoop',
      eventType: 'UNKNOWN',
      headers,
      status: 'FAILED',
      error: 'Invalid signature'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 2. Parse Body
  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch (e) {
    console.error('[Whoop Webhook] Failed to parse JSON body')
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }

  const { user_id, type } = body

  // 3. Log Receipt
  const log = await logWebhookRequest({
    provider: 'whoop',
    eventType: type || 'UNKNOWN',
    payload: body,
    headers,
    status: 'PENDING'
  })

  // 4. Find User
  if (!user_id) {
    console.warn('[Whoop Webhook] Missing user_id in payload')
    if (log) await updateWebhookStatus(log.id, 'FAILED', 'Missing user_id')
    return 'OK' // Return OK to acknowledge receipt even if invalid payload content
  }

  const integration = await prisma.integration.findFirst({
    where: {
      provider: 'whoop',
      externalUserId: user_id.toString()
    }
  })

  if (!integration) {
    console.warn(`[Whoop Webhook] No integration found for user_id: ${user_id}`)
    if (log) await updateWebhookStatus(log.id, 'IGNORED', 'User not found')
    return 'OK'
  }

  // 5. Enqueue Job
  try {
    await webhookQueue.add('whoop-webhook', {
      provider: 'whoop',
      type,
      userId: integration.userId,
      payload: body,
      logId: log?.id
    })
    if (log) await updateWebhookStatus(log.id, 'QUEUED')
    console.log(`[Whoop Webhook] Queued event ${type} for user ${integration.userId}`)
  } catch (err: any) {
    console.error('[Whoop Webhook] Failed to enqueue job:', err)
    if (log) await updateWebhookStatus(log.id, 'FAILED', 'Queue error')
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }

  return 'OK'
})
