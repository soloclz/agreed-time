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
