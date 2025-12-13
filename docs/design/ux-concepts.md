# UX Design Concepts: Smart Time Selection

To address the limitations of traditional grid selection on mobile devices, AgreedTime introduces a "Pattern-First" interaction model.

## 1. The Core Problem
- **Repetition Fatigue**: Users often have repetitive schedules (e.g., "9-5 Mon-Fri"). Tapping/dragging 5 days individually is tedious.
- **Mobile Constraints**: 7-day grids are too cramped on mobile screens. Infinite scroll is disorienting.

## 2. The Solution: "Flow" Mode

### 2.1. Rolling Week Canvas
Instead of a strict Sunday-Saturday calendar week, the canvas starts from **Today** and shows the next 6 days.
- **Mental Model**: "What is my availability for the *immediate* future?"
- **Mobile View**: Displays 3-4 days at a time with swipe pagination.

### 2.2. Pattern Replication (The "Magic" Actions)

#### A. One-Tap Copy (Explicit)
- **Trigger**: User completes selection for the current week.
- **UI**: A Floating Action Button (FAB) appears: `Copy to Next Week`.
- **Action**: 
    1.  Duplicates the current week's time slots to the following 7 days.
    2.  Automatically swipes/scrolls to the newly filled week.
    3.  User is presented with the result for immediate review/tweaking.

#### B. Ghost Mode (Implicit)
- **Trigger**: User manually swipes to an empty future week.
- **UI**: The previous week's pattern is displayed in a semi-transparent "ghost" style.
- **Action**: Tapping anywhere on the grid (or a "Confirm" toast) solidifies the ghost pattern into real selection.

#### C. Drag-to-Copy (Gesture)
- **Trigger**: User pulls the edge of the current week view (overscroll).
- **Feedback**: Haptic vibration and "Pull to replicate" text.
- **Action**: Releasing the pull triggers the copy action and transitions to the next week.

### 2.3. Constraints
- **5-Week Limit**: The system supports generating up to ~1 month of availability.
- **Boundary**: Attempting to scroll past Week 5 triggers a resistance effect (rubber banding) and a "Max limit reached" tooltip.

## 3. Implementation Strategy
- **Frontend Only**: This logic lives entirely in the client-side state management. The backend receives standard ISO time slots.
- **Data Structure**:
    - `WeeklyPattern`: An abstract representation of a week (e.g., `{ Mon: [9-12], Tue: [14-17] }`).
    - `Generator`: A function that projects this pattern onto specific dates.
