export function useStripe() {
  const toast = useToast()

  /**
   * Create a checkout session and redirect to Stripe
   */
  async function createCheckoutSession(
    priceId: string,
    options?: {
      successUrl?: string
      cancelUrl?: string
    }
  ) {
    try {
      const { data, error } = await useFetch('/api/stripe/checkout-session', {
        method: 'POST',
        body: {
          priceId,
          successUrl: options?.successUrl,
          cancelUrl: options?.cancelUrl
        }
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create checkout session')
      }

      if (data.value?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.value.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      toast.add({
        title: 'Checkout Failed',
        description: err.message || 'Unable to start checkout process',
        color: 'error'
      })
    }
  }

  /**
   * Open Stripe Customer Portal
   */
  async function openCustomerPortal(returnUrl?: string) {
    try {
      const { data, error } = await useFetch('/api/stripe/portal-session', {
        method: 'POST',
        body: {
          returnUrl
        }
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create portal session')
      }

      if (data.value?.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.value.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err: any) {
      console.error('Portal error:', err)
      toast.add({
        title: 'Portal Access Failed',
        description: err.message || 'Unable to access customer portal',
        color: 'error'
      })
    }
  }

  return {
    createCheckoutSession,
    openCustomerPortal
  }
}
