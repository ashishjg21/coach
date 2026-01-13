/**
 * Autotask REST API Connector
 * Simple module for creating tickets in Autotask via REST API
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const AUTOTASK_CONFIG = {
  // Default ticket settings
  defaults: {
    priority: 3, // 1=Critical, 2=High, 3=Medium, 4=Low
    companyId: 0, // Default company ID
    queueId: 29683488, // Default queue ID
    dueHours: 24, // Hours until due date
    status: 1, // Default status (1=New)
    ticketCategory: 3 // MDR Security Alert (or General Support)
  },

  api: {
    version: 'v1.0',
    endpoint: 'Tickets'
  }
} as const

export interface CreateTicketParams {
  title: string
  description: string
  priority?: number
  companyId?: number
  queueId?: number
  dueHours?: number
}

interface TicketData {
  companyID: number
  queueID: number
  title: string
  description: string
  priority: number
  status: number
  dueDateTime: string
  ticketCategory: number
}

interface AutotaskResponse {
  itemId: number
  errors?: string[]
}

/**
 * Calculate due date based on hours from now
 */
function calculateDueDate(hours: number): string {
  const dueDate = new Date()
  dueDate.setHours(dueDate.getHours() + hours)

  // Format: YYYY-MM-DDTHH:MM:SS.00
  const year = dueDate.getUTCFullYear()
  const month = String(dueDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dueDate.getUTCDate()).padStart(2, '0')
  const hour = String(dueDate.getUTCHours()).padStart(2, '0')
  const minute = String(dueDate.getUTCMinutes()).padStart(2, '0')
  const second = String(dueDate.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.00`
}

/**
 * Create an Autotask ticket
 */
export async function createAutotaskTicket(params: CreateTicketParams): Promise<number | null> {
  const username = process.env.AUTOTASK_USERNAME
  const password = process.env.AUTOTASK_PASSWORD
  const integrationCode = process.env.AUTOTASK_INTEGRATION_CODE
  const baseUrl = process.env.AUTOTASK_BASE_URL?.replace(/\/$/, '')

  if (!username || !password || !integrationCode || !baseUrl) {
    console.error('Missing Autotask environment variables')
    throw new Error('Autotask configuration missing')
  }

  // Use values from config or defaults
  const priority = params.priority ?? AUTOTASK_CONFIG.defaults.priority
  const companyId = params.companyId ?? AUTOTASK_CONFIG.defaults.companyId
  const queueId = params.queueId ?? AUTOTASK_CONFIG.defaults.queueId
  const dueHours = params.dueHours ?? AUTOTASK_CONFIG.defaults.dueHours

  const endpoint = `${baseUrl}/${AUTOTASK_CONFIG.api.version}/${AUTOTASK_CONFIG.api.endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    Username: username,
    Secret: password,
    APIIntegrationcode: integrationCode
  }

  const dueDateTime = calculateDueDate(dueHours)

  const ticketData: TicketData = {
    companyID: companyId,
    queueID: queueId,
    title: params.title,
    description: params.description,
    priority: priority,
    status: AUTOTASK_CONFIG.defaults.status,
    dueDateTime: dueDateTime,
    ticketCategory: AUTOTASK_CONFIG.defaults.ticketCategory
  }

  try {
    console.log(
      `[Autotask] Creating ticket: "${params.title}" (Queue: ${queueId}, Priority: ${priority})`
    )

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(ticketData)
    })

    if (response.ok) {
      const result = (await response.json()) as AutotaskResponse
      const ticketId = result.itemId
      console.log(`[Autotask] ✓ Ticket created successfully: #${ticketId}`)
      return ticketId
    } else {
      console.error(`[Autotask] ✗ Failed to create ticket. Status code: ${response.status}`)
      try {
        const text = await response.text()
        console.error(`[Autotask] Response body: ${text}`)
      } catch (e) {
        console.error(`[Autotask] Could not read error response body`, e)
      }
      return null
    }
  } catch (error) {
    console.error(`[Autotask] Network/Request error:`, error)
    return null
  }
}
