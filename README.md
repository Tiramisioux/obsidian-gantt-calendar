# Gantt Calendar — Tiramisioux fork

A fork of [Gantt Calendar](https://github.com/sustcsugar/obsidian-gantt-calendar) by Sugar, made for a vault that tags its tasks in Swedish and colours them by a fixed convention. Everything below is in addition to — or a fix of — the upstream plugin; the upstream README follows further down.

**Plugin id `gantt-calendar-tiramisioux`** (upstream: `gantt-calendar`), so community-store updates of the original never overwrite it. Both register the same views, so **only one of the two may be enabled**. Branch `tiramisioux` holds all fork work; `master` follows upstream. Forked at release **1.6.2**.

## What this fork adds

| | What you get |
|---|---|
| **Tags in any script** | `#röd`, `#grå`, `#DOK/styrelsemöte_oktober`, `#Åsa_Öberg` are read whole. Upstream only knew ASCII + Chinese, so `#röd` became the tag `#r` plus the loose text `öd` — and when the plugin wrote a task back (tick, drag, resize) it saved that broken line into the note. Hyphens and macOS's decomposed letters (`o` + `¨`) are tag characters too. |
| **Your line order on write-back** | A task the calendar rewrites keeps the vault's order: `text #colour #PROJECT #PROJECT/sub [start:: …] [due:: …]`. Upstream put the tags in front of the text. |
| **Colour tags = task colours** | A task's colour is its colour tag, in the exact row colours of the vault snippet `highlight-tags.css`: cards (all views), gantt bars (tint + outline), tag chips. Done tasks keep the colour at 40 %, as in a note. Every other tag looks like an ordinary Obsidian tag (no random pastel). |
| **Meeting and shooting days** | Month view: a day with a `#röd` task (a meeting) or a `#lila` task (an inspelningstillfälle) gets that colour in its date field — both on one day → **lila** (a shooting day blocks the whole day). |
| **Open a project in the calendar** | File menu **Open in Gantt calendar** (notes and folders) and the command **Open the active note's project in the calendar** (**⌘⇧C**, change in Settings → Hotkeys). The calendar then shows only that kontext/projekt, subprojects included — plus the days *other* projects have booked, in a lighter tint: every `#lila` (an inspelningstillfälle takes the whole day, with or without times) and every **all-day** `#röd` (a meeting without a clock time; timed meetings stay hidden). A bar under the toolbar names the scope; **×** (or the command **Show all projects in the calendar**) shows everything again. |
| **Completed tasks shown** | Every view shows done tasks by default (status filter *todo + done*; upstream: *todo* only). Views you had left on the old default were switched once at the first start of `.3`; a filter you set yourself is kept. Done tasks keep their colour at 40 % — cards and gantt bars; a done task without a colour tag is a plain card at 40 % (no green status colour), like a ticked line in a note. |
| **Gantt and month open on all tags** | The gantt and month views always start unfiltered — no tag selected = every tag shown. A tag you pick there filters for the session but isn't restored at the next start (upstream kept the last selection, so a view could open on one project). The other views keep their saved tag filters. |
| **Sync id hidden** | The calendar bridge's hidden `(id:: a1b2c3)` on a todo line is not shown in cards, tooltips, drag chips or gantt bar names. Display only: every write-back (tick, drag, resize, edit) keeps it, or the Obsidian ↔ Apple Calendar sync would lose the todo. |
| **Only the colours on cards** | Calendar cards show the task text in its colour, without tag pills (`#röd`, `#UND` …). The **#** button in the toolbar (task list and calendar views) or the command **Visa/dölj taggtext i kalendern** brings the tag text back — then each view's own *show tags* setting applies. Tooltips always list the tags. |
| **Follows the vault's tree contract** | *Open in Gantt calendar* reads the vault's tree from `.obsidian/vault-struktur.json` (areas `01_HEM/`, `02_PROJEKT/`, `03_RISE/`, an `_archive/` per kontext) through the vendored library `src/fork/vault_struktur.js`, so the folder layout is no longer written into the plugin. Archived projects (and whole archived kontexts) scope exactly like active ones. Without the contract file the command shows a notice and does nothing. |
| **Latin ribbon name** | The ribbon icon says *Gantt Calendar* (upstream: 甘特日历 whatever the language). |

### The colours

| Tag | Card / chip | Ink | Means |
|---|---|---|---|
| `#blå` | `#d0e7ff` | `#1c3d5a` | creative work |
| `#gul` | `#fff3cd` | `#665c00` | shaping / analysis |
| `#orange` | `#fde2cf` | `#995200` | admin, communication |
| `#grå` | `#e5e5e5` | `#555555` | travel, waiting on others |
| `#röd` | `#f8d7da` | `#842029` | meeting — marks its day |
| `#lila` | `#e6d9f6` | `#5c3a78` | inspelningstillfälle (shooting day) — marks its day |
| `#grön` | `#d3f4d1` | `#205d28` | home |

The first colour tag on a line decides. Defined in `src/fork/vaultColors.ts` and `src/styles/fork.css`.

### What "a project" means here

| Opened from | The calendar shows |
|---|---|
| a project folder `01_HEM/<PROJ>`, `03_RISE/<PROJ>` or `02_PROJEKT/<CTX>/<PROJ>` (or anything inside it), also under `_archive/` | project `<PROJ>` |
| a kontext folder: `01_HEM`, `03_RISE`, or a kontext folder of `02_PROJEKT` (`02_PROJEKT/<CTX>`, also `02_PROJEKT/_archive/<CTX>`) | context `<CTX>` |
| a note with `projekt: "#PROJ"` (hub, subproject note, clipping, person hub) | project `PROJ` |
| a note inside a project folder without `projekt` | that project |
| a note at kontext level (`<kontext folder>/notes/…`, `_inbox.md`) or with only `kontext:` | that context |
| any other folder / note | the tasks in it |

A task belongs to project `P` when it is tagged `#P` or `#P/<sub>`, or its note has `projekt: "#P…"` / `delprojekt: "#P/…"`, or its path resolves to `P` (its folder, archived or not). Context `C`: `#C`, `kontext: C`, or a path that resolves to the kontext. Same rules as the 3D graph fork's *Open in 3D graph*. While a scope is open, the tag filters you had saved are set aside (not changed) — pick a tag to narrow inside the scope; after × your filters are back.

## Install / update

Built files go to `<vault>/.obsidian/plugins/gantt-calendar-tiramisioux/` (`main.js`, `manifest.json`, `styles.css`; the fork's `data.json` started as a copy of the original's). Disable *Gantt Calendar*, enable *Gantt Calendar (Tiramisioux)*. Versions are `1.6.2-tiramisioux.N`.

## Building

```bash
npm ci
npm run build          # tsc + esbuild → main.js, styles.css
npx jest               # upstream suite + tests/fork.test.ts
cp main.js manifest.json styles.css "<vault>/.obsidian/plugins/gantt-calendar-tiramisioux/"
```

Fork code is marked `fork:`; the fork's own files are `src/fork/` (`vaultColors.ts`, `scope.ts`, `pluginId.ts`, `ScopeBar.tsx`, and `vault_struktur.js` + `.d.ts` — a byte copy of `obsidian-vault-functions/lib/vault_struktur.js`, never edited here; `tests/fixtures/vault_struktur_cases.json` is the shared case file), `src/styles/fork.css`, `tests/fork.test.ts`. Live testing against a running Obsidian (`--remote-debugging-port=9222`): `node scripts/dev/cdp.mjs '<js>'`, `node scripts/dev/shot.mjs out.png`.

---

# Obsidian Gantt Calendar

[简体中文](./README_zh.md)

<div align="center" style="padding: 20px; border: 2px solid #8b5cf6; border-radius: 12px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%); margin: 20px 0;">

A powerful visual task management plugin for Obsidian.

**Multi-View Calendar** — Task / Year / Month / Week / Day / Gantt — six views with seamless switching

**Festival Display** — Solar festivals, lunar festivals, and 24 solar terms

**Data Visualization** — Task heatmap, daily task counts, 8 gradient palettes

**Smart Task Management** — Global filter, priority tags, 6 date fields, time precision (HH:mm), smart write-back with line drift protection

**Timeline Canvas** — Continuous minute-positioned timeline in Week/Day/Sidebar views: click-to-create, edge resize (15-min snap), WYSIWYG drag with landing preview

**Mobile Ready** — Long-press menus as bottom sheets, touch drag, swipe paging, responsive layouts

**Daily Note Integration** — Embedded editor with edit/preview mode toggle

**Sidebar View** — Task search, filter & sort + daily timeline

**Highly Customizable** — Festival colors, heatmap palettes, task display count, and more

**Dual Format** — Full support for Tasks plugin (emoji) and Dataview plugin (inline field) formats

**Recurring Tasks** — daily/weekly/monthly/yearly repeat with virtual instances shown across all views (Year/Month/Week/Day/Task/Gantt)

**Feishu Sync** — Bidirectional task sync with Feishu (Lark) via OAuth 2.0

</div>

---

## Screenshots

Year View
![YearView](./docs/images/gantt-calendar-YearView.png)

Gantt View
![GanttView](./docs/images/gantt-view.png)

Week Timeline View
![WeekTimeline](./docs/images/gantt-calendar-weekview-timeline.png)

Sidebar View (Task List + Daily Timeline)
![SidebarView](./docs/images/gantt-calendar-sidebar-timeline.png)

Day View with Embedded Editor
![DayViewEditor](./docs/images/gantt-calendar-day-view.png)

## Installation

### Via BRAT

1. Install and enable the community plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Run the command `BRAT: Add a beta plugin for testing`
3. Enter the repository URL: `https://github.com/sustcsugar/obsidian-gantt-calendar`

### Manual

1. Download the latest [Release](https://github.com/sustcsugar/obsidian-gantt-calendar/releases)
2. Extract and copy the folder to `<your-vault>/.obsidian/plugins/`
3. Restart Obsidian and enable the plugin in Settings

## Quick Start

### Open the View

- Click the **sidebar icon** to open the main calendar view
- Use the **view switcher** in the toolbar to switch between views

### Create Tasks

Use the **Add Task** button in the toolbar, or manually write tasks in any Markdown file:

```markdown
- [ ] 🎯 Complete project documentation 📅 2025-12-20
```

Refresh the plugin and the task will appear in the calendar and task list.

## Features

### Layout

The plugin uses a **toolbar + content area** layout:

- **Toolbar Left** — View switcher (6 views)
- **Toolbar Center** — Current date range / title
- **Toolbar Right** — Functional buttons (navigation, sort, filter, add task, etc.)

### Task Formats

**Tasks Plugin Format (Emoji)**

```markdown
- [ ] 🎯 Complete project documentation ⏫ ➕ 2025-01-10 📅 2025-01-15
```

| Emoji | Meaning | Emoji | Meaning |
|-------|---------|-------|---------|
| `🎯` | Global filter marker | `🔺` | Highest priority |
| `⏫` | High priority | `🔼` | Medium priority |
| `🔽` | Low priority | `⏬` | Lowest priority |
| `➕` | Created date | `🛫` | Start date |
| `⏳` | Scheduled date | `📅` | Due date |
| `✅` | Completion date | `❌` | Cancelled date |
| `🔁` | Recurring task | - | - |

**Dataview Plugin Format (Inline Fields)**

```markdown
- [ ] 🎯 Complete project documentation [priority:: high] [created:: 2025-01-10] [due:: 2025-01-15]
```

| Field | Meaning | Field | Meaning |
|-------|---------|-------|---------|
| `priority::` | Priority | `created::` | Created date |
| `start::` | Start date | `scheduled::` | Scheduled date |
| `due::` | Due date | `completion::` | Completion date |
| `cancelled::` | Cancelled date | `repeat::` | Recurrence rule |

**Time Precision**

- Date: `YYYY-MM-DD` (e.g., `2026-04-27`)
- Time: `YYYY-MM-DD HH:mm` (e.g., `2026-04-27 14:00`)
- Tasks with time automatically display in timeline layout

**Recurring Task Syntax**

```markdown
🔁 every day              # Every day
🔁 every 3 days           # Every 3 days
🔁 every week on Monday   # Every Monday
🔁 every month on 15      # Every month on the 15th
🔁 every year on 01-01    # Every year on Jan 1
🔁 every weekday          # Every weekday
🔁 when done              # Restart after completion
```

### Year View

- **Year Overview** — 12 month cards showing full-year task distribution
- **Task Heatmap** — 5-level color gradient for task density
  - 8 palette options: blue / green / red / purple / orange / cyan / pink / yellow
  - 3D heatmap effect (off / slight / prominent)
- **Responsive Layout** — Auto-switches between 4×3 / 3×4 / 2×6 / 1×12 grids
- **Task Count** — Optional per-day task total display
- **Lunar Calendar** — Chinese lunar dates in month cards
- **Click Navigation** — Click a date to switch to Day View

### Month View

- **Monthly Calendar** — Standard month grid layout with daily tasks
- **Week Numbers** — ISO week numbers shown in the first column
- **Task Display Limit** — Configurable per-day task count (1–10) with "+N more" overflow
- **Task Popup** — Click a date to view all tasks for that day
- **Festival Display** — Solar/lunar/solar-term festivals with distinct colors
- **Drag & Drop** — Drag task cards between days to reschedule
- **Recurring Tasks** — Virtual instances for repeating tasks
- **Week Start** — Configurable Monday or Sunday start

### Week View

- **Continuous Time Canvas** — Always-on 24-hour timeline (no more list/timeline mode switching); task blocks positioned by the minute (1h = 50px), hour + half-hour grid lines
- **Smart Task Blocks** — Blocks sized by actual duration:
  - Single-time tasks render as 1-hour point blocks anchored by field role (start-field → forward `[t, t+60)`, due-field → backward `[t-60, t)`)
  - Same-day intervals render at true size; overnight intervals (<24h) span columns with continuation arrows
  - Multi-day tasks (≥24h) move to the all-day row as spanning bars with time annotations (`"22:00 → 18:00"`)
  - Text wraps to multiple lines within block bounds (block is master, text is servant)
- **All-Day Row** — Date-only tasks + ≥24h spanning bars, unlimited lane rows with `+N` collapse beyond 3
- **Click-to-Create** — Click any empty canvas spot to create a task at that time (15-min snap); drag vertically to pre-select a range
- **Edge Resize** — Drag block top/bottom edges to adjust start/end (15-min snap, Alt = 5-min fine-tune); resizing a point task upgrades it to an interval
- **WYSIWYG Drag & Drop** — Landing anchored to block edges (not cursor) with drop preview; dropping a point task writes both start & end
- **Overlap Lanes** — Up to 3 side-by-side columns; 4th+ stacks with shadow
- **Mobile** — 3-day sliding window with horizontal swipe
- **Today Highlight** — Current day emphasized; current time indicator line
- **Lunar Info** — Lunar dates and festivals in day headers

### Day View

- **Continuous Time Canvas** — Same timeline semantics as Week View (minute-positioned blocks, edge resize, click-to-create, drop preview, multi-line text)
- **All-Day Section** — Date-only tasks + ≥24h spanning bars with time annotations; drop here to convert to all-day
- **Drag & Drop** — Block-edge-anchored with landing preview; point tasks upgrade to intervals on drop
- **Current Time Indicator** — Red line at the current time
- **Daily Note Integration**
  - Embedded full editor (WorkspaceSplit mode)
  - Edit / Preview mode toggle
  - Auto-loads daily note for the selected date
  - Supports Obsidian core daily notes, Periodic Notes plugin, and custom paths
- **Resizable Split** — Draggable divider between task and note panes (horizontal or vertical layout)
- **Lunar Info Bar** — Lunar date, festivals, and solar terms

### Task View

- **Task List** — Centralized display of all tasks
- **Date Range Filter** — All / Today / This Week / This Month / Custom range
- **Time Field Selector** — Filter by any of 6 date fields
- **Multi-dimensional Filtering** — Status, priority, and tags (AND/OR/NOT operators)
- **Sorting** — 7 sort fields with asc/desc toggle
- **Persistent State** — Filter and sort settings persist across refreshes
- **Recurring Tasks** — Virtual instances for repeating tasks are expanded and sorted by date

### Gantt View

- **Interactive Gantt Bars** — Custom SVG rendering engine
  - Drag entire bar to shift dates
  - Drag endpoints to adjust start/end dates
  - Drag to change progress percentage
  - Click to open task edit modal
- **Navigation** — Jump to today / scroll left / scroll right
- **Incremental Refresh** — Fingerprint-based diff (O(1) events) + immediate drag-write-back (no delay)
- **Tag & Status Filtering** — Filter gantt bars by tags and status
- **Configurable Fields** — Choose which date fields map to gantt start/end
- **Time-Aligned** — Day-granularity grid aligned with calendar view semantics; touch-friendly handles (22px hit area); bar-end time annotations

### Sidebar View

Two-tab sidebar for quick task access:

**Task List Tab**
- Keyword search (debounced)
- Multi-dimensional filters: status, priority, tags (OR/AND), date range
- Sort by: priority / due date / start date
- Click a task card to jump to the source file or open the edit panel (Settings → General → Task Card Click)

**Daily Timeline Tab**
- 24-hour timeline for timed tasks (defaults to today)
- Date navigation on the right of the title row (previous / today / next)
- All-day task section
- Current time indicator line
- Drag & drop to adjust time
- Quick create on empty slots

### Context Menu

Right-click any task for:

- **Edit Task** — Full edit modal (description, priority, dates, repeat, tags)
- **Create Note** — Generate a wiki-linked note from the task (same name or alias)
- **Set Priority** — 6 levels: highest / high / medium / normal / low / lowest
- **Set Status** — Custom statuses (important, question)
- **Postpone** — Delay 1/3/7 days (from due date or from today)
- **Cancel / Restore** — Toggle cancelled state
- **Delete** — Remove task from markdown file

### Feishu (Lark) Sync

- **Bidirectional Sync** — Push local tasks to Feishu and pull Feishu tasks to Obsidian
- **OAuth 2.0** — Secure authentication with automatic token refresh
- **Push Filters** — Filter by file paths, completion status, and date
- **Conflict Resolution** — Multiple strategies: local-wins, remote-wins, newest-wins, manual
- **Auto Sync** — Configurable automatic sync interval
- **Sync Result Modal** — Detailed per-task sync results with statistics

## Roadmap

### Task Parsing
- [x] Tasks and Dataview dual-format parsing
- [x] Global filter markers
- [x] Task tags
- [x] Task description
- [x] 6 priority levels
- [x] 6 date fields with time precision (HH:mm)
- [x] Recurring task recognition and display
- [x] Recurring task virtual instances across all views (Year/Month/Week/Day/Task/Gantt)
- [x] Smart write-back (line drift protection, file-level locking, mixed-format preservation)
- [ ] Nested tag recognition
- [ ] Multi-line task recognition
- [ ] Sub-task recognition
- [ ] Task dependency relationships

### Views
- [x] Day View with Daily Note integration (embedded editor)
- [x] Day View timeline layout
- [x] Week View dual mode (list + timeline)
- [x] Week/Month View drag & drop
- [x] Year View heatmap and task count
- [x] Task View (multi-dimensional filter + date range + recurring task virtual instances)
- [x] Gantt View (drag + incremental refresh + navigation + recurring task virtual instances)
- [x] Sidebar View (task list + daily timeline)

### Toolbar
- [x] View switcher
- [x] Tag / status / priority filtering
- [x] Date navigation buttons
- [x] Time field selector
- [x] Add task button

### Interactions
- [x] Task cards (description, tags, priority)
- [x] Context menu (edit, create note, priority, status, postpone, cancel, delete)
- [x] Hover tooltips
- [x] Quick create on empty time slots

### Future Plans (v2.0.0)
- [ ] Third-party calendar subscription (Feishu Calendar, Outlook Calendar)
- [ ] Microsoft To Do sync
- [ ] Google / Apple Calendar via CalDAV

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT](LICENSE)

---

<div align="center">

Found a bug or have a suggestion? Open an [Issue](https://github.com/sustcsugar/obsidian-gantt-calendar/issues)

Enjoying the plugin? Give it a ⭐!

</div>
