import { rateLimiter } from 'nuxt-rate-limit'

export default defineEventHandler(async (event) => {
  if (
    event.path.startsWith('/api/integrations/withings/webhook') ||
    event.path.startsWith('/api/integrations/whoop/webhook') ||
    event.path.startsWith('/api/integrations/intervals/webhook')
  ) {
    await rateLimiter(
      {
        event,
        // TODO: Configure with environment variables
        // See: https://github.com/timb-103/nuxt-rate-limit?tab=readme-ov-file#options
        requests: 100,
        seconds: 60
      },
      {
        // TODO: Configure with environment variables
      }
    )
  }
})
