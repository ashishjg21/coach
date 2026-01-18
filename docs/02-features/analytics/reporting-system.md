# Flexible Reporting System

The Flexible Reporting System is a template-driven architecture that allows Coach Watts to generate various types of AI-powered analysis reports without hardcoded logic for each type. It supports both system-defined standard reports (like "Weekly Analysis") and future user-defined custom templates.

## Architecture Overview

The system moves away from hardcoded report types to a configuration-based approach:

1.  **ReportTemplate**: A database model defining _what_ data to fetch and _how_ to process it.
2.  **Unified Trigger**: A single Trigger.dev task (`generate-report`) that executes any template.
3.  **Report Engine**: A utility layer that handles dynamic data fetching and prompt rendering.
4.  **Dynamic UI**: The frontend fetches available templates and renders them as options.

---

## Database Schema

### `ReportTemplate`

The core definition of a report type.

| Field | Type | Description |
|Data Source| `sources` | List of data fetch definitions |
|Prompt| `promptTemplate` | Handlebars-style prompt string |
|Schema| `schema` | JSON Schema for structured AI output |

```prisma
model ReportTemplate {
  id          String   @id @default(uuid())
  userId      String?  // Null for system templates, set for user custom templates
  name        String   // Display name (e.g., "Race Prep Strategy")
  description String?
  icon        String?  // UI Icon (e.g., "i-heroicons-trophy")
  isSystem    Boolean  @default(false)

  inputConfig  Json    // Rules for data fetching
  outputConfig Json    // Prompt template and JSON schema
}
```

### `Report`

Stores the generated result and links back to the template used.

```prisma
model Report {
  id           String          @id @default(uuid())
  templateId   String?
  template     ReportTemplate? @relation(...)

  status       String          // PENDING, PROCESSING, COMPLETED, FAILED
  analysisJson Json?           // The structured AI output
  markdown     String?         // Text fallback
}
```

---

## Configuration Structure

### Input Configuration (`inputConfig`)

Defines what context data to fetch for the LLM.

```json
{
  "sources": [
    {
      "entity": "workout",
      "key": "workouts",
      "range": { "type": "days", "value": 7 },
      "filter": { "type": ["Ride", "Run"] }
    },
    {
      "entity": "wellness",
      "key": "metrics",
      "range": { "type": "days", "value": 7 }
    }
  ]
}
```

**Supported Entities:**

- `workout`: Fetches training sessions. Supports `limit`, `orderBy`, `filter.type`.
- `wellness`: Fetches sleep/recovery data.
- `nutrition`: Fetches caloric/macro data.
- `sport_settings`: Fetches user zones (HR/Power).
- `goal`: Fetches active user goals.

### Output Configuration (`outputConfig`)

Defines how to prompt the AI and structure the response.

```json
{
  "promptTemplate": "You are a coach... Analyze these workouts: {{workouts_summary}}...",
  "schema": {
    "type": "object",
    "properties": {
      "executive_summary": { "type": "string" },
      "scores": { ... }
    }
  }
}
```

**Prompt Variables:**
The Report Engine automatically injects summaries and raw data into the prompt context based on the `key` defined in `inputConfig`:

- `{{workouts_summary}}`: Auto-generated markdown summary of workouts.
- `{{user.ftp}}`: User profile data.
- `{{persona}}`: The user's selected AI persona.

---

## Unified Execution Flow

1.  **User Action**: User selects a template from the "New Report" modal.
2.  **API Call**: `POST /api/reports/generate` with `templateId`.
3.  **Job Trigger**: The API triggers the `generate-report` task.
4.  **Execution (Report Engine)**:
    - Fetches the `ReportTemplate`.
    - **Fetch Context**: Iterates `inputConfig.sources` and queries the database (Repository Pattern).
    - **Render Prompt**: Replaces `{{placeholders}}` in `promptTemplate` with fetched data.
    - **AI Generation**: Calls Gemini with the rendered prompt and `outputConfig.schema`.
5.  **Completion**: Updates the `Report` record with the JSON result and Markdown fallback.

---

## Adding New Templates

### System Templates

System templates are managed via the CLI to ensure consistency across environments.

1.  Edit `cli/backfill/report-templates.ts`.
2.  Add a new `upsert` block with the Template definition.
3.  Run the seed command:
    ```bash
    pnpm cw:cli backfill report-templates
    ```

### Custom Templates (Future)

The database structure supports users creating their own templates via the UI. A future "Template Builder" feature would simply insert rows into `ReportTemplate` with `userId` set, and the existing engine would handle them immediately.
