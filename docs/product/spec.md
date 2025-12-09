# AgreedTime Frontend Specification (Astro + React, Minimal UI + API View)

> Scope: This document describes the **frontend behavior and structure only**, targeting an implementation using **Astro + React + TypeScript**.
> It is intended to be enough for building the UI, wiring basic data flow, and integrating with the backend APIs.

---

## 1. Tech Assumptions

- **Framework:** Astro
- **UI islands:** React components rendered as Astro islands
- **Language:** TypeScript
- **Styling:** Tailwind CSS (recommended)
- **Data fetching:** `fetch` or a small wrapper; no heavy state library required for MVP
- **Deployment target:** Static Astro site with backend API at a separate origin (e.g. `https://api.agreedtime.example`), or same origin with `/api` prefix.

---
## 1.x Time Handling Strategy

To ensure accuracy and consistency across different time zones, the application adheres to the following principles for time management:

- **Database Storage**: All time-related data stored in the backend database (e.g., `time_slots.start_at`, `time_slots.end_at`) will use `TIMESTAMPTZ` (timestamp with time zone) PostgreSQL data type. This means all times are internally stored in **UTC (Coordinated Universal Time)**.
- **API Communication**: The backend API will expose and expect time-related data in **ISO 8601 format (UTC)** (e.g., `2025-12-08T09:00:00Z`).
- **Frontend Presentation**: The frontend is responsible for:
    - Receiving UTC time data from the API.
    - Converting UTC times to the **user's local timezone** for display in the UI (e.g., the Time Grid).
    - Handling display adjustments for dates and times that may cross local day boundaries due to timezone conversion (e.g., a UTC time on Dec 10 might display as Dec 9 in a user's local timezone).
- **`events.time_zone` field**: The `time_zone` field in the `events` table (e.g., "Asia/Taipei") will serve as **metadata for user interface context only**. It indicates the original timezone the event organizer used for planning and can be displayed to users for clarity, but it is **not used for backend time calculations or conversions**.


---

## 2. Routes (Frontend)

The frontend must implement the following routes:

1. `/` – Landing page + "Create a event" entry
2. `/event/[public_token]` – Public event view (participants fill their availability)
3. `/manage/[organizer_token]` – Organizer management view (configure event, open, finalize)

Optional future route (not required for first UI pass, can be a simple section on `/`):

- `/about`

---

## 3. Implementation Status

**Current Status**: ✅ MVP Completed (Create Event Page with Time Slot Selector)

**Implemented Features**:
- Multi-week horizontal scrolling calendar view (Sunday start)
- Date range selector with validation (max 8 weeks)
- Time range selector (customizable start/end hours)
- Drag-to-select interaction for time slots
- Bottom fixed bar with expandable panel for selected slots
- Responsive design with mobile considerations

---

## 3. Shared Concepts (for UI)

### 3.1. Event State

The backend returns a `state` for each event. To simplify the flow, there are only two states:

- `open`
- `closed`

Frontend behavior by state:

- `open`:
  - **Organizer**: Can edit title/description, add/remove time slots, and view aggregated results. Can "Close" the event to finalize it.
  - **Participants**: Can submit / update availability.
- `closed`:
  - **All Users**: The event becomes read-only.
  - **Redirect**: Accessing the participant view (`/event/[public_token]`) should automatically redirect to the result view (`/event/[public_token]/result`).

### 3.1.x Data Retention (Auto-Deletion)

To maintain system hygiene and privacy:

- **Policy**: Events and all associated data (time slots, participants, availability) are **automatically deleted** from the database.
- **Condition**: 7 days after the **latest date** in the event's defined Time Slots.
  - *Example*: If an event has slots on Dec 10 and Dec 12, the event expires on Dec 19 (12 + 7).

### 3.2. Availability Status

For the MVP, a participant can simply choose:

- `yes` (Selected)
- `no` (Not selected)

UI suggestion:

- Selected → green
- Not selected → white/default

Interaction pattern:
Click on a cell toggles selection.

### 3.3. Selected Slots Display (Bottom Fixed Bar - Implemented)

**Design Pattern**: Shopping Cart / Bottom Sheet

The selected time slots are displayed using a fixed bottom bar that expands upward, similar to e-commerce shopping carts.

**Components**:

1. **Bottom Fixed Bar** (Always visible when slots selected)
   - Fixed at bottom of viewport
   - Green background (#10b981)
   - Shows count badge (white circle with number)
   - Left: "Selected Time Slots" text
   - Right: "View Details" / "Hide Details" + arrow icon
   - Click to toggle expanded panel

2. **Expanded Panel** (Slides up from bottom)
   - Max height: 60vh
   - Smooth slide animation (300ms)
   - White background with green top border
   - Header shows total count with "Clear All" button
   - Content scrollable, grouped by date
   - Each slot shows time range with × button to remove

3. **Semi-transparent Overlay** (When expanded)
   - Click to close panel
   - 30% black opacity

**UX Advantages**:
- ✅ Always visible (no need to search for button)
- ✅ Familiar pattern (shopping cart)
- ✅ Doesn't block main content
- ✅ Mobile-friendly (thumb-accessible)
- ✅ No layout shift (fixed positioning)

### 3.4. Grid Layout Pattern (Multi-Week Horizontal Scrolling)

**Visual Structure**

The time selection grid displays multiple weeks side-by-side with horizontal scrolling:

- **Layout**: Multiple week tables arranged horizontally
- **Columns**: 7 days per week (Sunday to Saturday)
- **Rows**: Time slots (e.g., 9:00 AM, 10:00 AM, 11:00 AM)
- **Week Separation**: Thick gray border between weeks
- **Fixed Time Column**: Left-most time labels remain visible while scrolling

**Week Generation**

- Automatically generates complete weeks from start date to end date
- Week starts on Sunday, ends on Saturday
- Cells outside the selected date range are grayed out and disabled
- Maximum 8 weeks supported (validated with error message)

**Interaction**

1. **Date/Time Range Selection**:
   - Date range picker: Start date → End date
   - Time range selector: Start hour → End hour (0-23)
   - Validates range (max 8 weeks)

2. **Click to Select**: Single click toggles cell selection (green = selected, white = unselected)

3. **Drag to Paint**:
   - Mouse down on a cell starts drag mode
   - Dragging over other cells applies the same selection state
   - Works across multiple weeks
   - Allows quick selection of large time blocks
   - `user-select: none` prevents text selection during drag

4. **Visual Feedback**:
   - Selected cells: Green (`bg-green-400`)
   - Unselected cells: White
   - Disabled cells: Gray (outside date range)
   - Hover effect: Lighter shade
   - Smooth transitions

5. **Navigation**:
   - Scroll Left / Scroll Right buttons for keyboard/mouse users
   - Native horizontal scroll with mouse wheel or trackpad
   - Touch-friendly swipe on mobile

**Layout Details**

```
Week 1: 12/1 - 12/7          │ Week 2: 12/8 - 12/14
────────────────────────────  │ ────────────────────────────
Time │ Sun Mon Tue Wed Thu... │ Time │ Sun Mon Tue Wed Thu...
─────┼────────────────────... │ ─────┼────────────────────...
9 AM │ [ ] [ ] [ ] [ ] [ ]    │ 9 AM │ [ ] [ ] [ ] [ ] [ ]
10AM │ [ ] [ ] [ ] [ ] [ ]    │ 10AM │ [ ] [ ] [ ] [ ] [ ]
...  │                        │ ...  │
```

**Responsive Behavior**

- Desktop: Full multi-week horizontal scroll
- Tablet/Mobile: Same layout, relies on native touch scroll
- Time column sticky on left for orientation

---

## 4. Pages

### 4.1. `/` – Landing Page

**Purpose**

- Explain what AgreedTime does in 1–2 sentences.
- Provide a prominent CTA to create a new event.

**Layout (rough)**

- Header:
  - App name / logo: "AgreedTime"
  - (Optional) Link to GitHub / About
- Hero section:
  - Short tagline: "Find a time everyone can make it."
  - Secondary text (one sentence).
  - Primary button: "Create a event"
- (Optional) How it works:
  - 3 steps: Create event → Share link → Finalize time

**Interactions**

- "Create a event" button:
  - Navigates to a simple inline form **on the same page** or to a dedicated route (e.g. `/new`).
    For MVP, simplest is: clicking opens a modal or section with the form.

**Create Event Form Fields**

- `title` (required, text input)
- `description` (optional, textarea)
- (Optional MVP) `time_zone` select or hidden default

**API Integration**

- On form submit:
  - `POST /events`
  - On success:
    - **Redirect immediately** to organizer dashboard: `/manage/[organizer_token]`
    - (Skip "Event Created" success screen to reduce friction).

---

### 4.2. `/event/[public_token]` – Participant View

**Purpose**

- Allow participants to view event info.
- Show grid of time slots (WhenIsGood style).
- Let participants select availability and submit.

**Data Source**

- On initial load, call:

  - `GET /events/{public_token}`

**Expected Response (frontend-relevant)**

```json
{
  "event": {
    "title": "Team Sync",
    "description": "Discuss next sprint",
    "state": "open",
    "time_zone": "Asia/Taipei",
    "created_at": "2025-12-01T12:00:00Z"
  },
  "time_slots": [
    {
      "id": 1,
      "date": "2025-12-10",
      "start_time": "09:00",
      "end_time": "10:00"
    },
    {
      "id": 2,
      "date": "2025-12-10",
      "start_time": "10:00",
      "end_time": "11:00"
    }
  ],
  "final_selection": [2],
  "aggregated": {
    "1": { "yes": 3, "if_needed": 1, "no": 0, "total": 4 },
    "2": { "yes": 2, "if_needed": 2, "no": 0, "total": 4 }
  },
  "participants": [
    {
      "id": 10,
      "display_name": "Alice",
      "last_updated_at": "2025-12-02T01:23:45Z"
    }
  ]
}
```

**UI Sections**

1. **Header**
   - Event title
   - Optional small text: "Time zone: Asia/Taipei"
2. **Description**
   - Plain text or hidden if empty
3. **Availability Form**
   - Input: `display_name` (text)
   - Time grid (WhenIsGood style):
     - X-axis: dates (columns) with day-of-week labels
     - Y-axis: time ranges (rows)
     - Each cell: clickable/draggable to set availability
     - Support for drag-to-paint interaction
     - Visual color coding: green (yes), yellow (if_needed), grey/red (no)
4. **Aggregated Info (optional for MVP)**
   - Show how many people selected `yes` / `if_needed` / `no` for each slot
   - Could be numeric labels or background intensity
5. **Submit / Update Button**
   - Label: "Save my availability"

**Grid Implementation Details**

1. **Data Processing**:
   - Group time_slots by date
   - Extract all unique time ranges across all dates
   - Build a 2D matrix: `matrix[timeRange][date]` = `timeslot_id | null`

2. **Rendering**:
   - Table with fixed headers (dates)
   - Row headers showing time ranges (e.g., "9:00 AM - 10:00 AM")
   - Cells:
     - Enabled if timeslot exists for that date-time combination
     - Disabled/grayed if no timeslot defined
     - Colored based on user's selection

3. **Drag Interaction**:
   ```typescript
   // Pseudo-code
   const [isDragging, setIsDragging] = useState(false);
   const [dragStatus, setDragStatus] = useState<'yes' | 'if_needed' | 'no'>(null);

   const handleMouseDown = (cellId) => {
     setIsDragging(true);
     // Toggle to next status
     const newStatus = getNextStatus(currentStatus);
     setDragStatus(newStatus);
     updateCell(cellId, newStatus);
   };

   const handleMouseEnter = (cellId) => {
     if (isDragging) {
       updateCell(cellId, dragStatus);
     }
   };

   const handleMouseUp = () => {
     setIsDragging(false);
     setDragStatus(null);
   };
   ```

**State-specific behavior**

- `state = "draft"`:
  - Show message: "This event is not open yet."
  - Hide form.
- `state = "open"`:
  - Show form and allow editing.
- `state = "finalized"`:
  - Show final selected slot(s) highlighted.
  - Disable editing; show message: "This event has been finalized."

**API: Submit Availability**

- Endpoint: `POST /events/{public_token}/availability`

- Request body:

  ```json
  {
    "participant_name": "Alice",
    "time_slot_ids": [1, 2]
  }
  ```

- On success:
  - Return 200 OK.
  - Optionally refetch `GET /events/{public_token}` to update aggregated view.
  - Show a small toast / message: "Saved! You can revisit this link to adjust later."

---

### 4.3. `/manage/[organizer_token]` – Organizer Dashboard

**Purpose**

- Provide a streamlined dashboard for the event organizer.
- **Visual Consistency**: Reuses the same visual components as the Result View (`EventResultsDisplay`) to show the heatmap and top picks.
- **Admin Controls**: Provides specific actions available only to the organizer (sharing, closing).

**Data Source**

- On initial load, call:
  - `GET /api/events/organizer/{organizer_token}`

**UI Sections**

1. **Header & Status**
   - Event title and description.
   - **Status Badge**: Displays "OPEN" (Green) or "CLOSED" (Red).

2. **Admin Controls (Top Section)**
   - **Invite Participants (Primary Action)**:
     - Prominent "Copy Invitation Link" button.
     - Displays truncated URL preview (e.g., `agreed-time.com/event/...`) for clarity.
     - *Instruction*: "Send this link to your participants to collect their availability."
   - **Share Results (Secondary Action)**:
     - Smaller "Copy Result Link" button.
     - For read-only access to the results.
   - **Close Event Action** (Only when `state = "open"`):
     - "Close Event" button (Red).
     - Triggers a **Confirmation Modal** (not native confirm) to prevent accidental closure.
     - Once closed, the event becomes read-only for everyone.

3. **Event Results Visualization**
   - **Reused Component**: Renders the exact same view as `/event/[public_token]/result`.
   - **Heatmap**: Shows availability intensity.
   - **Top Picks**: Lists the best time slots.
   - **Participants**: Lists who has responded.
   - **Empty State**: If no responses yet, shows a simple message encouraging the organizer to share the link (no "Go to Guest Link" button, as the organizer typically doesn't need to vote).

**API Actions**

- **Close Event**:
  - `POST /api/events/{organizer_token}/close`
  - On success: Update local state to "CLOSED" and show success toast.

---

### 4.4. `/event/[public_token]/result` – Event Result View

**Purpose**
- Display the aggregated results of the event availability.
- Show the best meeting times ("Top Picks").
- Provide a detailed heatmap of availability.
- List participants and their comments.

**UI Sections**

1. **Header**
   - Event title and description.
   - **Timezone Context**: Clearly states that "All times are shown in your local timezone".

2. **Top Picks (Best Times)**
   - Highlights the time slots with the highest availability (e.g., 100% attendance).
   - Display:
     - Date and Time (e.g., "Dec 24, 2025", "Friday, 14:00 - 15:00").
     - "Available" count (e.g., "5/5 Available").
     - List of attendees for this specific slot.

3. **Other Options**
   - A list of remaining time slots sorted by popularity (vote count).
   - Shows date/time and vote count (e.g., "4 votes").
   - Hover/detail view shows who can attend.

4. **Participants List**
   - Displays a grid/list of all participants.
   - Shows `display_name` and their avatar (initial).
   - **Comments**: Displays the optional comment provided by the participant (e.g., "I'll be late").

5. **Heatmap**
   - A visual grid (TimeGrid component reuse) showing availability intensity.
   - **Visuals**:
     - Color intensity represents the number of available participants (e.g., Dark Red = All, Light Red = Few).
     - Non-interactive (read-only) version of the selection grid.
   - **Legend**: Clearly labels "Few", "Most", and "All" with corresponding color swatches.

6. **Action Bar**
   - **Share Results**: Button to copy the result page URL to clipboard.

---

## 5. Astro + React Structure (Recommended Minimal Layout)

### 5.1. High-Level File Structure

Example (not mandatory but recommended):

```
src/
  pages/
    index.astro               # /
    event/
      [public_token].astro    # /event/:public_token
    manage/
      [organizer_token].astro # /manage/:organizer_token

  components/
    Layout.astro

    # Grid Components
    TimeGrid.tsx              # React - Main grid wrapper
    GridCell.tsx              # React - Individual cell with drag support
    GridHeader.tsx            # React - Date/time headers

    # Forms
    AvailabilityForm.tsx      # React - Participant form with grid
    CreateEventForm.tsx        # React - Landing page form

    # Organizer Components
    TimeSlotGenerator.tsx     # React - Bulk time slot creation
    TimeSlotList.tsx          # React - Show/edit existing slots
    HeatMapGrid.tsx           # React - Aggregated view with heat map

    # Shared
    StateBadge.tsx            # React - Event state indicator
    CopyLinkButton.tsx        # React - Copy to clipboard
```

- Astro pages:
  - Responsible for routing and top-level layout.
  - Embed React islands for interactive parts.
- React components:
  - Handle grid interactions, form state, and API calls.

### 5.2. Data Flow Pattern

For MVP (to get UI drawn and working quickly), use **client-side fetch** in React components:

- Astro page renders a shell (title, basic layout).
- Main React component uses `useEffect` to:
  - Fetch data from the backend API.
  - Maintain local state for:
    - Event
    - Time slots
    - Aggregated availability
    - Participant name and cell selections
- Submit changes via `fetch` to appropriate backend endpoints.

### 5.3. Key React Hooks and State Management

**Participant View State**:
```typescript
const [eventData, setEventData] = useState<PublicEventResponse | null>(null);
const [selections, setSelections] = useState<Record<number, AvailabilityStatus>>({});
const [displayName, setDisplayName] = useState('');
const [isDragging, setIsDragging] = useState(false);
const [dragStatus, setDragStatus] = useState<AvailabilityStatus | null>(null);
```

**Organizer View State**:
```typescript
const [eventData, setEventData] = useState<OrganizerEventResponse | null>(null);
const [isClosing, setIsClosing] = useState(false);
// ... shared state with EventResultsDisplay
```

---

## 6. Frontend Types (Simplified)

```ts
export type EventState = "draft" | "open" | "finalized" | "archived";

export type AvailabilityStatus = "yes" | "if_needed" | "no";

export interface EventPublic {
  title: string;
  description: string | null;
  state: EventState;
  time_zone: string;
  created_at: string; // ISO
}

export interface TimeSlot {
  id: number;
  date: string;       // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

export interface AggregatedCounts {
  yes: number;
  if_needed: number;
  no: number;
  total: number;
}

export interface ParticipantSummary {
  id: number;
  display_name: string;
  last_updated_at: string;
}

export interface PublicEventResponse {
  event: EventPublic;
  time_slots: TimeSlot[];
  final_selection: number[];
  aggregated: Record<string, AggregatedCounts>;
  participants: ParticipantSummary[];
}

export interface OrganizerEventResponse extends PublicEventResponse {
  event: EventPublic & {
    id: number;
    public_token: string;
    organizer_token: string;
    updated_at: string;
  };
}

// For grid rendering
export interface GridCell {
  timeslot_id: number | null;
  date: string;
  time: string;
  enabled: boolean;
  status?: AvailabilityStatus;
  aggregated?: AggregatedCounts;
}

export interface GridData {
  dates: string[];
  times: string[];
  cells: GridCell[][];
}
```

---

## 7. Grid Rendering Logic

### 7.1. Transform API Data to Grid Structure

```typescript
function buildGridData(timeSlots: TimeSlot[]): GridData {
  // 1. Extract unique dates (sorted)
  const dates = Array.from(new Set(timeSlots.map(slot => slot.date))).sort();

  // 2. Extract unique time ranges (sorted by start_time)
  const timeRanges = Array.from(
    new Set(timeSlots.map(slot => `${slot.start_time}-${slot.end_time}`))
  ).sort();

  // 3. Build lookup map: `${date}_${time}` -> timeslot_id
  const slotMap = new Map<string, number>();
  timeSlots.forEach(slot => {
    const key = `${slot.date}_${slot.start_time}-${slot.end_time}`;
    slotMap.set(key, slot.id);
  });

  // 4. Build 2D grid
  const cells: GridCell[][] = timeRanges.map(timeRange =>
    dates.map(date => {
      const key = `${date}_${timeRange}`;
      const timeslotId = slotMap.get(key) ?? null;
      return {
        timeslot_id: timeslotId,
        date,
        time: timeRange,
        enabled: timeslotId !== null,
        status: undefined,
        aggregated: undefined
      };
    })
  );

  return { dates, times: timeRanges, cells };
}
```

### 7.2. Render Grid Component

```tsx
function TimeGrid({ gridData, selections, onCellChange, isDragging, onDragStart, onDragEnd }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th></th>
            {gridData.dates.map(date => (
              <th key={date} className="px-4 py-2 border">
                {formatDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridData.times.map((time, rowIndex) => (
            <tr key={time}>
              <th className="px-4 py-2 border text-sm">{time}</th>
              {gridData.cells[rowIndex].map((cell, colIndex) => (
                <GridCell
                  key={`${cell.date}_${cell.time}`}
                  cell={cell}
                  status={selections[cell.timeslot_id]}
                  onChange={(newStatus) => onCellChange(cell.timeslot_id, newStatus)}
                  onMouseDown={() => onDragStart(cell.timeslot_id, selections[cell.timeslot_id])}
                  onMouseEnter={() => isDragging && onCellChange(cell.timeslot_id, dragStatus)}
                  onMouseUp={onDragEnd}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 8. MVP Frontend Checklist

To "畫出來" and have a functional MVP, the frontend should:

### Core Routes
- [ ] Implement the routes: `/`, `/event/[public_token]`, `/manage/[organizer_token]`
- [ ] Render a basic but clear landing page with a "Create a event" button and form
- [ ] Call `POST /events` to create a event and redirect to organizer view

### Participant View (`/event/[public_token]`)
- [ ] Fetch event details and time slots
- [ ] Transform time slots into aligned grid structure
- [ ] Render WhenIsGood-style grid with dates × times
- [ ] Allow entering participant name
- [ ] Implement click-to-toggle on individual cells
- [ ] Implement drag-to-paint for bulk selection
- [ ] Show visual feedback (colors) for yes/if_needed/no
- [ ] Submit availability via `POST /events/{public_token}/availability`
- [ ] Handle draft/open/finalized states correctly

### Organizer View (`/manage/[organizer_token]`)
- [ ] Fetch organizer event details
- [ ] Show public link with copy-to-clipboard
- [ ] **Draft State**:
  - [ ] Implement bulk time slot generator UI (date range + time range + interval)
  - [ ] Show preview of slots to be generated
  - [ ] Allow manual add/remove of individual slots
  - [ ] Call `PUT /organizer/events/{organizer_token}/timeslots` to save
  - [ ] Show "Open event" button
- [ ] **Open State**:
  - [ ] Render heat map grid with aggregated data
  - [ ] Show color intensity based on availability
  - [ ] Display hover tooltips with detailed counts
  - [ ] Allow selecting slots for finalization
  - [ ] Show "Finalize event" button with selected slots
  - [ ] Call `POST /organizer/events/{organizer_token}/finalize`
- [ ] **Finalized State**:
  - [ ] Highlight final selected time(s)
  - [ ] Show read-only aggregated view
  - [ ] Display public link for sharing

### Polish
- [ ] Responsive design (mobile-friendly grid)
- [ ] Loading states for API calls
- [ ] Error handling and user feedback
- [ ] Smooth transitions and hover effects
- [ ] Time zone display
- [ ] Toast notifications for save confirmations

Once this checklist is done, the UI is effectively "drawn" and end-to-end flows can be tested visually.

---

## 9. Future Enhancements (Post-MVP)

- **Participant individual views**: Click a participant to see their selections
- **Real-time updates**: WebSocket for live aggregation updates
- **Calendar integration**: Export finalized time to Google Calendar / iCal
- **Email notifications**: Notify participants when event opens/finalizes
- **Custom branding**: Allow organizers to customize colors/logo
- **Event templates**: Save commonly used time ranges
- **Anonymous mode**: Allow participation without display name
- **Comments**: Let participants add notes/constraints
