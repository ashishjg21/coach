# Fitbit Integration Documentation

## Overview

The Fitbit integration syncs nutrition history and food logs from Fitbit into the local database. It mirrors the Yazio nutrition ingestion flow but uses Fitbit OAuth and Web API endpoints.

## Data Flow

1. **Trigger**: User connects Fitbit via OAuth (`/api/integrations/fitbit/authorize`).
2. **API Handler**: `/api/integrations/sync` triggers the ingestion task for Fitbit.
3. **Background Task**: `trigger/ingest-fitbit.ts` processes each day in the date range.
4. **Data Fetching**: `server/utils/fitbit.ts` calls Fitbit Web API nutrition endpoints.
5. **Normalization**: Data is transformed to match our `Nutrition` schema.
6. **Storage**: Records are upserted into `Nutrition` table.

## API Endpoints Used

- **Food Log**: `GET /1/user/-/foods/log/date/{date}.json`
- **Water Log**: `GET /1/user/-/foods/log/water/date/{date}.json`
- **Food Goals**: `GET /1/user/-/foods/log/goal.json`

Scope required: `nutrition`.

## Date Range

- Fitbit uses the same sync date range as other providers. Default sync window is 7 days.
- Dates are generated in UTC from the user’s local day boundaries (see `server/utils/date.ts`).

## Data Mapping

| Database Field | Fitbit Source | Notes |
| --- | --- | --- |
| `date` | Date parameter | Stored as UTC date at midnight |
| `calories` | `summary.calories` | Daily total calories |
| `protein` | `summary.protein` | Grams |
| `carbs` | `summary.carbs` | Grams |
| `fat` | `summary.fat` | Grams |
| `fiber` | `summary.fiber` | Grams |
| `sugar` | `summary.sugar` | Grams (optional) |
| `waterMl` | `waterLog.summary.water` | Stored as numeric total |
| `caloriesGoal` | `foodGoals.goals.calories` | Daily calorie target |
| `breakfast/lunch/dinner/snacks` | `foods[]` | Grouped by `mealTypeId` (defaults to snacks) |

## Notes

- If a day has no food logs, calories, or water entries, it is skipped.
- Recent days (today and last 2 days) are always re-synced to capture late entries.
- Older days are skipped if existing nutrition entries already exist.
