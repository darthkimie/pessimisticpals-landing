# PPals UI - Design System

Use this file for any screen, component, or layout work in Pessimistic Pals.

## Visual Direction

Pessimistic Pals should read as a hostile mobile archive: administrative, slightly theatrical,
and committed to dark whimsy. The app is not cute, soft, or futuristic-polished. It should feel
like a deadpan control panel with bad news embedded in it.

### Official Site Reference

The attached official website adds a second useful layer to the app aesthetic:

- phosphor terminal green over black
- amber-lit borders, hover states, and active highlights
- command-deck shells with dense route bars and control strips
- line-icon navigation with compact labels
- ambient space backdrop treatment

When using that reference in the app, translate it into the app token system instead of copying it literally.
The website is a mood and color reference, not a directive to replace the app with a desktop-style landing page.

### Core Traits

- Sharp terminal archive, not pill-soft consumer UI.
- Color is for state signaling and identity, not decorative saturation spam.
- Layout rhythm should feel deliberate and narrow-screen native.
- Typography should be compressed but still readable. Never sink metadata below the 10px floor.
- UI copy should sound administrative, faintly hostile, and emotionally dry.

## Token Reference

Always prefer the existing tokens in `css/main.css`.

```css
--black: #0a0a0a;
--dark: #111111;
--panel: #161616;
--border: #222222;
--border-lit: #2a2a2a;
--surface-1: rgba(255, 255, 255, 0.03);
--surface-2: rgba(255, 255, 255, 0.05);
--surface-3: rgba(255, 255, 255, 0.08);
--surface-4: rgba(255, 255, 255, 0.12);
--surface-ink-1: rgba(5, 9, 16, 0.82);
--surface-ink-2: rgba(5, 9, 16, 0.96);
--surface-ink-3: rgba(5, 9, 16, 0.98);
--surface-card: rgba(3, 8, 16, 0.72);
--gloom: #4a9eff;
--gloom-dim: #0d2240;
--luck: #c8860a;
--luck-dim: #2a1d00;
--plague: #5a2d82;
--plague-lit: #9b59d0;
--green: #2a6e3f;
--green-lit: #3aaa62;
--red: #8b2020;
--red-lit: #cc4444;
--text: #d0d0c8;
--text-dim: #666660;
--text-faint: #2e2e2a;
--mono: 'Share Tech Mono', monospace;
--display: 'Rajdhani', sans-serif;
```

## Color Translation Rules

Map the website palette into PPals like this:

- website pure black maps to `var(--black)` and `var(--dark)`
- website phosphor green maps best to `var(--green-lit)` for success, system glow, or live-state emphasis
- website amber UI glow maps best to `var(--luck)` and `var(--luck-dim)`
- website white-hot active text maps to `var(--text)` rather than pure white when possible
- website transparent green washes should be translated through `--surface-*` tokens or `color-mix()` with PPals tokens

Do not replace core PPals currencies or meaning:

- `var(--gloom)` remains the primary currency color
- `var(--luck)` remains the rare currency and highlight color
- `var(--plague)` remains decay and danger

Use the official site reference mainly for surface mood, glow balance, and interaction color hierarchy.

## Type Rules

- Headings use Rajdhani, uppercase, tight line-height.
- Labels, counters, metadata, stat chips, and nav labels use Share Tech Mono.
- Anything rendered on-screen should stay at `0.68rem` or above for metadata unless there is a documented exception.
- Eyebrows should be uppercase mono with added tracking.
- Dialogue and body copy should read comfortably at around `1rem` with `line-height: 1.5`.

## Interaction Rules

- Every button, link, toggle, and input must have visible hover, focus-visible, and active feedback.
- Keyboard focus must be visible without relying on browser defaults disappearing into the dark background.
- Tooltip triggers that are interactive should keep pointer affordance, not help affordance.
- Hover effects should be border shifts, subtle surface tinting, or sweep accents - not scale jumps.
- Reduced motion must be respected for decorative transitions and panel reveals.
- Borrow from the official site's amber hover and active glow, but apply it with PPals tokens and sharper geometry.

## Shape Rules

- Prefer clipped corners, hard rectangles, and angled edges.
- Avoid full pills and circles unless the component has a strong in-world reason.
- Progress tracks should be rectilinear or ruled, not soft capsules.
- Status chips may be compact, but still angular and bordered.

## Layout Rules

- Max body width: `420px`.
- Design mobile-first for `320px` to `420px`.
- Favor stacked sections, asymmetric pairs, and narrow dashboard rhythm.
- Use `.panel` as the core container model.
- Bottom nav remains fixed and must always feel tappable and readable.

## Copy Tone

- Deadpan, administrative, mildly contemptuous.
- Never bubbly or reward-culture cheerful.
- Even positive outcomes should sound restrained.
- Avoid generic app copy like "Great job" or "You're all set".

## Preferred UI Patterns

- Eyebrow + title + compact note stack.
- Dialogue boxes for reactive commentary.
- Inline status feedback instead of floating toast spam.
- Dense stat rows with clear border/state treatment.
- Fixed bottom nav with readable icon-plus-label hierarchy.
- Command-strip rows, route-summary bars, and dashboard-like info clusters when a screen needs a stronger shell.

## Avoid

- Generic SaaS cards.
- Soft glass effects.
- Bright rainbow gradients.
- Overscaled microinteractions.
- Rounded badges that break the archive aesthetic.
- Decorative illustrations that ignore Pal canon or screen tone.
- Copying the official website's font stack directly into the app unless the user explicitly asks for a typography change.