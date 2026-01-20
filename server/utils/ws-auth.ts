import { randomBytes } from 'crypto'

// In-memory token store: token -> { userId, expiresAt }
// 10 second expiration is plenty for the handshake
const tokens = new Map<string, { userId: string; expiresAt: number }>()

export function generateWsToken(userId: string): string {
  const token = randomBytes(32).toString('hex')
  tokens.set(token, {
    userId,
    expiresAt: Date.now() + 10 * 1000 // 10 seconds validity
  })

  // Cleanup old tokens
  if (tokens.size > 1000) {
    const now = Date.now()
    for (const [key, value] of tokens.entries()) {
      if (value.expiresAt < now) {
        tokens.delete(key)
      }
    }
  }

  return token
}

export function verifyWsToken(token: string): string | null {
  const data = tokens.get(token)

  if (!data) return null

  if (Date.now() > data.expiresAt) {
    tokens.delete(token)
    return null
  }

  // Single use token
  tokens.delete(token)

  return data.userId
}
