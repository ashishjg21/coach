import { prisma } from '../../utils/db'
import { z } from 'zod'
import { tasks } from '@trigger.dev/sdk/v3'
import { getServerSession } from '../../utils/session'
import { getUserTimezone, getUserLocalDate, getStartOfDayUTC } from '../../utils/date'

import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'

const initializePlanSchema = z.object({
  goalId: z.string(),
  startDate: z.string().datetime(), // ISO string
  endDate: z.string().datetime().optional(), // ISO string
  volumePreference: z.enum(['LOW', 'MID', 'HIGH']).default('MID'),
  volumeHours: z.number().optional(),
  strategy: z
    .enum(['LINEAR', 'UNDULATING', 'BLOCK', 'POLARIZED', 'REVERSE', 'MAINTENANCE'])
    .default('LINEAR'),
  preferredActivityTypes: z.array(z.string()).default(['Ride']),
  customInstructions: z.string().optional(),
  recoveryRhythm: z.number().int().min(2).max(5).default(4) // 4 = 3:1 ratio, 3 = 2:1 ratio
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const validation = initializePlanSchema.safeParse(body)

  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const {
    goalId,
    startDate,
    endDate,
    volumePreference,
    volumeHours,
    strategy,
    preferredActivityTypes,
    customInstructions,
    recoveryRhythm
  } = validation.data
  const userId = (session.user as any).id

  // 1. Fetch Goal to get target date
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { events: true } // If linked to an event
  })

  if (!goal) {
    throw createError({ statusCode: 404, message: 'Goal not found' })
  }

  let targetDate = endDate ? new Date(endDate) : goal.targetDate || goal.eventDate
  if (!targetDate && goal.events.length > 0 && goal.events[0] && !endDate) {
    targetDate = goal.events[0].date
  }

  if (!targetDate) {
    throw createError({ statusCode: 400, message: 'Goal must have a target date' })
  }

  // 2. Calculate Timeline
  // Force start date to UTC midnight of the calendar day
  const timezone = await getUserTimezone(userId)
  const start = getUserLocalDate(timezone, new Date(startDate))

  const end = new Date(targetDate)
  const totalWeeks = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))

  if (totalWeeks < 4) {
    throw createError({ statusCode: 400, message: 'Plan duration too short (min 4 weeks)' })
  }

  // 4. Define Blocks
  const blocks = calculateBlocks(start, totalWeeks, strategy, recoveryRhythm, goal)

  // 5. Create Plan Skeleton
  const plan = await trainingPlanRepository.create(
    {
      userId,
      goalId,
      startDate: start,
      targetDate: end,
      strategy,
      status: 'DRAFT',
      activityTypes: preferredActivityTypes,
      customInstructions,
      recoveryRhythm,
      blocks: {
        create: blocks.map((block) => ({
          order: block.order,
          name: block.name,
          type: block.type,
          primaryFocus: block.primaryFocus,
          startDate: block.startDate,
          durationWeeks: block.durationWeeks,
          recoveryWeekIndex: block.recoveryWeekIndex,
          weeks: {
            create: Array.from({ length: block.durationWeeks }).map((_, i) => {
              const weekStart = new Date(block.startDate)
              weekStart.setUTCDate(weekStart.getUTCDate() + i * 7)
              const weekEnd = new Date(weekStart)
              weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

              const isRecovery = (i + 1) % (block.recoveryWeekIndex || 4) === 0

              // Determine target volume
              let targetMinutes = 450 // Default MID
              if (volumeHours) {
                targetMinutes = volumeHours * 60
                if (isRecovery) targetMinutes = Math.round(targetMinutes * 0.6) // 60% volume on recovery weeks
              } else {
                // Fallback to bucket logic
                if (volumePreference === 'LOW') targetMinutes = 240
                else if (volumePreference === 'HIGH') targetMinutes = 600

                if (isRecovery) targetMinutes = Math.round(targetMinutes * 0.6)
              }

              // Default TSS estimation (0.6 IF avg => 36 TSS/hr)
              const tssTarget = Math.round((targetMinutes / 60) * 50)

              return {
                weekNumber: i + 1,
                startDate: weekStart,
                endDate: weekEnd,
                isRecovery,
                volumeTargetMinutes: targetMinutes,
                tssTarget: tssTarget
              }
            })
          }
        }))
      }
    },
    {
      blocks: {
        include: {
          weeks: true
        }
      }
    }
  )

  // 6. Trigger background generation for all blocks
  if (plan.blocks && plan.blocks.length > 0) {
    for (let i = 0; i < plan.blocks.length; i++) {
      const block = plan.blocks[i]
      await tasks.trigger(
        'generate-training-block',
        {
          userId,
          blockId: block.id,
          // Only generate detailed intervals for the first week of the first block
          triggerStructureForWeekNumber: i === 0 ? 1 : undefined
        },
        {
          tags: [`user:${userId}`],
          concurrencyKey: userId
        }
      )
    }
  }

  return {
    success: true,
    planId: plan.id,
    plan
  }
})

// Helper function to calculate block structure
function calculateBlocks(
  startDate: Date,
  totalWeeks: number,
  strategy: string,
  recoveryRhythm: number,
  goal?: any
) {
  const blocks = []

  // 1. Analyze Event Demands
  const event = goal?.events?.[0]
  let buildFocus = 'THRESHOLD'
  let peakFocus = 'RACE_SPECIFIC'

  if (event) {
    if (event.terrain === 'Mountainous' || (event.elevation && event.elevation > 2000)) {
      buildFocus = 'SWEET_SPOT'
    } else if (['Criterium', 'Cyclocross', 'MTB (XC)'].includes(event.subType)) {
      buildFocus = 'VO2_MAX'
      peakFocus = 'ANAEROBIC_CAPACITY'
    } else if (event.expectedDuration && event.expectedDuration > 6) {
      buildFocus = 'TEMPO'
    }
  }

  // 2. BACKWARD PLANNING LOGIC
  // We plan backward from the target date to ensure the peak is perfectly timed.
  const taperWeeks = 2
  const trainingWeeks = totalWeeks - taperWeeks

  // Calculate block configurations based on strategy
  // We use the recoveryRhythm (e.g. 4 for 3:1) to determine builds
  const mesocycleWeeks = recoveryRhythm

  let remainingWeeks = trainingWeeks
  const buildSegments = []

  // Split into segments based on strategy
  if (strategy === 'MAINTENANCE') {
    while (remainingWeeks > 0) {
      const duration = remainingWeeks >= mesocycleWeeks + 2 ? mesocycleWeeks : remainingWeeks
      buildSegments.push({ type: 'BASE', focus: 'SWEET_SPOT', weeks: duration })
      remainingWeeks -= duration
    }
  } else if (strategy === 'REVERSE') {
    // Reverse: Speed (BUILD) then Endurance (BASE)
    let buildPool = Math.floor(trainingWeeks * 0.4)
    let basePool = trainingWeeks - buildPool

    while (buildPool > 0) {
      const duration = buildPool >= mesocycleWeeks + 2 ? mesocycleWeeks : buildPool
      buildSegments.push({ type: 'BUILD', focus: buildFocus, weeks: duration })
      buildPool -= duration
    }
    while (basePool > 0) {
      const duration = basePool >= mesocycleWeeks + 2 ? mesocycleWeeks : basePool
      buildSegments.push({ type: 'BASE', focus: 'AEROBIC_ENDURANCE', weeks: duration })
      basePool -= duration
    }
  } else {
    // Standard LINEAR / POLARIZED / BLOCK
    let basePool = Math.floor(trainingWeeks * 0.6)
    let buildPool = trainingWeeks - basePool

    while (basePool > 0) {
      const duration = basePool >= mesocycleWeeks + 2 ? mesocycleWeeks : basePool
      buildSegments.push({
        type: 'BASE',
        focus: strategy === 'POLARIZED' ? 'AEROBIC_ENDURANCE' : 'SWEET_SPOT',
        weeks: duration
      })
      basePool -= duration
    }
    while (buildPool > 0) {
      const duration = buildPool >= mesocycleWeeks + 2 ? mesocycleWeeks : buildPool
      buildSegments.push({ type: 'BUILD', focus: buildFocus, weeks: duration })
      buildPool -= duration
    }
  }

  // 3. Assemble Chronologically
  const currentDate = new Date(startDate)
  let order = 1
  const counts: Record<string, number> = { BASE: 1, BUILD: 1, PEAK: 1 }

  for (const segment of buildSegments) {
    blocks.push({
      order: order++,
      name: `${segment.type === 'BASE' ? 'Base' : 'Build'} Phase ${counts[segment.type]++}`,
      type: segment.type,
      primaryFocus: segment.focus,
      startDate: new Date(currentDate),
      durationWeeks: segment.weeks,
      recoveryWeekIndex: segment.weeks >= 3 ? recoveryRhythm : null // Only recovery if block is long enough
    })
    currentDate.setUTCDate(currentDate.getUTCDate() + segment.weeks * 7)
  }

  // Final Peak & Taper
  blocks.push({
    order: order++,
    name: 'Peak & Taper',
    type: 'PEAK',
    primaryFocus: peakFocus,
    startDate: new Date(currentDate),
    durationWeeks: taperWeeks,
    recoveryWeekIndex: 2 // Taper week is always recovery
  })

  // 4. Clean up names
  const nameCounts: Record<string, number> = {}
  for (const b of blocks) {
    const baseName = b.name.replace(/ \d+$/, '')
    nameCounts[baseName] = (nameCounts[baseName] || 0) + 1
  }

  for (const b of blocks) {
    const baseName = b.name.replace(/ \d+$/, '')
    if (nameCounts[baseName] === 1) {
      b.name = baseName
    }
  }

  // 5. Tag blocks with events
  if (goal?.events && goal.events.length > 0) {
    for (const block of blocks) {
      const blockStart = block.startDate.getTime()
      const blockEnd = blockStart + block.durationWeeks * 7 * 24 * 60 * 60 * 1000

      const eventsInBlock = goal.events.filter((e: any) => {
        const eDate = new Date(e.date).getTime()
        return eDate >= blockStart && eDate < blockEnd
      })

      if (eventsInBlock.length > 0) {
        const eventNames = eventsInBlock.map((e: any) => e.title).join(', ')
        block.name += ` [Race: ${eventNames}]`
        if (block.type !== 'PEAK') {
          block.primaryFocus += '_WITH_RACE'
        }
      }
    }
  }

  return blocks
}
