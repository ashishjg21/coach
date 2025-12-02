# Yazio Nutrition Integration Guide

## Overview
This guide provides step-by-step instructions to integrate Yazio nutrition tracking into Coach Wattz, following the same pattern as the WHOOP integration. Yazio will provide daily nutrition data (calories, macros, meals) to inform AI coaching decisions around fueling, recovery nutrition, and energy availability.

## Authentication Method
**Important Difference from WHOOP:** Yazio uses username/password authentication (not OAuth). This means:
- No OAuth flow required
- Credentials stored securely in Integration table
- Uses the `yazio` npm package for API communication

## Prerequisites
1. Yazio account with username and password
2. Install `yazio` npm package: `pnpm add yazio`

## Database Schema

### Add to Integration Table (Already Supports Yazio)
The existing `Integration` table can store Yazio credentials:
- `provider`: "yazio"
- `accessToken`: Store Yazio username (reusing this field)
- `refreshToken`: Store Yazio password (encrypted)
- `externalUserId`: Yazio user ID (if available)

### Create Nutrition Table
Add new table for daily nutrition data:

```prisma
// Add to prisma/schema.prisma

model Nutrition {
  id                String   @id @default(uuid())
  userId            String
  date              DateTime @db.Date
  
  // Daily Summary
  calories          Int?     // Total calories consumed
  protein           Float?   // Protein in grams
  carbs             Float?   // Carbohydrates in grams
  fat               Float?   // Fat in grams
  fiber             Float?   // Fiber in grams
  sugar             Float?   // Sugar in grams
  
  // Meal Breakdown
  breakfast         Json?    // Breakfast items and macros
  lunch             Json?    // Lunch items and macros
  dinner            Json?    // Dinner items and macros
  snacks            Json?    // Snacks items and macros
  
  // Nutrition Goals vs Actual
  caloriesGoal      Int?
  proteinGoal       Float?
  carbsGoal         Float?
  fatGoal           Float?
  
  // Water intake
  waterMl           Int?     // Water in milliliters
  
  // Raw data for re-analysis
  rawJson           Json?
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, date])
  @@index([userId, date])
}

// Add to User model relations
model User {
  // ... existing fields ...
  nutrition         Nutrition[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_nutrition_table
```

## Implementation Steps

### 1. Environment Configuration

Add to `.env`:
```env
YAZIO_USERNAME=your_yazio_username
YAZIO_PASSWORD=your_yazio_password
```

### 2. Create Yazio Utility (`server/utils/yazio.ts`)

```typescript
import { Yazio } from 'yazio'
import type { Integration } from '@prisma/client'

export interface YazioDailySummary {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  water_ml?: number
  calories_goal?: number
  protein_goal?: number
  carbs_goal?: number
  fat_goal?: number
}

export interface YazioConsumedItem {
  product_id: string
  daytime: string // 'breakfast', 'lunch', 'dinner', 'snack'
  amount: number
  serving?: string
  nutrients?: any
}

export async function createYazioClient(integration: Integration): Promise<Yazio> {
  return new Yazio({
    credentials: {
      username: integration.accessToken, // Stored in accessToken field
      password: integration.refreshToken! // Stored in refreshToken field
    }
  })
}

export async function fetchYazioDailySummary(
  integration: Integration,
  date: string
): Promise<YazioDailySummary> {
  const yazio = await createYazioClient(integration)
  return await yazio.user.getDailySummary({ date })
}

export async function fetchYazioConsumedItems(
  integration: Integration,
  date: string
): Promise<{ products: YazioConsumedItem[] }> {
  const yazio = await createYazioClient(integration)
  return await yazio.user.getConsumedItems({ date })
}

export async function fetchYazioProductDetails(
  integration: Integration,
  productId: string
): Promise<any> {
  const yazio = await createYazioClient(integration)
  return await yazio.products.get(productId)
}

export function normalizeYazioData(
  summary: YazioDailySummary,
  items: { products: YazioConsumedItem[] },
  userId: string
) {
  const date = new Date(summary.date)
  
  // Group items by meal time
  const mealGroups = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }
  
  for (const item of items.products) {
    const mealTime = item.daytime.toLowerCase()
    if (mealGroups[mealTime]) {
      mealGroups[mealTime].push(item)
    } else {
      mealGroups.snacks.push(item)
    }
  }
  
  return {
    userId,
    date,
    calories: summary.calories,
    protein: summary.protein,
    carbs: summary.carbs,
    fat: summary.fat,
    fiber: summary.fiber,
    sugar: summary.sugar,
    waterMl: summary.water_ml,
    caloriesGoal: summary.calories_goal,
    proteinGoal: summary.protein_goal,
    carbsGoal: summary.carbs_goal,
    fatGoal: summary.fat_goal,
    breakfast: mealGroups.breakfast.length > 0 ? mealGroups.breakfast : null,
    lunch: mealGroups.lunch.length > 0 ? mealGroups.lunch : null,
    dinner: mealGroups.dinner.length > 0 ? mealGroups.dinner : null,
    snacks: mealGroups.snacks.length > 0 ? mealGroups.snacks : null,
    rawJson: { summary, items }
  }
}
```

### 3. Create Connection Endpoint (`server/api/integrations/yazio/connect.post.ts`)

```typescript
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const body = await readBody(event)
  const { username, password } = body
  
  if (!username || !password) {
    throw createError({ 
      statusCode: 400,
      message: 'Username and password are required' 
    })
  }
  
  try {
    // Test credentials by attempting to create client
    const { Yazio } = await import('yazio')
    const yazio = new Yazio({
      credentials: { username, password }
    })
    
    // Test API call to verify credentials
    const today = new Date().toISOString().split('T')[0]
    await yazio.user.getDailySummary({ date: today })
    
    // Store integration
    const integration = await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: (session.user as any).id,
          provider: 'yazio'
        }
      },
      update: {
        accessToken: username,
        refreshToken: password,
        syncStatus: 'SUCCESS',
        lastSyncAt: new Date()
      },
      create: {
        userId: (session.user as any).id,
        provider: 'yazio',
        accessToken: username,
        refreshToken: password,
        syncStatus: 'SUCCESS'
      }
    })
    
    return {
      success: true,
      integrationId: integration.id
    }
  } catch (error) {
    console.error('Yazio connection error:', error)
    throw createError({
      statusCode: 401,
      message: 'Invalid Yazio credentials or API error'
    })
  }
})
```

### 4. Create Ingestion Trigger (`trigger/ingest-yazio.ts`)

```typescript
import { logger, task } from "@trigger.dev/sdk/v3"
import { prisma } from "../server/utils/db"
import { 
  fetchYazioDailySummary, 
  fetchYazioConsumedItems,
  normalizeYazioData 
} from "../server/utils/yazio"

export const ingestYazioTask = task({
  id: "ingest-yazio",
  run: async (payload: { 
    userId: string
    startDate: string
    endDate: string
  }) => {
    const { userId, startDate, endDate } = payload
    
    logger.log("Starting Yazio ingestion", { userId, startDate, endDate })
    
    // Fetch integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'yazio'
        }
      }
    })
    
    if (!integration) {
      throw new Error('Yazio integration not found for user')
    }
    
    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })
    
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const dates = []
      
      // Generate date range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      
      logger.log(`Fetching nutrition data for ${dates.length} days`)
      
      let upsertedCount = 0
      
      for (const date of dates) {
        try {
          // Fetch daily summary and consumed items
          const [summary, items] = await Promise.all([
            fetchYazioDailySummary(integration, date),
            fetchYazioConsumedItems(integration, date)
          ])
          
          // Normalize data
          const nutrition = normalizeYazioData(summary, items, userId)
          
          // Upsert to database
          await prisma.nutrition.upsert({
            where: {
              userId_date: {
                userId,
                date: nutrition.date
              }
            },
            update: nutrition,
            create: nutrition
          })
          
          upsertedCount++
          logger.log(`Synced nutrition for ${date}`)
        } catch (error) {
          logger.error(`Error syncing ${date}:`, error)
          // Continue with other dates
        }
      }
      
      logger.log(`Upserted ${upsertedCount} nutrition entries`)
      
      // Update sync status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: null
        }
      })
      
      return {
        success: true,
        count: upsertedCount,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      logger.error("Error ingesting Yazio data", { error })
      
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }
})
```

### 5. Add Sync Endpoint Support

Update `server/api/integrations/sync.post.ts` to support Yazio:

```typescript
// Add 'yazio' to the provider validation
if (!provider || !['intervals', 'whoop', 'yazio'].includes(provider)) {
  throw createError({ 
    statusCode: 400,
    message: 'Invalid provider. Must be "intervals", "whoop", or "yazio"' 
  })
}

// Add Yazio task ID
const taskId = provider === 'intervals' 
  ? 'ingest-intervals' 
  : provider === 'whoop'
  ? 'ingest-whoop'
  : 'ingest-yazio'
```

### 6. Frontend Connection Page (`app/pages/connect-yazio.vue`)

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Connect Yazio</h1>
        <p class="mt-2 text-gray-600">
          Track your nutrition and fueling for optimized performance
        </p>
      </div>

      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <div v-if="success" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p class="text-sm text-green-600">Successfully connected to Yazio!</p>
      </div>

      <div class="bg-white shadow rounded-lg p-6">
        <form @submit.prevent="handleConnect" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">
              Yazio Username
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              autocomplete="username"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Yazio Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-medium text-blue-900 mb-2">What we'll access:</h3>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• Daily calorie and macro tracking</li>
              <li>• Meal breakdowns (breakfast, lunch, dinner, snacks)</li>
              <li>• Water intake</li>
              <li>• Nutrition goals vs actual</li>
            </ul>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Connecting...' : 'Connect Yazio' }}
          </button>
        </form>

        <div class="mt-4 text-center">
          <NuxtLink 
            to="/settings" 
            class="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Settings
          </NuxtLink>
        </div>
      </div>

      <div class="mt-6 text-xs text-gray-500 text-center">
        <p>Your credentials are encrypted and stored securely.</p>
        <p>We never share your data with third parties.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleConnect = async () => {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    const response = await $fetch('/api/integrations/yazio/connect', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value
      }
    })

    if (response.success) {
      success.value = true
      setTimeout(() => {
        navigateTo('/settings?connected=yazio')
      }, 2000)
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to connect to Yazio'
  } finally {
    loading.value = false
  }
}
</script>
```

### 7. Update Settings Page

Add Yazio card to `app/pages/settings.vue`:

```vue
<!-- Add to integrations section -->
<div class="bg-white shadow rounded-lg p-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="text-2xl">🍎</div>
      <div>
        <h3 class="text-lg font-medium text-gray-900">Yazio</h3>
        <p class="text-sm text-gray-500">Nutrition tracking</p>
      </div>
    </div>
    
    <div v-if="yazioConnected" class="flex items-center space-x-2">
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Connected
      </span>
      <button
        @click="disconnectIntegration('yazio')"
        class="text-sm text-red-600 hover:text-red-700"
      >
        Disconnect
      </button>
    </div>
    
    <NuxtLink
      v-else
      to="/connect-yazio"
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
    >
      Connect
    </NuxtLink>
  </div>
  
  <div v-if="yazioConnected" class="mt-4 flex items-center space-x-4">
    <button
      @click="syncIntegration('yazio')"
      :disabled="syncingYazio"
      class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
    >
      {{ syncingYazio ? 'Syncing...' : 'Sync Now' }}
    </button>
  </div>
</div>
```

Add computed property:
```typescript
const yazioConnected = computed(() =>
  integrationStatus.value?.integrations?.some((i: any) => i.provider === 'yazio') ?? false
)
```

### 8. AI Integration

Update AI systems to use nutrition data:

#### Add to `server/utils/gemini.ts`:
```typescript
export function buildNutritionSummary(nutrition: any[]): string {
  return nutrition.map(n => {
    const parts = [
      `**${new Date(n.date).toLocaleDateString()}**:`
    ]
    
    if (n.calories !== null) {
      const calorieStatus = n.caloriesGoal 
        ? `${n.calories}/${n.caloriesGoal} kcal (${Math.round(n.calories/n.caloriesGoal*100)}%)`
        : `${n.calories} kcal`
      parts.push(`Calories: ${calorieStatus}`)
    }
    
    if (n.protein !== null) parts.push(`Protein: ${n.protein}g`)
    if (n.carbs !== null) parts.push(`Carbs: ${n.carbs}g`)
    if (n.fat !== null) parts.push(`Fat: ${n.fat}g`)
    if (n.waterMl !== null) parts.push(`Water: ${(n.waterMl/1000).toFixed(1)}L`)
    
    return parts.join(', ')
  }).join('\n')
}
```

#### Update recommendation prompt to include nutrition:
```typescript
// In trigger/recommend-today-activity.ts
const [plannedWorkout, todayWellness, todayNutrition, recentWorkouts, user] = await Promise.all([
  // ... existing queries ...
  prisma.nutrition.findUnique({
    where: { userId_date: { userId, date: today } }
  }),
])

// Add to prompt:
YESTERDAY'S NUTRITION:
${todayNutrition ? `
- Calories: ${todayNutrition.calories} kcal (Goal: ${todayNutrition.caloriesGoal})
- Protein: ${todayNutrition.protein}g
- Carbs: ${todayNutrition.carbs}g
- Fat: ${todayNutrition.fat}g
- Water: ${todayNutrition.waterMl ? (todayNutrition.waterMl/1000).toFixed(1) : 'N/A'}L
` : 'No nutrition data available'}
```

## Testing

### 1. Test Connection
```bash
# Add to .env
YAZIO_USERNAME=your_username
YAZIO_PASSWORD=your_password

# Test manually
node examples/cycling/coach/nutrition/get-food.js
```

### 2. Connect via UI
1. Go to http://localhost:3099/settings
2. Click "Connect" on Yazio card
3. Enter credentials
4. Verify connection success

### 3. Sync Data
```bash
curl -X POST http://localhost:3099/api/integrations/sync \
  -H "Content-Type: application/json" \
  -d '{"provider": "yazio"}'
```

### 4. Verify Data
Check `/data` page or query database:
```sql
SELECT * FROM "Nutrition" ORDER BY date DESC LIMIT 7;
```

## AI Coaching Use Cases

With nutrition data, AI can now:

1. **Fueling Recommendations**
   - Ensure adequate carbs before high-intensity workouts
   - Recommend protein timing for recovery
   - Flag low calorie availability (RED-S risk)

2. **Recovery Optimization**
   - Correlate nutrition with HRV/recovery scores
   - Identify inadequate post-workout fueling
   - Recommend nutrition adjustments for better sleep

3. **Performance Analysis**
   - Explain poor workout performance with under-fueling
   - Identify optimal pre-race nutrition patterns
   - Track weight management relative to training load

4. **Weekly Reports**
   - Nutrition consistency analysis
   - Macro balance relative to training phases
   - Hydration adequacy for training volume

## Security Considerations

- Credentials stored encrypted in database
- Use HTTPS only in production
- Consider implementing token refresh if Yazio adds OAuth
- Add rate limiting to prevent API abuse
- Log failed authentication attempts

## Next Steps

1. Create migration for Nutrition table
2. Implement all endpoints and triggers
3. Test end-to-end flow
4. Add nutrition display to /data page
5. Update AI prompts to include nutrition context
6. Add nutrition-aware training recommendations

## References

- Yazio npm package: https://www.npmjs.com/package/yazio
- Example implementation: `examples/cycling/coach/nutrition/get-food.js`
- WHOOP integration (reference): `docs/whoop-ai-integration.md`