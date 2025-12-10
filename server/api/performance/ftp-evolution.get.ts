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
  const months = parseInt(query.months as string) || 12

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
  startDate.setMonth(startDate.getMonth() - months)

  // Get workouts with FTP data, ordered by date
  const workouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate
      },
      isDuplicate: false,
      ftp: {
        not: null
      }
    },
    select: {
      id: true,
      date: true,
      title: true,
      type: true,
      ftp: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  // Group by month and get the last FTP value for each month
  const ftpByMonth = new Map<string, { date: Date; ftp: number; title: string }>()
  
  workouts.forEach(workout => {
    if (!workout.ftp) return
    
    const monthKey = new Date(workout.date).toISOString().slice(0, 7) // YYYY-MM
    const existing = ftpByMonth.get(monthKey)
    
    // Keep the most recent FTP value for each month
    if (!existing || new Date(workout.date) > existing.date) {
      ftpByMonth.set(monthKey, {
        date: new Date(workout.date),
        ftp: workout.ftp,
        title: workout.title
      })
    }
  })

  // Convert to array and sort by date
  const ftpData = Array.from(ftpByMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(item => ({
      date: item.date,
      month: item.date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      ftp: item.ftp,
      title: item.title
    }))

  // Calculate statistics
  const currentFTP = user.ftp || (ftpData.length > 0 ? ftpData[ftpData.length - 1].ftp : null)
  const startingFTP = ftpData.length > 0 ? ftpData[0].ftp : null
  const peakFTP = ftpData.length > 0 ? Math.max(...ftpData.map(d => d.ftp)) : null
  const improvement = startingFTP && currentFTP ? ((currentFTP - startingFTP) / startingFTP * 100) : null

  return {
    data: ftpData,
    summary: {
      currentFTP,
      startingFTP,
      peakFTP,
      improvement: improvement ? Math.round(improvement * 10) / 10 : null,
      dataPoints: ftpData.length
    }
  }
})