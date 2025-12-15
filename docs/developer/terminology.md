# Terminology & Naming Alignment

Canonical wording for docs, UI copy, and code. Terms match current models (`backend/src/models/mod.rs`) and frontend types (`frontend/src/types/index.ts`).

## Roles & Links
- **Organizer**: Creates the event, owns the capability tokens (`organizer_token`), can close the event. UI badge: "Organizer".
- **Participant**: Anyone submitting availability (organizer included). Prefer this term over guest/attendee.
- **Participant link**: Public link for submitting availability `/event/{public_token}`. Same token powers results.
- **Results link**: Read-only results `/event/{public_token}/result` (uses the same public token).
- **Organizer link**: Management view `/manage/{organizer_token}` for copying links and closing the event.
- **Capability token**: Opaque UUID strings (`public_token`, `organizer_token`). No auth beyond possession.

## Time & Availability Model
- **Time range**: ISO 8601 UTC `start_at`/`end_at`. Payload types: `TimeRangeRequest` (backend) / `ApiTimeRange` (frontend).
- **Slot duration**: Minutes per event (`slot_duration`, current UI sends `60`). Drives grid segmentation and merging.
- **Event slots**: Merged organizer ranges stored in `event_slots`; returned as `event_slots` in APIs.
- **Availability**: Participant-submitted time ranges stored in `availabilities`; payload field `availabilities` in `SubmitAvailabilityRequest`.
- **Grid cell**: Client-only representation for selection and heatmap (e.g., `TimeSlotSelector`), keyed as `YYYY-MM-DD_H.5`.

## State & Metadata
- **Event state**: `open` or `closed`. Closing stops new submissions; results remain viewable.
- **Participant record**: Stored in `participants` with `is_organizer` and optional `comment`.
- **Comment**: Optional free-text attached to a participant and surfaced in results.
- **Time zone**: Organizer-provided `time_zone` stored as metadata; all payloads stay UTC.

## Copy Guidelines
- Use **participant link** for the public share URL; avoid "guest link" in UI and docs.
- Refer to people as **participants**; use **availability** (not vote/response) for submissions.
- Call URLs **capability links** (participant/results/organizer); avoid "invite link" unless clarifying behavior.
- Mention **UTC ISO 8601** for data exchange; use "local time" only when describing rendering.

## Pointers
- Aggregation and labels: `frontend/src/components/EventResultsDisplay.tsx`, `frontend/src/utils/eventUtils.ts`
- Selection grid: `frontend/src/components/TimeSlotSelector.tsx`, `frontend/src/components/TimeGrid.tsx`
