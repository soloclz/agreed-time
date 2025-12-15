# Architecture Decision Records (ADR)

## ADR-001: Atomic Time Slots Database Schema

*   **Status**: Accepted
*   **Date**: 2025-12-09
*   **Context**: We needed a way to store event time slots and user availability. Options included Bitmasks, Global Time Tables, and Normalized (Atomic) Rows.
*   **Decision**: We chose **Normalized (Atomic) Rows**.
    *   `time_slots` table stores individual slots linked to an `event_id`.
    *   `availability` table links `user` to `time_slot_id`.
*   **Consequences**:
    *   (+) High flexibility for custom event intervals.
    *   (+) Simple SQL queries for aggregation (`GROUP BY time_slot_id`).
    *   (+) "Cascade Delete" easily cleans up data.
    *   (-) Higher row count, but within safe limits for PostgreSQL (estimated capacity: ~10k concurrent events without issues).

## ADR-002: Frontend Grid Display Logic

*   **Status**: Accepted
*   **Date**: 2025-12-09
*   **Context**: Displaying a grid that only contains "available" slots can look broken (e.g., a single row for a 1-hour event). Displaying 24 hours is wasteful on mobile.
*   **Decision**: Implement **"Business Hours + Auto-expand"** logic.
    *   Base range: 09:00 - 18:00.
    *   Expansion: If slots exist < 09:00 or > 18:00, the grid expands to include them.
*   **Consequences**:
    *   (+) Consistent visual context for most events.
    *   (+) edge cases (early morning/late night) are supported dynamically.

## ADR-003: Routing Strategy for Privilege Separation

*   **Status**: Accepted
*   **Date**: 2025-12-09
*   **Context**: Distinction between Organizer (Admin) and Participant is handled via Token URLs.
*   **Decision**:
    *   `/manage/[organizer_token]`: **Admin**. Full control.
    *   `/event/[public_token]`: **Participant**. Vote/Availability input.
    *   `/event/[public_token]/result`: **Public Read-only**. View aggregated heatmap.
*   **Consequences**:
    *   (+) Prevents accidental sharing of admin rights.
    *   (+) Clear separation of concerns in frontend components.

## ADR-004: Frontend Rendering Strategy (Static to SSR)

*   **Status**: Accepted
*   **Date**: 2025-12-09
*   **Context**: Initially aimed for a purely static Astro site. However, dynamic routes like `/event/[public_token]` and `/manage/[organizer_token]` require dynamic content generation at request time (SSR) because event tokens are unpredictable and cannot be pre-generated via `getStaticPaths`.
*   **Decision**: Transitioned Astro's output mode from `static` to `server` (SSR).
    *   Installed `@astrojs/vercel` adapter (or `@astrojs/node` for generic Node.js environment).
    *   Configured `output: 'server'` in `astro.config.mjs`.
*   **Consequences**:
    *   (+) Enables dynamic routes to function correctly by rendering pages on demand.
    *   (+) Supports server-side data fetching for initial page load, improving perceived performance and SEO for dynamic content.
    *   (-) Requires a server environment (e.g., Vercel's Edge Functions, Node.js server) for deployment, moving away from purely static hosting.

## ADR-005: Custom Notification and Dialog System

*   **Status**: Accepted
*   **Date**: 2025-12-09
*   **Context**: Native browser `alert()` and `confirm()` calls lead to poor user experience (inconsistent styling, blocking nature, showing domain name). A more polished and consistent UI feedback mechanism is needed.
*   **Decision**: Implement a custom notification and dialog system using `react-hot-toast` and a custom Tailwind CSS modal.
    *   `react-hot-toast` for all non-blocking messages (e.g., "Link copied!", "Event created successfully!").
    *   A custom Tailwind CSS modal for blocking confirmations (e.g., "Confirm Close Event").
*   **Consequences**:
    *   (+) Significantly improved user experience with visually consistent and non-blocking (for toasts) feedback.
    *   (+) Aligns UI with brand styling, avoiding "browser says" popups.
    *   (+) Provides better control over user interaction flows.
    *   (-) Adds a small dependency (`react-hot-toast`) and custom component implementation for modals.

## ADR-006: Capability Links, No Auth, Auto-Expiry

*   **Status**: Accepted
*   **Date**: 2025-12-12
*   **Context**: The product needs shareable links without building accounts/auth. Security is handled by hard-to-guess tokens.
*   **Decision**:
    *   Use capability URLs: `public_token` for participant/result access, `organizer_token` for manage/close actions.
    *   No login or invite flow; tokens are the only access control and must be treated as secrets.
    *   Auto-delete events (and cascading data) 7 days after creation via an hourly cleanup task.
*   **Consequences**:
    *   (+) Very fast to share and use; zero onboarding friction.
    *   (+) Automatic hygiene keeps the database small and limits exposure window.
    *   (-) Token leakage grants control; relies on user care when sharing links.
    *   (-) Expiry will 404 links after 7 days; long-running events must be recreated.

## ADR-007: Event Closure Without Final Selection, Binary Availability

*   **Status**: Accepted
*   **Date**: 2025-12-12
*   **Context**: The current backend and UI do not support picking a “winner” slot or multi-state voting; simplicity and delivery speed are prioritized.
*   **Decision**:
    *   Event states are `open` and `closed`. Closing stops new submissions but does not mark a final slot.
    *   Availability is binary (selected/not selected). No `if_needed`/`no` tri-state.
    *   Aggregation is computed client-side from participant ranges using the event’s `slot_duration`.
*   **Consequences**:
    *   (+) Keeps flows and data model simple; minimal UI complexity.
    *   (+) Avoids backend changes for finalization logic.
    *   (-) Organizers must decide a time manually outside the app.
    *   (-) Less expressiveness for participants (no soft/conditional votes).

## ADR-008: Allowing Duplicate Participant Names for Security & Simplicity

*   **Status**: Accepted
*   **Date**: 2025-12-15
*   **Context**:
    *   Initially, `participants` table had `UNIQUE(event_id, name)` to allow "update by re-entering name" for anonymous users.
    *   This led to a security vulnerability where any user could overwrite an existing participant's (including the organizer's) data by submitting with the same name.
    *   The previous approach of simply blocking organizer names was deemed insufficient as it didn't align with the principle of "modification should be handled by other means."
*   **Decision**:
    *   Remove the `UNIQUE(event_id, name)` constraint from the `participants` table.
    *   Modify the `submit_availability` endpoint in the backend to **always insert a new participant entry** for every submission, even if the name already exists for that event.
*   **Consequences**:
    *   (+) **Security greatly improved**: Prevents any form of name-based participant data overwriting, including the organizer. Every submission is a new record.
    *   (+) Simplifies backend logic for `submit_availability`, removing complex lookup and update paths.
    *   (-) **Loss of "update by re-entering name" feature**: Users can no longer modify their previous submissions by typing the same name. Each submission will create a new entry with a duplicate name.
    *   (-) Leads to potentially multiple entries with the same name for a single event in the database and UI, which might require UI adjustments to distinguish or group them.
    *   (Future Work): If modification functionality is desired, a more robust identity mechanism (e.g., cookie-based `participant_token` or magic links) will need to be implemented.
