### instructions

If mode is `plan`:
- Review the provided @task under given @context, write @analysis for the rootcause of the problem, and @fix_plan to resolve the problem. Add all relevant files to the @related_files section. Update this document at the end.

If mode is `execute`:
- If the @fix_plan is not provided, ask the user for confirmation.
- Execute the @fix_plan.

### context

Kaizen OS daily dashboard has two UX issues:
1. Calendar events overflow the viewport — users must scroll to see the full day
2. Scratchpad exists as a separate route (`/scratchpad`) but would be more useful embedded inline in the day panel, replacing the current playlist view

### task

1. Shrink calendar events so everything fits in one screen
2. Delete scratchpad as a unique route; merge its functionality into the day panel playlist, turning it into a fast responsive scratchpad. Make today's playlist an ordered list.

### analysis

**Calendar overflow:**
- `CalendarPanel.tsx:613-616` sets calendar height to 500px (plan mode) / 300px (normal)
- `step={30}` and `timeslots={2}` allocate generous vertical space per slot
- Event font is already 11px but padding/slot height still pushes content beyond viewport
- The calendar spans 5 AM–10 PM (17 hours), each with 2 slots = 34 rows — too many for a fixed 500px container without scroll

**Scratchpad as separate page:**
- `ScratchpadPage.tsx` is a full TipTap rich text editor with toolbar, auto-save, and formatting
- Routed at `/scratchpad` in `App.tsx:58`
- The day panel's `AmmoPanel` (playlist) already shows today's work items but is a simple list — no inline editing or note-taking
- Users context-switch between scratchpad and dashboard, losing flow

### fix_plan

#### Part 1: Shrink Calendar Events

**Goal:** All calendar content fits in one viewport without scrolling.

1. **Reduce time range** — change `min` from 5 AM to 7 AM and `max` from 10 PM to 9 PM in `CalendarPanel.tsx:631-644`. This cuts 4 hours (8 slots) of rarely-used space.

2. **Reduce slot height** — decrease `step` from 30 to 15 and `timeslots` from 2 to 1. This halves the vertical space per time unit while keeping 15-min granularity.

3. **Compact event styling** — in `CalendarPlanMode.css`:
   - Reduce event padding from `0 4px` to `0 2px`
   - Reduce event font to `10px`
   - Tighten `line-height` to `1.1`

4. **Reduce calendar container height** — lower plan-mode height from 500px to 400px; normal mode from 300px to 250px.

5. **Verify** the calendar still renders all events legibly at common screen sizes (1080p+).

#### Part 2: Replace Playlist with Inline Scratchpad

**Goal:** Remove `/scratchpad` route; embed scratchpad into day panel; make playlist an ordered list.

1. **Make playlist an ordered list** — in `AmmoPanel.tsx`, change the playlist items container from unordered to numbered. Add sequence numbers (1, 2, 3…) before each item. Support drag-to-reorder so users can prioritize.

2. **Add scratchpad section to AmmoPanel** — below the playlist, add a collapsible "Scratchpad" section with a lightweight TipTap editor (reuse config from `ScratchpadPage.tsx`). Keep the toolbar minimal (bold, italic, lists only). Auto-save with the same 1s debounce pattern.

3. **Extract reusable editor component** — pull TipTap setup from `ScratchpadPage.tsx` into a shared `InlineScratchpad` component that both the old page and new panel can use during transition.

4. **Remove scratchpad route** — delete the route from `App.tsx:58`, remove `ScratchpadPage.tsx` and `ScratchpadPage.css`. Update any navigation links pointing to `/scratchpad`.

5. **Persist scratchpad content per day** — store content keyed by date so each day has its own scratchpad. Reuse existing save mechanism.

6. **Verify** the day panel fits in one screen with: top-3 outcomes + ordered playlist + inline scratchpad.

### success criteria

**functional (verify with unit and integration tests)**
- Calendar renders all events within viewport at 1080p without scrolling
- Playlist items display with sequential numbers (1, 2, 3…)
- Scratchpad content saves and loads per-day
- `/scratchpad` route returns 404 or redirects to dashboard
- Drag-to-reorder updates playlist order

**ui (verify using ui testing and browser)**
- Calendar events are legible at reduced size (10px font, tighter padding)
- Day panel (outcomes + playlist + scratchpad) fits in one screen at 1080p
- Scratchpad editor supports bold, italic, lists with responsive input
- No layout overflow or horizontal scroll on any panel

**non-functional**
- Auto-save latency stays under 1s
- No regression in calendar drag-to-assign functionality
- Page load time does not increase

### related_files

- `projects/kaizen_os/app/src/App.tsx` (route config, line 58)
- `projects/kaizen_os/app/src/pages/ScratchpadPage.tsx` (to be removed)
- `projects/kaizen_os/app/src/pages/ScratchpadPage.css` (to be removed)
- `projects/kaizen_os/app/src/components/landing/CalendarPanel.tsx` (event rendering, lines 103-130, 613-644)
- `projects/kaizen_os/app/src/components/landing/CalendarPlanMode.css` (event styles, lines 2-17)
- `projects/kaizen_os/app/src/components/daily/AmmoPanel.tsx` (playlist, lines 39-216)
- `projects/kaizen_os/app/src/components/daily/DailyDashboard.tsx` (layout, lines 33-242)
- `projects/kaizen_os/app/src/components/daily/DailyDashboard.css` (playlist styles, lines 500-760)
