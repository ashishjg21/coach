import 'dotenv/config'
import { prisma } from '../server/utils/db'

const WORKOUT_ID = '413f4bd3-3e1f-4bea-84cc-ad1d5305d8eb'

async function main() {
  console.log(`\n${'='.repeat(80)}`)
  console.log('INVESTIGATING WORKOUT:', WORKOUT_ID)
  console.log('='.repeat(80))
  
  // Get the workout from database
  const workout = await prisma.workout.findUnique({
    where: { id: WORKOUT_ID }
  })
  
  if (!workout) {
    console.log('\n❌ Workout not found in database!')
    return
  }
  
  console.log('\n📊 DATABASE RECORD:')
  console.log('-'.repeat(80))
  console.log(`Title: ${workout.title}`)
  console.log(`Date: ${workout.date}`)
  console.log(`Type: ${workout.type}`)
  console.log(`Source: ${workout.source}`)
  console.log(`External ID: ${workout.externalId}`)
  console.log(`Duration: ${workout.durationSec ? `${Math.round(workout.durationSec / 60)} min` : 'N/A'}`)
  console.log(`Distance: ${workout.distanceMeters ? `${(workout.distanceMeters / 1000).toFixed(2)} km` : 'N/A'}`)
  
  console.log('\n🏋️ TRAINING LOAD METRICS:')
  console.log('-'.repeat(80))
  console.log(`TSS: ${workout.tss ?? 'NULL'}`)
  console.log(`Training Load: ${workout.trainingLoad ?? 'NULL'}`)
  console.log(`TRIMP: ${workout.trimp ?? 'NULL'}`)
  console.log(`Intensity: ${workout.intensity ?? 'NULL'}`)
  console.log(`Session RPE: ${workout.sessionRpe ?? 'NULL'}`)
  console.log(`Kilojoules: ${workout.kilojoules ?? 'NULL'}`)
  
  console.log('\n⚡ POWER METRICS:')
  console.log('-'.repeat(80))
  console.log(`Average Watts: ${workout.averageWatts ?? 'NULL'}`)
  console.log(`Normalized Power: ${workout.normalizedPower ?? 'NULL'}`)
  console.log(`Weighted Avg Watts: ${workout.weightedAvgWatts ?? 'NULL'}`)
  console.log(`FTP: ${workout.ftp ?? 'NULL'}`)
  
  console.log('\n❤️ HEART RATE METRICS:')
  console.log('-'.repeat(80))
  console.log(`Average HR: ${workout.averageHr ?? 'NULL'}`)
  console.log(`Max HR: ${workout.maxHr ?? 'NULL'}`)
  
  console.log('\n📝 SUBJECTIVE METRICS:')
  console.log('-'.repeat(80))
  console.log(`RPE: ${workout.rpe ?? 'NULL'}`)
  console.log(`Feel: ${workout.feel ?? 'NULL'}`)
  
  console.log('\n🔧 TRAINING STATUS:')
  console.log('-'.repeat(80))
  console.log(`CTL (Fitness): ${workout.ctl ?? 'NULL'}`)
  console.log(`ATL (Fatigue): ${workout.atl ?? 'NULL'}`)
  
  // Check if there's raw JSON stored
  if (workout.rawJson) {
    console.log('\n📦 RAW JSON DATA:')
    console.log('-'.repeat(80))
    const raw = workout.rawJson as any
    console.log(JSON.stringify(raw, null, 2))
  }
  
  // If this is from intervals.icu, fetch the live data
  if (workout.source === 'intervals' && workout.externalId) {
    console.log('\n\n🌐 FETCHING LIVE DATA FROM INTERVALS.ICU...')
    console.log('='.repeat(80))
    
    const user = await prisma.user.findUnique({
      where: { id: workout.userId }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'intervals'
        }
      }
    })
    
    if (!integration) {
      console.log('❌ No intervals integration found')
      return
    }
    
    const athleteId = integration.externalUserId || 'i0'
    const auth = Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')
    
    try {
      const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities/${workout.externalId}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })
      
      if (!response.ok) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`)
        return
      }
      
      const activity = await response.json()
      
      console.log('\n📊 INTERVALS.ICU DATA:')
      console.log('-'.repeat(80))
      console.log(`Name: ${activity.name}`)
      console.log(`Type: ${activity.type}`)
      console.log(`Start Time: ${activity.start_date_local}`)
      
      console.log('\n🏋️ INTERVALS.ICU TRAINING LOAD:')
      console.log('-'.repeat(80))
      console.log(`icu_training_load: ${activity.icu_training_load ?? 'NULL'}`)
      console.log(`training_load: ${activity.training_load ?? 'NULL'}`)
      console.log(`tss: ${activity.tss ?? 'NULL'}`)
      console.log(`trimp: ${activity.trimp ?? 'NULL'}`)
      console.log(`intensity: ${activity.intensity ?? 'NULL'}`)
      console.log(`work: ${activity.work ?? 'NULL'}`)
      
      console.log('\n⚡ INTERVALS.ICU POWER:')
      console.log('-'.repeat(80))
      console.log(`average_watts: ${activity.average_watts ?? 'NULL'}`)
      console.log(`weighted_average_watts: ${activity.weighted_average_watts ?? 'NULL'}`)
      console.log(`np: ${activity.np ?? 'NULL'}`)
      console.log(`ftp: ${activity.icu_ftp ?? 'NULL'}`)
      
      console.log('\n❤️ INTERVALS.ICU HEART RATE:')
      console.log('-'.repeat(80))
      console.log(`average_hr: ${activity.average_hr ?? 'NULL'}`)
      console.log(`max_hr: ${activity.max_hr ?? 'NULL'}`)
      
      console.log('\n\n🔍 COMPARISON:')
      console.log('='.repeat(80))
      
      // Compare key fields
      const comparisons = [
        { field: 'TSS', db: workout.tss, icu: activity.tss },
        { field: 'Training Load (ICU)', db: workout.trainingLoad, icu: activity.icu_training_load },
        { field: 'Training Load (generic)', db: workout.trainingLoad, icu: activity.training_load },
        { field: 'TRIMP', db: workout.trimp, icu: activity.trimp },
        { field: 'Intensity', db: workout.intensity, icu: activity.intensity },
        { field: 'Kilojoules', db: workout.kilojoules, icu: activity.work }
      ]
      
      for (const comp of comparisons) {
        const match = comp.db === comp.icu ? '✅' : '❌'
        console.log(`${match} ${comp.field}:`)
        console.log(`   DB:  ${comp.db ?? 'NULL'}`)
        console.log(`   ICU: ${comp.icu ?? 'NULL'}`)
        if (comp.db !== comp.icu) {
          console.log(`   ⚠️  MISMATCH!`)
        }
        console.log()
      }
      
    } catch (error) {
      console.error('❌ Error fetching from Intervals.icu:', error)
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('INVESTIGATION COMPLETE')
  console.log('='.repeat(80) + '\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())