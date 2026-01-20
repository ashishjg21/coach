export default defineEventHandler((event) => {
  const now = new Date()

  return {
    serverTime: now.toString(),
    serverTimeISO: now.toISOString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    processEnvTZ: process.env.TZ,
    nodeVersion: process.version,
    // Add some helper calculations to verify server-side date logic
    utcDayStart: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString()
  }
})
