# Architectural Spec: Cross-Chat Memory System (UserFacts)

## Overview

Currently, Coach Watts has a "short-term memory" limited to the current chat session and a "structural memory" derived from the database (profile, workouts, wellness). However, qualitative information (e.g., "My left knee hurts when I go over 90rpm", "I prefer high-intensity intervals in the morning") is lost between sessions.

The **Cross-Chat Memory System** introduces a persistent "long-term memory" layer allowing the AI to store and retrieve qualitative facts about the user.

## Data Model (Proposed)

### `UserFact`

A new Prisma model to store atomic pieces of information with vector support.

```prisma
model UserFact {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  content     String
  category    FactCategory @default(PREFERENCE)

  // Semantic Vector (for pgvector)
  embedding   Unsupported("vector(1536)")?

  importance  Int      @default(3)
  verified    Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@index([userId])
}
```

## System Flow: Personal RAG

### 1. The "Memory Creation" (Indexing)

When the agent calls `save_user_fact`:

1. The backend generates a vector embedding for the `content` (using `text-embedding-3-small` or similar).
2. The fact and its embedding are stored in Postgres.

### 2. The "Contextual Retrieval" (The RAG Part)

When a user sends a message:

1. **Query Embedding**: The user's message is converted into a vector.
2. **Similarity Search**: We query the database for the Top 5-10 `UserFacts` that are semantically closest to the message.
3. **Thresholding**: We only include facts with a similarity score > 0.7.
4. **Prompt Augmentation**: These facts are injected into the "Long-Term Memory" section of the prompt.

## API Endpoints

### `GET /api/profile/memory`

- **Description**: Returns a paginated list of `UserFacts` for management.
- **Includes**: ID, content, category, importance.

### `POST /api/profile/memory`

- **Description**: Manual creation. Automatically triggers the embedding generation.

### `PATCH /api/profile/memory/:id`

- **Description**: Updates content. Re-generates embedding if content changes.

### `DELETE /api/profile/memory/:id`

- **Description**: Permanent removal.

## Technical Considerations

- **Postgres + pgvector**: We will use the `pgvector` extension (already common in Nuxt/Supabase/Vercel stacks).
- **Token Efficiency**: Instead of dumping ALL facts, we only provide what is relevant to the _current_ query.
- **Cache Invalidation**: Manual edits in /settings/ai will refresh the embedding.
