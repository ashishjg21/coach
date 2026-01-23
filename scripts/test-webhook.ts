import dotenv from 'dotenv'
dotenv.config()

const port = process.env.PORT || 3099
const url = `http://localhost:${port}/api/integrations/intervals/webhook`
const secret = process.env.INTERVALS_WEBHOOK_SECRET

if (!secret) {
  console.error('Error: INTERVALS_WEBHOOK_SECRET not found in environment variables.')
  process.exit(1)
}

const payload = {
  secret: secret,
  events: [
    {
      athlete_id: 'test_athlete_id',
      type: 'TEST_EVENT',
      timestamp: new Date().toISOString()
    }
  ]
}

console.log(`Sending webhook to ${url} with secret: ${secret}`)

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(async (response) => {
    console.log(`Response Status: ${response.status} ${response.statusText}`)
    const text = await response.text()
    console.log(`Response Body: ${text}`)
  })
  .catch((error) => {
    console.error('Error sending webhook:', error)
  })
