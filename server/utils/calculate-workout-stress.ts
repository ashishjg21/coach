/**
 * Helper to calculate and update CTL/ATL for new workouts
 * This ensures training stress metrics are always up-to-date
 */

import { prisma } from './db'
import { calculateCTL, calculateATL, getStressScore } from './training-stress'

/**
 * Calculate and update CTL/ATL for a new or updated workout
 * Should be called after a workout is created/updated
 */
export async function calculateWorkoutStress(
  workoutId: string,
  userId: string
): Promise<{ ctl: number; atl: number }> {
  // Get the workout
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      id: true,
      date: true,
      tss: true,
      trimp: true,
      ctl: true,
      atl: true
    }
  })

  if (!workout) {
    throw new Error(`Workout ${workoutId} not found`)
  }

  // If workout already has CTL/ATL (e.g., from Intervals.icu), use those
  if (workout.ctl !== null && workout.atl !== null) {
    return { ctl: workout.ctl, atl: workout.atl }
  }

  // Get the previous workout's CTL/ATL (chronologically before this one)
  const previousWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      date: { lt: workout.date },
      isDuplicate: false,
      OR: [
        { ctl: { not: null } },
        { atl: { not: null } }
      ]
    },
    orderBy: { date: 'desc' },
    select: { ctl: true, atl: true }
  })

  // Get initial values (0 if no previous workout)
  const previousCTL = previousWorkout?.ctl ?? 0
  const previousATL = previousWorkout?.atl ?? 0

  // Calculate stress score
  const tss = getStressScore(workout)

  // Calculate new CTL and ATL
  const ctl = calculateCTL(previousCTL, tss)
  const atl = calculateATL(previousATL, tss)

  // Update the workout
  await prisma.workout.update({
    where: { id: workoutId },
    data: { ctl, atl }
  })

  return { ctl, atl }
}

/**
 * Recalculate CTL/ATL for all workouts after a specific date
 * Useful when a workout is deleted or modified
 */
export async function recalculateStressAfterDate(
  userId: string,
  afterDate: Date
): Promise<number> {
  // Get the CTL/ATL just before the affected date
  const lastGoodWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      date: { lt: afterDate },
      isDuplicate: false
    },
    orderBy: { date: 'desc' },
    select: { ctl: true, atl: true }
  })

  let ctl = lastGoodWorkout?.ctl ?? 0
  let atl = lastGoodWorkout?.atl ?? 0

  // Get all workouts from the affected date onwards
  const workoutsToUpdate = await prisma.workout.findMany({
    where: {
      userId,
      date: { gte: afterDate },
      isDuplicate: false
    },
    orderBy: { date: 'asc' }
  })

  // Recalculate each workout
  for (const workout of workoutsToUpdate) {
    const tss = getStressScore(workout)
    ctl = calculateCTL(ctl, tss)
    atl = calculateATL(atl, tss)

    await prisma.workout.update({
      where: { id: workout.id },
      data: { ctl, atl }
    })
  }

  return workoutsToUpdate.length
}