# Feature Spec: Coach Memory

## User Experience

Coach Watts should feel like a human coach who learns about the athlete over time. This feature enables "persistent awareness" across all chat rooms.

### Examples of "Learned" Information:

- **Injuries**: "I'm still nursing that slight IT band issue on the right side."
- **Preferences**: "I'm a morning person, I rarely train after 6 PM."
- **Gear**: "I'm currently using my gravel bike for all my zone 2 rides."
- **Psychology**: "I respond well to tough love, don't go easy on me."

## Proposed Chat Tools

### 1. `save_user_fact`

Allows the agent to commit a piece of information to long-term memory.

- **Arguments**: `content` (string), `category` (FactCategory), `importance` (integer).
- **Agent Instruction**: Use this when the user shares durable information about their life, body, or training style that isn't already captured in their profile metrics.

### 2. `update_user_fact`

Allows the agent to correct or update an existing memory.

- **Arguments**: `fact_id` (string), `content` (string).
- **Example**: Changing "User is recovering from a cold" to "User has fully recovered from their cold."

### 3. `forget_user_fact`

Allows the agent to remove a memory that is no longer true or relevant.

- **Arguments**: `fact_id` (string), `reason` (string).

### 4. `search_user_memory` (Optional/Phase 2)

If the prompt injection becomes too large, the agent can explicitly search for information.

- **Arguments**: `query` (string).

## Privacy & Transparency

### The "Coach's Notes" UI

Users can manage their long-term memories in **Settings > AI Coach**.

#### 1. Entry Point

- **Location**: `/settings/ai` inside the "Identity & Context" card.
- **UI**: A list item or row with the text "Coach's Knowledge Base".
- **Action**: A button "Manage 12 Memories" (dynamic count) that opens the modal.

#### 2. Management Modal (`MemoryManagementModal.vue`)

- **Responsive Layout Strategy**:
  - **Desktop (>768px)**: Uses a `UTable` with columns for Category, Content, and Actions.
  - **Mobile (<768px)**: Hides the table and renders a vertical list of cards. Each card uses a `UCard` or a simple div with:
    - Top row: Category badge + Importance stars.
    - Middle: Full content text.
    - Bottom: "Edit" and "Delete" ghost buttons.
- **Search & Filter**:
  - A persistent search bar at the top of the modal.
  - Category filter (e.g., "Show only Injuries").

#### 3. State Management

- **Optimistic Updates**: When a user deletes a memory, it should disappear immediately from the UI before the API call finishes.
- **Loading States**: Skeletons for the table/cards while initial data is fetching.
- **Confirmation**: A `UModal` confirmation for "Delete Memory" to prevent accidental data loss.

#### 4. Inline Editing

- Clicking a memory in the list opens a secondary `USlideover` or small modal for editing.
- **Validation**: Minimum 5 characters for content to avoid useless memories like "Bike".

## Guardrails

1. **No Sensitive Data**: The agent should be instructed NOT to store passwords, financial data, or highly sensitive personal info (non-fitness related).
2. **Fact vs. Opinion**: Distinguish between "User says they are tired" (transient, shouldn't be a Fact) and "User has chronic fatigue issues in the winter" (durable, should be a Fact).
3. **Redundancy**: Don't store facts that are already in the User Profile (e.g., FTP, Weight).
4. **Validation**: All manual edits via the UI should trigger a background "refresh" of the AI's current context if a chat is active.
