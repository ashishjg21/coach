import Stripe from 'stripe'

const config = useRuntimeConfig()

// Check if Stripe is configured to avoid startup crashes in self-hosted environments
export const stripe = config.stripeSecretKey
  ? new Stripe(config.stripeSecretKey, {
      apiVersion: '2025-12-15.clover' as any,
      typescript: true
    })
  : (new Proxy(
      {},
      {
        get: (_target, prop) => {
          throw new Error(
            `Stripe is not configured (missing STRIPE_SECRET_KEY). Cannot access stripe.${String(
              prop
            )}`
          )
        }
      }
    ) as unknown as Stripe)

/**
 * Get Stripe price IDs from environment
 */
export function getStripePriceIds() {
  return {
    supporter: {
      monthly: config.stripeSupporterMonthlyPriceId,
      annual: config.stripeSupporterAnnualPriceId
    },
    pro: {
      monthly: config.stripeProMonthlyPriceId,
      annual: config.stripeProAnnualPriceId
    }
  }
}

/**
 * Get Stripe product IDs from environment
 */
export function getStripeProductIds() {
  return {
    supporter: config.stripeSupporterProductId,
    pro: config.stripeProProductId
  }
}
