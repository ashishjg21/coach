import { prisma } from './db'
import { userRepository } from './repositories/userRepository'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'
import { calculatePowerZones, calculateHrZones } from './zones'
import { roundToTwoDecimals } from './number'

export const athleteMetricsService = {
  /**
   * Update athlete metrics (FTP, Weight, Max HR) and automatically recalculate zones.
   * Updates both the global User record and the Default Sport Profile.
   */
  async updateMetrics(
    userId: string,
    metrics: {
      ftp?: number | null
      weight?: number | null
      maxHr?: number | null
      lthr?: number | null
      date?: Date
    }
  ) {
    const user = await userRepository.getById(userId)
    if (!user) throw new Error('User not found')

    const userUpdateData: any = {}
    const sportUpdateData: any = {}

    // 1. Prepare User Update (Basic/Global fields)
    if (metrics.ftp !== undefined) userUpdateData.ftp = metrics.ftp
    if (metrics.weight !== undefined && metrics.weight !== null)
      userUpdateData.weight = roundToTwoDecimals(metrics.weight)
    else if (metrics.weight !== undefined) userUpdateData.weight = metrics.weight
    if (metrics.maxHr !== undefined) userUpdateData.maxHr = metrics.maxHr
    if (metrics.lthr !== undefined) userUpdateData.lthr = metrics.lthr

    // 2. Prepare Sport Profile Update (for Default profile)
    if (metrics.ftp !== undefined) sportUpdateData.ftp = metrics.ftp
    if (metrics.maxHr !== undefined) sportUpdateData.maxHr = metrics.maxHr
    if (metrics.lthr !== undefined) sportUpdateData.lthr = metrics.lthr

    // 3. Recalculate Zones for Default Profile
    const ftp = metrics.ftp ?? user.ftp
    const maxHr = metrics.maxHr ?? user.maxHr
    const lthr = metrics.lthr ?? user.lthr

    if (ftp) {
      sportUpdateData.powerZones = calculatePowerZones(ftp)
    }

    if (maxHr || lthr) {
      const activeLthr = lthr || (maxHr ? Math.round(maxHr * 0.9) : null)
      sportUpdateData.hrZones = calculateHrZones(activeLthr, maxHr)
    }

    // 4. Persist Updates
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: userUpdateData
    })

    // Update Default Sport Profile
    const defaultProfile = await sportSettingsRepository.getDefault(userId)
    if (defaultProfile) {
      await prisma.sportSettings.update({
        where: { id: defaultProfile.id },
        data: sportUpdateData
      })
    }

    // 5. Weight History
    if (metrics.weight !== undefined && metrics.weight !== null) {
      const effectiveDate = metrics.date || new Date()
      const dateOnly = new Date(effectiveDate)
      dateOnly.setUTCHours(0, 0, 0, 0)
      const roundedWeight = roundToTwoDecimals(metrics.weight)

      try {
        await prisma.wellness.upsert({
          where: { userId_date: { userId, date: dateOnly } },
          create: { userId, date: dateOnly, weight: roundedWeight },
          update: { weight: roundedWeight }
        })
      } catch (e) {
        console.error(`[MetricsService] Failed to log weight history:`, e)
      }
    }

    return updatedUser
  },

  /**
   * Get the current effective zones for an athlete from the Default profile.
   */
  async getCurrentZones(userId: string) {
    const defaultProfile = await sportSettingsRepository.getDefault(userId)
    if (!defaultProfile) {
      // Fallback to legacy User zones if default profile somehow missing
      const user = await userRepository.getById(userId)
      return {
        power: user?.powerZones || [],
        hr: user?.hrZones || []
      }
    }

    return {
      power: defaultProfile.powerZones || [],
      hr: defaultProfile.hrZones || []
    }
  }
}
