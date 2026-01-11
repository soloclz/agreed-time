# AgreedTime Product Strategy 2026

## 1. Vision & Pivot
**"The Calendly for Creatives & Solopreneurs in Asia."**

AgreedTime is evolving from a simple group polling tool into a **Freemium Booking Platform** tailored for individuals who value aesthetics and simplicity (e.g., designers, therapists, tutors, beauty professionals).

### Core Value Proposition
*   **Aesthetics**: Distinctive "Paper/Film" design style that acts as a personal brand statement, not just a utility.
*   **Simplicity**: No account required to start (PLG model).
*   **Localization**: Future integration with local ecosystems (LINE, local payments) where global competitors fail.

---

## 2. Business Model: Freemium
We adopt a dual-track approach to serve both casual users and professionals without breaking the existing experience.

| Feature | **Polling (Free)** | **Booking (Pro)** |
| :--- | :--- | :--- |
| **Primary Use Case** | Group Coordination (Parties, Meetings) | 1-on-1 Services (Consulting, Haircut) |
| **Availability Logic** | Collaborative (Heatmap) | **First-come, First-served** (Exclusive) |
| **Privacy** | Open (Participants see each other) | **Blind** (Clients only see slots) |
| **Schedule Type** | Manual selection | Manual (MVP) -> Recurring Rules (Future) |
| **Calendar Sync** | Read-only (Check conflicts) | **Bi-directional** (Add to calendar) |

---

## 3. Technical Architecture Strategy

### Repository & Open Source
*   **Core Codebase**: **Public**. This repository contains the backend logic, API handling, and the scheduling frontend.
*   **Monorepo Structure**: Logical layering within a single repo (`backend/`, `frontend/`).
*   **Public Assets**:
    *   **UI Kit / Design System**: Part of the open-source repository to build brand reputation.
    *   **i18n Locales**: Open sourced for community translation.
    *   **Figma**: Public for marketing.

### Database Evolution
*   **Phase 1 (MVP)**: Reuse `events` table. Add `type` column (`poll` vs `booking`).
    *   Booking Mode enforces "Mutual Exclusion" (locking slots).
*   **Phase 2 (Scale)**: Split into `services`, `availability_rules`, and `appointments` tables.

### Frontend & UX
*   **Homepage (PLG)**: Keep "Create Event" accessible without login. Add distinct "Sign In / Dashboard" paths for power users.
*   **Booking UI**: Default to **Fixed Grid** (Snap to Grid) to maximize billable hours and prevent schedule fragmentation.

---

## 4. Tactical Backlog (Migrated from TODO)

### Feature Roadmap (Phase 2)
- [ ] **Smart Time Selection UX (Mobile First)**
    - [ ] Implement "Rolling Week" view (Start from Today + 6 days).
    - [ ] Add "Copy to Next Week" floating action button.
    - [ ] Implement "Ghost Mode" preview for empty weeks.
    - [ ] Add week-based pagination/swipe navigation for mobile.
- [ ] **Event Polls (Attached Voting)**
    - [ ] **Backend**: Create tables (`poll_questions`, `poll_options`, `poll_votes`) and API endpoints.
    - [ ] **Frontend**: Add Poll creation UI to Organizer dashboard.
    - [ ] **Frontend**: Add Voting UI to Participant view.
    - [ ] **Frontend**: Visualise poll results in Event Result view.

### Improvements & Tech Debt
- [ ] **Test**: Add Vitest for unit testing `dateUtils`.
- [ ] **UI**: Polish the mobile view of `CreateEventForm` (padding adjustments).
- [ ] **Refactor**: Consider using Zod for form validation in `CreateEventForm`.
- [ ] **Docs**: Add screenshots to `docs/developer/guide.md`.
