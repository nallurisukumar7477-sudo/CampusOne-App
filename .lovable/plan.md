# CampusOne Redesign — "Notice Board — Paper & Ink"

## Status: DRAFT — audit findings pending

## 1. What we found broken / incomplete (audit)

- PLACEHOLDER — will be filled from the code audit + database check.

Confirmed from the database so far:
- `faculty_assignments` table is EMPTY (0 rows) — the single faculty/mentor account has no class assignments, so class-scoped rosters come back empty.
- `attendance_records` is EMPTY (0 rows) — student attendance view shows only the empty state; nothing is broken in the query itself.
- The mentor account (Nagaraju) has no department set on its profile.
- 154 students + 1 faculty in `user_roles`; 5 published timetables with 180 entries; 0 notices.

## 2. Confirmed decisions from you

- Timetable and Admin: KEEP and redesign in the Paper & Ink style.
- Events: UI-only mockup screens (no database work in this pass).
- Roll numbers: hidden from every screen; remain in the database for demo-data identification.
- "Faculty" is renamed to "Mentor" everywhere in the UI (database role value stays untouched).

## 3. Design direction — "Notice Board — Paper & Ink"

Palette (light only; dark mode intentionally retired):
- Paper `#F3EBDD` background
- Ink `#1B1A17` text and borders
- Highlighter Yellow `#F2C230` accent / priority
- Stamp Red `#C8372D` absent / urgent / errors
- Chalk Green `#2F6B4F` present / success
- Pencil Grey `#8A8578` secondary text

Type:
- Fraunces — headings
- IBM Plex Sans — body
- IBM Plex Mono — dates, times, counters (loaded via `<link>` in the root route head)

Visual rules:
- 2px corner radius, 1.5px ink borders, hard offset shadows (no blur)
- Subtle paper grain texture on surfaces
- Perforated ticket edges where a "slip" makes sense
- Stamp-style badges (circular/rectangular ink stamps)
- No gradients, no glassmorphism, no soft rounded-card grids

## 4. Module personalities

- Attendance: register-book layout; ink tick = Present, red stamp = Absent; Total/Present/Absent counters in mono font.
- Notices: pinned paper notes on a board with slight varied rotation; highlighter strip marks priority.
- Events: ticket stubs with large mono date; category as stamp label (UI-only mockup).
- Notifications: slip-style list; unread = highlighter dot.
- Student Dashboard: light paper — welcome note, latest 5 notices, next 3 events.
- Mentor Dashboard: darker ink-heavy workspace for management tasks.

## 5. The 14 areas

1. Student Dashboard — rebuild on paper theme: welcome note, today strip (redesigned), latest 5 notices, next 3 events (mockup), attendance summary counters.
2. Mentor Dashboard — one darker workspace page merging today's Faculty Panel stats + quick links.
3. Student Profile — paper form/cards, roll number hidden.
4. Mentor Profile — NEW page (today mentors have no profile screen).
5. My Classes — class cards + student drill-down, search.
6. Attendance Management (mentor) — register-book roster, ink tick / red stamp, summary counters, save + edit.
7. Student Attendance View — history ledger + threshold status.
8. Notices Management (mentor) — create/edit/delete with category, priority, targeting.
9. Student Notices — pinned-note board.
10. Events Management (mentor) — UI-only mockup.
11. Student Events — UI-only mockup ticket stubs.
12. Notifications — slip-style bell dropdown.
13. Auth + Profile Setup — paper-styled sign-in/sign-up with password checklist.
14. Navigation — desktop sidebar, mobile BOTTOM nav bar (replaces today's drawer menu); separate Student and Mentor items; "Mentor" wording only.

## 6. Fixes included before/alongside the redesign

- Attendance Management must not depend on `faculty_assignments` (table is empty): mentor selects Dept → Course → Section directly and the roster loads.
- Seed the mentor's department/profile basics so selectors default sensibly.
- Remove roll numbers from all rendered lists.

## 7. Implementation phases

- Phase 0 — fix the attendance roster bug + mentor profile basics (works before restyle).
- Phase 1 — design system swap (tokens, fonts, grain/shadows/utilities) + navigation (sidebar + bottom nav, Mentor wording).
- Phase 2 — Auth + Profile Setup redesign.
- Phase 3 — Student Dashboard + Student Attendance + Student Notices + Notifications.
- Phase 4 — Mentor Dashboard + My Classes + Attendance Management + Mentor Profile.
- Phase 5 — Notices Management + Timetable (student) + Timetable Management + Admin redesign.
- Phase 6 — Events mockup screens (student + mentor, UI-only) + final state/empty/loading/error polish pass.

## 8. Non-goals

- No backend/database changes (except the Phase 0 profile fix via admin tooling, no schema change).
- No AI features, marks, or assignments.
- Roll numbers never rendered.
