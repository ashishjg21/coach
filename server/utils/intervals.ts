import type { Integration } from '@prisma/client'

interface IntervalsActivity {
  id: string
  start_date_local: string
  name: string
  type: string
  moving_time: number
  distance: number
  average_watts?: number
  max_watts?: number
  normalized_power?: number
  average_hr?: number
  max_hr?: number
  tss?: number
  intensity?: number
  kilojoules?: number
  icu_training_load?: number
  [key: string]: any
}

interface IntervalsAthlete {
  id: string
  email: string
  name: string
}

export async function fetchIntervalsWorkouts(
  integration: Integration,
  startDate: Date,
  endDate: Date
): Promise<IntervalsActivity[]> {
  const athleteId = integration.externalUserId || 'i0' // i0 means "current authenticated user"
  
  const url = new URL(`https://intervals.icu/api/v1/athlete/${athleteId}/activities`)
  url.searchParams.set('oldest', startDate.toISOString().split('T')[0])
  url.searchParams.set('newest', endDate.toISOString().split('T')[0])
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Basic ${Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Intervals API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export async function fetchIntervalsAthlete(accessToken: string): Promise<IntervalsAthlete> {
  const response = await fetch('https://intervals.icu/api/v1/athlete/i0', {
    headers: {
      'Authorization': `Basic ${Buffer.from(`API_KEY:${accessToken}`).toString('base64')}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Intervals API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}

export function normalizeIntervalsWorkout(activity: IntervalsActivity, userId: string) {
  return {
    userId,
    externalId: activity.id,
    source: 'intervals',
    date: new Date(activity.start_date_local),
    title: activity.name,
    description: null,
    type: activity.type,
    durationSec: activity.moving_time,
    distanceMeters: activity.distance,
    elevationGain: null,
    averageWatts: activity.average_watts,
    maxWatts: activity.max_watts,
    normalizedPower: activity.normalized_power,
    averageHr: activity.average_hr,
    maxHr: activity.max_hr,
    tss: activity.tss || activity.icu_training_load,
    if: activity.intensity,
    kilojoules: activity.kilojoules,
    rawJson: activity
  }
}