# PPals UI - Component Patterns

Use this file to match the established screens and component structure already present in the app.

## Official Site Cues

When a user asks for stronger PPals UI direction, borrow these cues from the official website:

- status-strip or route-bar framing at the top of a screen
- command-deck grouping rather than generic stacked cards
- icon-plus-label navigation treatment
- black, green, and amber contrast balance for active states
- dense, slightly game-like shell around informational sections

Adapt those cues into the existing app components instead of replacing the mobile app with the website layout wholesale.

## Core Building Blocks

### Panel
- Base class: `.panel`
- Fill: dark solid panel surface with a single border.
- Use as the structural wrapper for nearly every screen section.

### Eyebrow Stack
- Usually `.eyebrow` above `.section-title` or `.screen-title`.
- Eyebrow is mono, uppercase, spaced out.
- Title is Rajdhani, uppercase, compact.

### Primary Action
- Class: `.action-button`
- Use for the main forward action on a screen.
- Must feel keyboard-visible and pointer-visible.
- If the user wants the website feel, lean the button toward dark fill plus amber-border/amber-glow feedback rather than generic bright fills.

### Secondary Action
- Class: `.ghost-link`
- Use for utility links, dismissive actions, navigation out of a panel, and low-emphasis controls.
- Website-inspired treatment should feel like a command-link, not a default text link.

### Dialogue Box
- Class: `.dialogue-box`
- Contains a `.label` plus `.dialogue-text`.
- Used for Pal commentary, event notes, and result feedback.

### Status Card
- Used in compact status grids.
- Usually `.status-card` with `.label` and `.status-value`.
- Good for counts, monthly summaries, outcome/value splits, or care readouts.

### Stat Chip
- Small mono metadata blocks like `.task-stat`, `.collection-affinity-chip`, `.clone-tier-badge`, `.care-roster-badge`.
- Keep bordered, angular, and readable.

## Screen-Specific Patterns

### Daily Decline (`home.html`)
- Dense dashboard of stacked panels.
- Currency cards first, then active Pal, then collapsible systems.
- Home collapsible panels now use `.home-panel-body` with `.home-panel-body-inner` for grid-row collapse.
- Tone: report-like, compressed, operational.
- Good place to borrow the website's route-bar or command-strip framing without turning it into a desktop hero.

### Maintenance Loop (`care.html`)
- Needs rows, action cards, wheel, and alert surfaces.
- Care actions are dense cards, not soft product tiles.
- Use state colors sparingly and functionally.

### Routine Ledger (`habits.html`)
- Day cells and streak evidence should look stamped and administrative.
- Progress bars should stay hard-edged.

### Persistence Report (`streak.html`)
- Treat this like a suspicious audit, not a celebratory streak dashboard.
- Anti-achievements and event watch should feel archival.

### Emotional Orbit (`calendar.html`)
- Data-dense scheduling surface.
- Small metadata must remain readable and aligned.
- Inline event load info is preferable to decorative clutter.
- Website reference is especially useful here for terminal-map and control-panel treatment.

### Clone Chamber (`lab.html`)
- Mutation, rarity, and clone status should feel clinical and slightly unstable.
- Use warning colors with restraint.

### Specimen Archive (`collection.html`)
- Cards should feel catalogued, tagged, and indexed.
- Use chips and metadata rows rather than generic marketing cards.

### Choose Your Pal (`choose-pal.html`)
- Treat selection as assignment, not celebration.
- Pal identity should come from stats, labels, and clipped-card hierarchy.

## Interaction Pattern Rules

- Hover: subtle state tint or border shift.
- Focus-visible: always explicit and high contrast against the dark base.
- Active: slight pressed state only, no bounce or pop.
- Tooltips: delay on hover, instant on focus.
- Motion: reduced-motion fallback is mandatory for decorative movement.
- Website-inspired active treatment can add glow and depth, but should stay sharp-edged and restrained in the app.

## Component Authoring Checklist

- Does it reuse existing tokens instead of raw values?
- Does it match the screen's in-universe tone?
- Does the interaction feedback exist for mouse and keyboard?
- Are labels readable on a 320px screen?
- Does it avoid pills, soft consumer UI, and generic app patterns?