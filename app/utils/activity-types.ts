export const WORKOUT_ICONS: Record<string, string> = {
  Ride: 'i-tabler-bike',
  VirtualRide: 'i-tabler-device-laptop',
  MountainBikeRide: 'i-tabler-bike',
  GravelRide: 'i-tabler-bike',
  Run: 'i-tabler-run',
  VirtualRun: 'i-tabler-device-laptop',
  TrailRun: 'i-tabler-run',
  Swim: 'i-tabler-swimming',
  Gym: 'i-tabler-barbell',
  WeightTraining: 'i-tabler-barbell',
  Rest: 'i-tabler-zzz',
  'Active Recovery': 'i-tabler-recharging',
  Walk: 'i-tabler-walk',
  Hike: 'i-tabler-mountain',
  Yoga: 'i-tabler-yoga'
}

export const WORKOUT_COLORS: Record<string, string> = {
  Ride: 'text-green-500',
  VirtualRide: 'text-green-500',
  MountainBikeRide: 'text-green-600',
  GravelRide: 'text-green-600',
  Run: 'text-orange-500',
  VirtualRun: 'text-orange-500',
  TrailRun: 'text-orange-600',
  Swim: 'text-cyan-500',
  Gym: 'text-purple-500',
  WeightTraining: 'text-purple-500',
  Rest: 'text-gray-400',
  'Active Recovery': 'text-blue-400',
  Walk: 'text-teal-500',
  Hike: 'text-emerald-600',
  Yoga: 'text-rose-500'
}

export const WORKOUT_BORDER_COLORS: Record<string, string> = {
  Ride: 'border-green-500',
  VirtualRide: 'border-green-500',
  MountainBikeRide: 'border-green-600',
  GravelRide: 'border-green-600',
  Run: 'border-orange-500',
  VirtualRun: 'border-orange-500',
  TrailRun: 'border-orange-600',
  Swim: 'border-cyan-500',
  Gym: 'border-purple-500',
  WeightTraining: 'border-purple-500',
  Rest: 'border-gray-200 dark:border-gray-700',
  'Active Recovery': 'border-blue-400',
  Walk: 'border-teal-500',
  Hike: 'border-emerald-600',
  Yoga: 'border-rose-500'
}

export function getWorkoutIcon(type: string): string {
  return WORKOUT_ICONS[type] || 'i-heroicons-question-mark-circle'
}

export function getWorkoutColorClass(type: string): string {
  return WORKOUT_COLORS[type] || 'text-gray-400'
}

export function getWorkoutBorderColorClass(type: string): string {
  return WORKOUT_BORDER_COLORS[type] || 'border-gray-200'
}
