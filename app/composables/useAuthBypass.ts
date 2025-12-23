export const useAuthBypass = () => {
  const config = useRuntimeConfig()
  const bypassEnabled = config.public.authBypassEnabled

  // If bypass is enabled, return mock auth data from environment
  if (bypassEnabled) {
    return {
      status: ref('authenticated'),
      data: ref({
        user: {
          id: '6cbccf6c-e5a3-4df2-8305-2584e317f1ea', // This will be looked up from DB by the server
          name: config.public.authBypassName || 'Bypass User',
          email: config.public.authBypassUser || '',
          isAdmin: true
        }
      })
    }
  }

  // Otherwise, use normal auth
  return useAuth()
}
