---
name: pessimistic-pals-ui
description: "Design system, lore reference, and UI generation skill for the Pessimistic Pals app. Use this skill whenever the user asks to build, design, critique, or improve any UI component, screen, or visual element for Pessimistic Pals. Trigger for: component generation, screen mockups, UI copy, Pal-specific visual treatments, constellation or trait visualizations, care/task/calendar UI, dialogue box copy, onboarding flows, collection screens, and anything that should match the PP aesthetic. Also trigger when the user says 'build this for PPals', 'make a screen for', 'design a card for [Pal]', or references any PP screen by its in-universe name. This skill contains the full design token set, all 10 Pal profiles, component patterns, and anti-giveaway rules specific to this project."
---

# Pessimistic Pals UI Skill

Full design system plus lore reference for building Pessimistic Pals UI. Always read the
relevant reference file before generating any component.

## External UI Reference

The official site at `c:\Users\Lemon\OneDrive\Projects\pessimistic pals\pessimistic pals website\index.html`
and its paired `styles.css` should be treated as a visual reference for UI mood and color.

Use that site for:

- black-first backgrounds
- phosphor-green terminal copy and linework
- warm amber hover, border, and active-state glow
- command-deck information layout
- icon-plus-label navigation treatment
- dense archive or codex panel rhythm

Do not blindly copy the website stack into the app. Keep the app's existing HTML/CSS/JS structure,
body width, and core token system unless the user explicitly asks for a larger redesign.

## Reference Files

Load the file that matches your task:

| Task | File |
|---|---|
| Building any UI component, screen, or layout | `references/design-system.md` |
| Writing Pal dialogue, copy, or character-specific UI | `references/lore.md` |
| Matching an existing screen pattern | `references/components.md` |

For most tasks, load `design-system.md` first, then `lore.md` if Pal voice is involved.

## Canon Rules

- All Pals use they/them pronouns exclusively.
- Pals clone - they do not breed. Gender does not exist in this universe.
- Use Pals not People in all lore or UI copy.
- Never use em dashes - use plain hyphens.
- Yun's planet is Yishap but image file is `yuin.png` - do not rename.
- Ahote's image file is `ahoteog.png` (used as `ahote.png` in project).
- `js/data.js` is the single source of truth - never hardcode Pal data independently.
- State lives under `ppals_state` in localStorage - never create new keys.
- All new state fields go in `ensureStateIntegrity()` defaults only.

## Stack Rules

- Plain HTML, CSS, and JS only - no frameworks and no build system.
- `js/main.js` holds logic, `js/data.js` holds canon data, and `css/main.css` holds styles.
- Page routing is driven by `body[data-page]`.
- Body max width is `420px`, centered.
- Fonts: Rajdhani for display, Share Tech Mono for mono labels.
- Bottom nav remains fixed with `position: fixed`, `max-width: 420px`, `left: 50%`, and `transform: translateX(-50%)`.

## Anti-Giveaway Rules

These patterns make output look generic. Break all of them.

| Never | Instead |
|---|---|
| `#111` or gray utility defaults as the visual base | Use `var(--black)` or `var(--panel)` |
| Purple-to-pink gradient text | Use `var(--gloom)`, `var(--luck)`, `var(--plague)`, or Pal-specific color values |
| Glassmorphism or backdrop blur | Use solid fills and border tokens |
| Generic scale-on-hover microinteractions | Use border shift, sweep shimmer, or state tinting |
| Lucide or stock icon packs | Use inline SVG matched to the screen |
| Generic state names like `activeTab` or `isOpen` | Use descriptive app language like `selectedPal` or `currentScreen` |
| Emoji headers | Use uppercase mono eyebrow labels |
| Symmetric feature-card grids by default | Use single-column rhythm, uneven pairs, or clipped card groupings |
| Inter or system UI type stacks | Use Rajdhani and Share Tech Mono |
| Toasts for every interaction | Prefer inline dialogue, result boxes, or status copy |

## Screen Name Reference

| File | In-Universe Name |
|---|---|
| `home.html` | Daily Decline |
| `care.html` | Maintenance Loop |
| `habits.html` | Routine Ledger |
| `streak.html` | Persistence Report |
| `calendar.html` | Emotional Orbit |
| `lab.html` | Clone Chamber |
| `collection.html` | Specimen Archive |
| `choose-pal.html` | Choose Your Pal |
| `adopt.html` | Lore Oracle |
| `companion.html` | Pal companion chat |
| `pages/devtools.html` | Developer sandbox |

## Output Format Rules

When generating HTML, CSS, or JS:

1. Always use CSS variables - never raw hex values except for existing Pal-specific color values already established in canon data.
2. Add a comment at the top of generated snippets: `// PPals UI - [screen or component name]`.
3. Follow existing class naming patterns like `.panel`, `.eyebrow`, `.action-button`, `.ghost-link`, and `.dialogue-box`.
4. Use clipped polygon shapes deliberately for cards and controls where they support the screen's visual hierarchy.
5. Do not re-add scanline texture per component - it already exists globally on `body::before`.
6. Keep everything mobile-first and functional at `320px` to `420px` width.