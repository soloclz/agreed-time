# Developer Todo List

This file tracks technical debt, refactoring tasks, minor improvements, and upcoming features.

## Feature Roadmap (Phase 2)

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

## Improvements & Tech Debt

- [ ] **Test**: Add Vitest for unit testing `dateUtils`.
- [ ] **UI**: Polish the mobile view of `CreateEventForm` (padding adjustments).
- [ ] **Refactor**: Consider using Zod for form validation in `CreateEventForm`.
- [ ] **Docs**: Add screenshots to `docs/developer/guide.md`.