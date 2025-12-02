import type { Integration } from '@prisma/client'

interface WhoopRecovery {
  cycle_id: number
  sleep_id: number
  user_id: number
  created_at: string
  updated_at: string
  score_state: string
  score: {
    user_calibrating: boolean
    recovery_score: number
    resting_heart_rate: number
    hrv_rmssd_milli: number
    spo2_percentage?: number
    skin_temp_celsius?: number
  }
  sleep?: {
    id: number
    score?: number
    total_sleep_duration_milli?: number
  }
}

interface WhoopRecoveryResponse {
  records: WhoopRecovery[]
  next_token?: string
}

interface WhoopUser {
  user_id: number
  email: string
  first_name: string
  last_name: string
}

export async function fetchWhoopRecovery(
  integration: Integration,
  startDate: Date,
  endDate: Date
): Promise<WhoopRecovery[]> {
  const url = new URL('https://api.prod.whoop.com/developer/v1/recovery')
  url.searchParams.set('start', startDate.toISOString())
  url.searchParams.set('end', endDate.toISOString())
  url.searchParams.set('limit', '100')
  
  const allRecords: WhoopRecovery[] = []
  let nextToken: string | undefined

  do {
    if (nextToken) {
      url.searchParams.set('nextToken', nextToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Whoop API error: ${response.status} ${response.statusText}`)
    }
    
    const data: WhoopRecoveryResponse = await response.json()
    allRecords.push(...(data.records || []))
    nextToken = data.next_token
  } while (nextToken)
  
  return allRecords
}

export async function fetchWhoopUser(accessToken: string): Promise<WhoopUser> {
  const response = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export function normalizeWhoopRecovery(recovery: WhoopRecovery, userId: string) {
  // Parse the date and use just the date part
  const recoveryDate = new Date(recovery.created_at)
  const dateOnly = new Date(recoveryDate.getFullYear(), recoveryDate.getMonth(), recoveryDate.getDate())
  
  return {
    userId,
    date: dateOnly,
    source: 'whoop',
    hrv: recovery.score.hrv_rmssd_milli,
    restingHr: recovery.score.resting_heart_rate,
    recoveryScore: recovery.score.recovery_score,
    spO2: recovery.score.spo2_percentage,
    sleepScore: recovery.sleep?.score,
    hoursSlept: recovery.sleep?.total_sleep_duration_milli 
      ? recovery.sleep.total_sleep_duration_milli / (1000 * 60 * 60)
      : null,
    strainScore: null // Whoop doesn't include strain in recovery endpoint
  }
}