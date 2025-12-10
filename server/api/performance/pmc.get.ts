import { defineEventHandler, getQuery, createError } from 'h3'
import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const days = parseInt(query.days as string) || 90

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get workouts with CTL/ATL data, ordered by date
  const workouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate
      },
      isDuplicate: false,
      OR: [
        { ctl: { not: null } },
        { atl: { not: null } },
        { tss: { not: null } }
      ]
    },
    select: {
      id: true,
      date: true,
      title: true,
      type: true,
      ctl: true,
      atl: true,
      tss: true,
      trainingLoad: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  // Calculate TSB (Training Stress Balance) = CTL - ATL
  const pmcData = workouts.map(workout => {
    const ctl = workout.ctl || 0
    const atl = workout.atl || 0
    const tsb = ctl - atl

    return {
      date: workout.date,
      ctl,
      atl,
      tsb,
      tss: workout.tss || workout.trainingLoad || 0,
      title: workout.title,
      type: workout.type
    }
  })

  // Calculate summary statistics
  const currentCTL = pmcData.length > 0 ? pmcData[pmcData.length - 1].ctl : 0
  const currentATL = pmcData.length > 0 ? pmcData[pmcData.length - 1].atl : 0
  const currentTSB = pmcData.length > 0 ? pmcData[pmcData.length - 1].tsb : 0
  
  // Get average TSS
  const totalTSS = pmcData.reduce((sum, d) => sum + d.tss, 0)
  const avgTSS = pmcData.length > 0 ? totalTSS / pmcData.length : 0

  return {
    data: pmcData,
    summary: {
      currentCTL: Math.round(currentCTL * 10) / 10,
      currentATL: Math.round(currentATL * 10) / 10,
      currentTSB: Math.round(currentTSB * 10) / 10,
      avgTSS: Math.round(avgTSS * 10) / 10,
      form: currentTSB >= 5 ? 'fresh' : currentTSB >= -10 ? 'optimal' : 'fatigued'
    }
  }
})