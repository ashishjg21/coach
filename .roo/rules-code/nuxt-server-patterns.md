# Nuxt Server Patterns & Best Practices

## Auto-Imports in Server Routes

Nuxt 3 automatically imports utilities exported from the `server/utils` directory into all API routes (`server/api/...`).

### Rule
**Do NOT manually import files from `server/utils` using relative paths.**

**❌ Bad:**
```typescript
// server/api/workouts/index.get.ts
import { prisma } from '../../utils/db' // causes resolution errors
import { formatData } from '../../utils/format'

export default defineEventHandler(async (event) => {
  return prisma.workout.findMany()
})
```

**✅ Good:**
```typescript
// server/api/workouts/index.get.ts
// prisma and formatData are available globally
export default defineEventHandler(async (event) => {
  return prisma.workout.findMany()
})
```

## Prisma Client Management

When using Prisma in a long-running server (like Nuxt dev server), we use a singleton pattern to prevent connection exhaustion. However, this can lead to stale clients during development.

### Schema Changes
When you modify `prisma/schema.prisma` and run `prisma migrate` or `prisma db push`:

1.  **Regenerate Client**: You MUST run `npx prisma generate` to update the generated client code in `node_modules`.
2.  **Restart/Invalidate**: The running dev server might hold onto the *old* client instance in memory.
    *   If you see errors like `Unknown argument` for a new field you just added, the server is using the old client.
    *   **Action**: You may need to trigger a server restart or (if you cannot restart) modify the `server/utils/db.ts` file (e.g., changing the global variable name) to force a new client instantiation.
