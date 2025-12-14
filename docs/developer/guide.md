# Developer Guide

This guide reflects the current codebase (no MVP wording) and is grounded in the implemented behavior.

---

## 1) Architecture & Stack
- **Frontend:** Astro 5 + React 19 islands, Tailwind CSS theme (film-inspired palette), Node adapter (`output: 'server'` standalone). The dev server proxies `/api` to `http://localhost:3000`.
- **Backend:** Rust (Axum + SQLx + PostgreSQL). Capability tokens (UUID strings) power public/organizer links. An hourly background task deletes events older than 7 days (cascades to slots/participants/availabilities).
- **Time:** Database uses `TIMESTAMPTZ` and expects/returns ISO 8601 UTC. The UI converts to/from the viewer's local time; `slot_duration` (currently 60 minutes) drives grid segmentation.

---

## 2) Frontend Structure
- **Astro pages:** `src/pages/index.astro`, `/new`, `/event/[public_token]`, `/event/[public_token]/result`, `/manage/[organizer_token]`. `Layout.astro` hosts the fixed header, film-grain overlay, and the global toast container.
- **Core React components:**
  - `CreateEventForm`: Collects title/description/organizer, auto-detects timezone, enforces at least one slot, uses `TimeSlotSelector`, saves the organizer token to `localStorage`, and redirects to the manage page on success.
  - `EventGuestForm`: Fetches event data, redirects to results when `state === 'closed'`, captures participant name/comment, and reuses `TimeSlotSelector` in guest mode (selection constrained to organizer slots).
  - `OrganizerDashboard`: Fetches organizer event data, shows copy buttons for guest/result links, displays expiry (created_at + 7 days), and lets the organizer close the event.
  - `EventResultView` / `EventResultsDisplay` / `Heatmap`: Fetch results, compute slot counts client-side from participant ranges, render best times, other options, participant list with organizer badge/comments, and a read-only heatmap grid.
  - Grid system: `TimeSlotSelector` (selection logic + controls + bottom panel), `TimeGrid` (multi-week horizontal layout with date/time headers and drag delegation), `TimeSlotCell` (select vs heatmap modes), `TimeSlotBottomPanel` (selected slots list).
- **Hooks & utils:** `useTimeSlotDragSelection` manages drag state and selection sets; `eventUtils` (`rangesToCells`, `cellsToRanges`, organizer-only helpers); `dateUtils` handles local date arithmetic and timezone-safe formatting.
- **Services:** `services/eventService.ts` wraps API calls (`createEvent`, `getEvent`, `submitResponse`, `getEventResults`, `getOrganizerEvent`, `closeEvent`) with the `/api` base and basic error handling.

---

## 3) Backend Endpoints
Router (Axum) with shared `PgPool` state:
- `GET /health`
- `POST /events` — create event (merges overlapping ranges, auto-creates organizer participant & availability)
- `GET /events/{public_token}` — guest view
- `POST /events/{public_token}/availability` — submit/overwrite a participant's availability (by name) + optional comment
- `GET /events/{public_token}/results` — participants + slots + totals
- `GET /events/organizer/{organizer_token}` — organizer view (includes tokens and created_at)
- `POST /events/{organizer_token}/close` — set state to `closed`

Data models live in `backend/src/models`, handlers in `backend/src/handlers/events.rs`, with `merge_time_ranges` used for both event slots and availabilities.

---

## 4) Data & Time Flow
- Frontend selection state is stored as local-time grid cells; `cellsToRanges` converts to UTC ISO ranges before API calls. `rangesToCells` converts server ranges back to local cells.
- `TimeSlotSelector` defaults to today → +27 days and 09:00–18:00 for organizers; in guest mode it auto-sizes the visible range to the provided slots. `TimeGrid` caps display to 4 weeks and surfaces a validation message if exceeded.
- Organizer name defaults to `"Organizer"` on the client; backend requires a non-empty name.
- Closing an event only changes `state` to `closed`; results remain viewable and no final slot is chosen.
- Aggregated counts are computed in the frontend using the event's `slot_duration`; the API does not return per-slot aggregates.

---

## 5) Development Workflow
- **Database:** `docker compose up -d` (from repo root) to start Postgres. Apply migrations with `cargo run --bin agreed-time-backend -- migrate` or simply `cargo run -- migrate` (single-binary crate).
- **Backend dev:** `cd backend && cargo run` (serves on `0.0.0.0:3000`). Logging via `tracing_subscriber`; CORS configured from `ALLOWED_ORIGINS`.
- **Frontend dev:** `cd frontend && npm install && npm run dev` (Astro dev server on `localhost:4321`, proxying `/api`).
- **Build/preview:** `npm run build` (SSR output), `npm run preview`.
- **Tests:** `cd backend && cargo test`; `cd frontend && npm test` (Vitest + Testing Library).

---

## 6) Access & Token Strategy
- `public_token` → participant submission and public results. `organizer_token` → manage/close capabilities. Tokens are opaque capability URLs; treat them as secrets.
- On create, the organizer token is stored in `localStorage` (`agreed_time_admin_{eventId}`) to keep the user "logged in" as the organizer on that device.
- There is no authentication, invite email, or per-user accounts; ownership is purely token-based.

---

## 7) Notes & Pitfalls
- Event edits (title/slots) are not supported post-creation; users must recreate events.
- Slot duration is fixed per event at creation (UI currently hard-coded to 60).
- Comments are persisted on participants and returned in results; they are not editable independently of resubmitting availability.
- Auto-deletion removes expired events hourly; local links will 404 after cleanup.
