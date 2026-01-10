// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark'
  },
  runtimeConfig: {
    coachWattsClientSecret: process.env.NUXT_COACH_WATTS_CLIENT_SECRET,
    public: {
      coachWattsUrl: process.env.NUXT_PUBLIC_COACH_WATTS_URL || 'http://localhost:3099',
      clientId: process.env.NUXT_COACH_WATTS_CLIENT_ID,
      redirectUri: process.env.NUXT_PUBLIC_REDIRECT_URI || 'http://localhost:3001/callback'
    }
  }
})
