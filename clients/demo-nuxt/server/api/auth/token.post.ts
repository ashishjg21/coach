export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { code } = body

  if (!code) {
    throw createError({ statusCode: 400, message: 'Missing authorization code' })
  }

  try {
    // Exchange code for token at Coach Watts IdP
    const data: any = await $fetch(`${config.public.coachWattsUrl}/api/oauth/token`, {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: config.public.clientId,
        client_secret: config.coachWattsClientSecret,
        code,
        redirect_uri: config.public.redirectUri
      }
    })

    return data
  } catch (error: any) {
    console.error('Token exchange error:', error.data || error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.data?.error_description || 'Token exchange failed'
    })
  }
})
