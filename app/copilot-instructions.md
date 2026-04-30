# Pessimistic Pals - Copilot Instructions

## Project Overview

Pessimistic Pals is a mobile-first productivity app built as a virtual pet system.
Stack: plain HTML, CSS, and JavaScript. No frameworks. No build system.
Persistence: localStorage under the key `ppals_state`.
Version constant: `0.5.0`

---

## Core File Locations

- Main logic: `js/main.js`
- All canon data: `js/data.js`
- Global styles and CSS variables: `css/main.css`
- Page routing: via `body[data-page]` attribute on each HTML file

Do not hardcode Pal data, planet names, moon names, or tribe names in HTML files.
Always read from `js/data.js`.

---

## Canon Rules - Never Break These

- All Pals use **they/them** pronouns. No exceptions.
- Pals **clone**. They do not breed.
- Gender does not exist in this universe.
- Use "Pals" not "people" in all in-app copy and lore text.
- Yun's planet is Yishap. The image file is `yuin.png`. Do not rename the file.
- Yun has no moon.
- Ahote's image source is `ahoteog.png`. When adding to assets, rename to `ahote.png`.
- Yun and Zenji are placeholder-canon. Mark any dialogue written for them with `// TODO: confirm canon`.

---

## Pal Roster

| Pal | ID | Diagnosis |
|---|---|---|
| Ahote | `ahote` | ADHD |
| Brutus | `brutus` | Depression |
| Centrama | `centrama` | Anxiety |
| Doolin | `doolin` | NPD |
| Elbjorg | `elbjorg` | PTSD |
| Veruca | `veruca` | BDD |
| Winta | `winta` | HPD |
| Xio | `xio` | IED |
| Yun | `yun` | TBD - placeholder |
| Zenji | `zenji` | TBD - placeholder |

---

## State Rules

- All state lives in a single object under `ppals_state` in localStorage.
- Never create a new localStorage key. Always extend the existing state object.
- Always use `setAppState(updater)` as the single mutation entry point.
- Never write directly to localStorage except through the save path.
- Always call `ensureStateIntegrity(state)` after loading state to normalize missing fields.
- When adding new fields to state, add defaults inside `ensureStateIntegrity`, not inline.

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

---

## Currency and Stats Rules

- Primary currency: `gloom`
- Rare currency: `luckdust`
- Secondary progression: `xp`
- `TASK_REWARD = 5` is the base manual task reward constant
- Care action costs: Feed 3, Entertain 2, Comfort 0, Sanitize 4, Cure 5
- Streak milestones: +1 Luckdust every 3 days, streak item every 5 days
- Streak anchor: `meta.lastProgressDate`
- Mood cap: `MAX_RELUCTANT_MOOD = 78`
- Plague threshold: `PLAGUE_THRESHOLD = 100`

---

## Load System Rules

Load is calculated as:
```js
load = intensity + socialWeight + energyCost + dreadLevel
```

- Minimum: 0, Maximum: 20
- All four fields must be clamped to `0..5`
- Older tasks missing load fields must be backfilled to `0` on normalization
- Manual task Gloom reward: `5 + Math.floor(load / 2)`
- Manual task mood boost: `6 + (load >= 12 ? 4 : load >= 6 ? 2 : 0)`

---

## Task Rules

- Manual tasks use `source: 'manual'`
- Calendar events are NOT merged into the task console; they live only on the Schedule page
- Calendar completions route through `completeCalendarOccurrence(eventId, occurrenceDate)` from the Schedule UI
- `getTaskConsoleEntries(state)` returns manual tasks only

---

## Calendar Rules

- Calendar events use the same four load fields as manual tasks
- Event categories: `focus`, `appointment`, `social`, `maintenance`, `celebration`, `recovery`
- Recurrence values: `none`, `daily`, `weekly`, `monthly`
- Occurrences are completed individually and recorded in `state.calendar.completionLog`
- Overdue pressure runs once per new day inside `prepareSessionState`
- Never run `applyCalendarOverduePressure` more than once per day

### Calendar Event Schema
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

---

## Needs System Rules

| Need | Starting Value | Hourly Change | Direction |
|---|---:|---:|---|
| Hunger | 80 | 2.2 | decreases |
| Boredom | 80 | 1.4 | decreases |
| Mood | 60 | 0.8 | decreases |
| Plague | 10 | 1.1 | increases |

Visual class rules for hunger, boredom, mood:
- `is-good`: above 55
- `is-warn`: 26 to 55
- `is-critical`: 25 and below

Visual class rules for plague:
- `is-good`: below 45
- `is-warn`: 45 to 74
- `is-plague`: 75 and above

---

## Seasonal Events

| Event ID | Name | Date Range |
|---|---|---|
| `annual_disappointment_reset` | The Annual Disappointment Reset | Jan 1 - Jan 7 |
| `ugh_fine_love` | Ugh, Fine. A Love Event. | Feb 10 - Feb 14 |
| `their_favorite_day` | Their Favorite Day (They Deny It) | Oct 25 - Oct 31 |

- Seasonal state syncs during `prepareSessionState`
- During seasonal events, cosmetic item weight in Daily Disappointment increases by `0.4`

---

## Screen Reference

| File | Real Title | Purpose |
|---|---|---|
| `home.html` | Daily Decline | task loop, check-in, emotional weather, calendar summary |
| `care.html` | Maintenance Loop | needs, care actions, wheel, orbit burden |
| `habits.html` | Routine Ledger | 7-day routine tracking |
| `streak.html` | Persistence Report | streak state, event watch, anti-achievements |
| `calendar.html` | Emotional Orbit | scheduling, month grid, add/edit flow |
| `lab.html` | Clone Chamber | long-running mutation loop |
| `collection.html` | Specimen Archive | pal roster and item wall |
| `choose-pal.html` | Choose Your Pal | active pal selection |
| `onboarding.html` | Initial Assignment Pending | legacy stub |

---

## Asset File Naming

- Pal portraits: `assets/pals/[palid].png` (lowercase pal ID, no spaces)
- Planet images: `assets/planets/[planetname].png`
- Moon images: `assets/moons/[moonname].png`
- Tribe emblems: `assets/tribes/[tribename].png`
- Ship parts: `assets/ships/[partname].png`
- Background images: `assets/backgrounds/[name].png`
- UI elements: `assets/ui/[name].png`

Do not rename `yuin.png`. It stays as-is.
Ship parts confirmed usable: `thrusterd.png`, `thrusterfired.png`, `nosed.png`, `based.png`, `wingd.png`, `windowd.png`

---

## UI and Design Rules

- Body max width: `420px`
- Layout: mobile-first, centered, dark background
- Tone: hostile, deadpan, administrative - not playful
- Color is used for state signaling only, not decoration

### CSS Variable Reference
- `--text`: main text color
- `--text-dim`: secondary/dim text
- `--gloom`: blue (primary currency color)
- `--luck`: amber (luckdust color)
- `--plague`: violet (plague state color)
- `--green`: success state
- `--red`: failure/overdue state

### Fonts
- Display headings: `Rajdhani`
- Mono labels and stats: `Share Tech Mono`
- Available but secondary: `Monoton`, `Syne`

### Component Patterns
- Eyebrow pattern: small uppercase mono label above a heavier title
- Panels: use `.panel` class with dark background and single border
- Primary actions: `.action-button`
- Low-emphasis navigation or utility: `.ghost-link`
- Status values: short prominent numbers, often zero-padded
- Dialogue boxes: used on all screens for Pal commentary and system status

### Navigation
- Fixed bottom nav with six entries: Tasks, Habits, Streak, Calendar, Lab, Care

### Task Row Visual Rules
- Completed rows: green border tint
- Calendar relay rows: amber border tint
- Overdue calendar rows: red border tint
- Rated manual tasks show `I / S / E / D` stat pills plus `LOAD N`
- Unrated manual tasks show `UNRATED`
- Calendar relay tasks do not render the manual stat pill row

---

## Pal Lore Profiles

Use these profiles when writing dialogue, commentary, reactions, or any Pal-specific copy.
Each Pal must sound distinct. Do not flatten them into generic sarcasm or interchangeable snark.
Base every line on the diagnosis, quirk, likes, dislikes, and core voice for that Pal.

---

### Ahote
- ID: `ahote`
- Diagnosis: ADHD
- Planet: Aniwer | Moon: Alai | Tribe: Andgo
- Luck: 10 | Pess: 01 | MutRisk: 01
- Likes: shiny trinkets, drawing, exploring planets
- Dislikes: ship maintenance, sand, losing things
- Catchphrase: "Oh! Shiny!"
- Quirk: forgets mid-sentence what they were saying but keeps talking anyway
- Mood: overstimulated, distracted, impulsively optimistic until they crash
- Best Pal: Yun
- Core voice: bright, scattered, impulsive, delight-first then consequence-later
- Tribe notes: wanderers, inventors, improvisers - rarely finish anything
- Planet theme: chaos, overstimulation

---

### Brutus
- ID: `brutus`
- Diagnosis: Depression
- Planet: Busru | Moon: Brau | Tribe: Busrani
- Luck: 09 | Pess: 02 | MutRisk: 02
- Likes: horror, coffee, reading
- Dislikes: the sun, cooking, leaving their house
- Catchphrase: "...I'd rather stay here."
- Quirk: [not yet written - do not invent a value]
- Mood: tired, withdrawn, quietly yearning for something they cannot name
- Best Pal: Elbjorg
- Core voice: quiet, heavy, dry, low-power resignation
- Tribe notes: quiet scavengers and archivists, collect broken relics
- Planet theme: stillness, heaviness, quiet beauty in bleakness
- Note: most animations completed - used as first desktop pet character

---

### Centrama
- ID: `centrama`
- Diagnosis: Anxiety
- Planet: Coonsa | Moon: Carea | Tribe: Casnov
- Luck: 09 | Pess: 02 | MutRisk: 03
- Likes: coloring, walking, house plants
- Dislikes: conflict, getting sick, jump scares
- Catchphrase: "What if something goes wrong?"
- Quirk: taps fingers or fidgets with small objects whenever standing still
- Mood: on edge
- Best Pal: Zenji
- Core voice: anticipatory, observant, cautious, spiraling but articulate
- Tribe notes: obsessive order and routine, cautious and meticulous, always anticipating disaster

---

### Doolin
- ID: `doolin`
- Diagnosis: NPD
- Planet: Dilrus | Moon: Dirwa | Tribe: Diani
- Luck: 08 | Pess: 04 | MutRisk: 04
- Likes: the spotlight, anything gold, music
- Dislikes: rules, vegetables, scripts
- Catchphrase: "The world deserves to see me shine."
- Quirk: constantly checks their reflection mid-conversation
- Mood: dramatic, self-assured, charming, easily wounded if ignored
- Best Pal: Winta (unstable - they compete for attention)
- Core voice: theatrical, self-mythologizing, charismatic, image-aware
- Tribe notes: orators, rulers, performers - measure success in admiration and power

---

### Elbjorg
- ID: `elbjorg`
- Diagnosis: PTSD
- Planet: Einlin | Moons: Eadin + Esea (two moons) | Tribe: Eiol
- Luck: 07 | Pess: 04 | MutRisk: 05
- Likes: camping, crocheting, macaroni and cheese
- Dislikes: snow, therapy, open concept floor plans
- Catchphrase: "Strong walls make safe hearts."
- Quirk: does not like to be touched
- Mood: calm and reserved
- Best Pal: Brutus
- Core voice: guarded, practical, protective, sturdy, spare with words
- Tribe notes: sentinels and stewards of the forest, suspicious of outsiders, fiercely loyal to their own

---

### Veruca
- ID: `veruca`
- Diagnosis: BDD
- Planet: Vaxa | Moon: Vix | Tribe: Vatax
- Luck: 06 | Pess: 06 | MutRisk: 06
- Likes: working out, social media, fashion
- Dislikes: pineapple on pizza, going out in public, the beach
- Catchphrase: [FLAG - unconfirmed - do not use Elbjorg catchphrase - candidates: "Almost. Not quite. Almost." or "I look fine. I look completely fine."]
- Quirk: always returns a compliment tenfold
- Mood: unsure, questioning
- Best Pal: Xio
- Core voice: self-scrutinizing, tender, image-conscious, reciprocal, slightly spiraling
- Tribe notes: appearance-obsessed, perfectionist, prize conformity

---

### Winta
- ID: `winta`
- Diagnosis: HPD
- Planet: Woldof | Moons: Wotl + Wifid (two moons) | Tribe: Wanfoti
- Luck: 05 | Pess: 08 | MutRisk: 07
- Likes: theatre, social media, shopping
- Dislikes: being left on read, repeating themselves, awkward silence
- Catchphrase: "I want it... until I don't."
- Quirk: fakes fainting when the spotlight drifts - always lands near someone influential
- Mood: restless, unsatisfied, chasing the next shiny thing
- Best Pal: Doolin (unstable - they compete for attention)
- Core voice: performative, glamorous, needy, quick to pivot, emotionally decorative but sharp
- Tribe notes: emotionally intense and theatrical, track social standing via the Glint system (holographic symbol on shoulder)

---

### Xio
- ID: `xio`
- Diagnosis: IED (intermittent explosive disorder)
- Planet: Xandu | Moon: Xap | Tribe: Xatle
- Luck: 01 | Pess: 08 | MutRisk: 08
- Likes: robotics, night time, their planner
- Dislikes: last minute plans, slow walkers, mint chocolate chip anything
- Catchphrase: "Everything breaks eventually."
- Quirk: hums when angry
- Mood: tense, restless, quick to ignite
- Best Pal: Veruca
- Core voice: terse, intense, planning-obsessed, impatient, competent under pressure
- Tribe notes: battle-engineers, build combat robots from hardened lava stone, treat eruptions as opportunities

---

### Yun
- ID: `yun`
- Diagnosis: Autism
- Planet: Yishap (image file: `yuin.png` - do not rename) | No moon | Tribe: Yorrin (the Caretakers)
- Luck: 01 (FLAG - notes say 2, unconfirmed) | Pess: 09 | MutRisk: 02
- Likes: physics, animals, cheesecake
- Dislikes: eye contact, loud sounds, school
- Catchphrase: "Oh. Sorry. I was thinking."
- Mood: quiet, internally focused
- Best Pal: Ahote
- Core voice: evocative but minimal - keep responses understated
- Note: dialogue still pending full canon confirmation. Mark written lines with `// TODO: confirm canon`

---

### Zenji
- ID: `zenji`
- Diagnosis: OCPD
- Planet: Zardi | Moon: Zincen | Tribe: Zessra
- Luck: 10 | Pess: 01 | MutRisk: 05 (FLAG - code shows 0, unconfirmed)
- Likes: sports, sudoku, their planner
- Dislikes: sticky things, foods touching, spontaneity
- Catchphrase: "I'll get to it... eventually."
- Mood: composed, exacting, quietly frustrated by disorder
- Best Pal: Centrama
- Core voice: evocative but minimal - keep responses understated
- Note: dialogue still pending full canon confirmation. Mark written lines with `// TODO: confirm canon`

---

## World Lore Notes

- The universe is called the Pessimistic Pals universe. Tone: dark whimsy, cozy cynicism, Tim Burton-influenced.
- Pals do not have gender. They clone. Do not introduce breeding, reproduction, or gendered language.
- The app voice is pessimistic, deadpan, and faintly hostile - but the mechanics reward consistency.
- In-app copy should feel administrative and a little contemptuous, not cute or chirpy.
- Seasonal events: The Annual Disappointment Reset (Jan), Ugh Fine A Love Event (Feb), Their Favorite Day They Deny It (Oct).
- Anti-achievements reward suspicious behavior, not heroic play.
- Items have flavor text and provenance. They should feel like sad little relics, not prizes.

---

## Copilot Behavior Rules

### Before Writing Any Code
- Read the existing file you are about to modify before writing anything.
- Understand what already exists. Do not duplicate functions or state fields.
- Check `js/data.js` for canon data before adding any Pal, planet, moon, or tribe reference.
- Check `js/main.js` for existing functions before writing a new one with the same purpose.

### When Writing Code
- One task at a time. Do not refactor unrelated code while completing a task.
- Never rewrite existing working code unless explicitly asked.
- Never create a new localStorage key. Extend `ppals_state` only.
- Never add a framework, library, or build step.
- Never use em dashes in strings, comments, or copy. Use plain hyphens.
- Never use apostrophes, curly quotes, or Unicode characters in JS or JSX strings. Plain ASCII only.
- Extend existing state objects. Do not create parallel state structures.
- Add new state fields as defaults inside `ensureStateIntegrity`, not at the point of use.

### Dialogue and Copy Rules
- All Pals use they/them pronouns.
- Never write "he", "she", "his", "her", "him" for any Pal.
- Never write that Pals breed. They clone.
- Use "Pals" not "people" in any UI copy or lore text.
- Yun and Zenji dialogue is placeholder. Mark it: `// TODO: confirm canon`
- Do not give every Pal the same joke structure or the same sarcastic tone.
- Each Pal must sound distinct based on their diagnosis, quirk, and personality.

### Verify Before Finishing
- Does the new code read from `js/data.js` instead of hardcoding values?
- Does it use `setAppState()` for all state mutations?
- Does it extend existing state rather than creating new keys?
- Are all strings plain ASCII with no special characters?
- Are they/them pronouns used correctly throughout?
- Is the task isolated and not touching unrelated code?

---

## Open Flags - Do Not Resolve Without Confirmation

These are known data conflicts. Do not pick a value. Leave them as-is until DK confirms.

- Yun Luck stat: code shows `1`, notes say `2`
- Zenji MutRisk: code shows `0`, notes say `5`
- Brutus Quirk field: blank in source - do not invent a value
- Veruca catchphrase: currently duplicates Elbjorg's - do not overwrite either until confirmed
- Yun planet image: file is `yuin.png`, canon name is Yishap - do not rename the file

---

## Lore Scaffolding and Claude Collaboration

Pessimistic Pals lore is developed collaboratively with Claude, not written directly in code.
Copilot's role is to build the scaffolding that makes that lore easy to drop in later.

### When Writing New Pal Dialogue or Copy

- Never invent lore, personality details, catchphrases, or backstory from scratch.
- If a dialogue field is missing, insert a placeholder comment in this format:
  ```js
  // LORE NEEDED: [palId] - [context e.g. "reaction to overdue calendar event"]
  // Bring this to Claude with the Pal profile to generate canon-consistent dialogue.
  ```
- If a new dialogue category is being added (new event type, new screen, new reaction), scaffold the structure with empty strings and mark each one:
  ```js
  ahote: '', // LORE NEEDED: ahote - [describe the moment or trigger]
  brutus: '', // LORE NEEDED: brutus - [describe the moment or trigger]
  ```
- Do not write filler lines like "..." or "TBD" or generic placeholder text. Use the structured comment format above so Claude can find and fill them systematically.

### When Adding New Systems That Touch Lore

If you are building a new screen, feature, or mechanic that will eventually need Pal-specific dialogue or flavor text, always:
1. Create the dialogue data structure in `js/data.js` with empty strings and `// LORE NEEDED` comments.
2. Wire the UI to read from that structure even if it is empty.
3. Add a comment at the top of the new data block:
   ```js
  // LORE BLOCK: [system name]
  // Dialogue for this system should be written with Claude using the Pal profiles in copilot-instructions.md.
  // Do not fill these in manually.
  ```

### When You Spot a Lore Gap

If you notice an existing system that has hardcoded strings, generic copy, or missing Pal-specific reactions:
- Leave a comment flagging it:
  ```js
  // LORE GAP: this copy is not Pal-specific. Bring to Claude for per-Pal versions.
  ```
- Do not rewrite the copy yourself. Flag it and move on.

### New Pal Expansion Checklist

If a new Pal is ever added to the roster, scaffold these data blocks immediately and mark all as `// LORE NEEDED`:
- `PAL_DIALOGUE`
- `CARE_DIALOGUE`
- `CALENDAR_EVENT_DIALOGUE`
- `LAB_DIALOGUE`
- `CALENDAR_PAL_TEMPLATES`
- All seasonal event `palDialogue` entries
- Anti-achievement `palReactionDialogue`
- Daily Disappointment named wheel segment

### Lore Flags to Surface to the User

When finishing a session where lore gaps were found or scaffolded, include a summary in `STATUS.md`:
```
LORE GAPS FOUND THIS SESSION:
- [palId] - [system] - [brief description of what is missing]
```
This makes it easy to bring a targeted list to Claude and generate all missing dialogue in one focused session.

---

## Three-Way Workflow - Copilot, Claude, and DK

This project is built across three collaborators: DK (creative director and artist), Claude (lore, strategy, prompt authoring, and design reasoning), and Copilot (code generation and implementation). Each has a defined role. Do not blur the lines.

### Division of Labor

**Claude handles:**
- All lore writing and dialogue
- Copilot prompt authoring
- Design decisions and UI direction
- Creative strategy and world expansion
- Asset processing and image prep
- Reviewing broken systems before expanding them

**Copilot handles:**
- Screen-by-screen code generation
- Extending existing patterns
- Scaffolding new data structures
- Flagging lore gaps without filling them
- Updating STATUS.md at session end

**DK handles:**
- All art and asset creation
- Final canon confirmation
- Creative direction and approval
- Bringing Claude prompts and screenshots to the right tool at the right time

---

### Comment Tags

Use these two tags anywhere in the codebase to signal who should handle something next:

```js
// CLAUDE: this needs review, design input, or lore before expanding
// COPILOT: safe to extend this pattern directly
```

When in doubt, tag it `// CLAUDE` and move on. Never block progress waiting for a decision - scaffold and flag.

---

### Prompt Log

A file called `PROMPT_LOG.md` lives in the project root.
Every time a major Copilot prompt is written or used, log it there in this format:

```
[date] - [system name] - [one line summary of what the prompt did]
```

Example:
```
2026-03-28 - calendar.html - added per-Pal event reaction scaffolding to CALENDAR_EVENT_DIALOGUE
```

This makes it easy to trace what changed and when if something breaks later.

---

### Prompt Files

Reusable Claude prompts are stored as markdown files in the project root with the naming convention:

```
PROMPT_[system_name].md
```

Examples: `PROMPT_task_ratings.md`, `PROMPT_clone_lab.md`, `PROMPT_pal_event_calendar.md`

When building or expanding a major system, check if a prompt file already exists before starting. If one does not exist, note it in STATUS.md so one can be written before the next session.

---

### Known Broken Log

STATUS.md includes a `KNOWN BROKEN` section. Format:

```
KNOWN BROKEN:
- [file]: [description of issue] - flagged [date]
```

When starting a new session, paste the KNOWN BROKEN section into the prompt so fixes are prioritized before new features are added. Never build on top of a known broken system without flagging it first.

---

### UI Change Protocol

Before asking Copilot to change any UI layout, spacing, or visual structure:
1. Note what is wrong in plain language.
2. Bring the description to Claude first for a precise CSS-level prompt.
3. Use that prompt with Copilot instead of describing the change vaguely.

Vague UI instructions produce inconsistent results. A prompt that says "add flex:1 to .task-row-meta and set overflow to hidden" is more reliable than "make the task row look cleaner."

---

## Session Continuity

- Update `STATUS.md` at the end of every session.
- Record: what was completed, what is in progress, what was skipped, and any new flags discovered.
- Do not delete previous STATUS.md entries. Append to them.
