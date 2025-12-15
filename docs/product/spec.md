# AgreedTime Product Spec

The current build lets an organizer create an event with proposed time windows, collect availability from participants, and review a heatmap-style result view. This doc mirrors what the code ships today (no MVP framing, no unimplemented features presented as done).

---

## Product Snapshot
- Create an event, define time ranges, and share two capability links: invitation link (`/event/{public_token}`) and manage link (`/manage/{organizer_token}`). The same public token also serves the results page.

## 2. Core User Flows

### A. Organizer Flow
1. **Create**: User lands on `/`. Inputs "Event Title", optional "Description", "Organizer Name".
2. **Select Time**: Interactive grid (desktop) or list (mobile) to paint possible time slots.
3. **Share**: System generates the event and redirects to the **Organizer Dashboard** (`/manage/{organizer_token}`).
4. **Manage": 
   - Shows state badge, expiry hint (`created_at + 7 days`), copy buttons for the invitation link and the results link, and reuses the same results display component as the public results page.
   - Can "Close Event" to stop new submissions.
   - **Crucial**: This page is the *only* way to manage the event. No login.

### B. Participant Flow
1. **Receive**: Gets the invitation link (`/event/{public_token}`) via chat/email.
2. **View**: Sees event title, description, and "Organizer Name".
3. **Select**: Enters "Your Name" and paints their availability on top of the organizer's time slots.
   - *Logic*: Participants can only select slots that are within the organizer's offered ranges.
4. **Submit**: POSTs availability. Redirects to "Results View".
- Availability state is binary (available or not selected). There is no `if_needed`/`no` tri-state.
- Event states: `open` or `closed`. Closing an event only locks further submissions; it does not pick a final slot.
- Events auto-expire and are deleted 7 days after creation (background task runs hourly).
- Participants can add an optional free-text comment with their submission.
- All times are stored and exchanged as ISO 8601 UTC timestamps; the UI renders them in the viewer's local timezone.

---

## Tech & Time Handling
- **Frontend:** Astro 5 + React 19 islands, Tailwind CSS, server output via `@astrojs/node` (standalone mode). Client-side `fetch` calls `/api` (proxied to the backend in dev).
- **Backend:** Rust + Axum with PostgreSQL and SQLx. Capability tokens are UUID strings generated per event.
- **Time:** `TIMESTAMPTZ` in the database. Requests/responses use ISO 8601 UTC (e.g., `2025-12-08T09:00:00Z`). The frontend converts UTC to local time for display and back to UTC when sending ranges.
- **Slot duration:** Stored per event (`slot_duration`); the UI currently always sends `60` minutes.
- **Time zone field:** `time_zone` from the organizer is stored as metadata only.

---

## Routes & Flows

### `/` – Landing
- Simple hero with CTA button linking to `/new`.

### `/new` – Create Event
- Fields: `title` (required), `description` (optional), `organizer_name` (defaults to `"Organizer"` if left blank), `time_zone` auto-detected from the browser.
- Time selection: `TimeSlotSelector` with adjustable date range and start/end hours (defaults to today → +27 days, 09:00–18:00). Drag/long-press to paint, or click a date header to toggle a full day. Bottom panel lists selected slots with remove/clear actions.
- Validation: requires non-empty title and at least one selected slot.
- Submission: `POST /api/events` with the selected ranges (merged server-side). Organizer availability is auto-created with the provided name. Organizer token is stored in `localStorage` (`agreed_time_admin_{eventId}`) for convenience.
- Success path: toast + redirect to `/manage/{organizer_token}`.

### `/event/{public_token}` – Participant Submission
- Loads via `GET /api/events/{public_token}`. If the event state is `closed`, the page immediately redirects to `/event/{public_token}/result`.
- Shows event title/description and organizer name.
- Fields: participant name (required) and optional comment.
- Time selection constrained to the organizer's slots; rendered in the viewer's local timezone. Drag-to-select supported; no multi-state selection.
- Submission: `POST /api/events/{public_token}/availability` with merged ranges and comment. On success, shows a thank-you screen (no auto-redirect).

### `/event/{public_token}/result` – Public Results
- Fetches `GET /api/events/{public_token}/results`.
- Computes counts client-side from participant ranges (no aggregated counts from the API).
- Sections:
  - Header with timezone note using the viewer's offset string.
  - **Best Times:** all slots tied for highest availability, showing date/time and participant list.
  - **Other Options:** remaining slots sorted by count then time.
  - **Participants:** list with organizer badge and optional comments; empty-state handling for zero or organizer-only responses.
  - **Heatmap:** read-only grid intensity based on availability counts.

### `/manage/{organizer_token}` – Organizer Dashboard
- Fetches `GET /api/events/organizer/{organizer_token}`.
- Shows state badge, expiry hint (`created_at + 7 days`), copy buttons for the participant link and the results link, and reuses the same results display component as the public results page.
- Close action (only when `open`): `POST /api/events/{organizer_token}/close`, then refetch. Closing locks further submissions; no finalize/pick flow yet.

---

## API Shapes (Current)

### Create Event
`POST /api/events`
```json
{
  "title": "Team Sync",
  "description": "Weekly planning",
  "organizer_name": "Alex",
  "time_zone": "Asia/Taipei",
  "slot_duration": 60,
  "time_slots": [
    { "start_at": "2025-12-10T01:00:00Z", "end_at": "2025-12-10T03:00:00Z" }
  ]
}
```
Response:
```json
{ "id": "…", "public_token": "…", "organizer_token": "…" }
```

### Get Event (Guest View)
`GET /api/events/{public_token}`
```json
{
  "id": "…",
  "title": "Team Sync",
  "description": "Weekly planning",
  "time_zone": "Asia/Taipei",
  "slot_duration": 60,
  "state": "open",
  "event_slots": [
    { "id": 1, "event_id": "…", "start_at": "2025-12-10T01:00:00Z", "end_at": "2025-12-10T02:00:00Z" }
  ],
  "organizer_name": "Alex"
}
```

### Submit Availability
`POST /api/events/{public_token}/availability`
```json
{
  "participant_name": "Jamie",
  "availabilities": [
    { "start_at": "2025-12-10T01:00:00Z", "end_at": "2025-12-10T02:00:00Z" }
  ],
  "comment": "Prefer mornings"
}
```

### Event Results
`GET /api/events/{public_token}/results`
```json
{
  "id": "…",
  "title": "Team Sync",
  "description": "Weekly planning",
  "time_zone": "Asia/Taipei",
  "slot_duration": 60,
  "state": "open",
  "event_slots": [ { "id": 1, "event_id": "…", "start_at": "2025-12-10T01:00:00Z", "end_at": "2025-12-10T02:00:00Z" } ],
  "participants": [
    {
      "name": "Alex",
      "is_organizer": true,
      "comment": "Organizer auto-created on event creation",
      "availabilities": [ { "start_at": "2025-12-10T01:00:00Z", "end_at": "2025-12-10T02:00:00Z" } ]
    }
  ],
  "total_participants": 1
}
```

### Organizer Event
`GET /api/events/organizer/{organizer_token}`
Returns the same shape as results plus `public_token`, `organizer_token`, and `created_at`.

### Close Event
`POST /api/events/{organizer_token}/close` → `EventResponse` (same shape as Get Event).

---

## Data & Behavior Notes
- Overlapping or contiguous ranges are merged on the server for both event slots and participant submissions.
- There is no API to edit event slots or metadata after creation; create a new event instead.
- Aggregated counts are calculated in the frontend from participant ranges using the event's `slot_duration`.
- Tokens are the only access control; treat them as sensitive capability URLs.

---

## Known Gaps / Backlog
- Changing slots after creation and re-opening closed events are not supported.
- No final selection/pinning of a winning time; closing simply stops new submissions.
- Only one availability state (available). No "if needed"/"no" or weighting.
- Slot duration is fixed per event at creation; the UI currently exposes only 60 minutes.
- No authentication beyond tokens; no email/calendar integrations.
