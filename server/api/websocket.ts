import { defineWebSocketHandler } from 'h3'
import { runs } from '@trigger.dev/sdk/v3'
import { verifyWsToken } from '../utils/ws-auth'

// Map to store active subscriptions cancel functions per peer
const subscriptions = new Map<any, Set<() => void>>()
// Map to store peer authentication status
const peerContext = new Map<any, { userId?: string }>()

export default defineWebSocketHandler({
  open(peer) {
    peer.send(JSON.stringify({ type: 'welcome', message: 'Connected to Coach Watts WebSocket' }))
    subscriptions.set(peer, new Set())
    peerContext.set(peer, {})
  },

  async message(peer, message) {
    const text = message.text()

    if (text === 'ping') {
      peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      return
    }

    try {
      const data = JSON.parse(text)

      // Handle Authentication
      if (data.type === 'authenticate') {
        const userId = verifyWsToken(data.token)
        if (userId) {
          const ctx = peerContext.get(peer) || {}
          ctx.userId = userId
          peerContext.set(peer, ctx)
          peer.send(JSON.stringify({ type: 'authenticated', userId }))
        } else {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token'
            })
          )
        }
        return
      }

      if (data.type === 'subscribe_run') {
        const runId = data.runId
        if (!runId) return

        startSubscription(peer, () => runs.subscribeToRun(runId), runId)
      }

      if (data.type === 'subscribe_user') {
        // Enforce Authentication
        const ctx = peerContext.get(peer)
        if (!ctx?.userId) {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            })
          )
          return
        }

        // Use the authenticated user ID, ignore payload to prevent snooping
        const userId = ctx.userId
        const tag = `user:${userId}`
        startSubscription(peer, () => runs.subscribeToRunsWithTag(tag), `tag:${tag}`)
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  },

  close(peer, event) {
    const peerSubs = subscriptions.get(peer)
    if (peerSubs) {
      peerSubs.forEach((cancel) => cancel())
      subscriptions.delete(peer)
    }
    peerContext.delete(peer)
  },

  error(peer, error) {
    // WebSocket error
  }
})

// Helper to handle subscription loops
function startSubscription(peer: any, iteratorFn: () => AsyncIterable<any>, subId: string) {
  let isSubscribed = true
  const cancel = () => {
    isSubscribed = false
  }

  const peerSubs = subscriptions.get(peer)
  if (peerSubs) peerSubs.add(cancel)
  ;(async () => {
    try {
      for await (const run of iteratorFn()) {
        if (!isSubscribed) break

        peer.send(
          JSON.stringify({
            type: 'run_update',
            runId: run.id,
            taskIdentifier: run.taskIdentifier,
            status: run.status,
            output: run.output,
            error: run.error,
            tags: run.tags,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt
          })
        )
      }
    } catch (err) {
      // Subscription error
    } finally {
      if (peerSubs) peerSubs.delete(cancel)
    }
  })()
}
