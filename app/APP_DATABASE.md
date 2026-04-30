# Pessimistic Pals App Database

## Table of Contents
- [Overview](#overview)
- [Currencies and Core Stats](#currencies-and-core-stats)
- [Needs System](#needs-system)
- [Care System](#care-system)
- [Task Console](#task-console)
- [Load System](#load-system)
- [Calendar System](#calendar-system)
- [Seasonal Interference and Seasonal Events](#seasonal-interference-and-seasonal-events)
- [Daily Disappointment](#daily-disappointment)
- [Anti-Achievements](#anti-achievements)
- [Habits](#habits)
- [Clone Lab](#clone-lab)
- [Pal System](#pal-system)
- [Item System](#item-system)
- [UI and UX Design System](#ui-and-ux-design-system)
- [State Architecture](#state-architecture)

## Overview
Pessimistic Pals is a mobile-first productivity app wrapped in a virtual pet structure. The user chooses a Pal, keeps that Pal marginally functional through routine maintenance, and earns Gloom by completing tasks, habits, check-ins, and calendar commitments. The app's voice is pessimistic, deadpan, and faintly hostile, but the actual mechanics reward consistency and structured planning.

Technical overview:
- Stack: plain HTML, CSS, and JavaScript
- Frameworks: none
- Build system: none
- Persistence: `localStorage` under `ppals_state`
- App version constant: `0.5.0`
- Main logic: `js/main.js`
- Data catalogs: `js/data.js`
- Styling: `css/main.css`
- Page routing: page-specific initialization via `body[data-page]`

## Currencies and Core Stats
This layer governs progress, pacing, and rewards. The app uses multiple currencies, but only Gloom is central to almost every loop.

### Gloom
Gloom is the primary currency. It is the most visible reward and the resource the player spends to keep their Pal from deteriorating.

Technical details:
- Base manual task reward constant: `TASK_REWARD = 5`
- Earned from:
  - manual task completion
  - calendar event completion
  - daily check-ins
  - Wheel of Gloom outcomes
  - Daily Disappointment outcomes
- Spent on:
  - Feed: 3
  - Entertain: 2
  - Sanitize: 4
  - Cure: 5
- Display style: generally zero-padded in `currency-value` UI

### XP
XP is a secondary progression value. It is awarded by Daily Disappointment and calendar effects, but it does not currently unlock or spend against a visible system.

Technical details:
- Earned from:
  - Daily Disappointment reward table
  - calendar pal impact templates
- Current role: accumulation only

### Luckdust
Luckdust is a rarer resource tied mainly to streak pacing and the clone system.

Technical details:
- Earned from:
  - streak milestones every 3 days
  - Wheel of Gloom
- Associated with:
  - Clone Lab status and future chamber cost logic
- Displayed prominently on Home, Care, Lab, and Streak screens

### Streak
The streak measures consecutive progress days, not merely app opens. It is anchored to actual progress.

Technical details:
- Shared progress anchor: `meta.lastProgressDate`
- Progress routes that can update it:
  - daily check-in
  - calendar completion links
- Advance rule:
  - if `lastProgressDate === today`, streak does not change
  - if `lastProgressDate === yesterday`, streak increments
  - otherwise streak resets to `1` on the next valid progress event
- Break detection happens in `prepareSessionState`
- Rewards:
  - every 3 streak days: +1 Luckdust
  - every 5 streak days: streak item via `maybeAwardStreakItem`

### Mood
Mood is the app's emotional pressure metric for each Pal. It acts as the bridge between productivity behavior and character response.

Technical details:
- Stored per pal in `palMoodLedger[palId].mood`
- Cap: `MAX_RELUCTANT_MOOD = 78`
- Raised by:
  - manual task completion
  - calendar pal impact
  - comfort action indirectly through `needs.mood`
- Lowered by:
  - neglect over time
  - overdue calendar pressure
  - some calendar high-load penalties

## Needs System
The active Pal's care state decays continuously. The player is expected to maintain a barely acceptable operational baseline rather than achieve ideal wellness.

### Need Values
| Need | Starting Value | Hourly Change | Direction | Important Thresholds |
|---|---:|---:|---|---|
| Hunger | 80 | 2.2 | decreases | `<= 25` critical |
| Boredom | 80 | 1.4 | decreases | `<= 25` critical |
| Mood | 60 | 0.8 | decreases | `<= 25` critical |
| Plague | 10 | 1.1 | increases | `>= 45` warn, `>= 75` plague tone, `>= 100` plagued |

### Visual Tone Rules
For hunger, boredom, and mood:
- `is-good`: above 55
- `is-warn`: 26 to 55
- `is-critical`: 25 and below

For plague:
- `is-good`: below 45
- `is-warn`: 45 to 74
- `is-plague`: 75 and above

### Plague State
Plague is the one need that rises instead of drains. It culminates in a hard state flag.

Technical details:
- Full plague threshold: `PLAGUE_THRESHOLD = 100`
- When plague reaches 100, `plagued` becomes `true`
- Cure clears the full-plague state and resets risk downward

## Care System
Care is where currencies and needs meet. It is the app's maintenance loop: spend Gloom, reduce deterioration, and react to daily randomness.

### Care Actions
| Action | Cost | Need Affected | Effect |
|---|---:|---|---:|
| Feed | 3 Gloom | Hunger | +28 |
| Entertain | 2 Gloom | Boredom | +22 |
| Comfort | 0 Gloom | Mood | +18 |
| Sanitize | 4 Gloom | Plague | -34 |
| Cure | 5 Gloom | Full plague state | clears plague condition |

### Wheel of Gloom
The wheel is a once-per-day random reward mechanism on the Care screen.

Wheel segments:
- `+6 Gloom`
- `+4 Gloom`
- `+2 Gloom`
- `+1 Luckdust`
- `+2 Luckdust`
- `Nothing`
- `Nothing`
- `Plague`

Behavior notes:
- One spin per day
- Result text persists in `care.lastWheelResult`
- Dialogue is pulled from `CARE_DIALOGUE[palId]` by result type
- The plague outcome forces a major setback rather than granting currency

### Orbit Burden Panel
This panel summarizes how the calendar is currently harming care stability.

Technical details:
- Data source: `getCalendarPressureSnapshot(state)`
- Shows:
  - overdue count
  - next orbit item
  - pressure note about care drag

## Task Console
The Task Console is the main productivity surface on Home. It shows manual and library tasks only. Calendar events live exclusively on the Schedule page and are not projected into the task list.

### Manual Tasks
Manual tasks are user-created items stored in `state.tasks`.

Schema:
```js
{
  id,
  title,
  completed,
  rewardClaimed,
  createdAt,
  completedAt,
  source,
  intensity,
  socialWeight,
  energyCost,
  dreadLevel,
}
```

Normalization rules:
- older tasks missing load fields are backfilled to `0`
- all four load fields are clamped to `0..5`
- manual tasks keep `source: 'manual'`

### Calendar / Task Separation
Calendar events are NOT merged into the task console. `getTaskConsoleEntries(state)` returns manual tasks only. Calendar occurrences are completed on the Schedule page via `completeCalendarOccurrence`. Calendar pressure (overdue mood penalties, pal dialogue) still flows through `getCalendarPressureSnapshot` / `applyCalendarOverduePressure` independently of the task list.

### Completed Drawer
Completed items are collapsed into a dedicated drawer under the active list.

Behavior:
- Hamburger-style toggle
- Count badge shows number of completed entries
- Holds completed manual / library tasks

### Task Row Anatomy
```text
[MARK / DONE] [Title] [TASK / LIB]
              [I N] [S N] [E N] [D N] [LOAD N]  <- rated manual tasks
              [Not rated yet]                  <- unrated manual tasks
              [Meta line]
```

### MARK and DONE Behavior
- Manual tasks toggle completion
- Calendar relay tasks mark an occurrence complete
- Completed calendar relay tasks are disabled in the UI

## Load System
Load is the main difficulty model shared between manual tasks and calendar events. It quantifies how heavy a task feels across four dimensions instead of treating all work as equal.

### Formula
```js
load = intensity + socialWeight + energyCost + dreadLevel
```

Range:
- minimum: `0`
- maximum: `20`

### Load Dimensions
- `intensity`: how demanding the task is
- `socialWeight`: how much human interaction it requires
- `energyCost`: how much it drains stamina
- `dreadLevel`: how much avoidance or dread it creates

### Manual Task Reward Logic
Manual tasks use load to scale both Gloom and mood gain.

Formulas:
```js
gloom = 5 + Math.floor(load / 2)
moodBoost = 6 + (load >= 12 ? 4 : load >= 6 ? 2 : 0)
```

Reward table:
| Load Range | Gloom Result | Mood Boost |
|---|---|---|
| 0 | 5 | +6 |
| 1-5 | 5-7 | +6 |
| 6-11 | 8-10 | +8 |
| 12-20 | 11-15 | +10 |

Worked example:
```text
intensity    = 3
socialWeight = 2
energyCost   = 3
dreadLevel   = 4
load         = 12

gloom        = 5 + floor(12 / 2) = 11
moodBoost    = 6 + 4 = 10
```

### Calendar Event Load Logic
Calendar events use the same four fields, but the downstream logic is different.

Key difference:
- manual tasks: direct formula-based payout
- calendar events: routed through `calculateCalendarPalImpact` and the active pal's calendar template

Calendar load consequences:
- contributes to overdue burden
- can trigger `highLoadPenalty` thresholds
- contributes to care and mood pressure when overdue

### Load in the UI
- rated manual tasks show `I / S / E / D` pills plus `LOAD N`
- unrated manual tasks show `Not rated yet`
- calendar tasks do not render the manual stat row

## Calendar System
The calendar is not just a planner. It is a cross-system pressure engine that affects tasks, streak, care, and Pal mood.

### Event Schema
```js
{
  id,
  title,
  date,
  startTime,
  endTime,
  allDay,
  category,
  recurrence,
  notes,
  intensity,
  socialWeight,
  energyCost,
  dreadLevel,
  seasonalEventId,
  createdAt,
  updatedAt,
}
```

### Categories
| Key | Label | Reaction Type |
|---|---|---|
| `focus` | Focus | `created` |
| `appointment` | Appointment | `created` |
| `social` | Social | `social` |
| `maintenance` | Maintenance | `maintenance` |
| `celebration` | Celebration | `celebration` |
| `recovery` | Recovery | `created` |

### Recurrence
| Key | Label |
|---|---|
| `none` | One Time |
| `daily` | Daily |
| `weekly` | Weekly |
| `monthly` | Monthly |

### Completion Log
Occurrences are completed individually and recorded in `state.calendar.completionLog`.

Entry schema:
```js
{
  eventId,
  date,
  completedAt,
}
```

### Core Calendar Functions
#### `completeCalendarOccurrence(eventId, occurrenceDate)`
- canonical completion path
- appends to completion log
- runs pal impact
- runs streak and habit links
- updates `calendar.lastInteraction`

#### `applyCalendarPalImpact(state, pal, event, actionType, latestReaction)`
- applies gloom, XP, and mood deltas based on template + category + action

#### `applyCalendarCompletionLinks(previousState, currentState, pal, event, latestReaction)`
- may log today's habit
- may advance primary streak
- may award milestone items
- updates `meta.lastProgressDate`

#### `getCalendarPressureSnapshot(state)`
Returns:
```js
{
  overdueOccurrences,
  overdueCount,
  overdueLoad,
  oldestOverdue,
  nextOccurrence,
  nextStatus,
}
```

#### `getCalendarInterferenceState(state, palId)`
Returns:
```js
{
  token,
  headline,
  detail,
}
```

#### `applyCalendarOverduePressure(state)`
- runs once per new day during session preparation
- penalizes `needs.mood`, `needs.boredom`, and pal mood
- writes a care dialogue warning

## Seasonal Interference and Seasonal Events
Seasonal Interference is a status lens layered across Home and Streak. It decides whether current atmosphere is being driven by seasonal content or by orbit pressure from the calendar.

### Interference Priority Order
1. active seasonal event
2. overdue calendar items
3. upcoming calendar items
4. default fallback

### Interference Output
The system returns:
- `token`: short uppercase system label
- `headline`: the main visible status line
- `detail`: supporting explanation or dialogue

### Seasonal Events
| Event ID | Name | Date Range | Theme Token |
|---|---|---|---|
| `annual_disappointment_reset` | The Annual Disappointment Reset | Jan 1-Jan 7 | `reset-gloom` |
| `ugh_fine_love` | Ugh, Fine. A Love Event. | Feb 10-Feb 14 | `bruise-heart` |
| `their_favorite_day` | Their Favorite Day (They Deny It) | Oct 25-Oct 31 | `hollow-delight` |

Each event includes:
- `exclusive_item_pool`
- `themed_dialogue_pool`
- `palDialogue[palId].banner_line`
- `palDialogue[palId].reaction_line`

## Daily Disappointment
Daily Disappointment is the app's login reward system. It is intentionally cynical in presentation, but functionally it is a once-per-day reward roll.

Reward table:
| Reward Type | Label | Weight | Amount |
|---|---|---:|---|
| `gloom_coins` | Gloom Coins | 3.2 | 2-6 |
| `xp` | XP | 2.2 | 4-9 |
| `cosmetic_item` | Cosmetic Item | 1.1 | one item |
| `nothing` | Literally Nothing | 4.5 | 0 |

Rules:
- one roll per day in `prepareSessionState`
- during seasonal events, cosmetic item weight increases by `0.4`
- results are stored in `dailyDisappointment.latestResult` and `rewardLog`

## Anti-Achievements
Anti-achievements are sarcastic milestones that reward suspicious patterns rather than heroic play.

| ID | Title | Unlock Condition |
|---|---|---|
| `tried_once` | Tried Once | First app open with no user-created tasks |
| `participation` | Participation | At least one completed task in a 7-day window |
| `it_could_be_worse` | It Could Be Worse | Streak broke today and the app was reopened the same day |
| `administrative_gloom` | Administrative Gloom | Opened the app 7 days in a row with no tasks completed in that run |

Stored on unlock:
- `id`
- `title`
- `date`
- `palId`
- `palReactionDialogue`

Reward note:
- unlocking `participation` or `tried_once` also awards the `cursed_participation_ribbon`

## Habits
The habit system is a simple 7-day rolling ledger. It tracks whether today's routine was logged and how many recent days remain intact.

Technical details:
- source of truth: `habitHistory`
- schema: `{ 'YYYY-MM-DD': true }`
- rendered via `getHabitWindow(history, 7)`
- one log per day
- undo today is supported
- some calendar completions auto-log habits through pal template streak links

## Clone Lab
The Lab is the mutation-themed long-cycle system. It frames clone generation as a persistent chamber process rather than an instant reward.

Technical details:
- page title: `Clone Chamber`
- timer constants:
  - `CLONE_CYCLE_BASE_MS = 45000`
  - `CLONE_CYCLE_STEP_MS = 5000`
- state shape:
```js
{
  activeCycle,
  revealedVariant,
  history,
  dialogue,
  clonePair,
}
```
- primary UI areas:
  - source pal panel with live Luck, Pessimism, Base Risk, and Clone Bonus readout
  - clone pair selector with dominant source and mutation base
  - chamber metrics for countdown, compatibility, cycle length, and archive depth
  - reveal panel with optional clone naming and activation
  - clone history and collection archive linkage

## Pal System
Pals are the character layer that gives every system emotional and narrative framing. Every Pal has lore, aesthetic identity, and personalized dialogue.

### Roster
| Pal | ID | Diagnosis | Personality | Luck | Placeholder |
|---|---|---|---|---:|---|
| Ahote | `ahote` | ADHD | Easily distracted and bored | 10 | No |
| Brutus | `brutus` | Depression | Low energy, boring | 9 | No |
| Centrama | `centrama` | Anxiety | Perceptive, hyper-vigilant | 9 | No |
| Doolin | `doolin` | NPD | Leader, good orator, selfish | 8 | No |
| Elbjorg | `elbjorg` | PTSD | Closed-off and suspicious | 7 | No |
| Veruca | `veruca` | BDD | Always questions themselves, unsure | 6 | No |
| Winta | `winta` | HPD | Fickle, materialistic, unfulfilled | 5 | No |
| Xio | `xio` | IED | Hot-headed, prepared | 1 | No |
| Yun | `yun` | Autism | Absent-minded introvert | 1 | No |
| Zenji | `zenji` | OCPD | Methodical, cautious, patient to a fault | 10 | No |

Coverage note:
- No currently selectable pals are placeholders, but later-authored systems still have thinner bespoke coverage than the core roster

### Mood Ledger
```js
{
  palId,
  mood,
  hunger,
  neglectDays,
  lastTaskCompletionDate,
  lastMoodSyncDate,
  latestReaction,
}
```

### Calendar Pal Templates
`CALENDAR_PAL_TEMPLATES` define how a specific Pal reacts to calendar operations.

Template fields:
- `summary`
- `actions`
- `categories`
- `highLoadPenalty`
- `rewardCopy`
- `completionCopy`
- `streakLink`

Current state:
- Ahote is the only fully authored template at present

## Item System
Items are cosmetic or trophy-like inventory entries awarded by streaks, seasonal events, disappointment rolls, and anti-achievements.

### Rarities
- `common`
- `uncommon`
- `rare`
- `cursed`

### Sources
- `daily_disappointment`
- `streak`
- `seasonal`
- `achievement`

### Current Named Items
| Item | Rarity | Source |
|---|---|---|
| Burnt Toast Relic | common | daily_disappointment |
| Staring Idol | uncommon | daily_disappointment |
| Receipt of Minor Ruin | common | streak |
| Dust Locket | rare | seasonal |
| Cursed Participation Ribbon | cursed | achievement |
| Mildew Medal | uncommon | seasonal |
| Velvet Grudge | rare | daily_disappointment |
| Lint Crown | common | streak |

### Inventory Entry Shape
```js
{
  id,
  catalogId,
  name,
  image_ref,
  flavor_text,
  rarity,
  date_acquired,
  source,
  event_id,
}
```

## UI and UX Design System
The UI is a compact dark sci-fi interface built around panels, mono labels, and pessimistic copy. It aims to feel deliberate, not playful, even when the mechanics are game-like.

### Visual Language
- dark brutalist base with low-saturation panels
- mobile-first centered layout
- hostile, deadpan, administrative tone
- color is used sparingly for state signaling rather than decoration

### Core Tokens and Fonts
- body max width: `420px`
- main text color: `--text`
- dim text: `--text-dim`
- mood/reward colors:
  - `--gloom` blue
  - `--luck` amber
  - `--plague` violet
  - `--green` success green
  - `--red` failure red
- fonts imported:
  - `Rajdhani`
  - `Share Tech Mono`
  - `Monoton`
  - `Syne`
- primary in-use families:
  - display: `Rajdhani`
  - mono labels: `Share Tech Mono`

### Common UI Patterns
#### Eyebrow Pattern
Small uppercase mono label over a heavier title.

#### Panel Pattern
Most sections use `.panel` with a dark background and single border.

#### Navigation
- fixed primary bottom nav with five entries:
  - Tasks
  - Habits
  - Streak
  - Calendar
  - Care
- secondary utility row on major app screens:
  - Talk
  - Lab
  - Archive
  - Change Pal
  - Database

#### Button Hierarchy
- `.action-button`: primary action
- `.ghost-link`: lower-emphasis navigation or utility action

#### Status Values
Short, prominent numbers or phrases displayed in compact cards. Often zero-padded.

#### Dialogue Boxes
Used across all screens to host Pal commentary, reward flavor, or system status copy.

### Screen Responsibilities
| Screen | Real Title | Purpose |
|---|---|---|
| `home.html` | Daily Decline | main task loop, check-in, emotional weather, calendar summary |
| `care.html` | Maintenance Loop | needs, care actions, wheel, orbit burden |
| `habits.html` | Routine Ledger | 7-day routine tracking |
| `streak.html` | Persistence Report | streak state, event watch, anti-achievements |
| `calendar.html` | Emotional Orbit | event scheduling, month grid, add/edit flow |
| `companion.html` | Talk to Your Pal | standalone conversation shell with saved pal chat history |
| `lab.html` | Clone Chamber | long-running mutation chamber loop |
| `collection.html` | Specimen Archive | pal roster, constellation map, item wall, and clone archive |
| `onboarding.html` | Initial Assignment Pending | legacy stub directing users to choose-pal |
| `choose-pal.html` | Choose Your Pal | active pal selection, roster switching, and acquisition gating |
| `database.html` | Internal Reference | live system reference, lore catalog, and save-state snapshot |

### Task UI Anatomy
The task console is the clearest expression of the design system: compact grid layout, mono labels, status color, and hostile administrative phrasing.

Row behaviors:
- completed rows use green border tint
- calendar rows use amber border tint
- overdue calendar rows use red border tint
- manual load display is always visible as either stat pills or `Not rated yet`

## State Architecture
The app uses one persisted state object. Every system mutates through the same save path, which keeps the architecture simple but tightly coupled.

### Global State Shape
```js
{
  activePal,
  gloom,
  xp,
  luckdust,
  streak,
  habitDays,
  habitHistory,
  tasks,
  unlockedPals,
  inventory,
  palMoodLedger,
  spunToday,
  lastSpinDate,
  dailyDisappointment,
  antiAchievements,
  seasonalEvent,
  meta,
  calendar,
  dailyCheckIn,
  needs,
  plagued,
  care,
  clone,
  version,
}
```

### Lifecycle
#### `loadState()`
- reads raw localStorage
- falls back to defaults
- normalizes with `ensureStateIntegrity`

#### `saveState(state)`
- writes the normalized object back to localStorage

#### `setAppState(updater)`
- single mutation entry point
- accepts object or updater function
- always normalizes before save

#### `ensureStateIntegrity(state)`
- fills missing defaults
- normalizes task, inventory, calendar, mood, meta, and care structures
- upgrades older saved states to new schema safely

#### `prepareSessionState(state)`
- updates open counts and date history
- detects streak breaks
- syncs seasonal event state
- syncs neglect and mood
- applies overdue calendar pressure once per new day
- rolls Daily Disappointment
- evaluates anti-achievements

### Important Meta Fields
| Field | Purpose |
|---|---|
| `firstOpenDate` | first known app-open day |
| `lastOpenDate` | last app-open day |
| `lastProgressDate` | shared streak anchor |
| `openCount` | lifetime app opens |
| `openCountToday` | same-day open count |
| `openDateHistory` | recent days opened |
| `userTaskCreations` | count of user-created tasks |
| `lastStreakBreakDate` | date the streak last broke |

This architecture keeps every system in one place, which makes iteration fast and feature interactions immediate. It also means most systems are intentionally cross-coupled: calendar affects streak, care, and tasks; tasks affect mood and anti-achievements; session prep affects seasonal state and disappointment rewards.