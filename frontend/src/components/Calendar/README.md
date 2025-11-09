# Calendar Components Architecture

## Component Separation Strategy

To prevent changes to one calendar view from affecting others, we use a **composition-based architecture** with clear separation of concerns:

### 1. **CalendarGrid** (Main Calendar Component)
- **Purpose**: Renders the main calendar view (read-only)
- **Responsibilities**: 
  - Display calendar grid structure
  - Handle assignment calendar display and drag/drop
  - Display class schedule items (read-only via `ClassScheduleDay`)
- **Does NOT handle**: Class schedule edit mode (that's on a separate page)

### 2. **ClassScheduleDay** (Read-Only Display)
- **Purpose**: Pure presentational component for class schedule items
- **Used by**: Main calendar (read-only mode)
- **No edit logic**: Just displays text and opens modal on click

### 3. **EditableClassScheduleDay** (Edit Mode Display)
- **Purpose**: Component for editable class schedule items
- **Used by**: Semester edit view, Future Planning edit mode
- **Handles**: Pickup, drop, fixed item detection

### 4. **SemesterEditView** (Separate Page)
- **Purpose**: Full semester view for editing class schedules
- **Uses**: Its own calendar grid component (not shared with main calendar)
- **Isolated**: Has its own state, handlers, and CSS

## Key Principles

1. **No Shared Edit State**: Main calendar never enters edit mode for class schedule
2. **Composition Over Conditionals**: Use different components instead of conditional rendering
3. **Separate Pages**: Edit views are separate routes, not modals
4. **Scoped CSS**: Each view has its own CSS file

## Adding a New Calendar View

When creating a new calendar view (like semester edit):

1. Create a new page component (e.g., `SemesterEditView.js`)
2. Create its own calendar grid component (don't reuse `CalendarGrid`)
3. Use `EditableClassScheduleDay` for editable items
4. Create a separate CSS file
5. Add a new route in `App.js`

This ensures changes to one view never affect another.

